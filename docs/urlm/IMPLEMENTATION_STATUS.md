# URLM Implementation Status

## Current phase

**Phase 1 implemented and frontend-verified; final acceptance blocked by the
PHP baseline environment.**

Phase 1 is an unused framework-neutral core. No existing runtime consumer was
migrated, and Phase 2 has not started.

## Workspace safety

Pre-existing changes were observed and left untouched: an `artisan` executable
bit change, Windows image `Zone.Identifier` sidecars, and the prior planning
documents. No Laravel runtime file, route, controller, model, migration,
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
- `npm test`: **passed**, 2 test files and 9 tests.
- Focused URLM TypeScript check with the repository baseline error excluded:
  **passed**.
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
- `vitest.config.ts`
- `docs/urlm/PHASE_1_DESIGN.md`

Modified:

- `package.json`
- `package-lock.json`
- `docs/urlm/IMPLEMENTATION_STATUS.md`

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

- [x] Pure reducer is total for supported event/state combinations.
- [x] Stale identities and generations cannot change state.
- [x] FINISH/finalization cannot create or replace an outcome.
- [x] Retry preserves operation, correlation, and idempotency identity and
  changes the attempt identity.
- [x] Latest-wins rejects the previous attempt.
- [x] Single-flight suppresses duplicate triggers.
- [x] Timers clean up on terminal state, cancellation, supersession, and
  disposal.
- [x] Only one blocking modal can exist.
- [x] No runtime consumer was migrated during Phase 1.
- [x] Existing application behavior remains unchanged by URLM.
- [x] Frontend tests and production build pass; TypeScript is blocked only by
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
- Phase 2 must not begin until this review is complete.
