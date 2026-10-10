<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Spatie\Permission\Middleware\{ PermissionMiddleware, RoleMiddleware, RoleOrPermissionMiddleware };
use App\Http\Middleware\{ SecureApiHeaders, RedirectAuthenticatedFromAuthPages };
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->statefulApi();

        $middleware->trustProxies(at: '*'); // 👈 Tells Laravel to trust Render's HTTPS headers

        $middleware->alias([
            'role'               => RoleMiddleware::class,
            'permission'         => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'redirect.authenticated' => RedirectAuthenticatedFromAuthPages::class,
        ]);

        // NEW: registers the security headers middleware (CSP, X-Frame-Options,
        // etc.) on every request via the global middleware stack. Appended
        // here rather than inside ->web() since it should apply to API
        // responses too, not just the web/Inertia session-based routes.
        $middleware->append(SecureApiHeaders::class);

    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // NEW: ensures API (and any JSON-expecting) request that throws an
        // unhandled exception gets a JSON error response instead of Laravel's
        // default HTML error page. Kept alongside the custom ->render()
        // override below — this only controls the *format* Laravel falls
        // back to, while ->render() below fully takes over the response body
        // for API/JSON requests.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // NEW: custom renderer for API/JSON exceptions. Generates or reuses a
        // correlation ID (from the X-Correlation-Id request header, falling
        // back to a freshly generated one) so errors can be traced end-to-end
        // across client, server logs, and support tickets. Delegates the
        // actual error-shape logic to ApiExceptionRenderer, keeping this file
        // focused on wiring rather than formatting.
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $correlationId = $request->header('X-Correlation-Id')
                    ?? \App\Services\ApiExceptionRenderer::newCorrelationId();

                $result = (new \App\Services\ApiExceptionRenderer())->render($e, $correlationId);

                return response()->json($result['body'], $result['status']);
            }
        });
    })->create();
