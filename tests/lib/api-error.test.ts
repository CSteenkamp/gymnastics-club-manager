import { describe, it, expect } from 'vitest'
import { APIError, errors, handleAPIError } from '@/lib/api-error'
import { ZodError, z } from 'zod'

describe('API Error Handling', () => {
  describe('APIError', () => {
    it('should create error with all properties', () => {
      const error = new APIError(404, 'Resource not found', 'NOT_FOUND', { id: '123' })

      expect(error.statusCode).toBe(404)
      expect(error.message).toBe('Resource not found')
      expect(error.code).toBe('NOT_FOUND')
      expect(error.details).toEqual({ id: '123' })
    })
  })

  describe('error factories', () => {
    it('should create unauthorized error', () => {
      const error = errors.unauthorized()

      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('UNAUTHORIZED')
    })

    it('should create forbidden error', () => {
      const error = errors.forbidden()

      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('FORBIDDEN')
    })

    it('should create not found error', () => {
      const error = errors.notFound('User')

      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toContain('User')
    })

    it('should create bad request error', () => {
      const error = errors.badRequest('Invalid input', { field: 'email' })

      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('BAD_REQUEST')
      expect(error.details).toEqual({ field: 'email' })
    })

    it('should create rate limit error', () => {
      const error = errors.tooManyRequests()

      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('handleAPIError', () => {
    it('should handle APIError correctly', () => {
      const error = errors.notFound('User', 'User not found')
      const response = handleAPIError(error)

      expect(response.status).toBe(404)
    })

    it('should handle ZodError with validation details', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      })

      try {
        schema.parse({ email: 'invalid', age: 10 })
      } catch (error) {
        const response = handleAPIError(error)

        expect(response.status).toBe(400)
      }
    })

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong')
      const response = handleAPIError(error)

      expect(response.status).toBe(500)
    })

    it('should handle unknown errors', () => {
      const error = 'String error'
      const response = handleAPIError(error)

      expect(response.status).toBe(500)
    })
  })
})
