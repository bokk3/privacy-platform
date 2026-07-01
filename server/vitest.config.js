import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        fileParallelism: false, // Ensures DB resets don't cross boundaries
        setupFiles: ['./src/tests/setup.js'],
    },
});
