import { NextRequest } from 'next/server'
import { z, ZodSchema } from 'zod'

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json()
  return schema.parse(body)
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): z.infer<T> {
  const { searchParams } = request.nextUrl
  const params = Object.fromEntries(searchParams.entries())
  return schema.parse(params)
}

/**
 * Validate URL parameters against a Zod schema
 */
export function validateParams<T extends ZodSchema>(
  params: any,
  schema: T
): z.infer<T> {
  return schema.parse(params)
}

/**
 * Extract and validate user context from headers
 */
export function getUserContext(request: NextRequest): {
  userId: string
  clubId: string
  role: string
} {
  const userId = request.headers.get('x-user-id')
  const clubId = request.headers.get('x-club-id')
  const role = request.headers.get('x-user-role')

  if (!userId || !clubId || !role) {
    throw new Error('Missing user context in request headers')
  }

  return { userId, clubId, role }
}

/**
 * Check if user has required role
 */
export function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): void {
  const { role } = getUserContext(request)

  if (!allowedRoles.includes(role)) {
    throw new Error(`Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`)
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),

  // ID parameter
  id: z.object({
    id: z.string().cuid(),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  // Search
  search: z.object({
    q: z.string().min(1).optional(),
  }),

  // Sorting
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
}
