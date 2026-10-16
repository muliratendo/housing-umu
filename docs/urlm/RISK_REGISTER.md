# URLM Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner/phase |
|---|---|---:|---:|---|---|
| R1 | A late Inertia/Axios response overwrites newer visible state. | High | High | Identity + generation checks in one reducer/coordinator; delayed-response tests. | Frontend / 1–3 |
| R2 | Duplicate application/allocation mutation after timeout. | High | Critical | Establish durable idempotency records, transactions, unique constraints, and reconciliation in Phase 4; migrate consumers in Phase 5. | Laravel / 4–5 |
| R3 | Login credentials are automatically resubmitted after a lost response. | Medium | Critical | Single-flight authentication profile; safe session check/reload only. | Auth / 2–4 |
| R4 | `onFinish` is treated as success. | Medium | High | Explicit adapter event mapping and reducer tests. | Frontend / 1–2 |
| R5 | Retry timers or logger interval survive unmount/navigation. | High | Medium | Owned timer registry and lifecycle-managed logger resources. | Frontend / 1 |
| R6 | Validation errors from one form appear in another form. | Medium | Medium | Scoped Inertia error bags and operation-owned clearing. | Auth/forms / 2–7 |
| R7 | Client logs leak exception details or secrets. | Medium | Critical | Recursive allowlist/sanitizer, metadata limits, server validation, tests. | Logging / 3–8 |
| R8 | Session-authenticated routes are moved to stateless API middleware. | Low | Critical | Preserve web routes and verify middleware; add correlation independently. | Laravel / 4 |
| R9 | Throttle countdown is invented by the browser. | Medium | High | Parse authoritative `Retry-After`/server timing; no client hammering. | Auth/HTTP / 2–4 |
| R10 | Cache-only duplicate protection fails during infrastructure outage. | Medium | Critical | Establish database uniqueness and transactional idempotency authority in Phase 4; apply it during Phase 5 migrations. | Laravel / 4–5 |
| R11 | Blocking failures stack multiple global modals. | Medium | Medium | One modal coordinator; downgrade/join scoped failures. | Frontend / 1–3 |
| R12 | Reload trusts stale React state or sensitive local drafts. | Medium | High | Server-derived reconstruction and versioned non-sensitive drafts only. | Resilience / 8 |
| R13 | Missing frontend test runner leaves reducer invariants unverified. | High | High | Add minimal repository-compatible runner during phase 1, or document blocker. | Tooling / 1 |
| R14 | Large migration changes behavior beyond the requested lifecycle contract. | High | High | Small phases, compatibility adapters, targeted tests, review gates. | All phases |
| R15 | Account deletion is misrepresented as irreversible even though it is soft deletion. | Medium | High | Treat `profile.destroy` as reversible; document `deleted_at` retention and identify any future purge separately. | Profile / 5 |
| R16 | WSL has no Linux Node executable, so frontend verification may silently invoke Windows npm/npx shims. | High | High | Require a native Linux Node installation or a confirmed Linux shell before accepting frontend baseline results. | Tooling / 1 |
| R17 | Route definitions contain duplicated URI segments or missing explicit permissions. | Medium | High | Preserve as existing findings; review routes independently before migration. | Laravel / 2–5 |
| R18 | A coordinator or late finalizer releases a newer operation record. | High | Critical | Require exact operation/attempt/generation ownership for registry release, cancellation, disposal, and completion; test stale coordinators. | Frontend / 1 |
| R19 | Concurrency policy silently collapses parallel or queued work into one slot. | High | High | Represent policy-specific registry records explicitly and test parallel siblings and FIFO promotion. | Frontend / 1 |
| R20 | Retry resubmits an authentication or non-idempotent operation under an invalid policy. | Medium | Critical | Enforce profile and retry-origin eligibility before creating a new attempt; require stable idempotency for idempotent-only work. | Frontend / 1; Laravel / 4 |
| R21 | A stale watchdog or cancellation handle acts after supersession/disposal. | High | High | Bind timers and cancellation handlers to exact identity and recheck authority immediately before invocation. | Frontend / 1 |
| R22 | A rejected foreign or stale event publishes a coordinator snapshot under another operation. | High | Critical | Use a reducer result with accepted/rejected classification and publish only after exact current ownership succeeds. | Frontend / 1 |
| R23 | Joined observers are lost during retry or miss cancellation because release precedes notification. | High | High | Store observers on logical-operation channels; abort, publish terminal cancellation, then release; test retry and all cancellation causes. | Frontend / 1 |
| R24 | Finalization invents an unknown failure or leaves transport indefinitely submitting. | High | High | Use `awaiting_outcome` and return `needs_outcome_classification`; retain exact authority until classification, then reconcile or resolve. | Frontend / 1; HTTP / 3 |
| R25 | Untrusted reason/correlation values leak secrets through failure descriptors. | Medium | Critical | Allowlist stable reason codes and validate generated correlation format; malformed values become fixed unknown descriptors. | Frontend / 1 |
| R26 | Throwing observer, cancellation, promotion, or watchdog callbacks interrupt cleanup. | Medium | High | Invoke callbacks through safe boundaries and test continued cleanup/promotion. | Frontend / 1 |
| R27 | Unknown outcomes lose cross-coordinator conflict authority after transport release. | High | Critical | Retain a separate logical claim; join single-flight callers, queue FIFO callers, and block unsafe latest-wins replacement until classification or closure. | Frontend / 1 |
| R28 | Recordless disposal leaves joined observers and logical claims unresolved. | High | High | Publish deterministic `abandoned` closure, release the claim, and avoid synthetic transport callbacks. | Frontend / 1 |
| R29 | Queue promotion occurs while the logical owner is still unresolved. | High | Critical | Make release derive promotion from explicit cleanup result; retain queued FIFO records until terminal classification or closure. | Frontend / 1 |
| R30 | Retry removes a foreign logical claim by conflict key. | High | Critical | Require exact logical claim ownership before reacquisition; return typed blocked results without consuming retry budget. | Frontend / 1 |
| R31 | Recordless cancellation silently fails after transport completion. | Medium | High | Return explicit cancellation results and distinguish backend cancellation from local abandonment. | Frontend / 1 |
