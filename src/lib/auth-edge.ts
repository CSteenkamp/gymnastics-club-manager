import { jwtVerify, SignJWT } from 'jose'

// Edge-compatible JWT utilities using jose library
// This file is used in middleware and other edge runtime contexts

export interface JWTPayload {
  userId: string
  clubId: string
  email: string
  role: string
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * Get JWT secret as Uint8Array (lazy-loaded)
 */
function getJWTSecret(): Uint8Array {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set')
  }
  // In Node.js, use Buffer.from instead of TextEncoder for better compatibility
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(process.env.JWT_SECRET, 'utf-8'))
  }
  // Fallback to TextEncoder for edge runtime
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

/**
 * Verify a JWT token in edge runtime (middleware)
 * Returns the payload if valid, null if invalid
 */
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret())

    // Validate required fields
    if (!payload.userId || !payload.clubId || !payload.email || !payload.role) {
      return null
    }

    return {
      userId: payload.userId as string,
      clubId: payload.clubId as string,
      email: payload.email as string,
      role: payload.role as string,
    }
  } catch (error) {
    // Token verification failed (expired, invalid signature, etc.)
    return null
  }
}

/**
 * Generate a JWT token in edge runtime
 */
export async function generateTokenEdge(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT({ ...payload } as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getJWTSecret())

  return token
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}
