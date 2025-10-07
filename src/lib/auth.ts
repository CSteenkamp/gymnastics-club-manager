import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { User } from '@prisma/client'

// Fail fast if JWT_SECRET is not configured
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set')
}

const JWT_SECRET: string = process.env.JWT_SECRET
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d'

export interface JWTPayload {
  userId: string
  clubId: string
  email: string
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    clubId: user.clubId,
    email: user.email,
    role: user.role,
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    // Additional validation
    if (!decoded.userId || !decoded.role || !decoded.clubId) {
      return null
    }
    return decoded
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}