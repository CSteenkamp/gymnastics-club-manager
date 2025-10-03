import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

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
  '/api/credits'
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
  '/api/credits'
]

// Define super admin-only routes
const superAdminRoutes = [
  '/super-admin',
  '/api/clubs'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // TEMPORARY: Allow all access in development for testing
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔧 [DEV] Allowing access to ${pathname}`)
    return NextResponse.next()
  }
  
  // Check if this is a public route that should never be protected
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  if (!isProtectedRoute) {
    return NextResponse.next()
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

  // Verify token
  const payload = verifyToken(token)
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔐 [${pathname}] Token verification:`, payload ? 'SUCCESS' : 'FAILED')
  }
  
  if (!payload) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`❌ [${pathname}] Invalid token - redirecting to login`)
    }
    
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
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ [${pathname}] User authenticated:`, payload.userId, payload.role)
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
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-club-id', payload.clubId)
    requestHeaders.set('x-user-role', payload.role)
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
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