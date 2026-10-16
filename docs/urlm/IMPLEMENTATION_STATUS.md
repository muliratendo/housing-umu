# URLM Implementation Status

## Current phase

**Phase 1 corrective pass implemented and frontend-verified; final acceptance
blocked by the PHP baseline environment.**

Required base commit verified: `40201de1b5b45078c6b820e6cf71293b6f8a3aff`.
This document records a correction pass for review; it does not grant Phase 1
acceptance.

The initial Phase 1 implementation was not treated as fully accepted. This
pass corrects registry authority, concurrency, retry, reducer, timer,
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
- `npm test -- --run`: **passed**, 3 test files and 38 tests.
- Latest claim-reacquisition/cancellation pass: **passed**, 3 test files and 38 tests.
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
- [x] Cancellation returns explicit results; unknown-outcome lifecycles are
  `not_cancellable` rather than silently ignored.
- [x] Reacquisition receives an exact expected owner separately from the next
  attempt and validates logical identity plus strictly increasing generation.
- [x] Queue-owner reacquisition preserves FIFO followers and suppresses
  promotion until terminal classification or closure.
- [x] Parallel unresolved claims remain independently addressable and do not
  overwrite one another.
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
- The current focused tests cover the principal authority, publication,
  cancellation, retry, queue, finalization, and secret-safety invariants, but
  Phase 1 remains pending explicit review and the blocked PHP baseline.
- Phase 2 must not begin until this review is complete.
