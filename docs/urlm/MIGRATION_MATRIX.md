# URLM Migration Matrix

| Existing surface | Decision | Reason | Exit condition |
|---|---|---|---|
| `resources/js/lib/requestState.ts` | adapt | Existing finite state is useful but lacks identity, attempts, failures, reconciliation, and cancellation states. | URLM state projection replaces it or it delegates without duplicate truth. |
| `resources/js/hooks/useAsyncSection.ts` | adapt | Useful for disposable reads, but current retries/timers and local state violate stale-response and cleanup invariants. | All consumers use coordinator-backed read policy. |
| `resources/js/hooks/useFormGuard.ts` | retain | Owns transient draft/touched/client validation only and does not claim server truth. | Continue after server error ownership is explicit. |
| `resources/js/lib/http.ts` | adapt | Same-origin CSRF foundation is compatible; it needs typed outcomes, identity headers, timeout, abort, and status normalization. | HTTP adapter is used by JSON reads/mutations. |
| `resources/js/lib/classifyError.ts` | adapt | It accepts arbitrary thrown values; Phase 1 adds a normalized descriptor contract without changing consumers. | Replace callers in Phase 3 after the descriptor is tested. |
| `resources/js/lib/logger.ts` | adapt | Central logging intent is correct, but interval/listener ownership and metadata sanitization need correction. | Logging is bounded, sanitized, non-blocking, and lifecycle-safe. |
| `components/states/*` | retain | These are presentation components and can render URLM projections. | No component owns transport truth or request callbacks. |
| `Pages/Auth/Login.tsx` | adapt | It uses Inertia correctly for the server boundary but wraps callbacks in a Promise and a watchdog. | Explicit single-flight Inertia adapter with no automatic credential retry. |
| `components/Admin/Allocations/AllocationsDialog.tsx` | adapt | Mixes Axios, Inertia, local loading booleans, and duplicate-sensitive mutations. | Each operation has a declared profile and coordinator state. |
| `components/Navigation/AppSidebar.tsx` | adapt | Logout is a critical authentication mutation currently submitted directly. | Authentication adapter owns identity and cleanup. |
| `Layouts/AuthenticatedLayout.tsx` | adapt | Logout/navigation actions need operation policy while local menu state remains React-owned. | Only request state moves to URLM. |
| Laravel `routes/web.php`/`routes/auth.php`/`routes/admin.php` | retain | Session-aware Inertia routing is correct and should not be moved to stateless API middleware. | Correlation middleware is applied without changing auth semantics. |
| `app/Http/Requests/Auth/LoginRequest.php` | retain | Server validation/throttle/authentication authority is already correctly centralized. | Add safe outcome/correlation integration without weakening it. |
| `AuthenticatedSessionController` | retain | Regenerates the session and chooses server-side role redirects. | Tests cover regeneration and role-safe redirect. |
| `app/Http/Middleware/HandleInertiaRequests.php` | retain | Existing shared Inertia props are compatible. | Add only URLM-safe shared data if required. |
| `app/Http/Middleware/SecureApiHeaders.php` | retain | Existing security headers should remain independent of lifecycle coordination. | Correlation headers do not conflict. |
| `app/Http/Controllers/ClientLogController.php` | adapt | Client logging endpoint exists, but payload sanitization/limits must be audited. | No secrets/raw bodies accepted or logged. |
| `ProfileController::destroy`, `User`, users migration, `ProfileTest` | retain/adapt later | Account deletion is reversible soft deletion: `User` uses `SoftDeletes`, the migration has `deleted_at`, and `delete()` sets the timestamp. It is not immediate permanent deletion and no later purge path was found. | UI copy/lifecycle says reversible deletion; tests assert the intended soft-delete contract. |
| Database schema | adapt | Current domain tables need operation/idempotency records only for qualifying mutations. | Migrations and concurrency tests prove duplicate protection. |
| PHPUnit configuration | retain/adapt | PHPUnit is installed and Laravel tests run; no frontend runner exists. | Add the smallest justified frontend test setup during phase 1. |
| `package.json` | adapt later | Build exists; Phase 1 now has only the approved Vitest and focused URLM typecheck scripts. | Keep the focused runner framework-neutral and do not add adapter/runtime scripts before Phase 2. |

## Corrective-pass boundary

The Phase 1 registry and coordinator are framework-neutral and remain unused by
all listed runtime surfaces. Their in-memory concurrency and cancellation
authority must not be mistaken for durable idempotency, reconciliation, Laravel
authorization, or transport behavior; those remain later-phase concerns.

## Phase 1 authority corrections

The coordinator owns one unresolved lifecycle. A queued handle exposes
framework-neutral activation and joined observers attach to a logical-operation
channel rather than an individual attempt. Exact identity includes operation,
attempt, correlation, generation, and idempotency-key presence. Publication is
accepted-transition-only; rejected stale or foreign events cannot populate
another operation's snapshot. Finalization stops transport and returns
`needs_outcome_classification` when no outcome exists; it does not classify the
outcome itself.

The ownership split is explicit: logical channels retain state, observers, and
retry budget; transport attempts retain abort/cancellation/watchdog resources;
concurrency leases retain only current scheduling authority. Retryable terminal
states release their transport/concurrency lease while retaining bounded
logical observation needed for retry or classification.

Unknown outcomes additionally retain a logical conflict claim after transport
release. Single-flight callers join it, queue callers remain FIFO behind it,
and latest-wins callers receive a safe typed block by default. Recordless
disposal closes the logical lifecycle with `abandoned`. Queue positions are
one-based waiting snapshots. Retry reacquisition compares the expected logical
owner and never deletes a claim by conflict key alone. Live cancellation and
local abandonment are separate outcomes.
