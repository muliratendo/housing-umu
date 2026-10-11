# URLM Phase 1 Design

This is the Phase 1 corrective pass over the initial implementation. Phase 1
is an unused, framework-neutral lifecycle core. It does not import Laravel,
Inertia, React, browser transport helpers, or any existing consumer.

## Module boundaries

- `core/` contains contracts, identities, profiles, guards, events, and the
  total pure reducer.
- `coordinator/` owns operation concurrency, cancellation handles, timers,
  and the single blocking-modal lease.
- `classification/` converts unknown failures into a sanitized descriptor.
- `testing/` contains deterministic factories for core tests.

## State and event model

`OperationState` is a discriminated union. `OperationEvent` is also
discriminated, and `reduceOperation` is pure and total. Explicit transition
guards reject arbitrary starts, retries, and out-of-order events with a
sanitized diagnostic. Blocked validation has an explicit `REVALIDATE` path;
queued work has observable `QUEUED` and `PROMOTE` paths; reconciliation has
explicit success, failure, unknown, and cancellation outcomes. Terminal states
cannot be replaced by finalization or later events, and `FINALIZE` resolves an
active lifecycle as `unknown_failure` when no outcome exists.

## Authority, identity, and retry

Only an event matching the active operation ID, attempt ID, and generation is
accepted. A retry is legal only from an eligible outcome and preserves
`operationId`, `correlationId`, and `idempotencyKey` while creating a new
`attemptId`. Retry origin and profile policy are checked by the coordinator.
Registry completion and cancellation require the exact operation, attempt, and
generation owner. Queue promotion is callback-driven and stale promotion is
ignored by the coordinator. Single-flight joins expose owner state through
unsubscribeable listeners without transferring transport ownership. Retry
replacement verifies the exact owner and swaps the record atomically, so a
failed replacement cannot release or promote the old authority.

## Concurrency and cancellation

`OperationRegistry` is an explicit application authority exported as
`applicationOperationRegistry`; tests and composition roots may inject an
isolated registry. It implements latest-wins, single-flight, parallel, and
FIFO queue semantics. It owns `AbortController` instances, transport-neutral
cancellation handlers, generations, exact-owner release, and queue promotion.
This is in-memory coordination only; durable mutation protection belongs to a
later server phase.

## Timers and modal leasing

`TimerRegistry` stores timers by full operation identity and executes a
watchdog only after an authority recheck. Timers are cleared on terminal state,
cancellation, supersession, retry, and disposal without clearing another
coordinator's timer. `applicationModalCoordinator` provides one
application-level blocking lease; `ModalCoordinator` remains independently
constructible for tests, and lease IDs prevent stale release.

## Diagnostics and sensitive data

Failure descriptors retain only a broad kind, stable reason code, retryability,
optional HTTP status, and correlation ID. They do not retain raw exceptions,
stacks, response bodies, credentials, tokens, cookies, SQL, or session IDs.
Diagnostic sinks are optional and never required for operation completion.
Diagnostics contain only event/status metadata and shortened identity
references; raw events and states never cross the diagnostic boundary.
Failure classification accepts only normalized discriminated inputs. Arbitrary
errors, including `TypeError`, classify as unknown; HTTP status and retry
metadata are validated and reason codes are bounded.

## Why adapters remain untouched

Inertia, HTTP, React components, hooks, routes, controllers, models,
migrations, and existing tests are intentionally not wired to this core.
Phase 1 proves the lifecycle invariants without changing current application
behavior. Authentication is the first vertical slice in Phase 2.
