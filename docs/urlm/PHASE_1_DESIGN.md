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

Only an event matching the canonical exact identity is accepted:
`operationId`, `attemptId`, `correlationId`, `generation`, and
`idempotencyKey` (including its absent/present distinction). The same
comparator is used by reducer acceptance, registry lookup/release/cancellation/
replacement/publication, observers, promotion, supersession, finalization, and
watchdog authority checks. A retry is legal only from an eligible outcome and
preserves logical identity while creating a new attempt and generation.
Retry origin and profile policy are checked by the coordinator. Queue promotion is callback-driven and stale promotion is
ignored by the coordinator. Single-flight joins expose owner state through
unsubscribeable listeners without transferring transport ownership. Retry
replacement verifies the exact owner and swaps the record atomically, so a
failed replacement cannot release or promote the old authority.

## Concurrency and cancellation

`OperationRegistry` is an explicit application authority exported as
`applicationOperationRegistry`; tests and composition roots may inject an
isolated registry. It implements latest-wins, single-flight, parallel, and FIFO queue semantics.
One coordinator owns one unresolved lifecycle; parallel work requires separate
coordinators. It owns `AbortController` instances, transport-neutral
cancellation handlers, generations, exact-owner release, and queue promotion.
Queued handles expose a subscription that receives activation through the
reducer exactly once; cancellation/disposal before promotion cannot activate.
This is in-memory coordination only; durable mutation protection belongs to a
later server phase.

## Timers and modal leasing

`TimerRegistry` stores timers by full operation identity and executes a
watchdog only after an authority recheck. Timers are cleared on terminal state,
cancellation, supersession, retry, and disposal without clearing another
coordinator's timer. Cancellation aborts transport, publishes the terminal
cancelled state to owner/joined observers, then releases ownership and promotes
the next queue entry. `applicationModalCoordinator` provides one
application-level blocking lease; `ModalCoordinator` remains independently
constructible for tests, and lease IDs prevent stale release.

## Diagnostics and sensitive data

Failure descriptors retain only a broad kind, fixed allowlisted reason code,
retryability, validated HTTP status, and an application-format correlation ID.
Malformed input, arbitrary errors, getters that throw, and untrusted text map
to `UNKNOWN_FAILURE`; no normalization preserves supplied secrets. They do not
retain raw exceptions, stacks, response bodies, credentials, tokens, cookies,
SQL, or session IDs. Diagnostic sinks are optional and never required for
operation completion. Reducer publication uses an explicit accepted/rejected
result: rejected stale/foreign/invalid events never publish, while legal
terminal no-ops are observationally classified without overwriting snapshots.

## Finalization and observation lifetime

`FINALIZE` is cleanup, not outcome classification. It clears exact timers and
transport resources. If no outcome exists, the coordinator enters the
transitional `awaiting_outcome` state and returns
`needs_outcome_classification`; classification may then produce a known failure,
known timeout, reconciliation, or protocol failure. Finalization never creates
success or failure and never cleans a newer attempt. Logical observer channels
survive atomic retry replacement, isolate listener exceptions, and retain only
bounded terminal snapshots.
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
