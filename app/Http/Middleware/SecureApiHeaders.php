<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * =============================================================================
 * FILE: app/Http/Middleware/SecureApiHeaders.php
 * PURPOSE: Baseline security headers (PortSwigger Web Security Academy
 * guidance) — CSP, clickjacking, MIME-sniffing, referrer, HSTS.
 *
 * FIX (2026-08-14): The previous dev-mode CSP allowed the Vite origin
 * (localhost:5173) for scripts/styles/connect, but NOT for fonts. You're
 * using `@fontsource-variable/inter`, an npm package served locally by Vite
 * from node_modules — those .woff2 files come from localhost:5173, not from
 * fonts.bunny.net, so `font-src 'self' https://fonts.bunny.net` blocked them.
 *
 * SOLUTION: add the Vite origin to `font-src` as well, dev-only.
 * =============================================================================
 */
class SecureApiHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Content-Security-Policy', $this->buildCsp());
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        return $response;
    }

    private function buildCsp(): string
    {
        // PRODUCTION: unchanged, maximally strict. In production your build
        // step bundles @fontsource-variable/inter's .woff2 files into your
        // own public/build/assets/ directory, so they're served from 'self'
        // — no extra font-src entries are needed there.
        if (! app()->environment(['local', 'development'])) {
            return "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                 . "font-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none';";
        }

        // LOCAL/DEV ONLY: Vite dev server origin needs to be allowed for
        // scripts (HMR), styles, connect (websocket), AND fonts (since
        // @fontsource npm packages are served raw from node_modules via
        // Vite in dev, not pre-bundled like in production).
        $viteOrigin = 'http://localhost:5173';
        $viteWs     = 'ws://localhost:5173';

        return "default-src 'self'; "
             . "script-src 'self' 'unsafe-inline' 'unsafe-eval' {$viteOrigin}; "
             . "style-src 'self' 'unsafe-inline' https://fonts.bunny.net {$viteOrigin}; "
             . "font-src 'self' https://fonts.bunny.net {$viteOrigin}; "
             . "connect-src 'self' {$viteOrigin} {$viteWs}; "
             . "img-src 'self' data: {$viteOrigin}; "
             . "object-src 'none'; frame-ancestors 'none';";
    }
}
