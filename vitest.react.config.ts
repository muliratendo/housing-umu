import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(process.cwd(), 'resources/js'),
        },
    },
    test: {
        environment: 'jsdom',
        include: ['resources/js/test/react/**/*.test.tsx'],
        setupFiles: ['./resources/js/test/react/setup.ts'],
        maxWorkers: 1,
        fileParallelism: false,
    },
});
