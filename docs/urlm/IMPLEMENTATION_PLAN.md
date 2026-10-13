# URLM Implementation Plan

## Phase 1 — contracts, coordinator, and focused tests

Add only framework-neutral contracts, identity generation, a total pure
reducer, operation registry, timer registry, cancellation ownership, modal
coordinator, and normalized failure descriptor. Add focused automated tests.
Do not add Inertia or HTTP adapters and do not migrate any runtime consumer.

The corrective pass must also prove exact-owner registry release, all four
concurrency policies, profile-enforced retry origin, explicit reducer
transitions, reachable retained states, identity-safe watchdogs,
transport-neutral cancellation handlers, application-wide modal leasing,
observable queue promotion and single-flight joins, blocked-validation
recovery, reconciliation outcomes, finalization cleanup, atomic retry
replacement, and metadata-only diagnostics.

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
- `resources/js/lib/urlm/**/*.test.ts`
- `tsconfig.urlm.json`
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

Phase 1 is not accepted until every gate below is demonstrated by a focused
test and the environmental baselines are reviewed:

- the pure reducer is total for all supported event/state combinations;
- stale identities and generations cannot change state;
- FINALIZE cannot create or replace an outcome;
- retry preserves `operationId`, `correlationId`, and `idempotencyKey` while
  changing `attemptId`;
- latest-wins rejects the previous attempt;
- single-flight suppresses duplicate triggers;
- one coordinator cannot own two unresolved lifecycles, including parallel or
  queued profiles;
- exact identity includes operation, attempt, correlation, generation, and
  idempotency-key presence;
- rejected stale/foreign/invalid events never publish;
- joined observers survive retry and receive cancellation exactly once;
- queued handles expose one-shot activation and throwing callbacks cannot block
  promotion;
- queued coordinators expose promotion and stale promotion cannot activate;
- joined callers can observe owner state and unsubscribe;
- all timers are cleaned on terminal state, cancellation, supersession, and
  disposal;
- finalization releases exact resources and returns
  `needs_outcome_classification` without inventing success or failure;
- terminal snapshots are bounded and logical observer channels do not leak;
- arbitrary callback failures cannot interrupt cleanup or promotion;
- reconciliation can resolve to success, failure, unknown failure, or valid
  cancellation;
- retry has a finite budget and preserves logical identity atomically;
- exact-owner completion, cancellation, disposal, and release cannot affect a
  newer record;
- latest-wins, single-flight, parallel, and FIFO queue behavior is explicit;
- retry policy and retry origin are enforced;
- every retained state has a legal transition;
- transport cancellation handlers run at most once;
- only one blocking modal can exist;
- no runtime consumer has been migrated during Phase 1;
- existing application behavior remains unchanged;
- frontend tests, TypeScript checks, build, and unaffected PHP tests run.

## Baseline gate

The initial Phase 1 implementation was not fully accepted. This corrective
pass is recorded in `IMPLEMENTATION_STATUS.md`; runtime consumers remain
unchanged until a later reviewed migration phase.
