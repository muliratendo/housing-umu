import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['resources/js/lib/urlm/**/*.test.ts'],
    },
});
