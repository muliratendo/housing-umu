import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react'; // 👈 Switch back to standard plugin
import tailwindcss from '@tailwindcss/vite'; // 👈 1. Make sure this exact line is present

/**
 * FILE: vite.config.js
 *
 * FIX (2026-09-12): merged the WSL/Docker Sail HMR fix into your existing
 * config instead of replacing it. Your plugin list, plugin order, the
 * Tailwind-before-React-before-Laravel ordering, and the `@` alias are
 * unchanged — only `server` and `resolve.dedupe` were added.
 *
 * WHY `server` WAS MISSING BEFORE:
 * Vite's dev server runs inside the Sail Docker container. Your browser
 * (on Windows/WSL) talks to it over a WebSocket for Hot Module Replacement.
 * Without an explicit `server.hmr.host`/`port`, that WebSocket connects once
 * on page load but then repeatedly drops — this is what produced
 * "[vite] connected." immediately followed by
 * "[vite] server connection lost. Polling for restart...". Each
 * drop-and-reconnect cycle is what can leave a stale React module instance
 * in memory alongside a freshly reloaded one, which is what then crashed
 * Inertia's `usePage()` with "Invalid hook call... dispatcher is null"
 * during a page swap.
 *
 * WHY `resolve.dedupe` WAS ADDED:
 * Guards against a duplicate React module instance if two different
 * resolution paths for react/react-dom/@inertiajs/react ever end up in the
 * dependency graph — a common outcome of installing node_modules once on
 * the Windows filesystem and again inside WSL/the Sail container. Vite will
 * always resolve these three packages to a single physical copy instead of
 * whichever one a given import path happens to reach first.
 */
export default defineConfig({
    plugins: [
        tailwindcss(), // 👈 Ensure the Tailwind plugin runs BEFORE the laravel/react plugins
        react(), // 👈 Revert to the native, now optimized react plugin
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'], // 👈 Change extension to .tsx
            refresh: true,
        }),
    ],

    resolve: {
        alias: {
            '@': '/resources/js',
        },

        // FIX: forces a single physical copy of these packages regardless
        // of which import path resolves them first. Prevents the
        // "two React copies loaded at once" failure mode that produces
        // "Invalid hook call... dispatcher is null" errors.
        dedupe: ['react', 'react-dom', '@inertiajs/react'],
    },

    // FIX: makes the Vite dev server reachable and reconnectable from the
    // browser running outside the Docker container (WSL/Windows host).
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
            // The browser connects to this host/port for the HMR
            // WebSocket. 'localhost' matches how you already open the app
            // (http://localhost), so the browser can always reach it,
            // regardless of the container's internal hostname.
            host: 'localhost',
            protocol: 'ws',
            port: 5173,
        },
    },
});
