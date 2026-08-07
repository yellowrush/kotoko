import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Cold buildApp() bootstrap (loads 137 places + media) can exceed the
    // 5s default on slower CI/sandbox machines; 20s keeps the suite stable.
    testTimeout: 20000,
  },
});