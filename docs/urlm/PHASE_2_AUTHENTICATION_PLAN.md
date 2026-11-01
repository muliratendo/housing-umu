# Phase 2 Authentication Slice Plan

## Status and boundary

**Planning baseline:** `2d73b219770f602822d9b112ebff5e51273ce049`  
**Parent baseline before the evidence-closure changes:** `7565a0c0b9f7ee41c91bfbabcd5e6eda13aeae6e`  
**Regression-test and PRD/status reconciliation commit:** `2d73b21`  
**Planning date:** 2026-11-01

Phase 1 framework-neutral URLM core is accepted within its agreed bounded
scope. Repository-wide verification remains blocked by the unrelated
`FooterLinks.patch.tsx` TypeScript error and the unavailable MySQL hostname.
Phase 2 implementation is pending explicit approval. Production mutation
readiness has not been established.

This document is a reviewable implementation plan plus the isolated Phase 2A
contract-test record. No runtime consumer, Laravel behavior, environment
configuration, migration, account, dependency, commit, or push is part of
this pass.

## Evidence reconciliation

The current snapshot is `2d73b219770f602822d9b112ebff5e51273ce049`, whose
parent is `7565a0c0b9f7ee41c91bfbabcd5e6eda13aeae6e`. The three evidence-gap
tests and the related status/PRD reconciliation were committed in `2d73b21`.
The earlier report measured the parent baseline plus those changes; it was not
a measurement of a different URLM implementation.

Current native-toolchain results at this snapshot:

| Command | Exit code | Result |
|---|---:|---|
| `npm test -- --run` | 0 | 3 files, 49 passed, 0 failed, 0 skipped, 0 todo |
| `npm run typecheck:urlm` | 0 | URLM TypeScript check passed |
| `npm run build` | 0 | Vite production build passed |

The framework-neutral decision remains **ACCEPTED within agreed scope**.
Repository-wide verification remains **BLOCKED**, and Phase 2 remains
**PENDING IMPLEMENTATION AUTHORIZATION**. These decisions do not establish
credential transmission behavior, Laravel adapter behavior, server-side
idempotency, durable reconciliation, or production cancellation.

## Current authentication flow

1. `GET /login` is defined in `routes/auth.php` under
   `redirect.authenticated`. `AuthenticatedSessionController::create()` also
   checks the session and renders `Auth/Login` through Inertia for guests.
2. `resources/js/Pages/Auth/Login.tsx` uses Inertia React `useForm` with
   `email`, `password`, and `remember`. `useFormGuard` performs client-side
   shape checks. `useSilentFailureGuard` wraps the submission in a promise.
3. Submit calls `post(route('login'))`. The current callbacks resolve on
   `onSuccess`, reject a generic `{ status: 422 }` on `onError`, and reset the
   password in `onFinish`. It does not currently bind URLM identity to an
   Inertia visit, retain an `onCancelToken`, or classify cancellation and
   unknown outcomes through URLM.
4. `POST /login` is handled by `LoginRequest`. Laravel validates required
   email/password fields, applies a five-attempt `RateLimiter` keyed by
   normalized email and IP, emits `Lockout`, calls `Auth::attempt`, and
   returns field validation errors for rejected credentials or throttling.
5. `AuthenticatedSessionController::store()` calls `authenticate()`,
   regenerates the session, obtains the authenticated user, and calls
   `redirectByRole()`. Recognized administrative roles redirect to
   `admin.dashboard`; `student` redirects to `student.dashboard`; all other
   roles use the `welcome` fallback.
6. Inertia follows the server redirect and updates the page. Protected
   student routes use `auth`, `verified`, and role middleware. The server,
   not React state, remains authoritative for authentication and role access.
7. `HandleInertiaRequests` shares the authenticated user, roles, permissions,
   and flash authentication notices. `RedirectAuthenticatedFromAuthPages`
   handles already-authenticated visits and separately routes unverified
   users to email verification.

The existing code has two policy details to resolve before implementation:
the controller recognizes `affiliated_hostel_admin` while the
already-authenticated middleware recognizes `affiliated_admin`, and the
unverified-user login outcome needs an explicit feature assertion. These are
planning findings, not authorization to change production behavior.

## Smallest authorized implementation slice

### Proposed files

- Add a framework adapter under `resources/js/lib/urlm/adapters/` with an
  Inertia-specific transport boundary.
- Add the login integration at the existing `Auth/Login.tsx` boundary,
  retaining Laravel `useForm` field/error behavior where it is authoritative.
- Add pure adapter tests under `resources/js/lib/urlm/`.
- Add focused React integration tests for login state and disposal.
- Add Laravel feature assertions only for existing authentication behavior.
- Add safe, redacted diagnostics using existing failure-descriptor rules.
- Do not change routes, controllers, requests, middleware, models, migrations,
  authentication policy, or server idempotency in this slice.

### Adapter contract

The adapter should accept a URLM operation and a single Inertia visit
factory, and emit only URLM-compatible events. The coordinator owns logical
operation identity, attempt identity, generation, policy, claim, observer
continuity, and terminal classification. The adapter owns only visit wiring,
callback normalization, cancellation-token capture, and disposal.

The adapter must reference the existing `profiles.authentication` unchanged:
`kind: authentication`, `retry: never`, `repeatSafety: never`,
`concurrency: single_flight`, and `retryBudget: 0`. `repeatSafety: never` is
the profile's deliberate contract; the adapter must not introduce a
different repeat-safety value. A user retry cannot retransmit credentials
automatically. A client idempotency key does not provide server-side
idempotency and is not a reason to retry a login mutation.

### Installed callback mapping

The installed packages declare `@inertiajs/react` 2.3.26 and
`inertiajs/inertia-laravel` 2.0.24. The installed core types expose the
following visit callbacks:

| Inertia callback | Adapter event/decision |
|---|---|
| `onStart` | begin/submit only if the operation is still the active attempt |
| `onProgress` | optional progress observation; never a terminal outcome |
| `onSuccess(page)` | classify only after the accepted Inertia success page/redirect is observed |
| `onError(errors)` | classify validation/throttle/server-provided form errors |
| `onCancel` | classify explicit client cancellation exactly once |
| `onCancelToken(token)` | retain the visit cancellation authority for exact-owner cancel |
| `onFinish` | cleanup/finalization only; never infer success or failure |

This mapping is based on the installed declarations and source for Inertia
core 2.3.26. The Laravel adapter is 2.0.24. The corresponding official
documentation must be pinned to the Inertia 2.x tagged documentation/source
when implementation begins; current unversioned pages may describe 3.x and
are not evidence for this contract. The installed source establishes:

The version-specific official tagged sources reviewed are:

- [`request.ts` for Inertia core v2.3.26](https://raw.githubusercontent.com/inertiajs/inertia/v2.3.26/packages/core/src/request.ts)
- [`response.ts` for Inertia core v2.3.26](https://raw.githubusercontent.com/inertiajs/inertia/v2.3.26/packages/core/src/response.ts)
- [`types.ts` for Inertia core v2.3.26](https://raw.githubusercontent.com/inertiajs/inertia/v2.3.26/packages/core/src/types.ts)

- `onStart` runs before the Axios request is sent.
- `onCancelToken` receives an `AbortController`-backed cancel function.
- An Inertia response is page-processed first; validation errors then call
  `onError`, otherwise page replacement is completed before `onSuccess`.
- A client cancellation calls `onCancel`, then `onFinish`; the request's
  `onFinish` is skipped again in the finalizer because it was already marked
  cancelled.
- A non-Inertia response raises the global cancelable `invalid` event. It does
  not call the per-visit `onError`.
- A network or other Axios exception raises the global cancelable `exception`
  event. It does not call the per-visit `onError`; it is then rejected unless
  a global listener handles it. `onFinish` still runs for a non-cancelled
  request.
- `onFinish` is cleanup notification, not a success signal. The adapter must
  classify an outcome before it, or retain an unknown outcome.

The adapter must not infer semantics from another Inertia version, from
`onFinish`, or from a client cancellation. Global `invalid` and `exception`
listeners, if used, must be installed for the login adapter instance only and
unregister in the same disposal path. In core 2.3.26 their event payloads
contain a response or exception, not the originating visit identity. Therefore
the adapter must not assume that a global listener can safely attribute an
event merely because a login is pending. A visit-attribution mechanism must be
specified and tested first; otherwise exception/invalid classification remains
an explicit adapter limitation and unrelated visits must not be intercepted.

### Required behavior

- **Identity:** one login submit owns one logical operation and one active
  attempt; duplicate submits join or are rejected by single-flight.
- **Validation:** clear only the edited field's client/server error; preserve
  server throttle messaging until a new authoritative response.
- **Stale callbacks:** every callback carries the captured attempt/generation
  and is ignored if it no longer owns the active channel.
- **Cancellation:** unmount/dispose invokes the retained cancellation token
  at most once. This cancels the client visit only; it does not promise server
  rollback.
- **Finalization:** `onFinish` releases timers/listeners and closes the
  transport record without inventing success, failure, or authentication.
- **Session expiry/CSRF:** classify a non-Inertia or redirect-to-login result
  as an explicit session/CSRF outcome only when the response evidence supports
  it; otherwise retain an unknown outcome and offer safe recovery.
- **Unexpected responses:** do not parse arbitrary HTML or expose raw response
  bodies. Record only normalized, redacted descriptors.
- **Unknown login outcome:** do not resubmit credentials. Offer a safe
  navigation/session-state check using a GET or server-rendered state; require
  an explicit fresh user action before another credential submission.
- **Credential handling:** password is cleared after the visit lifecycle,
  never put into operation descriptors, logs, diagnostics, retry state, or
  URLM snapshots.
- **Unmount:** dispose observers and timers, reject late callbacks by identity,
  and preserve server authority if the request may already have reached it.

`onError` must not be used as a catch-all transport callback. Likewise,
`onFinish` must not resolve the current login operation as success. The
adapter must distinguish cancellation from network interruption and must not
claim that aborting the browser request prevented backend authentication.

## Complete event and outcome contract

The following table is the planned mapping. “Ownership” means the callback
must match the active logical operation, attempt identity, generation,
correlation, and retained transport authority before publishing an event.

| Path | Framework event/callback and evidence | Ownership check | Adapter classification | Actual URLM event/state | Cleanup owner | Visible feedback and recovery |
|---|---|---|---|---|---|---|
| Valid input/start | `onBefore` permits visit; `onStart` fires before Axios | Active attempt and exact transport channel | Started | `CLIENT_VALID` / `submitting` after coordinator `START` / `validating` | Coordinator/timer registry | Pending sign-in; no recovery yet |
| Client-invalid input | Existing `useFormGuard` rejects before `post` | No operation exists | Client invalid | `CLIENT_INVALID` / `blocked` if an operation is created | Form validation owner | Inline field messages; user edits fields |
| Laravel validation failure | Inertia page has shared `errors`; core calls `onError(errors)` after page processing | Active attempt only; preserve field-scoped errors | Server validation | `SERVER_VALIDATION` / `validation_failed` | Coordinator/timer registry | Show scoped errors; no automatic retry |
| Rejected credentials | `LoginRequest::authenticate()` returns `auth.failed` through Inertia errors | Same as validation failure | Credential rejection, represented as server validation until a structured server code exists | `SERVER_VALIDATION` / `validation_failed` | Coordinator/timer registry | Generic credential message; fresh explicit submit |
| Throttle validation response | `LoginRequest::ensureIsNotRateLimited()` returns authoritative message and seconds/minutes | Same; no text heuristic is sufficient | Throttle only when structured authoritative metadata is supplied | `RATE_LIMIT` / `throttled`; otherwise `SERVER_VALIDATION` / `validation_failed` | Coordinator/timer registry | Preserve authoritative message; no invented countdown |
| Authentication success | Inertia page is replaced, then `onSuccess(page)` fires | Active attempt and validated authenticated page facts | Authenticated success | `SUCCESS` / `succeeded` | Coordinator/timer registry | Follow server role/intended redirect |
| Verification-required navigation | Server middleware/redirect sends verification page or notice | Active attempt; classify from page component/props/redirect evidence | Verification-required | `AUTH_LOST` / `auth_required` | Coordinator/timer registry | Show verification guidance; no dashboard assumption |
| Unexpected guest redirect | Success-shaped navigation lands on login/guest page without supported auth evidence | Active attempt plus page identity; do not call it success | Guest result without supported outcome | No callback event; `coordinator.finalize()` emits `OUTCOME_REQUIRED` / `awaiting_outcome` | Coordinator/timer registry; logical claim remains bounded | Safe session check; no password retransmission |
| HTTP/server exception | Global `exception` event; per-visit `onError` is not guaranteed | No safe visit attribution is available from the event payload | Unattributable exception | No adapter event; finish calls `coordinator.finalize()` → `OUTCOME_REQUIRED` / `awaiting_outcome` | Coordinator/timer registry | Generic safe error or reconciliation guidance |
| Network interruption | Axios rejection without response; source routes through global `exception` | Same attribution limitation; cancellation distinguished first | Unattributable network interruption | No adapter event; finish calls `coordinator.finalize()` → `OUTCOME_REQUIRED` / `awaiting_outcome` | Coordinator/timer registry | Explain result is unknown; explicit safe recovery |
| CSRF/session expiry | Non-Inertia/redirect response or server evidence; not assumed from generic error | Match visit and supported response/page evidence | Session/auth loss only with supported page facts | `AUTH_LOST` / `auth_required`; otherwise `OUTCOME_REQUIRED` / `awaiting_outcome` | Coordinator/timer registry | Navigate to safe GET/login state; never resubmit automatically |
| Non-Inertia response | Global cancelable `invalid` event; source does not call `onError` | No safe visit attribution is available from the event payload | Unattributable invalid response | No adapter event; finish calls `coordinator.finalize()` → `OUTCOME_REQUIRED` / `awaiting_outcome` | Coordinator/timer registry | Safe generic message; no raw HTML/body display |
| Explicit client cancellation | `onCancel` precedes `onFinish`; cancel token is exact-owner authority | Exact channel and once-only cancellation guard | Explicit cancellation | `CANCEL` / `cancelled`; finish calls `coordinator.finalize()` | Adapter token plus coordinator/registry | Cancellation is explicit; no server rollback claim |
| Finish without classified outcome | `onFinish` denotes cleanup, not success | Exact active attempt; late finish ignored | Unclassified finish | `coordinator.finalize()` → `OUTCOME_REQUIRED` / `awaiting_outcome` | Coordinator/timer registry | Keep recovery state visible if unresolved |
| Unmount during success navigation | Page replacement can occur before `onSuccess`; component may unmount | URLM coordinator survives view detachment; callback identity still required | Success remains transport-owned | `SUCCESS` / `succeeded`; `detachView()` only removes observer | Coordinator/timer registry, not view | Show resulting server page; no second submit |
| Unmount while outcome is unknown | Component cleanup may happen after request reached server | Detach observer; do not cancel without exact user/navigation authority | Unknown outcome retained until explicit disposal/recovery | `coordinator.finalize()` → `OUTCOME_REQUIRED` / `awaiting_outcome`; later explicit `dispose()` may emit `ABANDON` / `abandoned` | Coordinator/registry | Later safe GET/session check or explicit fresh login action |

## State ownership

| State | Owner | URLM boundary |
|---|---|---|
| Draft email, password, remember flag | Inertia `useForm` | Never copy password into URLM state or diagnostics |
| Client validation | `useFormGuard` | URLM starts only after client validation passes |
| Server field errors | Inertia `useForm`/page props | Adapter maps only scoped, normalized error codes/messages |
| Pending/outcome/identity | URLM coordinator and registry | Single lifecycle truth; React derives display state |
| Transport cancellation token | Inertia adapter for the exact visit | Retained only until cleanup; cancel once |
| Timers/watchdog | URLM `TimerRegistry` under operation authority | No component-owned duplicate watchdog |
| Success navigation | Laravel redirect plus Inertia page replacement | Adapter observes/classifies; it does not redirect by role |
| Recovery state | URLM classification plus login UI | Safe GET/session reconstruction only |
| Password clearing | Login form boundary | Clear after finish/unmount; never retry from retained data |

During migration, `useForm` remains the draft, server-error, and submission
payload owner while URLM is the pending/outcome/authority owner. The two
layers must not create separate promise truths. When implementation is
authorized, remove the old `submitRequest` Promise and
`useSilentFailureGuard` wrapper from the migrated login path; wire the
`useForm` visit callbacks directly to the URLM adapter, while retaining
`useFormGuard` and scoped `clearErrors` behavior.

## Server responsibilities retained

Laravel remains responsible for request validation, throttle counters and
`Lockout`, credential authentication, session regeneration, CSRF/session
validation, verified-account policy, role authorization, intended redirects,
and response shape. The adapter must not duplicate or weaken any of these
decisions. Any role-name reconciliation must be decided and tested before
implementation.

## Test matrix

### Pure adapter tests

- callback-to-event mapping for start, progress, success, validation error,
  cancel, finish, and cancellation token;
- `onFinish` without a classified outcome remains unresolved/unknown;
- stale callbacks cannot publish after retry, replacement, disposal, or
  cancellation;
- single-flight prevents duplicate transport;
- callback exceptions do not interrupt cleanup;
- no credentials, cookies, tokens, response bodies, or personal data appear
  in descriptors or diagnostics.

### React/form integration tests

- invalid client input never submits;
- rejected credentials show scoped server error;
- valid login follows the server redirect;
- recognized role redirects preserve server authority;
- unverified-account behavior follows the explicit server feature contract;
- throttling remains visible until a new authoritative result;
- double submit is single-flight;
- late response after a newer attempt is ignored;
- unmount/disposal cancels the client visit and cleans observers;
- finish without success/error is not shown as success;
- server error and unexpected non-Inertia response are safe and redacted;
- successful response followed by lost navigation offers safe session recovery;
- no credential leakage occurs in UI state, logs, or diagnostics.

### Laravel feature tests

- invalid input and rejected credentials;
- throttle threshold and authoritative lockout response;
- valid login, session regeneration, and intended redirect;
- every recognized role redirect;
- unverified-account behavior;
- CSRF/session expiry and non-Inertia response handling;
- logout and post-authentication access.

These tests require an isolated reachable test database. Do not run
destructive feature tests until that prerequisite is established.

### Safe recovery contract

Use the existing `GET /login` route as the safe server-rendered recovery
check; do not add an endpoint in this slice. A fresh GET may establish:

- authenticated result: the server's `redirect.authenticated` middleware
  redirects by its existing role policy;
- unauthenticated result: the login page is rendered;
- verification-required result: the middleware redirects to
  `verification.notice` with its existing flash notice;
- network/unavailable result: retain `awaiting_outcome` and show unavailable
  guidance without resubmitting credentials.

The recovery action is an explicit user click or navigation, never an
automatic POST, password retransmission, blind reload loop, or silent
replacement of an unresolved login lifecycle. A new login operation is
permitted only after the old lifecycle has been classified, cancelled with
exact authority, or retained under bounded reconciliation.

Throttle timing is authoritative only when the server supplies the
`seconds`/`minutes` metadata in the validation message or a future structured
field. If timing is unavailable, show the server's safe guidance and do not
invent a countdown.

### Browser end-to-end tests

- login success and role navigation;
- validation, rejected credentials, throttle, and unverified account;
- double submit, slow/late response, navigation away, and unmount;
- session expiry/CSRF recovery;
- lost navigation after successful authentication without credential
  retransmission;
- browser-visible redaction and final navigation state.

## Environment prerequisites and blockers

The repository is configured for Sail/Docker MySQL: `.env` uses
`DB_HOST=mysql`, `compose.yaml` defines the `mysql` service, and
`phpunit.xml` overrides only the database name to isolated `testing`.
Native WSL cannot resolve the Docker service name `mysql`, which caused the
known PHP test failure. The implementation verification environment must
therefore run inside the Sail network or provide an already-approved,
reachable isolated test database. Do not change `DB_HOST`, switch to SQLite,
or run migrations against an uncertain database.

### Safe Sail/test-database procedure

Before implementation verification:

1. Confirm the repository `.env` and Compose project identify the intended
   local Sail MySQL service and that no remote or shared database is selected.
2. Start or inspect only the repository's declared Sail services; verify the
   `mysql` health check and service-network DNS from the application
   container.
3. Confirm PHPUnit sets `APP_ENV=testing`, `DB_DATABASE=testing`, and
   `DB_URL` empty, and verify the `testing` schema is created by the declared
   Sail initialization path. A database name alone is not sufficient isolation
   evidence.
4. Record the database host, schema, container/project identity, and
   migration policy before any destructive test. Obtain explicit approval
   before running migrations or tests that mutate data.
5. Run Laravel feature tests from the Sail application container, not native
   WSL, and preserve the exit code. Stop if health, schema ownership, or
   isolation cannot be proved.

CSRF and browser middleware behavior must be tested through an HTTP/browser
layer where the relevant middleware is enabled. Default Laravel feature-test
behavior must not be treated as proof of browser CSRF behavior.

The existing frontend/browser tooling includes `react-dom` 18.3.1 for the
application runtime and Vitest 4.1.0 with a Node test environment and
URLM-only inclusion. No React testing library, jsdom, happy-dom, Playwright,
or Cypress dependency is present. The smallest version-compatible proposal
for later UI/E2E work is:

- add `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` as
  dev dependencies for React/form integration tests;
- add Playwright separately only for browser E2E tests against Sail, with its
  browser binary installation and CI/runtime policy explicitly approved.

This is a proposal only. It would change `package.json` and
`package-lock.json`; no dependency was installed in this planning pass.
Node-only Vitest cannot prove DOM lifecycle, browser navigation, CSRF, or
middleware behavior without the proposed environment.

The unrelated repository TypeScript blocker remains:
`resources/js/components/Profile/FooterLinks.patch.tsx(15,1): error TS2657:
JSX expressions must have one parent element.` It is outside this slice and
must not be fixed as part of authentication work.

## Rollback and disablement

Keep the adapter behind a login-slice feature boundary so the existing
Inertia `useForm` path can be restored without changing Laravel authority.
There is one submission path at a time: rollback disables the adapter
integration, removes its subscriptions and timers, and returns to the
existing form submission path. It must not leave both paths active, start a
second login POST, or silently retransmit credentials after an unknown
outcome.
Release criteria must include a clean disposal path and no active URLM
records/listeners after disablement.

## Acceptance criteria

The slice is complete only when:

1. URLM adapter and React integration tests pass with exact callback and
   identity assertions.
2. Laravel feature tests pass in the isolated database environment.
3. Browser tests demonstrate validation, roles, throttle, unverified account,
   cancellation, stale-response rejection, and safe unknown-outcome recovery.
4. No automatic credential retry or sensitive diagnostic leakage exists.
5. Server authentication, session regeneration, CSRF, throttle, verified
   status, and role redirects remain authoritative.
6. Repository-wide TypeScript and PHP environment blockers are resolved or
   explicitly classified outside the slice.

## Excluded scope

Dashboard reads, general HTTP transport, registration, password recovery,
allocations, application mutations, durable mutation idempotency,
database-backed duplicate-mutation protection, and production mutation
readiness are later separately authorized work.

## Unresolved decisions

- Reconcile the `affiliated_hostel_admin` and `affiliated_admin` role names.
  Until resolved, the affiliated-admin redirect acceptance case is blocked;
  the adapter must not normalize or silently choose either role.
- Specify the intended unverified-account result immediately after valid
  credentials. Until resolved, the verification-required acceptance case is
  blocked; the adapter must not treat it as dashboard success.
- Verify the selected `GET /login` session reconstruction behavior after a
  lost login response.
- Decide the browser E2E runner and its service orchestration.
- Establish the approved Sail/isolated-test-database execution procedure.
- Confirm whether authentication adapter diagnostics may emit only reason
  codes or also bounded timing metadata.

**Non-runtime adapter contract tested; login integration not started.**
The adapter is not exported from runtime application entry points, and no
browser, Laravel, or end-to-end verification is claimed.
