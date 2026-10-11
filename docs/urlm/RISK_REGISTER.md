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
