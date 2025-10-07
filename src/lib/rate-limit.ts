import { NextRequest, NextResponse } from 'next/server'
import { LRUCache } from 'lru-cache'

interface RateLimitOptions {
  interval: number // Time window in ms
  uniqueTokenPerInterval: number // Max number of unique tokens (IPs) to track
}

interface RateLimitConfig {
  limit: number // Max requests per interval
  interval: number // Time window in ms
}

/**
 * Rate limiter using in-memory LRU cache
 * For production, consider using Redis for distributed rate limiting
 */
export class RateLimiter {
  private tokenCache: LRUCache<string, number[]>

  constructor(options: RateLimitOptions) {
    this.tokenCache = new LRUCache({
      max: options.uniqueTokenPerInterval,
      ttl: options.interval,
    })
  }

  check(limit: number, token: string): { success: boolean; remaining: number; reset: number } {
    const now = Date.now()
    const tokenCount = this.tokenCache.get(token) || []

    // Filter out expired timestamps
    const validTokens = tokenCount.filter(timestamp => now - timestamp < this.tokenCache.ttl!)

    if (validTokens.length >= limit) {
      const oldestToken = validTokens[0]
      const reset = oldestToken + this.tokenCache.ttl!

      return {
        success: false,
        remaining: 0,
        reset: Math.ceil((reset - now) / 1000), // Seconds until reset
      }
    }

    validTokens.push(now)
    this.tokenCache.set(token, validTokens)

    return {
      success: true,
      remaining: limit - validTokens.length,
      reset: Math.ceil(this.tokenCache.ttl! / 1000),
    }
  }
}

// Default rate limiters for different route types
export const rateLimiters = {
  // Strict rate limit for auth endpoints (5 requests per minute)
  auth: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
  }),

  // Standard API rate limit (100 requests per minute)
  api: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
  }),

  // Relaxed rate limit for read-only endpoints (200 requests per minute)
  read: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
  }),
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = { limit: 100, interval: 60000 }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Get identifier (IP address or user ID)
    const identifier =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      req.ip ||
      'anonymous'

    // Determine which rate limiter to use based on path
    let limiter = rateLimiters.api
    let limit = config.limit

    if (req.nextUrl.pathname.includes('/auth/')) {
      limiter = rateLimiters.auth
      limit = 5
    } else if (req.method === 'GET') {
      limiter = rateLimiters.read
      limit = 200
    }

    const result = limiter.check(limit, identifier)

    // Add rate limit headers
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', limit.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
    headers.set('X-RateLimit-Reset', result.reset.toString())

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${result.reset} seconds.`,
        }),
        {
          status: 429,
          headers: {
            ...Object.fromEntries(headers),
            'Content-Type': 'application/json',
            'Retry-After': result.reset.toString(),
          },
        }
      )
    }

    const response = await handler(req)

    // Add rate limit headers to successful response
    headers.forEach((value, key) => {
      response.headers.set(key, value)
    })

    return response
  }
}

/**
 * Simple rate limit check for use in API routes
 */
export function checkRateLimit(
  identifier: string,
  type: 'auth' | 'api' | 'read' = 'api'
): { allowed: boolean; remaining: number; reset: number } {
  const limits = {
    auth: 5,
    api: 100,
    read: 200,
  }

  const limiter = rateLimiters[type]
  const result = limiter.check(limits[type], identifier)

  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  }
}
