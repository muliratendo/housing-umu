# URLM Phase 1 Design

Phase 1 is an unused, framework-neutral lifecycle core. It does not import
Laravel, Inertia, React, browser transport helpers, or any existing consumer.

## Module boundaries

- `core/` contains contracts, identities, profiles, guards, events, and the
  total pure reducer.
- `coordinator/` owns operation concurrency, cancellation handles, timers,
  and the single blocking-modal lease.
- `classification/` converts unknown failures into a sanitized descriptor.
- `testing/` contains deterministic factories for core tests.

## State and event model

`OperationState` is a discriminated union. `OperationEvent` is also
discriminated, and `reduceOperation` is pure and total. Unsupported or
out-of-order events leave state unchanged and can emit an injectable
diagnostic. Terminal states cannot be replaced by finalization or later
events.

## Authority, identity, and retry

Only an event matching the active operation ID, attempt ID, and generation is
accepted. A retry preserves `operationId`, `correlationId`, and
`idempotencyKey`, while creating a new `attemptId`. Latest-wins cancellation
marks the previous registry record aborted; single-flight returns the existing
record rather than starting a duplicate.

## Concurrency and cancellation

`OperationRegistry` owns `AbortController` instances and generations.
`OperationCoordinator` owns the operation key and dispatches lifecycle events.
Cancellation is explicit and disposal cancels the registry record and clears
all timers. This is in-memory coordination only; durable mutation protection
belongs to a later server phase.

## Timers and modal leasing

`TimerRegistry` stores timers by operation ID, replaces duplicate timers, and
clears them on terminal state or disposal. `ModalCoordinator` permits one
blocking owner; a stale owner cannot release a newer owner.

## Diagnostics and sensitive data

Failure descriptors retain only a broad kind, stable reason code, retryability,
optional HTTP status, and correlation ID. They do not retain raw exceptions,
stacks, response bodies, credentials, tokens, cookies, SQL, or session IDs.
Diagnostic sinks are optional and never required for operation completion.

## Why adapters remain untouched

Inertia, HTTP, React components, hooks, routes, controllers, models,
migrations, and existing tests are intentionally not wired to this core.
Phase 1 proves the lifecycle invariants without changing current application
behavior. Authentication is the first vertical slice in Phase 2.
