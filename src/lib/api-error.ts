import { NextResponse } from 'next/server'
import { logger } from './logger'
import { ZodError } from 'zod'

/**
 * Standard API error class
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Error response format
 */
interface ErrorResponse {
  error: {
    message: string
    code?: string
    details?: any
  }
}

/**
 * Handle API errors and return formatted response
 */
export function handleAPIError(error: unknown, context?: string): NextResponse<ErrorResponse> {
  // Zod validation errors
  if (error instanceof ZodError) {
    logger.warn('Validation error', { context, errors: error.issues })
    return NextResponse.json(
      {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
      },
      { status: 400 }
    )
  }

  // Custom API errors
  if (error instanceof APIError) {
    const isServerError = error.statusCode >= 500

    if (isServerError) {
      logger.error(error.message, error, { context, code: error.code })
    } else {
      logger.warn(error.message, { context, code: error.code })
    }

    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      { status: error.statusCode }
    )
  }

  // Generic errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  logger.error('Unhandled error', error, { context })

  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production'
  return NextResponse.json(
    {
      error: {
        message: isProduction ? 'Internal server error' : message,
        code: 'INTERNAL_ERROR',
      },
    },
    { status: 500 }
  )
}

/**
 * Common error factories
 */
export const errors = {
  unauthorized: (message = 'Unauthorized') =>
    new APIError(401, message, 'UNAUTHORIZED'),

  forbidden: (message = 'Forbidden') =>
    new APIError(403, message, 'FORBIDDEN'),

  notFound: (resource = 'Resource', message?: string) =>
    new APIError(404, message || `${resource} not found`, 'NOT_FOUND'),

  badRequest: (message = 'Bad request', details?: any) =>
    new APIError(400, message, 'BAD_REQUEST', details),

  conflict: (message = 'Resource conflict', details?: any) =>
    new APIError(409, message, 'CONFLICT', details),

  unprocessable: (message = 'Unprocessable entity', details?: any) =>
    new APIError(422, message, 'UNPROCESSABLE', details),

  tooManyRequests: (message = 'Too many requests') =>
    new APIError(429, message, 'RATE_LIMIT_EXCEEDED'),

  internal: (message = 'Internal server error') =>
    new APIError(500, message, 'INTERNAL_ERROR'),

  serviceUnavailable: (message = 'Service unavailable') =>
    new APIError(503, message, 'SERVICE_UNAVAILABLE'),
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status = 200): NextResponse<{ success: true; data: T }> {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleAPIError(error, handler.name)
    }
  }
}
