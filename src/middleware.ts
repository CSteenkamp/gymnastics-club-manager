import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenEdge, type JWTPayload } from '@/lib/auth-edge'

// Define protected routes
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/super-admin',
  '/api/children',
  '/api/invoices',
  '/api/payments',
  '/api/users',
  '/api/schedules',
  '/api/enrollments',
  '/api/classes',
  '/api/attendance',
  '/api/notifications',
  '/api/fees',
  '/api/fee-types',
  '/api/credits',
  '/api/reports',
  '/api/import'
]

// Define public routes that should never be protected
const publicRoutes = [
  '/api/payments/payfast/itn', // PayFast ITN endpoint
  '/api/payments/yoco/webhook', // Yoco webhook endpoint
  '/api/payments/ozow/notify', // Ozow notification endpoint
  '/api/health',
  '/api/auth/login',
  '/api/auth/register'
]

// Define admin-only routes
const adminRoutes = [
  '/admin',
  '/api/admin',
  '/api/users',
  '/api/schedules',
  '/api/classes',
  '/api/notifications/test',
  '/api/reports',
  '/api/fees',
  '/api/fee-types',
  '/api/credits',
  '/api/import'
]

// Define super admin-only routes
const superAdminRoutes = [
  '/super-admin',
  '/api/clubs'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Extract subdomain for multi-tenant routing
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost:3000'
  let clubSlug: string | null = null

  if (hostname !== mainDomain && !hostname.startsWith('www.')) {
    // Extract subdomain
    const parts = hostname.split('.')

    // For production: club.yourdomain.com
    if (!hostname.includes('localhost') && parts.length > 2) {
      clubSlug = parts[0]
    }
  }

  // Add club slug to headers for tenant context
  const requestHeaders = new Headers(request.headers)
  if (clubSlug) {
    requestHeaders.set('x-club-slug', clubSlug)
  }

  // Check if this is a public route that should never be protected
  const isPublicRoute = publicRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isPublicRoute) {
    return NextResponse.next({
      request: { headers: requestHeaders }
    })
  }

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (!isProtectedRoute) {
    return NextResponse.next({
      request: { headers: requestHeaders }
    })
  }

  // Get token from cookies or authorization header
  let token = request.cookies.get('token')?.value

  // Fallback: authorization header
  if (!token) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '')
    }
  }

  if (!token) {
    // Redirect to login for protected routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Verify token using edge-compatible jose library
  const payload = await verifyTokenEdge(token)

  if (!payload) {
    // Clear invalid token cookie
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({
          success: false,
          error: 'Invalid token'
        }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))

    // Clear the invalid token cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    })

    return response
  }

  // Check super admin access for super admin routes
  const isSuperAdminRoute = superAdminRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isSuperAdminRoute && payload.role !== 'SUPER_ADMIN') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({
        success: false,
        error: 'Super admin access required'
      }, { status: 403 })
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check admin access for admin routes
  const isAdminRoute = adminRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isAdminRoute && !['ADMIN', 'FINANCE_ADMIN', 'COACH'].includes(payload.role)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Add user info to headers for API routes
  if (pathname.startsWith('/api/')) {
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-club-id', payload.clubId)
    requestHeaders.set('x-user-role', payload.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next({
    request: { headers: requestHeaders }
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}