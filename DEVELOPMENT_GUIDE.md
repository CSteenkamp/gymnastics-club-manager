# Development Guide

This guide covers best practices and patterns for developing API routes in this application.

## Security Improvements Implemented

### 1. JWT Authentication
- ✅ Removed development JWT bypass in middleware
- ✅ Implemented edge-compatible JWT verification using `jose` library
- ✅ Removed default JWT secret fallback (now fails fast if not configured)
- ✅ All environments use proper JWT signature verification

### 2. Rate Limiting
- ✅ Added rate limiting for all API routes
- ✅ Different limits for auth endpoints (5/min), API endpoints (100/min), and read endpoints (200/min)
- ✅ Rate limit headers included in responses

### 3. Error Handling
- ✅ Centralized error handling with `handleAPIError`
- ✅ Consistent error response format
- ✅ Production-safe error messages (no internal details leaked)
- ✅ Proper logging of all errors

### 4. Validation
- ✅ Request validation using Zod schemas
- ✅ Helper functions for body, query, and param validation
- ✅ Common validation schemas for pagination, sorting, etc.

### 5. Logging
- ✅ Structured logging with different levels (info, warn, error, debug)
- ✅ Request-scoped logging with context
- ✅ Production-ready JSON logging format

## API Route Template

Here's the recommended pattern for creating new API routes:

```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandler, successResponse, errors } from '@/lib/api-error'
import { validateBody, getUserContext, requireRole } from '@/lib/validate'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

// Define validation schema
const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  amount: z.number().positive(),
})

// POST /api/items
export const POST = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now()

  // Get user context (set by middleware)
  const { userId, clubId, role } = getUserContext(request)

  // Check permissions
  requireRole(request, ['ADMIN', 'FINANCE_ADMIN'])

  // Validate request body
  const data = await validateBody(request, createItemSchema)

  logger.info('Creating new item', { userId, clubId, itemName: data.name })

  // Business logic
  const item = await prisma.item.create({
    data: {
      ...data,
      clubId,
      createdBy: userId,
    },
  })

  logger.info('Item created successfully', {
    userId,
    clubId,
    itemId: item.id,
    duration: Date.now() - startTime
  })

  return successResponse(item, 201)
})

// GET /api/items
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userId, clubId } = getUserContext(request)

  // Validate query parameters
  const { page, limit } = validateQuery(request, commonSchemas.pagination)

  logger.debug('Fetching items', { userId, clubId, page, limit })

  const items = await prisma.item.findMany({
    where: { clubId },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  })

  const total = await prisma.item.count({ where: { clubId } })

  return successResponse({
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
})
```

## Migration Checklist

When updating existing API routes:

- [ ] Wrap handler with `withErrorHandler`
- [ ] Replace `console.log`/`console.error` with `logger` methods
- [ ] Add request validation using Zod schemas
- [ ] Use `getUserContext` instead of manually reading headers
- [ ] Use `successResponse` for successful responses
- [ ] Use `errors.*` factories for error responses
- [ ] Add proper logging with context

## Environment Variables

Required environment variables:

```bash
# JWT Configuration (REQUIRED - no defaults)
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"

# Database
DATABASE_URL="postgresql://..."

# ... other variables
```

The application will fail to start if `JWT_SECRET` is not set.

## Testing

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

### Writing Tests
```typescript
import { POST } from '@/app/api/items/route'
import { NextRequest } from 'next/server'

describe('POST /api/items', () => {
  it('should create an item with valid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        amount: 100,
      }),
      headers: {
        'x-user-id': 'user-123',
        'x-club-id': 'club-123',
        'x-user-role': 'ADMIN',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('Test Item')
  })

  it('should return 400 for invalid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: '' }), // Invalid: empty name
      headers: {
        'x-user-id': 'user-123',
        'x-club-id': 'club-123',
        'x-user-role': 'ADMIN',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })
})
```

## Common Patterns

### Handling Database Transactions
```typescript
import { prisma } from '@/lib/prisma'

const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData })
  const profile = await tx.profile.create({ data: { userId: user.id, ...profileData } })
  return { user, profile }
})
```

### Pagination
```typescript
import { commonSchemas } from '@/lib/validate'

const { page, limit } = validateQuery(request, commonSchemas.pagination)

const items = await prisma.item.findMany({
  skip: (page - 1) * limit,
  take: limit,
})

const total = await prisma.item.count()
```

### File Uploads
```typescript
import { writeFile } from 'fs/promises'
import { join } from 'path'

const formData = await request.formData()
const file = formData.get('file') as File

const bytes = await file.arrayBuffer()
const buffer = Buffer.from(bytes)

const path = join(process.cwd(), 'uploads', file.name)
await writeFile(path, buffer)
```

## Performance Tips

1. **Use database indexes** for frequently queried fields
2. **Implement cursor-based pagination** for large datasets
3. **Use select** to only fetch required fields
4. **Cache frequently accessed data** using Redis
5. **Use database transactions** for multi-step operations

## Security Checklist

- [ ] All sensitive routes are behind authentication
- [ ] Role-based access control is implemented
- [ ] Input validation is performed on all endpoints
- [ ] Rate limiting is configured appropriately
- [ ] SQL injection is prevented (using Prisma)
- [ ] XSS is prevented (React escapes by default)
- [ ] CSRF protection is in place for state-changing operations
- [ ] Secrets are stored in environment variables, not code
- [ ] Error messages don't leak sensitive information

## Resources

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zod Documentation](https://zod.dev)
- [jose JWT Library](https://github.com/panva/jose)
