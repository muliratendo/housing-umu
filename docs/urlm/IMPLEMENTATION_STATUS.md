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
