import { describe, it, expect, beforeEach } from 'vitest'
import { hashPassword, comparePassword, generateToken } from '@/lib/auth'
import type { User } from '@prisma/client'

describe('Auth Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(20)
    })

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      const isMatch = await comparePassword(password, hash)

      expect(isMatch).toBe(true)
    })

    it('should return false for non-matching password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      const isMatch = await comparePassword('wrongPassword', hash)

      expect(isMatch).toBe(false)
    })
  })

  describe('generateToken', () => {
    const mockUser: User = {
      id: 'user-123',
      clubId: 'club-123',
      email: 'test@example.com',
      phone: null,
      firstName: 'Test',
      lastName: 'User',
      password: 'hashed-password',
      role: 'PARENT',
      isActive: true,
      emailNotifications: true,
      smsNotifications: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should include user data in token payload', () => {
      const token = generateToken(mockUser)
      const parts = token.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

      expect(payload.userId).toBe(mockUser.id)
      expect(payload.clubId).toBe(mockUser.clubId)
      expect(payload.email).toBe(mockUser.email)
      expect(payload.role).toBe(mockUser.role)
    })
  })
})
