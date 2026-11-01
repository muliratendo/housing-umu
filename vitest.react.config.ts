import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['resources/js/test/react/**/*.test.tsx'],
        setupFiles: ['./resources/js/test/react/setup.ts'],
    },
});
