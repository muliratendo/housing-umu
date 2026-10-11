# URLM Implementation Plan

## Phase 1 — contracts, coordinator, and focused tests

Add only framework-neutral contracts, identity generation, a total pure
reducer, operation registry, timer registry, cancellation ownership, modal
coordinator, and normalized failure descriptor. Add focused automated tests.
Do not add Inertia or HTTP adapters and do not migrate any runtime consumer.

## Phase 2 — authentication vertical slice

Add the minimum Inertia 2 adapter required for authentication. Migrate login as
the first complete vertical slice, then registration and account recovery.

## Phase 3 — standalone HTTP/read adapter

Add the standalone HTTP/read adapter, then migrate independent dashboard reads
with latest-wins cancellation and stale-response suppression.

## Phase 4 — critical mutation infrastructure

Add transactions, constraints, durable idempotency, reconciliation, and
conflict handling for critical mutations. Preserve Inertia redirects and
Laravel authority.

## Phase 5 — remaining mutation migrations

Migrate applications, allocations, maintenance, profile, academic, room/bed,
student-registry, user-management, and other mutations in dependency order.

## Phase 6 — durable jobs and long-running operations

Add durable operation/job records, acceptance/tracking states, bounded queue
retries, failure handling, and authorized status access only where current work
requires them.

## Phase 7 — transfers and external effects

Migrate uploads, downloads, streams, and external effects only where actually
required by the current repository.

## Phase 8 — resilience and operations

Add error boundary, draft/stale-read rules, health/alerting hooks, feature
disablement, recovery procedures, and fault-injection/integration coverage.

## Phase 1 file tree

Planned initial files (subject to repository conventions):

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
- `resources/js/lib/urlm/**/*.test.ts` after test tooling approval
- `docs/urlm/IMPLEMENTATION_STATUS.md`

## Compatibility strategy

No existing request code is removed in Phase 1. Phase 1 introduces an unused,
framework-neutral URLM core only: no adapters are added and no existing
consumer is migrated. `useAsyncSection`, `classifyError`, `http.ts`, and
`logger.ts` remain in place until later migrations. Existing state components
remain presentation-only. Login is migrated in Phase 2, before critical
mutations, and each migration phase must pass its targeted tests before the
next begins.

## Phase 1 acceptance gates

Phase 1 is complete only when:

- the pure reducer is total for all supported event/state combinations;
- stale identities and generations cannot change state;
- FINISH/finalization cannot create or replace an outcome;
- retry preserves `operationId`, `correlationId`, and `idempotencyKey` while
  changing `attemptId`;
- latest-wins rejects the previous attempt;
- single-flight suppresses duplicate triggers;
- all timers are cleaned on terminal state, cancellation, supersession, and
  disposal;
- only one blocking modal can exist;
- no runtime consumer has been migrated during Phase 1;
- existing application behavior remains unchanged;
- frontend tests, TypeScript checks, build, and unaffected PHP tests run.

## Baseline gate

The first step is inspection and planning only. Runtime code must remain
unchanged until this plan is reviewed. The corrected baseline command results are recorded in
`IMPLEMENTATION_STATUS.md`.
