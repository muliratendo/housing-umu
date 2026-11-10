# URLM Implementation Status

## Current phase

**Phase 1 retry-authority corrective pass implemented and frontend-verified; final acceptance
blocked by the PHP baseline environment.**

Required base commit verified: `b58b4955221eae4c9f8be0a0d9a25df4c98dd1a9`.
This document records a correction pass for review; it does not grant Phase 1
acceptance.

The initial Phase 1 implementation was not treated as fully accepted. This
pass corrects repeat-safety authority, registry claim paths, concurrency,
retry, reducer, timer,
cancellation, modal, queue promotion, joined observation, reconciliation,
finalization, atomic retry replacement, diagnostics, and failure semantics.
The core remains unused by all
runtime consumers, and Phase 2 has not started.

## Workspace safety

Pre-existing changes were observed and left untouched: an `artisan` executable
bit change; deleted `public/images/hostels/*.jpg` Windows
`Zone.Identifier` sidecars with corresponding untracked colon-named sidecars;
and prior planning documents. No Laravel runtime file, route, controller, model, migration,
existing React component, hook, request utility, database file, or existing
test was changed by Phase 1.

## Native Linux Node evidence

The installation was performed from WSL for x86_64 Linux without `sudo`,
Windows Node changes, or shell startup-file changes.

| Item | Verified value |
|---|---|
| Node archive | `node-v22.23.3-linux-x64.tar.xz` |
| Installation directory | `/home/tendo_mulira/.local/opt/node-v22.23.3-linux-x64` |
| Executable links | `/home/tendo_mulira/.local/bin/node`, `npm`, `npx` |
| Expected SHA-256 | `df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de` |
| Actual SHA-256 | `df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de` |
| `node --version` | `v22.23.3` |
| `npm --version` | `10.9.9` |
| `npx --version` | `10.9.9` |
| `process.platform` | `linux` |
| `process.arch` | `x64` |
| `process.execPath` | `/home/tendo_mulira/.local/opt/node-v22.23.3-linux-x64/bin/node` |

The archive and checksum came from the official Node distribution metadata.

## Installed package evidence

| Package | Declared constraint | Installed |
|---|---|---|
| Laravel | `^13.8` | `v13.15.0` |
| Inertia Laravel | `^2.0` | `v2.0.24` |
| Inertia React | `^2.3.26` | `2.3.26` |
| React | `^18.3.1` | `18.3.1` |
| TypeScript | `^6.0.3` | `6.0.3` |
| Vite | `^8.0.0` | `8.0.16` |
| Vitest | `4.1.0` | `4.1.0` |

Vitest 4.1.0 declares Node `^20.0.0 || ^22.0.0 || >=24.0.0` and Vite
`^6.0.0 || ^7.0.0 || ^8.0.0-0`, matching the verified environment.

`node_modules` was reinstalled with native Linux `npm ci --legacy-peer-deps
--ignore-scripts` after the manifest and lockfile were updated. The lockfile
contains the exact Vitest dependency and its transitive packages. No jsdom,
React Testing Library, browser runner, or coverage package was added.

## Frontend baseline and verification

Native WSL build baseline:

- `npm run build`: **passed**, Vite 8.0.16, built in 6.54 seconds before
  Phase 1 and passed again after Phase 1.
- `npx tsc --noEmit`: **failed on an unrelated pre-existing error**:
  `resources/js/components/Profile/FooterLinks.patch.tsx(15,1): error TS2657:
  JSX expressions must have one parent element.`
- `npm test -- --run`: **passed**, 3 test files and 42 tests.
- Latest retry-authority pass: **passed**, 3 test files and 42 tests.
- Focused URLM TypeScript check with the repository baseline error excluded:
  **passed**.
- `npm run typecheck:urlm`: **passed**.
- `git diff --check`: passed.

The TypeScript failure does not reference URLM files. It was not fixed because
the task prohibits unrelated application changes.

## Phase 1 files

Created:

- `resources/js/lib/urlm/core/contracts.ts`
- `resources/js/lib/urlm/core/events.ts`
- `resources/js/lib/urlm/core/reducer.ts`
- `resources/js/lib/urlm/core/identity.ts`
- `resources/js/lib/urlm/core/profiles.ts`
- `resources/js/lib/urlm/core/guards.ts`
- `resources/js/lib/urlm/coordinator/OperationCoordinator.ts`
- `resources/js/lib/urlm/coordinator/OperationRegistry.ts`
- `resources/js/lib/urlm/coordinator/TimerRegistry.ts`
- `resources/js/lib/urlm/coordinator/ModalCoordinator.ts`
- `resources/js/lib/urlm/classification/failureDescriptor.ts`
- `resources/js/lib/urlm/testing/factories.ts`
- `resources/js/lib/urlm/index.ts`
- `resources/js/lib/urlm/core/reducer.test.ts`
- `resources/js/lib/urlm/coordinator/coordinators.test.ts`
  - Covers one-based queue positions and live cancellation transaction
    guarantees, including exactly-once cancellation handlers and observer
    publication.
- `resources/js/lib/urlm/classification/failureDescriptor.test.ts`
- `vitest.config.ts`
- `tsconfig.urlm.json`
- `docs/urlm/PHASE_1_DESIGN.md`

Modified:

- `package.json`
- `docs/urlm/IMPLEMENTATION_STATUS.md`
- `docs/urlm/PHASE_1_DESIGN.md`
- `docs/urlm/IMPLEMENTATION_PLAN.md`
- `docs/urlm/MIGRATION_MATRIX.md`
- `docs/urlm/RISK_REGISTER.md`
- `resources/js/lib/urlm/core/guards.ts`
- `resources/js/lib/urlm/core/contracts.ts`
- `resources/js/lib/urlm/core/identity.ts`
- `resources/js/lib/urlm/core/profiles.ts`
- `resources/js/lib/urlm/core/reducer.ts`
- `resources/js/lib/urlm/coordinator/OperationCoordinator.ts`
- `resources/js/lib/urlm/coordinator/OperationRegistry.ts`
- `resources/js/lib/urlm/coordinator/coordinators.test.ts`
- `resources/js/lib/urlm/coordinator/TimerRegistry.ts`

`package-lock.json` already contained `vitest@4.1.0` from the reviewed
baseline and was not modified during this corrective pass.

No URLM import exists outside the URLM source/tests or documentation.

## PHP baseline

`php artisan test` was rerun after Phase 1 without any PHP/runtime changes.
Result: **24 feature tests failed before assertions and 1 unit test passed
(2 assertions)**. Every feature failure reports:

`SQLSTATE[HY000] [2002] php_network_getaddresses: getaddrinfo for mysql
failed` for host `mysql`, port `3306`, database `testing`.

This is an environmental blocker, not an application result. The prior
connected baseline remains recorded: 22 passed, 3 assertion-level failures,
59 assertions. Those failures were the login redirect contract, registration
authentication contract, and stale permanent-deletion expectation. None was
caused by URLM production changes.

## Acceptance gates

- [x] Pure reducer has explicit legal transitions and supported event/state
  combinations remain total.
- [x] Stale operation, attempt, and generation identities cannot change state.
- [x] FINALIZE cannot create or replace an outcome.
- [x] Retry preserves operation, correlation, and idempotency identity and
  changes the attempt identity only from an eligible state.
- [x] Latest-wins, single-flight, parallel, and FIFO queue semantics are
  explicit and tested.
- [x] Queue promotion, blocked validation recovery, reconciliation outcomes,
  joined observation, and unsubscribe behavior are explicit and tested.
- [x] Retry replacement is exact-owner and atomic, with a finite retry budget.
- [x] Exact-owner completion, cancellation, disposal, and release cannot
  affect a newer record.
- [x] Timers and watchdogs are identity-safe across coordinators and clean up
  on terminal state, cancellation, supersession, retry, and disposal.
- [x] Transport-neutral cancellation handlers run at most once.
- [x] One application-level blocking modal lease exists, with lease-safe
  reacquisition and release.
- [x] Failure descriptors use normalized discriminated inputs, validate HTTP
  status/retry metadata, bound reason codes, and classify arbitrary errors as
  unknown.
- [x] Publication requires an accepted reducer result and exact current
  ownership; rejected foreign/stale events do not notify observers.
- [x] One coordinator owns one unresolved lifecycle; parallel work requires
  separate coordinator instances.
- [x] Logical observer channels survive retry replacement, cancellation is
  notified before release, and callback exceptions are isolated.
- [x] Finalization returns `needs_outcome_classification` and uses
  `awaiting_outcome`; it does not invent an outcome.
- [x] Terminal snapshots and inactive logical channels use a bounded retention
  policy; evicting a snapshot also evicts its unsubscribed channel.
- [x] Logical channels, transport attempts, and concurrency leases are
  represented separately; terminal retryable outcomes release their lease
  while retaining bounded logical observation.
- [x] Post-finalization classification publishes through the logical channel
  after the transport lease is released, while stale attempts remain rejected.
- [x] Unresolved logical conflict claims survive transport release; single-flight
  joins, queue ordering, and safe latest-wins blocking are cross-coordinator.
- [x] Recordless unresolved disposal publishes `abandoned`, releases the claim,
  and does not invoke finished transport cancellation handlers.
- [x] Channel release, snapshot eviction, unsubscribe, and logical closure use
  one centralized reaping predicate.
- [x] Queue promotion is suppressed while an unresolved claim remains and
  occurs exactly once after terminal classification or closure.
- [x] Retry reacquisition requires exact logical claim ownership and rejects
  foreign claims without consuming retry budget.
- [x] Known retryable terminal states restart through a retained logical
  channel; missing channels do not fabricate authority.
- [x] Unknown outcomes are governed by explicit repeat safety: safe reads may
  repeat, idempotent repeats require a stable key, and authentication or
  non-idempotent mutation repeats return `reconciliation_required`.
- [x] Claim policy, lifecycle policy, and repeat-safety policy must remain
  consistent during replacement.
- [x] Cancellation returns explicit results; unknown-outcome lifecycles are
  `not_cancellable` rather than silently ignored.
- [x] Reacquisition receives an exact expected owner separately from the next
  attempt and validates logical identity plus strictly increasing generation.
- [x] Queue-owner reacquisition preserves FIFO followers and suppresses
  promotion until terminal classification or closure.
- [x] Parallel unresolved claims remain independently addressable and do not
  overwrite one another.
- [x] Parallel observers remain isolated, reverse completion preserves the
  other lifecycle, and a second active attempt for one logical operation is
  rejected.
- [x] Eighty parallel claim/retry/terminal/release cycles return records and
  claims to zero while bounded retention remains within limits.
- [x] No runtime consumer was migrated during Phase 1.
- [x] Existing application behavior remains unchanged by URLM.
- [x] URLM tests, focused URLM typecheck, and production build pass; repository
  TypeScript is blocked only by
  the unrelated pre-existing JSX error.
- [ ] Unaffected PHP tests run to completion; blocked by MySQL DNS.

## Corrected phase order

1. Framework-neutral contracts, identity, reducer, registry, timers,
   cancellation, modal coordination, failure descriptor, and focused tests.
2. Minimum Inertia authentication adapter; login, registration, and recovery.
3. Standalone HTTP/read adapter and independent dashboard reads.
4. Critical mutation infrastructure: transactions, constraints, idempotency,
   reconciliation, and conflicts.
5. Remaining mutation migrations.
6. Durable jobs and long-running operations.
7. Required uploads, downloads, streams, and external effects.
8. Resilience, operations, health, alerting, rollback, and fault injection.

## Remaining blockers and risks

- Resolve the test MySQL service/DNS before final PHP acceptance.
- Resolve the pre-existing `FooterLinks.patch.tsx` JSX error before claiming a
  clean repository-wide TypeScript check.
- Existing malformed/duplicate route definitions and absent durable
  idempotency/reconciliation remain documented risks.
- `npm ci` reported 26 dependency audit findings (7 moderate, 17 high, 2
  critical); no automated audit remediation was attempted because it would be
  outside Phase 1 scope.
- The current focused tests cover the principal authority, repeat-safety,
  publication, cancellation, retry, queue, finalization, parallel-isolation,
  and secret-safety invariants, but
  Phase 1 remains pending explicit review and the blocked PHP baseline.
- Phase 2 must not begin until this review is complete.

## Complete Acceptance Matrix — Commit 5a0c8cd

**Review date:** 2026-10-20
**Reviewed commit:** `5a0c8cd4f68587d8d058426118437a93cceeb084`
**Parent:** `bbdb1cd827d75941657f4ee3d3a3374729b102bd`

The required commit was verified before this rerun. Pre-existing worktree
changes were preserved: modified `artisan`; twelve deleted
`public/images/hostels/hostel-*.jpg:Zone.Identifier` files; and twelve
untracked `public/images/hostels/hostel-*.jpg:Zone.Identifier` files.

### Framework-neutral command matrix

| Command | Exit code | Result | Exact summary |
|---|---:|---|---|
| `npm test -- --run` | 0 | PASS | 3 files passed; 46 tests passed; 0 failed, 0 skipped, 0 todo; duration 2.99s |
| `npm run typecheck:urlm` | 0 | PASS | `tsc -p tsconfig.urlm.json --noEmit` completed successfully |
| `npm run build` | 0 | PASS | Vite production build completed successfully |
| `git diff --check` | 0 | PASS | No whitespace errors |

The URLM tests passed were:

- `resources/js/lib/urlm/classification/failureDescriptor.test.ts` — 2 tests
- `resources/js/lib/urlm/core/reducer.test.ts` — 6 tests
- `resources/js/lib/urlm/coordinator/coordinators.test.ts` — 38 tests

### Framework-neutral evidence matrix

The matrix below counts only invariants for which implementation behavior and
an effective test assertion together provide evidence. Documentation claims
are not treated as proof.

| Invariant group | Evidence result | Effective implementation/test evidence | Reason or limitation |
|---|---|---|---|
| Exact identity comparison includes operation, attempt, correlation, generation, and idempotency presence/value | PASS | `core/identity.ts`; reducer stale-event tests; coordinator identity tests | `identityKey` uses `null` for absent idempotency keys |
| Logical identity excludes attempt and generation | PASS | `core/identity.ts`; retry and claim tests | `logicalIdentityKey` retains operation, correlation, and idempotency only |
| Stale and foreign events cannot mutate or publish state | PASS | `core/reducer.ts`; stale-event and foreign-publication tests | — |
| Invalid transitions and terminal outcomes preserve state | PASS | `core/reducer.ts`; reducer transition tests | — |
| Finalization does not invent an outcome; reconciliation has explicit outcomes | PASS | coordinator finalization tests; reducer reconciliation tests | — |
| One coordinator owns at most one unresolved logical lifecycle | PASS | `OperationCoordinator.start`; owner and disposal tests | — |
| One logical operation cannot own two active attempts | PASS | registry active-attempt guard; duplicate-attempt test | — |
| Joined callers and observers remain continuous through retry/classification | PASS | joined observer and classification tests | — |
| Unsubscribe and callback isolation work | PASS | observer cleanup and callback-failure tests | — |
| Queue promotion is observable exactly once and remains FIFO across owner retry | PASS | queue promotion tests; two-follower reacquisition test | The two-follower test verifies ordered state promotion |
| Failed replacement is atomic across stale identity, invalid generation, policy mismatch, owner, observers, and two followers | NOT DEMONSTRATED | Partial registry policy/missing-authority coverage | The complete required two-follower stale/invalid-generation/policy matrix is absent |
| Single-flight, latest-wins unknown-side-effect blocking, and parallel isolation | PASS | registry/coordinator concurrency tests | — |
| Known retryable failures differ from unknown outcomes | PASS | `core/guards.ts`; retry and finalization tests | — |
| Safe reads, keyed idempotent retries, and repeat-safety policy enforcement | PASS | retry-policy and repeat-safety tests | No transport adapter is present |
| Non-idempotent uncertain mutations require reconciliation | PASS | uncertain mutation test | A client key is not server idempotency enforcement |
| Authentication, user-origin, and automatic retry policy cannot bypass repeat safety | PASS | authentication and retry-origin tests | This does not prove credential transmission behavior |
| Rejected retries do not consume retry budget | NOT DEMONSTRATED | One blocked-budget regression test | Repeated blocked and invalid replacement attempts are not fully asserted |
| Retry preserves logical identifiers and changes attempt/generation | PASS | identity retry tests | — |
| Finite retry-budget exhaustion returns `budget_exhausted` without mutation | NOT DEMONSTRATED | No exhaustion test exists | No test proves unchanged channel, observers, claims, queue, and identity at exhaustion |
| Timer ownership, cancellation exactly-once behavior, and cleanup callback isolation | PASS | timer, cancellation, and callback-failure tests | — |
| Terminal records/claims release and bounded retention | PASS | registry release and retention tests | Retention is bounded at 64 terminal snapshots/channels |
| Failure descriptors normalize malformed input without leaking secrets or raw data | PASS | `classification/failureDescriptor.test.ts` | No transport boundary is implemented |

**Evidence totals:** PASS 36; FAIL 0; NOT DEMONSTRATED 3.

Evidence limitations are intentional for Phase 1. The URLM core does not prove
actual authentication credential transmission, Laravel/Inertia adapter
behavior, server-side idempotency enforcement, database-backed duplicate
mutation protection, production transport cancellation, or end-to-end
reconciliation. Those require later integration phases.

### Decision A — Phase 1 core

**NOT ACCEPTED — EVIDENCE INCOMPLETE**

The implemented URLM core has no demonstrated failing invariant in this
matrix, but the three missing acceptance tests above prevent an `ACCEPTED`
decision under the required rule that every framework-neutral invariant must
pass.

### Repository-wide verification matrix

| Command | Exit code | Result | Exact summary |
|---|---:|---|---|
| `npm run typecheck` | 2 | BLOCKED | `resources/js/components/Profile/FooterLinks.patch.tsx(15,1): error TS2657: JSX expressions must have one parent element.` |
| `php artisan route:list --except-vendor --json > /tmp/housing-umu-routes.json` | 0 | PASS | Route listing generated successfully |
| `python3 -c 'import json; ...'` | 0 | PASS | `route_count=129` |
| `php artisan test` | 2 | BLOCKED | MySQL DNS/database initialization failure for host `mysql` |

The exact PHP blocker was:

```text
SQLSTATE[HY000] [2002] php_network_getaddresses: getaddrinfo for mysql:
Temporary failure in name resolution
(Connection: mysql, Host: mysql, Port: 3306, Database: testing)
```

The runtime URLM import search, excluding URLM source/tests and documentation,
returned no application-page, layout, hook, Laravel, or existing-request
utility imports. Configuration references such as `tsconfig.urlm.json`,
`vitest.config.ts`, and `package.json` are not runtime consumers.

### Decision B — Repository-wide verification

**BLOCKED**

Repository-wide verification cannot be marked passed while the unrelated
`FooterLinks.patch.tsx` TypeScript error and the MySQL `mysql` DNS/database
initialization failure remain unresolved.

### Decision C — Phase 2 production readiness

**PENDING — NOT AUTHORIZED**

Phase 2 remains pending until an Inertia adapter, Laravel request lifecycle
integration, server-side idempotency persistence/enforcement, end-to-end
authentication behavior, transport cancellation and stale-response handling,
and integration tests covering Laravel decisions and final React state exist.

### Scope confirmation

- No Phase 2 implementation was started.
- No runtime consumer was migrated.
- No Laravel behavior changed.
- No dependency was installed.
- No unrelated file was modified.
- No commit or push was performed.

## Evidence Closure — Commit 7565a0c

**Review date:** 2026-10-31
**Reviewed commit:** `7565a0c0b9f7ee41c91bfbabcd5e6eda13aeae6e`
**Parent:** `5a0c8cd4f68587d8d058426118437a93cceeb084`

This section supersedes the earlier 2026-10-20 acceptance counts for the
three known evidence gaps. The earlier section remains historical evidence
for commit `5a0c8cd`; it is not the result of this later commit.

### New evidence

The URLM coordinator suite now includes 41 tests. The added tests are:

- `keeps owner authority and two FIFO followers unchanged for failed replacements`
  — independently rejects stale expected-owner identity, invalid generation,
  and policy mismatch while preserving the unresolved claim, owner observer,
  queued follower positions, and active-record count; then verifies valid
  replacement and ordered promotion.
- `preserves the coordinator retry budget across repeated blocked retries`
  — repeats public coordinator retries while a foreign unresolved claim blocks
  authority, then proves both configured retries remain available after the
  claim resolves.
- `rejects retries at budget exhaustion without creating a new attempt`
  — performs two legal uncertain-outcome retries, then proves exhaustion leaves
  identity, state, records, claims, observers, queue order, and timer ownership
  unchanged.

The current URLM test run reports 3 files and 49 tests passed, with 0 failed,
0 skipped, and 0 todo. The complete framework-neutral matrix was rerun on this
commit; its command results are recorded in the completion report for this
review.

### Reconciled grouped invariant accounting

The acceptance matrix uses 22 stable grouped invariant rows, not a test count:

- PASS: 22
- FAIL: 0
- NOT DEMONSTRATED: 0

The framework-neutral evidence now covers identity and reducer safety,
authority and queue atomicity, retry and repeat-safety decisions, cancellation
and finalization, observer continuity, bounded retention, and sanitized
failure classification. The core still does not prove transport credential
transmission, Laravel/Inertia integration, server-side idempotency
enforcement, database-backed duplicate-mutation protection, production
transport cancellation, or end-to-end reconciliation.

### Decisions

- **Decision A — Framework-neutral Phase 1 core: ACCEPTED.**
  All 22 agreed grouped framework-neutral invariants have effective passing
  implementation and test evidence.
- **Decision B — Repository-wide verification: BLOCKED.**
  The unrelated repository TypeScript error in
  `resources/js/components/Profile/FooterLinks.patch.tsx` and the MySQL
  test-environment DNS failure remain outside URLM core.
- **Decision C — Phase 2: PENDING — NOT AUTHORIZED.**
  Phase 2 authorization is separate from Phase 2 completion criteria and from
  production mutation readiness. Phase 2 requires explicit approval; durable
  mutation infrastructure belongs to the later mutation-integration phase,
  not the authentication vertical slice.

  ## Phase 2 Authentication Planning — Commit 2d73b21

  The current baseline is `2d73b219770f602822d9b112ebff5e51273ce049`, whose
  parent is `7565a0c0b9f7ee41c91bfbabcd5e6eda13aeae6e`. The evidence-closure
  tests and documentation reconciliation were committed in `2d73b21`; the
  earlier report measured the parent baseline plus those changes.

  At the current snapshot, the URLM suite reports 49 passed tests across three
  files, URLM typecheck passes, and the frontend build passes. Phase 1 core
  remains **ACCEPTED within agreed scope**. Repository-wide verification remains
  **BLOCKED** by the unrelated `FooterLinks.patch.tsx` JSX error and the
  native-WSL MySQL service-name resolution failure. Phase 2 remains
  **PENDING IMPLEMENTATION AUTHORIZATION**. Production mutation readiness is
  not established.

  The bounded authentication planning document is
  `docs/urlm/PHASE_2_AUTHENTICATION_PLAN.md`. It covers the current
  React-to-Inertia-to-Laravel flow, installed Inertia callback semantics,
  adapter ownership, authentication test matrix, Sail/MySQL prerequisites,
  rollback, and excluded scope. No Phase 2 implementation has started.

  The finalized planning contract references the existing
  `profiles.authentication` (`retry: never`, `repeatSafety: never`,
  `concurrency: single_flight`, `retryBudget: 0`) and does not introduce the
  different repeat-safety value. Installed evidence records
  `@inertiajs/react` 2.3.26, `@inertiajs/core` 2.3.26, and
  `inertiajs/inertia-laravel` 2.0.24. In core 2.3.26, validation errors invoke
  per-visit `onError`; network/server exceptions use global `exception`;
  non-Inertia responses use global `invalid`; cancellation calls `onCancel`
  before cleanup `onFinish`; and page replacement precedes `onSuccess`.
  These are planning facts, not implementation verification.

  The finalized contract also records the core 2.3.26 limitation that global
  `invalid` and `exception` payloads do not include originating visit identity.
  No adapter may intercept unrelated visits or classify those paths without a
  separately specified attribution mechanism. The plan therefore leaves that
  classification as an explicit verification prerequisite rather than assuming
  that per-visit `onError` covers transport failures.

  ## Phase 2A Non-runtime Login Adapter Contract Correction — Commit b932b40

  The isolated adapter contract under
  `resources/js/lib/urlm/adapters/loginAdapter.ts` is tested without runtime
  exports or login integration. It references `profiles.authentication`
  unchanged, uses actual reducer/coordinator vocabulary, accepts an injected
  Inertia-compatible visit function, rejects duplicate transport, separates
  view detachment from transport disposal, and does not consume unattributable
  global `invalid`/`exception` events.

  Current validation:

  | Command | Exit code | Result |
  |---|---:|---|
  | `npm test -- --run` | 0 | 4 files, 68 passed, 0 failed |
  | `npm run typecheck:urlm` | 0 | Passed |
  | `npm run build` | 0 | Passed |
  | `git diff --check` | 0 | Passed |

  **Non-runtime adapter contract tested; login integration not started.**
  These Node tests do not prove React lifecycle, browser navigation, Laravel
  middleware, CSRF behavior, transport exceptions, or end-to-end authentication.

  The correction pass made the adapter resources attempt-owned, wired
  cancellation through `OperationCoordinator.registerCancellation`, used the
  shared `applicationOperationRegistry` by default, added exact-owner watchdog
  recovery to `awaiting_outcome`, isolated listener failures, and separated
  view detachment from transport disposal. It still intentionally does not
  consume unattributed global Inertia `invalid`/`exception` events. Recovery
  navigation remains specified but unimplemented, and Inertia's default
  non-Inertia response display risk remains a runtime integration concern.

  ## Phase 2A Cleanup Closure — Commit 8da5a30

  The cleanup correction tests throwing watchdog cancellation tokens,
  synchronous cancel/finish reentrancy for explicit cancellation, disposal,
  and watchdog recovery, accepted terminal outcomes without `onFinish`,
  staggered exact-owner watchdog deadlines, same-instance stale callbacks,
  active and awaiting-outcome joined observation, and malformed page input.
  Finalization is protected from transport-token errors by releasing adapter
  ownership before cancellation and always invoking coordinator finalization.

  Current validation:

  | Command | Exit code | Result |
  |---|---:|---|
  | `npm test -- --run` | 0 | 4 files, 76 passed, 0 failed |
  | `npm run typecheck:urlm` | 0 | Passed |
  | `npm run build` | 0 | Passed |
  | `git diff --check` | 0 | Passed |

  **Non-runtime adapter contract tested; login integration not started.**
  These tests prove adapter logic only. They do not prove React lifecycle,
  browser navigation, Laravel middleware or CSRF behavior, transport
  exception attribution, or end-to-end authentication.

  ## React integration test tooling — Commit 8331c80

  Tooling setup is complete without enabling login integration. Exact
  development dependencies are `@testing-library/react` 16.3.0,
  `@testing-library/dom` 10.4.0, `@testing-library/user-event` 14.6.1, and
  `jsdom` 26.1.0. They require Node 18 or newer and React Testing Library
  accepts React/React DOM 18 or 19; the repository uses Node 22.23.3,
  React/React DOM 18.3.1, Vitest 4.1.0, Vite 8.0.16, and TypeScript 6.0.3.
  No framework or production dependency was upgraded.

  The existing URLM suite remains isolated in the Node environment through
  `vitest.config.ts`. React smoke tests use `vitest.react.config.ts`, a
  jsdom environment, and a scoped cleanup setup. The smoke tests prove only
  TSX rendering, accessible role/name queries, user-event typing/clicking/
  submission, unmount cleanup, non-brittle StrictMode lifecycle cleanup, and
  DOM isolation between tests. They do not prove login behavior, adapter
  wiring, navigation, CSRF, cookies, Laravel authentication, or browser
  accessibility.

  Validation at baseline `8331c80419454d9db48a2a0693e971897a442eb7`:

  | Command | Exit code | Result |
  |---|---:|---|
  | `npm run test:core` | 0 | 4 files, 76 passed |
  | `npm run test:react` | 0 | 1 file, 3 passed |
  | `npm run test:all` | 0 | 79 passed |
  | `npm run typecheck:urlm` | 0 | Passed |
  | `npm run typecheck:react-tests` | 0 | Passed |
  | `npm run typecheck` | 2 | Pre-existing `FooterLinks.patch.tsx` JSX error |
  | `npm run build` | 0 | Passed |
  | `git diff --check` | 0 | Passed |

  npm reported 29 existing audit findings after installation; no automated
  audit remediation was run. The remaining Inertia global `invalid` and
  `exception` response-display/security gate requires runtime attribution
  design and is not solved by jsdom tooling.

  **React integration test tooling configured and verified. Login integration
  has not started.**

  ## Phase 2B recovery verification — commit 87454eb

  The login integration remains **partial and disabled by default**. The
  explicit `integration="urlm"` prop selects it; the default remains the
  legacy path. No normal application composition, query string, or hidden
  flag enables URLM login.

  The earlier 11-React-test result is retained only as a historical result
  from the interrupted validation attempt. It was not treated as fresh proof
  until reproduced.   The required reproduction succeeded on 2026-11-09:
  the React suite now has 13 passing tests (10 login integration tests and 3
  tooling smoke tests). The corrected fixtures use the installed Inertia
  rejection sequence `onStart -> onError -> onFinish`, separately test finish
  without a classified outcome, and test no-finish watchdog recovery with
  fake timers. Manual callbacks are delivered under `act()` where they update
  React.

  Ownership is:

  - `useForm` owns draft email, password, remember, and legacy submission
    state.
  - The URLM adapter owns the selected-path transport lifecycle and
    classification.
  - URLM adapter field errors are the authoritative response for the selected
    URLM visit; React owns their current presentation and hides an edited
    field's stale message without changing the historical outcome.
  - URLM owns pending, unresolved-outcome, recovery, and password-clearing
    presentation for the selected path. An unresolved outcome disables submit
    and keeps a normal `GET /login` anchor available.
  - The adapter receives `router.visit`; React detaches only its view
    subscription on unmount, preserving transport classification.

  The current status is **React verification demonstrated for the bounded
  jsdom cases**, but runtime security readiness and Laravel/browser
  acceptance remain unestablished. The Inertia 2.3.26 global `invalid` and
  `exception` events remain unattributed to a specific login visit, so the
  response-display security gate is unresolved. The tests do not prove real
  navigation, cookies, CSRF, Laravel authentication, or browser accessibility.

  ## Phase 2B Login Integration — disabled by default

  The current working-tree integration is selected only by the explicit
  `integration="urlm"` prop on `Login`. The default remains `integration="legacy"`;
  no query string, hidden flag, or normal application composition enables the
  new path. This pass changes only the login page, React integration test
  configuration, scoped test typing, and focused React tests. No Laravel,
  URLM core, coordinator, registry, timer, dependency, database, or
  environment files were changed.

  Ownership is intentionally split:

  - `useForm` owns draft email, password, remember, and Laravel field errors.
  - The login adapter owns the URLM lifecycle, Inertia visit callbacks,
    cancellation, watchdog, and terminal classification.
  - React subscribes to snapshots and calls `detachView()` on unmount; it does
    not dispose an active or unresolved transport during page replacement.
  - The adapter receives the Inertia `router.visit` function directly. Tests
    inject an isolated registry; normal construction defaults to the shared
    application registry.
  - URLM owns pending, validation, authentication-required, and unknown-outcome
    presentation for the selected path. Unknown outcomes expose a normal
    `GET /login` recovery link and never replay credentials.

  The earlier 8-login-test/11-total result is historical and superseded. The
  current focused React suite has 10 login integration tests, and the tooling
  suite has 3 smoke tests: 13 React tests total. The tests use the real login
  page, adapter, coordinator, reducer, registry, and recovery presentation
  component while narrowly mocking Inertia transport and unrelated
  layout/UI dependencies. They demonstrate invalid submission without a
  visit, one visit for duplicate submission, accessible pending state,
  scoped validation and a fresh rejection submission, edited-field stale
  feedback dismissal, password clearing after outcomes, successful navigation
  not becoming cancellation, same-instance stale-callback isolation,
  StrictMode transport ownership, view detachment before success, and
  recovery after both finish-without-outcome and actual no-finish watchdog
  expiry. They do not prove browser navigation, cookies, CSRF, Laravel
  authentication, Inertia response rendering, or browser accessibility
  compliance.

  The earlier 11-test working-tree result is historical and superseded by the
  current status below.

## Current Phase 2B status — 2026-11-09, authoritative

The login integration is **partial and disabled by default**. The explicit
`integration="urlm"` prop selects it; the normal default remains
`integration="legacy"`. No query string, hidden flag, or normal application
composition enables URLM login.

The pending duplicate-submit concern was reproduced as a fixture limitation,
not as a transport-ownership defect: after the first submit, the rendered
button becomes disabled and is named “Logging in”. The regression now submits
the form directly while pending. The adapter returns `already_active` for the
same adapter attempt, starts no second visit, and the original
`onStart -> onError -> onFinish` sequence permits corrected credentials to be
submitted. The presentation latch no longer treats `already_owner` as an
unknown outcome; unresolved adapter states alone retain the recovery lock.

Current ownership:

- `useForm` owns draft email, password, remember, and legacy submission state.
- The URLM adapter owns selected-path transport lifecycle and classification.
- URLM adapter field errors are authoritative for the selected URLM visit;
  React owns current presentation and hides an edited field's stale message
  without mutating the historical outcome.
- URLM owns pending, unresolved-outcome, recovery, and password-clearing
  presentation for the selected path.
- React detaches only its view subscription on unmount; it does not dispose an
  active or unresolved transport.

Current validation after the correction: 12 login integration tests plus 3
tooling smoke tests, 15 React tests total. The tests use the real login page,
adapter, coordinator, reducer, registry, and `ErrorState` recovery component;
only Inertia transport and unrelated layout/UI dependencies are mocked. They
do not prove browser navigation, cookies, CSRF, Laravel authentication,
Inertia response rendering, or browser accessibility compliance.

## Inertia 2.3.26 response-display security design — read-only

Installed source evidence is in
`node_modules/@inertiajs/core/dist/index.js`:

- `fireExceptionEvent` creates a cancelable global `inertia:exception` event
  whose detail contains only `{ exception }` (lines 129-130).
- `fireInvalidEvent` creates a cancelable global `inertia:invalid` event whose
  detail contains `{ response }` (lines 135-136).
- `Response.process()` runs request callbacks, rejects non-Inertia responses to
  `handleNonInertiaResponse()`, then calls `setPage()` before inspecting page
  errors and invoking `onError` or `onSuccess` (lines 2037-2060).
- `handleNonInertiaResponse()` fires `invalid`; if not canceled, it displays
  the response body through the built-in modal or dialog (lines 2073-2085).
  The modal builds an iframe with `srcdoc` from response data and targets links
  to `_top` (lines 1911-1964).
- Network/exception rejection fires `exception`; if not canceled, the error is
  re-rejected (lines 2357-2371). `finally()` then calls `finish()` (lines
  2373-2393).
- Cancellation invokes the request `onCancel`, marks the request canceled, and
  fires finish events; finished requests do not fire them again (lines
  2395-2400).

Current application wiring in `resources/js/app.tsx:23-37` calls
`createInertiaApp` with page resolution, React root setup, and progress
configuration only. It registers no global `invalid` or `exception` handlers.

Design evaluation:

| Option | Installed-API feasibility | Scope/risk | Credentials/raw bodies | Required tests/approval |
|---|---|---|---|---|
| A. Per-visit handling | `onError`, `onSuccess`, `onCancel`, and `onFinish` are available, but non-Inertia `invalid` and network `exception` have no originating visit identity. Not safely attributable. | Cannot prevent the default display for only login without global attribution; a guessed “pending login” association could suppress unrelated requests. | Per-visit callbacks do not receive the non-Inertia HTML body; global events expose response/exception data and must not log it. | Requires an attribution mechanism and focused transport tests; not feasible within current scope. |
| B. Application-wide display policy | `router.on('invalid')`/`router.on('exception')` or document listeners can cancel/default-handle globally. | Affects every Inertia request; suppressing unrelated server errors or session/CSRF failures is a broad behavior change. | Must prevent raw response HTML and exception details from reaching UI/logs; cannot be login-specific by pending state. | Requires app-wide policy tests for login, unrelated visits, session expiry, CSRF, and unexpected errors; separate global-application approval. |
| C. Server response normalization | Laravel can ensure login responses are valid Inertia redirects/errors, but non-Inertia failures, auth/session expiry, CSRF, and unexpected exceptions still require a consistent server policy. | Changes authentication and global response behavior; validation, redirects, error rendering, and exception handling are affected. | Server normalization can avoid raw HTML in normal login responses, but exception rendering/logging policy remains server-owned. | Requires Laravel feature tests and response-contract tests; separate Laravel approval. |

Recommendation: no option is safe to implement in this disabled-login
correction. Keep response-display prevention separate from operation
attribution. The smallest defensible next boundary is a separately approved
application-wide Inertia response policy, paired with Laravel response
normalization and tests for unrelated visits, authentication/session expiry,
CSRF, validation, and unexpected errors. No global listener, preventDefault
handler, server rendering change, or new transport behavior was implemented.

**Login remains disabled. No Laravel/global response policy, dependency,
accepted-core, database, deployment, commit, or push change was made.**

## Application-wide Inertia response display boundary — 2026-11-10

The frontend-only boundary is implemented in
`resources/js/lib/inertiaResponseDisplayBoundary.ts` and installed once before
`createInertiaApp()` in `resources/js/app.tsx`. It registers only the
cancelable global `invalid` listener. The listener calls `preventDefault()` and
renders one fixed, keyboard-focusable `role="alert"` containing only:

> We received an unexpected response. The request result may not be confirmed.

It never reads, serializes, logs, or renders response data, headers, request
payloads, credentials, cookies, or exception values. Installation is
singleton-safe and returns explicit teardown; teardown removes only this
listener and its owned alert. No URLM adapter lifecycle or operation state is
read or changed. No retry, redirect, reload, or credential replay occurs.

Installed Inertia 2.3.26 source evidence:

- `node_modules/@inertiajs/core/dist/index.js:129-136` creates cancelable
  global `exception` and `invalid` events.
- `:2037-2060` runs callbacks, then `setPage()`, then invokes `onError` for
  page errors or `onSuccess` for a successful Inertia page.
- `:2073-2085` handles non-Inertia responses: `X-Inertia-Location` 409
  responses take the external-location path; other responses fire `invalid`
  and, if not canceled, pass the body to the built-in modal/dialog.
- `:1911-1964` shows that built-in display constructs an iframe and assigns
  response-derived content to `srcdoc`; this is the exact path suppressed.
- `:2357-2378` fires `exception`, preserves rejection when uncanceled, and
  finishes in `finally`; `:2380-2400` preserves cancellation and finish
  ordering.

The boundary tests use the installed Inertia event handler and real DOM. They
verify invalid cancellation, fixed safe feedback, hostile marker exclusion,
singleton installation, teardown isolation, bounded repeated presentation,
and unchanged uncanceled exception propagation. The jsdom tests do not execute
a real Axios response through the browser transport, so actual iframe/modal
suppression during a live non-Inertia network response remains a browser
acceptance prerequisite. Existing React login tests cover normal validation and
successful callback paths separately.

### Laravel response-contract matrix

| Case | Current evidence | Frontend boundary effect | Required Laravel change |
|---|---|---|---|
| Validation rejection | `LoginRequest` throws `ValidationException` with `email` messages; controller uses Inertia POST route. | Normal Inertia page-error path remains unchanged; no global alert. | None identified for this boundary; feature verification remains unrun. |
| Throttled login | `ensureIsNotRateLimited()` throws translated `auth.throttle` validation message. | Normal scoped validation remains unchanged. | None authorized or identified. |
| Unauthenticated/session expiry | Auth middleware/routes are source-inspected; live response not exercised. | If returned as valid Inertia page, normal navigation applies; if non-Inertia, safe alert suppresses raw display. | Determine server contract with Laravel feature tests; do not assume normalization. |
| CSRF mismatch | Middleware/exception response is not exercised in this pass. | Non-Inertia HTML is replaced by the safe alert; exception propagation is untouched. | Separate Laravel response-format decision and feature tests. |
| Forbidden access | Role middleware is present in application wiring; live response not exercised. | Same conditional behavior: valid Inertia response follows normal path; non-Inertia response gets safe alert. | Verify intended Inertia/redirect contract with server tests. |
| Unexpected server error | `bootstrap/app.php` normalizes only API/`expectsJson()` exceptions; web/Inertia behavior is not proven. | Global `exception` remains uncanceled; `invalid` raw display is suppressed. | Separate Laravel exception-rendering authorization if web normalization is desired. |
| External-location response | Inertia source-inspected `409` plus `X-Inertia-Location` uses location visit rather than `invalid`. | Boundary does not intercept or redirect this path. | None for this frontend boundary; browser verification remains required. |
| Successful login redirect | Controller returns role-based Laravel redirect; source inspected, not browser-tested. | Normal Inertia successful navigation and callback behavior remain unchanged. | Existing server contract needs Laravel/browser acceptance only. |

This boundary is not operation attribution, does not identify a login owner,
and does not solve exception disclosure or network-failure attribution.
Exception handling remains unchanged pending separate approval.

**URLM login remains disabled by default. No Laravel, dependency, accepted-core,
database, deployment, commit, or push change was made.**
