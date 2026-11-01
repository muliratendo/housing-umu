# Phase 2 Authentication Slice Plan

## Status and boundary

**Planning baseline:** `2d73b219770f602822d9b112ebff5e51273ce049`  
**Parent baseline before the evidence-closure changes:** `7565a0c0b9f7ee41c91bfbabcd5e6eda13aeae6e`  
**Regression-test and PRD/status reconciliation commit:** `2d73b21`  
**Planning date:** 2026-11-01

Phase 1 framework-neutral URLM core is accepted within its agreed bounded
scope. Repository-wide verification remains blocked by the unrelated
`FooterLinks.patch.tsx` TypeScript error and the unavailable MySQL hostname.
Phase 2 implementation is pending explicit approval. Production mutation
readiness has not been established.

This document is a reviewable implementation plan only. No adapter, runtime
consumer, Laravel behavior, environment configuration, migration, account,
dependency, commit, or push is part of this pass.

## Evidence reconciliation

The current snapshot is `2d73b219770f602822d9b112ebff5e51273ce049`, whose
parent is `7565a0c0b9f7ee41c91bfbabcd5e6eda13aeae6e`. The three evidence-gap
tests and the related status/PRD reconciliation were committed in `2d73b21`.
The earlier report measured the parent baseline plus those changes; it was not
a measurement of a different URLM implementation.

Current native-toolchain results at this snapshot:

| Command | Exit code | Result |
|---|---:|---|
| `npm test -- --run` | 0 | 3 files, 49 passed, 0 failed, 0 skipped, 0 todo |
| `npm run typecheck:urlm` | 0 | URLM TypeScript check passed |
| `npm run build` | 0 | Vite production build passed |

The framework-neutral decision remains **ACCEPTED within agreed scope**.
Repository-wide verification remains **BLOCKED**, and Phase 2 remains
**PENDING IMPLEMENTATION AUTHORIZATION**. These decisions do not establish
credential transmission behavior, Laravel adapter behavior, server-side
idempotency, durable reconciliation, or production cancellation.

## Current authentication flow

1. `GET /login` is defined in `routes/auth.php` under
   `redirect.authenticated`. `AuthenticatedSessionController::create()` also
   checks the session and renders `Auth/Login` through Inertia for guests.
2. `resources/js/Pages/Auth/Login.tsx` uses Inertia React `useForm` with
   `email`, `password`, and `remember`. `useFormGuard` performs client-side
   shape checks. `useSilentFailureGuard` wraps the submission in a promise.
3. Submit calls `post(route('login'))`. The current callbacks resolve on
   `onSuccess`, reject a generic `{ status: 422 }` on `onError`, and reset the
   password in `onFinish`. It does not currently bind URLM identity to an
   Inertia visit, retain an `onCancelToken`, or classify cancellation and
   unknown outcomes through URLM.
4. `POST /login` is handled by `LoginRequest`. Laravel validates required
   email/password fields, applies a five-attempt `RateLimiter` keyed by
   normalized email and IP, emits `Lockout`, calls `Auth::attempt`, and
   returns field validation errors for rejected credentials or throttling.
5. `AuthenticatedSessionController::store()` calls `authenticate()`,
   regenerates the session, obtains the authenticated user, and calls
   `redirectByRole()`. Recognized administrative roles redirect to
   `admin.dashboard`; `student` redirects to `student.dashboard`; all other
   roles use the `welcome` fallback.
6. Inertia follows the server redirect and updates the page. Protected
   student routes use `auth`, `verified`, and role middleware. The server,
   not React state, remains authoritative for authentication and role access.
7. `HandleInertiaRequests` shares the authenticated user, roles, permissions,
   and flash authentication notices. `RedirectAuthenticatedFromAuthPages`
   handles already-authenticated visits and separately routes unverified
   users to email verification.

The existing code has two policy details to resolve before implementation:
the controller recognizes `affiliated_hostel_admin` while the
already-authenticated middleware recognizes `affiliated_admin`, and the
unverified-user login outcome needs an explicit feature assertion. These are
planning findings, not authorization to change production behavior.

## Smallest authorized implementation slice

### Proposed files

- Add a framework adapter under `resources/js/lib/urlm/adapters/` with an
  Inertia-specific transport boundary.
- Add the login integration at the existing `Auth/Login.tsx` boundary,
  retaining Laravel `useForm` field/error behavior where it is authoritative.
- Add pure adapter tests under `resources/js/lib/urlm/`.
- Add focused React integration tests for login state and disposal.
- Add Laravel feature assertions only for existing authentication behavior.
- Add safe, redacted diagnostics using existing failure-descriptor rules.
- Do not change routes, controllers, requests, middleware, models, migrations,
  authentication policy, or server idempotency in this slice.

### Adapter contract

The adapter should accept a URLM operation and a single Inertia visit
factory, and emit only URLM-compatible events. The coordinator owns logical
operation identity, attempt identity, generation, policy, claim, observer
continuity, and terminal classification. The adapter owns only visit wiring,
callback normalization, cancellation-token capture, and disposal.

The authentication profile must be `kind: authentication`, `retry: never`,
`repeatSafety: non_idempotent`, and `concurrency: single_flight`. A user
retry cannot retransmit credentials automatically. A client idempotency key
does not provide server-side idempotency and is not a reason to retry a login
mutation.

### Installed callback mapping

The installed packages declare `@inertiajs/react` 2.3.26 and
`inertiajs/inertia-laravel` 2.0.24. The installed core types expose the
following visit callbacks:

| Inertia callback | Adapter event/decision |
|---|---|
| `onStart` | begin/submit only if the operation is still the active attempt |
| `onProgress` | optional progress observation; never a terminal outcome |
| `onSuccess(page)` | classify only after the accepted Inertia success page/redirect is observed |
| `onError(errors)` | classify validation/throttle/server-provided form errors |
| `onCancel` | classify explicit client cancellation exactly once |
| `onCancelToken(token)` | retain the visit cancellation authority for exact-owner cancel |
| `onFinish` | cleanup/finalization only; never infer success or failure |

This mapping is based on the installed declarations and the official Inertia
manual-visits, forms, and events documentation:
`https://inertiajs.com/manual-visits`,
`https://inertiajs.com/forms`, and `https://inertiajs.com/events`.
The adapter must not infer semantics from a different Inertia version.

### Required behavior

- **Identity:** one login submit owns one logical operation and one active
  attempt; duplicate submits join or are rejected by single-flight.
- **Validation:** clear only the edited field's client/server error; preserve
  server throttle messaging until a new authoritative response.
- **Stale callbacks:** every callback carries the captured attempt/generation
  and is ignored if it no longer owns the active channel.
- **Cancellation:** unmount/dispose invokes the retained cancellation token
  at most once. This cancels the client visit only; it does not promise server
  rollback.
- **Finalization:** `onFinish` releases timers/listeners and closes the
  transport record without inventing success, failure, or authentication.
- **Session expiry/CSRF:** classify a non-Inertia or redirect-to-login result
  as an explicit session/CSRF outcome only when the response evidence supports
  it; otherwise retain an unknown outcome and offer safe recovery.
- **Unexpected responses:** do not parse arbitrary HTML or expose raw response
  bodies. Record only normalized, redacted descriptors.
- **Unknown login outcome:** do not resubmit credentials. Offer a safe
  navigation/session-state check using a GET or server-rendered state; require
  an explicit fresh user action before another credential submission.
- **Credential handling:** password is cleared after the visit lifecycle,
  never put into operation descriptors, logs, diagnostics, retry state, or
  URLM snapshots.
- **Unmount:** dispose observers and timers, reject late callbacks by identity,
  and preserve server authority if the request may already have reached it.

## Server responsibilities retained

Laravel remains responsible for request validation, throttle counters and
`Lockout`, credential authentication, session regeneration, CSRF/session
validation, verified-account policy, role authorization, intended redirects,
and response shape. The adapter must not duplicate or weaken any of these
decisions. Any role-name reconciliation must be decided and tested before
implementation.

## Test matrix

### Pure adapter tests

- callback-to-event mapping for start, progress, success, validation error,
  cancel, finish, and cancellation token;
- `onFinish` without a classified outcome remains unresolved/unknown;
- stale callbacks cannot publish after retry, replacement, disposal, or
  cancellation;
- single-flight prevents duplicate transport;
- callback exceptions do not interrupt cleanup;
- no credentials, cookies, tokens, response bodies, or personal data appear
  in descriptors or diagnostics.

### React/form integration tests

- invalid client input never submits;
- rejected credentials show scoped server error;
- valid login follows the server redirect;
- recognized role redirects preserve server authority;
- unverified-account behavior follows the explicit server feature contract;
- throttling remains visible until a new authoritative result;
- double submit is single-flight;
- late response after a newer attempt is ignored;
- unmount/disposal cancels the client visit and cleans observers;
- finish without success/error is not shown as success;
- server error and unexpected non-Inertia response are safe and redacted;
- successful response followed by lost navigation offers safe session recovery;
- no credential leakage occurs in UI state, logs, or diagnostics.

### Laravel feature tests

- invalid input and rejected credentials;
- throttle threshold and authoritative lockout response;
- valid login, session regeneration, and intended redirect;
- every recognized role redirect;
- unverified-account behavior;
- CSRF/session expiry and non-Inertia response handling;
- logout and post-authentication access.

These tests require an isolated reachable test database. Do not run
destructive feature tests until that prerequisite is established.

### Browser end-to-end tests

- login success and role navigation;
- validation, rejected credentials, throttle, and unverified account;
- double submit, slow/late response, navigation away, and unmount;
- session expiry/CSRF recovery;
- lost navigation after successful authentication without credential
  retransmission;
- browser-visible redaction and final navigation state.

## Environment prerequisites and blockers

The repository is configured for Sail/Docker MySQL: `.env` uses
`DB_HOST=mysql`, `compose.yaml` defines the `mysql` service, and
`phpunit.xml` overrides only the database name to isolated `testing`.
Native WSL cannot resolve the Docker service name `mysql`, which caused the
known PHP test failure. The implementation verification environment must
therefore run inside the Sail network or provide an already-approved,
reachable isolated test database. Do not change `DB_HOST`, switch to SQLite,
or run migrations against an uncertain database.

The unrelated repository TypeScript blocker remains:
`resources/js/components/Profile/FooterLinks.patch.tsx(15,1): error TS2657:
JSX expressions must have one parent element.` It is outside this slice and
must not be fixed as part of authentication work.

## Rollback and disablement

Keep the adapter behind a login-slice feature boundary so the existing
Inertia `useForm` path can be restored without changing Laravel authority.
Rollback means disabling the adapter integration, removing its subscriptions
and timers, and returning to the existing form submission path. Do not
silently fall back to credential retransmission after an unknown outcome.
Release criteria must include a clean disposal path and no active URLM
records/listeners after disablement.

## Acceptance criteria

The slice is complete only when:

1. URLM adapter and React integration tests pass with exact callback and
   identity assertions.
2. Laravel feature tests pass in the isolated database environment.
3. Browser tests demonstrate validation, roles, throttle, unverified account,
   cancellation, stale-response rejection, and safe unknown-outcome recovery.
4. No automatic credential retry or sensitive diagnostic leakage exists.
5. Server authentication, session regeneration, CSRF, throttle, verified
   status, and role redirects remain authoritative.
6. Repository-wide TypeScript and PHP environment blockers are resolved or
   explicitly classified outside the slice.

## Excluded scope

Dashboard reads, general HTTP transport, registration, password recovery,
allocations, application mutations, durable mutation idempotency,
database-backed duplicate-mutation protection, and production mutation
readiness are later separately authorized work.

## Unresolved decisions

- Reconcile the `affiliated_hostel_admin` and `affiliated_admin` role names.
- Specify the intended unverified-account result immediately after valid
  credentials.
- Define the safe server/session check after a lost login response.
- Decide the browser E2E runner and its service orchestration.
- Establish the approved Sail/isolated-test-database execution procedure.
- Confirm whether authentication adapter diagnostics may emit only reason
  codes or also bounded timing metadata.

**Phase 2 implementation has not started.**
