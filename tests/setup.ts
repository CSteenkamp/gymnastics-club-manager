import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach } from 'vitest'

// Set test environment variables
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
  process.env.JWT_EXPIRES_IN = '1h'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  process.env.NODE_ENV = 'test'
})

// Cleanup after each test
afterEach(() => {
  // Reset any mocks or test data
})

// Cleanup after all tests
afterAll(() => {
  // Close database connections, etc.
})
