import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// Set test environment variables before running tests
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.JWT_EXPIRES_IN = '1h'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NODE_ENV = 'test'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.config.*',
        '**/dist/**',
        '**/.next/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
