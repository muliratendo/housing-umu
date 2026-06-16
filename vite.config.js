import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react'; // 👈 Switch back to standard plugin
import tailwindcss from '@tailwindcss/vite'; // 👈 1. Make sure this exact line is present

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
  },
});
