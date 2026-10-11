# Current Request Architecture

## Audit scope

This audit was performed before runtime changes, against the Laravel/Inertia
application and the URLM specification in
`docs/architecture/Housing@UMU Unified Request Lifecycle Model.md`.

## Installed stack

| Area | Observed version/capability |
|---|---|
| PHP | Declared `^8.3`; installed CLI `8.4.24` |
| Laravel | Declared `^13.8`; installed `v13.15.0` |
| Inertia Laravel | Declared `^2.0`; installed `v2.0.24` |
| Inertia React | Declared `^2.3.26`; installed `2.3.26` |
| React | Declared `^18.3.1`; installed `18.3.1` |
| TypeScript | Declared `^6.0.3`; installed `6.0.3` in the package tree |
| Vite | Declared `^8.0.0`; installed `8.0.16` in the package tree |
| Node | Required by the project, but `node` is not installed in the WSL PATH |
| npm | `11.5.2` command resolves, but invokes Windows npm from the UNC context |
| PHP tests | PHPUnit 12 through `php artisan test` |
| Frontend tests/lint | No test runner or lint script is declared in `package.json` |
| Database | MySQL PDO extension is required; test configuration uses `testing` |
| Queue/session/cache in tests | `sync`, array session, array cache |

The repository contains `vendor` and `node_modules`. PHP and Composer execute
from `/home/tendo_mulira/projects/housing-umu` in WSL. The WSL environment has
no Linux `node` binary; `npm` and `npx` resolve to Windows shims and invoke
CMD, which cannot use the UNC working directory. Therefore the frontend
baseline is environmental, not an application build/type error.

## Existing layers

- Laravel web routes use session authentication, Inertia redirects, Form
  Requests, policies/permissions, and controller actions.
- `resources/js/lib/http.ts` provides a small same-origin JSON helper with
  CSRF-cookie support.
- `resources/js/lib/classifyError.ts` and `requestState.ts` define existing
  error/state conventions.
- `resources/js/hooks/useAsyncSection.ts` owns local React state, retries,
  timers, and logging for independent reads.
- Most form mutations use Inertia `useForm` or `router` callbacks; some admin
  components use Axios directly.
- `resources/js/lib/logger.ts` batches client events using a module-level
  queue, an unconditional interval, and a `beforeunload` listener.
- Existing presentation components include loading, error, empty, success,
  section-boundary, stale-failure, and optimistic-button components.
- API routes are separately registered, while session-authenticated dashboard
  section routes intentionally live in `web.php`.

## Current URLM violations and risks

1. There is no shared operation identity, attempt identity, generation check,
   or policy registry.
2. `useAsyncSection` retries by scheduling an unowned `setTimeout`; it does not
   cancel or reject stale attempts.
3. `useAsyncSection` and multiple components use scattered `setState` calls
   rather than one lifecycle reducer.
4. Login wraps an Inertia visit in a Promise and uses a silent-failure wrapper;
   this makes callback settlement and `onFinish` semantics harder to prove.
5. Axios and Inertia mutations do not share headers, cancellation, idempotency,
   or normalized failure handling.
6. The existing logger's interval/listener are not lifecycle-owned and its
   metadata contract permits error details that must be sanitized.
7. There is no durable idempotency record or operation-status reconciliation
   endpoint.
8. There is no correlation middleware that validates/propagates operation
   headers or response correlation headers.
9. The frontend has no global lifecycle/modal coordinator or URLM projection.
10. The repository has no frontend test infrastructure for reducer and
    coordinator invariants.

## Baseline correction

The full PHP suite was rerun without URLM runtime changes. This run stopped
before assertions because the test database host `mysql` could not resolve:
`SQLSTATE[HY000] [2002] php_network_getaddresses: getaddrinfo for mysql failed`.
The earlier connected baseline remains useful evidence: 22 passed and 3
assertion-level failures (login redirect, registration authentication, and
soft-delete expectation). Those failures were present before this correction
pass and were not caused by URLM changes.

## Compatibility boundary

The first implementation should add a framework-neutral URLM core and adapters
without deleting existing hooks or replacing presentation components. Existing
independent reads can be adapted incrementally; authentication and critical
mutations must migrate before old request abstractions are removed.
