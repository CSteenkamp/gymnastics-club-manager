import { describe, it, expect } from 'vitest'
import { verifyTokenEdge, generateTokenEdge } from '@/lib/auth-edge'
import type { JWTPayload } from '@/lib/auth-edge'

describe('Edge Auth Utils', () => {
  const mockPayload: JWTPayload = {
    userId: 'user-123',
    clubId: 'club-123',
    email: 'test@example.com',
    role: 'ADMIN',
  }

  describe('generateTokenEdge', () => {
    it('should generate a valid JWT token', async () => {
      const token = await generateTokenEdge(mockPayload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })
  })

  describe('verifyTokenEdge', () => {
    it('should verify a valid token', async () => {
      const token = await generateTokenEdge(mockPayload)
      const verified = await verifyTokenEdge(token)

      expect(verified).toBeDefined()
      expect(verified?.userId).toBe(mockPayload.userId)
      expect(verified?.clubId).toBe(mockPayload.clubId)
      expect(verified?.email).toBe(mockPayload.email)
      expect(verified?.role).toBe(mockPayload.role)
    })

    it('should return null for invalid token', async () => {
      const verified = await verifyTokenEdge('invalid-token')

      expect(verified).toBeNull()
    })

    it('should return null for tampered token', async () => {
      const token = await generateTokenEdge(mockPayload)
      const tamperedToken = token.slice(0, -5) + 'XXXXX'
      const verified = await verifyTokenEdge(tamperedToken)

      expect(verified).toBeNull()
    })

    it('should return null for token missing required fields', async () => {
      const incompletePayload = {
        userId: 'user-123',
        // Missing clubId, email, role
      } as any

      const token = await generateTokenEdge(incompletePayload)
      const verified = await verifyTokenEdge(token)

      expect(verified).toBeNull()
    })
  })
})
