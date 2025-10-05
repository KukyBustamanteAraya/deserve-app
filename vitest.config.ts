import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',               // API/integration tests use Node fetch
    include: ['__tests__/**/*.test.ts'],
    globals: true,
    reporters: 'default',
    timeout: 30000,                    // 30s for network calls to localhost
    env: {
      BASE_URL: 'http://localhost:3000'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70,
    }
  }
});
