# Housing@UMU Unified Request Lifecycle Model
## Executive decision
Housing@UMU should replace the idea of a universal “async section hook” with a **Unified Request Lifecycle Model (URLM)**. The unit of state is not a component, promise, spinner, or HTTP response; it is one **logical user operation** with one operation ID, one policy, one active lifecycle, and exactly one accepted terminal outcome.

This model preserves the existing UX state components, but places them beneath a request coordinator that understands whether an operation is a read, mutation, authentication attempt, navigation, transfer, background job, or live stream. Laravel remains authoritative for authentication, authorization, validation, throttling, persistence, and redirects. React remains authoritative only for transient interaction state and presentation.

The reliability invariant is:

> For every accepted user operation, all frontend and backend events are correlated to the same operation ID; only events from the currently authoritative operation may change visible React state; and every operation terminates as success, a specific recoverable failure, a specific non-recoverable failure, cancellation, or an explicitly reconciled uncertain result.

A model cannot predict literally every future transport or business failure. It can, however, be **total**: every recognized outcome receives a precise state, while every unrecognized outcome enters a safe `unknown_failure` state with a correlation code, no leaked technical detail, and a recovery route. That is the practical meaning of “works regardless of the request received.”
## Architectural boundaries
The system has five cooperating layers. No layer should duplicate another layer’s responsibility.

| Layer | Owns | Must not own |
|---|---|---|
| React view | Rendering, accessibility, focus, action placement, local drafts | Authentication truth, final authorization, durable success |
| Operation coordinator | Operation IDs, lifecycle transitions, cancellation, stale-response rejection, timers, retry policy | Business validation or database truth |
| Inertia/HTTP adapter | Transport callbacks, response normalization, progress, redirects, error bags | User-facing policy decisions |
| Laravel application | Session, authentication, authorization, validation, throttling, role redirect, domain transaction | Browser presentation state |
| Persistence/operations | Transactions, uniqueness, idempotency records, queues, audit trail, recovery tooling | Per-component UI decisions |

Laravel’s session guard maintains authenticated state through server-side session storage and cookies, and Laravel recommends regenerating the session after successful authentication to prevent session fixation. Laravel Form Requests encapsulate authorization and validation, execute before the controller, produce 403 when authorization fails, and provide validated data to application code.[^1][^2]
## Request taxonomy
Every operation must declare a `RequestProfile` before execution. This prevents a login, payment, search query, upload, and dashboard widget from accidentally receiving the same retry, cancellation, or UI behavior.

| Kind | Examples | Default concurrency | Retry default | Durable protection |
|---|---|---|---|---|
| `navigation` | Open dashboard, follow pagination | Latest wins | Safe once for network failure | None normally |
| `read` | Hostel list, recent activity | Latest wins per resource key | Bounded automatic retry | Cache/stale snapshot |
| `mutation` | Submit application, update profile | Single flight | Never automatically unless idempotent | Transaction + idempotency key |
| `authentication` | Login, logout, password confirmation | Single flight | Never automatically | Session rotation + throttle |
| `security_recovery` | Reset password, verification email | Single flight | User initiated only | Neutral responses + throttle |
| `upload` | Supporting document | Single flight or bounded parallel | Resume/retry by chunk policy | Checksum + durable upload record |
| `download` | Allocation letter, report | Parallel or single flight by key | Safe if endpoint supports ranges | Generated-artifact record |
| `long_job` | Export, bulk allocation | Submit once, then poll/subscribe | Polling may retry | Durable job ID + queue state |
| `live_stream` | Notifications, allocation updates | One connection per channel | Reconnect with backoff | Cursor/sequence checkpoint |
| `external_effect` | Payment, email/SMS provider | Single flight | Only with provider idempotency | Local outbox + provider reference |

HTTP methods alone are insufficient for policy. For example, a POST may be a harmless search or a payment, while a GET may be expensive. Nevertheless, HTTP defines safe methods and idempotent methods as useful defaults; repeated PUT, DELETE, and safe-method requests are intended to have the same effect as one request. For non-idempotent POST or PATCH operations, an idempotency key can let a client safely resend an unacknowledged logical operation, but the currently documented header remains non-standard and therefore Housing@UMU must explicitly define its own server contract.[^3][^4]
## Operation identity
Each logical operation carries four identifiers:

- `operationId`: generated once when the user intentionally starts a new operation; unchanged across retries.
- `attemptId`: generated for each transport attempt within that operation.
- `correlationId`: sent to Laravel and returned to the client for logs and support.
- `idempotencyKey`: required only for side-effecting operations that may be safely resubmitted.

An operation also records a `generation` number. Starting a newer latest-wins operation increments the generation. A response may update state only when both its operation ID and generation match the active record.

```ts
export interface RequestIdentity {
  operationId: string;
  attemptId: string;
  correlationId: string;
  idempotencyKey?: string;
  generation: number;
}

export interface RequestProfile {
  name: string;
  kind:
    | 'navigation'
    | 'read'
    | 'mutation'
    | 'authentication'
    | 'security_recovery'
    | 'upload'
    | 'download'
    | 'long_job'
    | 'live_stream'
    | 'external_effect';
  scope: 'field' | 'control' | 'section' | 'page' | 'application';
  criticality: 'advisory' | 'important' | 'blocking';
  concurrency: 'latest_wins' | 'single_flight' | 'parallel' | 'queue';
  retry: 'never' | 'safe_transient' | 'idempotent_only' | 'user_only';
  timeoutMs: number;
  staleData: 'forbid' | 'allow_marked' | 'allow_silent_refresh';
}
```

OWASP recommends an interaction identifier that links all events belonging to one user interaction rather than reconstructing them later. It also requires logs to capture when, where, who, and what while excluding passwords, access tokens, raw session IDs, and unnecessary sensitive information. Housing@UMU’s `correlationId` fulfills that interaction-linking role; it must never be derived from a password, reset token, session cookie, or raw personal data.[^5]
## Formal state machine
### State set
The coordinator uses a discriminated union rather than independent booleans. This prevents impossible combinations such as `loading = true`, `success = true`, and `error != null` at the same time.

```ts
export type OperationState<T> =
  | { status: 'idle' }
  | { status: 'validating'; id: RequestIdentity }
  | { status: 'blocked'; id: RequestIdentity; fieldErrors: FieldErrors }
  | { status: 'submitting'; id: RequestIdentity; startedAt: number }
  | { status: 'progressing'; id: RequestIdentity; progress: Progress }
  | { status: 'accepted'; id: RequestIdentity; jobId: string }
  | { status: 'tracking'; id: RequestIdentity; jobId: string; progress?: Progress }
  | { status: 'refreshing'; id: RequestIdentity; data: T }
  | { status: 'reconciling'; id: RequestIdentity; reason: 'outcome_unknown' }
  | { status: 'succeeded'; id: RequestIdentity; data?: T; effect?: SuccessEffect }
  | { status: 'empty'; id: RequestIdentity; reasonCode: string }
  | { status: 'validation_failed'; id: RequestIdentity; fieldErrors: FieldErrors }
  | { status: 'auth_required'; id: RequestIdentity }
  | { status: 'forbidden'; id: RequestIdentity; reasonCode: string }
  | { status: 'conflicted'; id: RequestIdentity; serverVersion?: string }
  | { status: 'throttled'; id: RequestIdentity; retryAt?: number }
  | { status: 'offline'; id: RequestIdentity }
  | { status: 'timed_out'; id: RequestIdentity; outcomeKnown: boolean }
  | { status: 'cancelled'; id: RequestIdentity; cause: CancelCause }
  | { status: 'failed'; id: RequestIdentity; reasonCode: string; retryable: boolean }
  | { status: 'unknown_failure'; id: RequestIdentity; correlationId: string };
```
### Transition function
Let `S` be the current state, `E` an event, and `A` the active operation identity. The reducer is a total function:

\[
\delta(S,E,A) \rightarrow S'
\]

Before applying a response event, the reducer evaluates:

\[
accept(E,A) = (E.operationId = A.operationId) \land (E.generation = A.generation) \land \neg A.cancelled
\]

If `accept(E,A)` is false, the event is logged as `LATE_RESPONSE_IGNORED` and state remains unchanged. Therefore an older response can never overwrite a newer submission.

The principal transitions are:

| Current state | Event | Next state | Mandatory side effect |
|---|---|---|---|
| `idle` or terminal | `START` | `validating` | Clear previous operation timers and appropriate old errors |
| `validating` | `CLIENT_INVALID` | `blocked` | Focus first invalid field |
| `validating` | `CLIENT_VALID` | `submitting` | Start request and watchdog |
| `submitting` | `PROGRESS` | `progressing` | Render measurable progress |
| `submitting` | `SERVER_ACCEPTED` | `accepted` | Store durable job ID |
| `accepted` | `TRACK_START` | `tracking` | Poll/subscribe using job ID |
| `submitting` | `SERVER_VALIDATION` | `validation_failed` | Merge authoritative field errors |
| `submitting` | `SUCCESS` | `succeeded` | Apply one success effect |
| Any active | `AUTH_LOST` | `auth_required` | Stop related requests; preserve safe return URL |
| Any active | `FORBIDDEN` | `forbidden` | Do not retry automatically |
| Any active | `CONFLICT` | `conflicted` | Offer refresh/compare action |
| Any active | `RATE_LIMIT` | `throttled` | Respect server retry time |
| Any active | `NETWORK_LOST` | `offline` | Keep safe draft locally where permitted |
| Mutation active | `TIMEOUT_UNKNOWN` | `reconciling` | Query operation status before resubmission |
| Safe read active | `TIMEOUT` | `timed_out` | Allow bounded retry |
| Any active | `CANCEL` | `cancelled` | Abort transport and clear timers |
| Any active | unknown event/error | `unknown_failure` | Display support code; log sanitized details |

`onFinish` is a **finalizer**, not an outcome. It clears timers, cancellation handles, and processing indicators, but it must never turn an error into success or replace an already accepted terminal state.
## Lifecycle algorithm
Every request adapter follows the same twelve-stage algorithm:

1. Build a `RequestProfile`.
2. Generate one operation ID and correlation ID.
3. Cancel or reject concurrent work according to the profile.
4. Clear only errors owned by the previous operation; do not erase unrelated forms’ errors.
5. Run client validation for immediate usability, never as a security boundary.
6. Enter `submitting` and start timers after the transport actually starts.
7. Pass identity headers and, where required, an idempotency key.
8. Normalize Inertia callbacks, JSON responses, redirects, upload progress, and network exceptions into lifecycle events.
9. Accept an event only if its identity is still current.
10. Let Laravel’s decision determine the business outcome.
11. Execute one presentation effect derived from the terminal state.
12. In a guaranteed finalizer, clear timers and transport handles without changing the outcome.

Inertia exposes per-visit callbacks for start, progress, success, validation error, HTTP exception, network error, cancellation, and finish. It also supports granular cancellation tokens and application-wide cancellation of in-flight visits. Browser `AbortController` similarly aborts fetch requests, response-body consumption, and streams, making it suitable for standalone requests managed outside Inertia.[^6][^7]
## Concurrency policies
### Latest wins
Use for search, filters, autocomplete, pagination, and refreshable reads. Starting operation B cancels operation A when possible; even if cancellation does not stop the server, A’s later response is ignored by identity comparison.
### Single flight
Use for login, registration, application submission, payment, allocation, password reset, and destructive actions. While one operation is active, repeated button presses do not start new logical operations. The button remains visibly processing, and keyboard submission follows the same lock.
### Parallel
Use only where results are independent, such as multiple dashboard widgets or non-conflicting downloads. Each operation must have a distinct resource key and state owner.
### Queue
Use when user intent must be preserved in order, such as ordered bulk actions. The browser queue is never the sole durable record for critical work; Laravel creates a durable server job and returns its identifier.

Laravel normally permits concurrent requests sharing one session, which can cause session-data loss when multiple endpoints write the session. Laravel provides route-level session blocking for selected routes when the configured cache driver supports atomic locks. Apply blocking narrowly to session-mutating security flows rather than globally, because unnecessary locks reduce concurrency.[^8]
## Transport adapters
### Inertia form adapter
Use for session-backed page forms and mutations whose normal result is validation feedback or navigation. Inertia’s form helpers expose processing state, server errors, and successful-submission state; Laravel validation exceptions automatically populate the form’s error object.[^9]

Critical rules:

- Clear stale field errors at `START`, or clear a specific field when it changes.
- Do not treat `onFinish` as success.
- Treat `onError(errors)` as `validation_failed` only when the payload is a validation error bag.
- Treat `onNetworkError` and `onHttpException` separately from validation.
- Cancel timers in success, error, cancellation, unmount, navigation, and finalization paths.
- Preserve sensitive values only as long as needed; clear passwords on completion or page exit.
- Use an error bag per concurrent form so one form cannot display another form’s errors.

Inertia validation differs from a plain JSON API: the server redirects back with errors flashed in the session, the Laravel adapter shares them as props, and Inertia invokes `onError` when the returned page contains errors. This distinction is why a generic fetch-oriented error classifier must not be placed directly around every Inertia form.[^10]
### Standalone HTTP adapter
Use for JSON endpoints, polling, live refreshes, and external APIs. It must inspect HTTP status before parsing the success body, validate the response shape, enforce timeout and cancellation, and normalize transport errors into lifecycle events.

For a future Inertia v3 upgrade, `useHttp` supports plain requests that do not participate in page navigation and exposes request cancellation. Until then, Housing@UMU’s existing `http.ts` can provide the same contract with `AbortController`.[^11]
### Deferred and partial data
Use Inertia deferred props for expensive page data that should arrive after the initial shell. A deferred prop can be configured to rescue an exception so the rest of the response remains successful, and the client can render a scoped fallback. Use partial reloads for same-page data refreshes, remembering that Inertia merges requested props with in-memory props and that error preservation must be intentional.[^12][^13]
## Laravel outcome contract
Laravel must emit stable machine-readable reason codes while user-facing wording remains controlled by the frontend presentation catalog or localized server messages. A normalized non-Inertia JSON failure can use:

```json
{
  "ok": false,
  "reason_code": "APPLICATION_ALREADY_EXISTS",
  "message_key": "applications.already_exists",
  "correlation_id": "01J...",
  "retryable": false,
  "field_errors": {},
  "retry_after_seconds": null,
  "operation": {
    "id": "01J...",
    "status": "failed"
  }
}
```

For Inertia forms, keep Laravel’s standard redirect-and-error-bag mechanism instead of forcing JSON envelopes into the protocol. The shared contract is semantic—reason code, correlation ID, ownership, and final outcome—not necessarily identical wire formatting.
### Status interpretation
| Outcome | Inertia behavior | JSON/API behavior | UI action |
|---|---|---|---|
| Validation failure | Redirect back + scoped errors | 422 + field errors | Inline fields; focus first error |
| Unauthenticated | Login redirect where appropriate | 401 | One blocking re-auth prompt |
| Unauthorized | 403 page/response | 403 | Inline if section-scoped; blocking only if page cannot function |
| CSRF/session page expiry | Framework-specific expired-page path | 419 convention | Reload/re-auth with draft preservation where safe |
| Missing record | 404 page or scoped response | 404 | Explain removal; navigate to parent |
| Edit conflict | Redirect with conflict state | 409 | Compare/refresh; never blind overwrite |
| Semantic conflict | Validation or domain response | 422 | Explain business correction |
| Throttled | Redirect with error + retry metadata | 429 + `Retry-After` | Countdown; no auto-hammering |
| Accepted background work | Redirect with job ID | 202 + job ID | Track durable job |
| Server failure | Error response | 5xx | Preserve safe work; retry only by policy |

A Form Request’s `authorize()` and `rules()` keep authorization and validation ahead of controller mutation logic. Laravel’s rate limiter can report whether attempts are exhausted and how many seconds remain, enabling accurate 429 countdowns rather than guessed client timers.[^14][^2]
## Authentication model
Login is an `authentication`, `application`-scope, `blocking`, `single_flight`, `never-auto-retry` operation. Its lifecycle is:

```text
idle
  → validating
  → blocked                  client-invalid input
  → submitting               exactly one Inertia visit
  → validation_failed        invalid credentials or field validation
  → throttled                too many attempts; server controls retry time
  → succeeded                session regenerated; server selects role redirect
  → failed                   explicit server/transport failure
  → cancelled                navigation/unmount/user cancel
```

The frontend must not infer a role redirect from submitted credentials or cached user data. Laravel authenticates, regenerates the session, reloads the authoritative user/roles, and returns the intended role-safe redirect. Login throttling should be keyed server-side and should not be bypassed by client refreshes; Laravel’s built-in rate-limiting abstraction is cache-backed and can expose the remaining wait.[^1][^14]

One login attempt must therefore have:

- One operation ID generated before validation.
- One active Inertia visit.
- One server authentication decision.
- One session regeneration on success.
- One role-authorized redirect.
- One final React state before navigation.
- No automatic credential resubmission after timeout or network failure.

If a login response is lost after Laravel authenticates, the result is uncertain. The client should perform a safe session-status read or reload the intended page rather than resending the password automatically.
## Mutation integrity
Mutations require more than correct React state. Use:

- Database transactions for multi-record invariants.
- Unique database constraints for facts that must never duplicate.
- Optimistic version columns or timestamps for edit conflicts.
- Idempotency records for retryable POST/PATCH operations.
- Atomic locks only for critical cross-process exclusion not already guaranteed by a database constraint.
- An outbox record for external side effects that must occur after commit.

Laravel cache atomic locks provide distributed exclusion across supported drivers. Laravel queue jobs can be made unique through lock-backed `ShouldBeUnique`, can retry failed attempts, and are recorded in `failed_jobs` after exhausting attempts.[^15][^16]

An idempotency table should minimally contain `(actor_id, operation_name, idempotency_key)` as a unique key, a request fingerprint, status, resource/result reference, response metadata, and expiry. Reusing the same key with a different payload must fail; reusing it with the same payload returns the stored outcome. The same key is retained for retries of one logical operation and replaced only when the user starts a genuinely new operation.[^3]
## Long-running work
An HTTP request should not remain the only proof that an export, import, bulk allocation, report, or external integration is running. Laravel should create a durable `operations` row and return 202 with a job ID. React then tracks the job independently.

```text
submit → accepted(jobId) → tracking
                         ├→ succeeded(resultLink)
                         ├→ failed(actionable reason)
                         └→ cancelled(if supported)
```

Queue workers require bounded attempts, backoff, failure hooks, and an operator-visible failed-job workflow. Laravel stores jobs that exhaust retries in `failed_jobs` and provides commands to list and retry them. The UI should never display success merely because dispatch succeeded; dispatch means `accepted`, while only the job’s durable terminal record means `succeeded`.[^15]
## UI projection rules
The request state is domain-neutral; the UI is a deterministic projection of that state plus the operation profile.

| State | Default presentation |
|---|---|
| `validating` | Usually no loader |
| `submitting` under 1 second | Disabled control; no flashing spinner |
| `submitting` 1–5 seconds | Inline spinner in originating control |
| `submitting` 5–10 seconds | Spinner plus truthful status text |
| `progressing` | Progress bar with measured bytes/items |
| `tracking` | Step/progress panel that survives navigation |
| `refreshing` | Preserve stale content; subtle refresh indicator |
| `empty` | Explanation + flow-specific next action |
| `validation_failed` | Inline errors near fields + summary/focus when needed |
| `forbidden` | Inline for section; page panel for page-wide denial |
| `auth_required` | One coordinated re-authentication modal/redirect |
| `reconciling` | “Checking whether it completed”; disable duplicate action |
| `succeeded` | Persistent visible effect, inline confirmation, toast, or completion page according to impact |
| `unknown_failure` | Safe message + retry/reload/support action + correlation code |

A modal is determined by operation criticality and scope, not by status code alone. A 403 for one recommendation widget is inline; a 403 for an entire protected page is page-level; a lost session can produce one application-level re-authentication prompt. The modal coordinator remains a singleton so independently failing components cannot stack blocking dialogs.
## Error classification
`classifyError.ts` should classify a normalized `FailureDescriptor`, not arbitrary thrown values directly:

```ts
interface FailureDescriptor {
  source: 'inertia' | 'http' | 'network' | 'client' | 'job' | 'stream';
  status?: number;
  reasonCode?: string;
  validationErrors?: FieldErrors;
  retryAfterSeconds?: number;
  operationCommitted?: boolean | 'unknown';
  correlationId: string;
}
```

Classification uses this priority:

1. Explicit trusted server `reasonCode`.
2. Validation error bag.
3. Authentication/session outcome.
4. Authorization.
5. Conflict/idempotency state.
6. Throttling and retry metadata.
7. Network/offline/timeout.
8. HTTP status family.
9. Response-shape failure.
10. `unknown_failure` fallback.

The browser receives only safe user messages and correlation codes. OWASP advises logging authentication failures, authorization violations, and audit-relevant actions while preventing sensitive values and technical secrets from entering logs. Logging failure must not prevent the application from running or cause information leakage.[^5][^17]
## Timers and stale responses
Every operation owns a timer registry. Timers are cancelled on success, error, cancellation, unmount, replacement by a newer operation, and navigation. A timer callback must re-check operation identity before dispatching.

```ts
if (!registry.isCurrent(identity)) return;
dispatch({ type: 'WATCHDOG_EXPIRED', identity });
```

A watchdog never declares server failure by itself. For reads it may offer retry. For mutations it sets `reconciling` because a timeout does not prove that the server did not commit the action. Automatic retry is permitted only where the profile and server idempotency contract allow it.
## Retry policy
| Failure | Read | Auth | Mutation without key | Mutation with key | Job tracking |
|---|---|---|---|---|---|
| Offline | Retry when online | User retry | Reconcile first | Retry same key | Resume tracking |
| Timeout | Bounded retry | Check session; user retry | Reconcile first | Retry same key | Retry poll |
| 408/502/503/504 | Bounded backoff | User retry | Reconcile first | Policy retry | Bounded retry |
| 409 | Refresh/resolve | Not applicable | User resolves | Inspect stored operation | Continue state query |
| 419 | Reload token/page | Reload login | Preserve safe draft, reload | Preserve key, reload | Re-auth then resume |
| 422 | No transport retry | Correct input | Correct input | Correct input | Display job failure |
| 429 | Respect retry time | No auto retry | No auto retry | No auto retry | Slow polling |
| 401/403 | Re-auth/stop | Server flow | Re-auth/stop | Re-auth/stop | Pause and re-auth |

Laravel’s outbound HTTP client supports explicit connect timeouts, total attempt timeouts, and selective retry callbacks. Use those controls for third-party services, but never retry a side-effecting external request merely because the local client timed out; the provider may already have completed it.[^18]
## Redundancy strategies
Redundancy should exist at multiple levels because no state model eliminates browser crashes, network partitions, database contention, deployment errors, or operator mistakes.
### Frontend redundancy
- **Hard-reload escape hatch:** every blocking error offers reload or safe navigation; no modal may trap the user.
- **Server-derived reconstruction:** reloading reconstructs durable truth from Laravel rather than trusting old React state.
- **Draft recovery:** save non-sensitive form drafts locally with schema version and expiry; never persist passwords, reset tokens, payment details, or session identifiers.
- **Stale read cache:** show a timestamped last-known snapshot for non-security-sensitive reads while refresh occurs.
- **Global error boundary:** preserve shell navigation and show a recovery panel when rendering itself fails.
- **Feature flag kill switch:** disable a broken optimistic path, background refresh, or new coordinator without redeploying the entire app.
- **Traditional form fallback:** critical login/recovery flows remain valid server routes and can be submitted as ordinary HTML forms if enhanced JavaScript fails.
### Server redundancy
- **Transactions and constraints:** make invalid duplicate states impossible even if frontend locks fail.
- **Idempotency store:** deduplicate retryable mutations across tabs, refreshes, and network retries.
- **Atomic lock/session blocking:** serialize narrowly selected critical operations.[^16][^8]
- **Outbox pattern:** commit the business record and an outgoing event in the same transaction; a worker delivers the side effect later.
- **Queue retries and dead-letter handling:** use bounded backoff, `failed_jobs`, alerting, and admin replay.[^15]
- **Operation status endpoint:** reconcile uncertain outcomes by operation ID instead of asking users to submit again.
- **Read fallback:** serve a marked stale cache or reduced dataset when non-critical dependencies fail.
- **Circuit breaker:** stop repeatedly calling an unhealthy third party; return a specific degraded response and retry later.
### Operational redundancy
- **Structured correlation:** frontend operation ID, Laravel request ID, queue job ID, and external provider ID are linked.
- **Independent health checks:** check web, database, cache/session, queue, storage, and external integrations separately.
- **Alerting on terminal patterns:** spikes in unknown failures, 401s, 419s, 429s, modal downgrades, late responses, and reconciliation timeouts trigger alerts.
- **Admin recovery console:** inspect an operation, retry a failed job, invalidate a stale lock, resend a notification, or mark manual resolution with an audit entry.
- **Backups and restore drills:** database and object-storage backups are tested through restoration, not merely configured.
- **Rollback and canary deployment:** retain the ability to roll back frontend assets, PHP deployment, and migrations safely.

OWASP requires that security-relevant transactions have audit trails with integrity protection and that sensitive logging does not leak to users. Session lifecycle monitoring should record creation, renewal, destruction, timeout, and authentication outcomes without storing raw session IDs; a salted session reference may be used for correlation.[^19][^20]
## Failure of the model
The coordinator itself may fail. The system must define what happens then:

1. If the reducer throws, the nearest error boundary logs a sanitized `STATE_COORDINATOR_FAILURE` and shows reload/navigation actions.
2. If logging fails, the operation continues; logging is never on the critical path.[^5]
3. If client identity headers are missing, Laravel generates a correlation ID; critical idempotent endpoints reject missing idempotency keys rather than guessing.
4. If Redis/cache is unavailable, operations protected only by cache locks fail closed or fall back to database uniqueness/locking according to endpoint policy.
5. If queue infrastructure is down, durable job creation must not claim acceptance unless the operation record can be safely dispatched later.
6. If the session store fails, Laravel returns a safe service/session error; React must not mislabel it as invalid credentials.
7. If an unknown server response arrives, the UI enters `unknown_failure`, exposes a support code, and preserves recoverable input.
8. If reconciliation cannot determine whether a critical mutation committed, the UI instructs the user not to repeat it and escalates to support/admin using the operation ID.
## Test model
The rollout is incomplete until transitions and invariants are automated.
### Frontend unit tests
- Every event/state pair returns a valid state.
- Late operation IDs and old generations cannot mutate state.
- `onFinish` cannot overwrite a terminal outcome.
- Starting a new attempt clears owned validation errors and timers.
- Unmount and navigation cancel timers and transports.
- Only one blocking modal can exist.
- Retry preserves the operation ID and idempotency key but changes attempt ID.
### Laravel feature tests
- Success, validation failure, unauthenticated, forbidden, CSRF expiry, throttled, conflict, missing record, and server failure.
- Correct role redirect after login.
- Session ID regeneration after authentication.
- Two simultaneous submissions create one durable resource.
- Same idempotency key and same body return the original outcome.
- Same idempotency key and different body fail safely.
- Transaction rollback leaves no partial records.
- Authorization is enforced server-side even when client controls are bypassed.
### Integration and browser tests
- Delay the first response, submit a second request, then release the first; the first must be ignored.
- Drop the response after the server commits; reconciliation must find success without duplication.
- Navigate away during submission; no later callback modifies the abandoned page.
- Expire the session between page render and submit.
- Simulate offline, reconnect, 429 with retry time, 503, malformed response, and queue failure.
- Open two tabs and submit the same high-impact action.
- Disable JavaScript and verify critical server-rendered form fallback where required.
## Migration plan
### Phase 1: establish contracts
- Add `RequestProfile`, `RequestIdentity`, `OperationState`, lifecycle events, and a pure reducer.
- Add one coordinator service/hook that owns timers, cancellation, latest-response acceptance, and structured logs.
- Refactor `classifyError.ts` to accept normalized failures.
- Keep existing state components as renderers.
### Phase 2: fix authentication first
- Replace ad-hoc Promise wrappers around Inertia form calls with an Inertia lifecycle adapter.
- Ensure login is single-flight and never automatically resubmits credentials.
- Clear stale errors at start and field change.
- Handle validation, network, HTTP exception, cancel, success, and finish separately.
- Verify Laravel authentication, session regeneration, throttling, and role redirects.
### Phase 3: migrate reads
- Convert dashboard sections to `read` profiles with latest-wins behavior, abort support, stale-response suppression, and optional cached data.
- Prefer deferred props with rescue or partial reloads where that better matches Inertia’s protocol.[^12][^13]
### Phase 4: protect mutations
- Add transactions, constraints, conflict/version checks, idempotency records, and operation status endpoints.
- Migrate applications, allocations, maintenance requests, profile edits, and admin changes one flow at a time.
### Phase 5: durable long work
- Move exports, bulk operations, notifications, and external calls to durable operations and queues.
- Add tracking UI, failed-job alerts, and admin replay.
### Phase 6: resilience verification
- Add fault-injection tests, dashboards, alert thresholds, restore drills, feature flags, and rollback procedures.
- Make the lifecycle contract a required code-review checklist for every new request type.
## Required invariants
The implementation is accepted only if these statements remain true:

1. One user intent creates one operation ID.
2. One operation has at most one active authoritative attempt unless its profile explicitly allows parallelism.
3. Every state transition is produced by the reducer, not scattered `setState` calls.
4. A late or cancelled response cannot update visible state.
5. Every timer and transport handle has deterministic cleanup.
6. `finish` means cleanup, never success.
7. Laravel remains authoritative for authentication, authorization, validation, throttling, redirects, and durable writes.
8. Non-idempotent mutations are never automatically retried without an enforced idempotency contract.
9. A timeout after sending a mutation is treated as an uncertain outcome until reconciled.
10. Every terminal outcome is visible and actionable.
11. Unknown outcomes fail safely with a correlation code.
12. Logs connect browser, Laravel, queue, and external events without containing secrets.
13. Failure of logging never becomes failure of the user operation.
14. Reloading reconstructs durable truth.
15. Database constraints and transactions preserve correctness even if every frontend safeguard fails.
## Final implementation rule
`useAsyncSection` remains appropriate for disposable independent reads, but it is only one adapter within the larger model. Authentication forms use an Inertia form adapter; critical mutations use a mutation adapter with idempotency and reconciliation; uploads use progress-aware transfer state; long jobs use durable acceptance and tracking; streams use connection and cursor state.

This separates universal mechanics—identity, lifecycle, stale-response suppression, cleanup, correlation, and safe fallback—from request-specific policy. Housing@UMU can then add future request types without forcing every operation into the behavior of a dashboard widget.

---

## References

1. [Authentication | Laravel 12.x - The clean stack for Artisans and agents](https://laravel.com/framework/docs/12.x/authentication) - If authentication is successful, you should regenerate the user's session to prevent session fixatio...

2. [Validation | Laravel 12.x - The clean stack for Artisans and agents](https://laravel.com/framework/docs/12.x/validation) - Form requests are custom request classes that encapsulate their own validation and authorization log...

3. [Idempotency-Key header - HTTP - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Idempotency-Key) - The HTTP Idempotency-Key header allows a client to make POST and PATCH requests idempotent by giving...

4. [RFC 7231: Hypertext Transfer Protocol (HTTP/1.1): Semantics and ...](https://www.rfc-editor.org/info/rfc7231/) - The Hypertext Transfer Protocol (HTTP) is a stateless \%application- level protocol for distributed,...

5. [Logging - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) - Logs may contain personal and other sensitive information, or the data may contain information regar...

6. [AbortController - Web APIs | MDN - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) - The AbortController interface represents a controller object that allows you to abort one or more We...

7. [Manual Visits - Inertia.js Documentation](https://inertiajs.com/docs/v3/the-basics/manual-visits) - You may cancel all in-flight visits using the router.cancelAll() method. By default, this cancels al...

8. [HTTP Session | Laravel 13.x - The clean stack for Artisans and agents](https://laravel.com/framework/docs/session) - To utilize session blocking, your application must be using a cache driver that supports atomic lock...

9. [Forms - Inertia.js Documentation](https://inertiajs.com/docs/v3/the-basics/forms) - Inertia provides two primary ways to build forms: the <Form> component and the useForm helper. The <...

10. [Validation - Inertia.js Documentation](https://inertiajs.com/docs/v3/the-basics/validation) - Handling server-side validation errors in Inertia works differently than a classic XHR-driven form t...

11. [HTTP Requests - Inertia.js Documentation](https://inertiajs.com/docs/v3/the-basics/http-requests) - You may cancel an in-progress request using the cancel() method. Event Callbacks Each submit method ...

12. [Partial Reloads - Inertia.js Documentation](https://inertiajs.com/docs/v3/data-props/partial-reloads) - Partial reloads only work for visits made to the same page component. To perform a partial reload, u...

13. [Deferred Props - Inertia.js Documentation](https://inertiajs.com/docs/v3/data-props/deferred-props) - Inertia’s deferred props feature allows you to defer the loading of certain page data until after th...

14. [Rate Limiting | Laravel 12.x - The clean stack for Artisans and agents](https://laravel.com/framework/docs/12.x/rate-limiting) - Laravel includes a simple to use rate limiting abstraction which, in conjunction with your applicati...

15. [Queues | Laravel 12.x - The clean stack for Artisans and agents](https://laravel.com/framework/docs/12.x/queues) - The queue:failed command will list the job ID, connection, queue, failure time, and other informatio...

16. [Cache | Laravel 12.x - The clean stack for Artisans and agents](https://laravel.com/framework/docs/12.x/cache) - Atomic locks allow for the manipulation of distributed locks without worrying about race conditions....

17. [Secure Code Review - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html) - Error handling verification ... Logging security: Sensitive data not logged, proper log protection (...

18. [HTTP Client | Laravel 12.x - The clean stack for Artisans and ...](https://laravel.com/framework/docs/12.x/http-client) - If you would like the HTTP client to automatically retry the request if a client or server error occ...

19. [Session Management - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) - Sensitive data like the session ID should not be included in the logs in order to protect the sessio...

20. [A09 Security Logging and Alerting Failures - OWASP Top 10:2025](https://owasp.org/Top10/2025/A09_2025-Security_Logging_and_Alerting_Failures/) - You are vulnerable to sensitive information leakage by making logging and alerting events visible to...

