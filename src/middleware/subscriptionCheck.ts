import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Routes that don't require subscription check
const EXEMPT_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/signup',
  '/login',
  '/signup',
  '/api/super-admin'
]

export async function checkSubscriptionStatus(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip check for exempt routes
  if (EXEMPT_ROUTES.some(route => pathname.startsWith(route))) {
    return null
  }

  // Get token from header
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return null // Let auth middleware handle this
  }

  try {
    const payload = verifyToken(token)
    if (!payload || !payload.clubId) {
      return null
    }

    // Super admins bypass subscription checks
    if (payload.role === 'SUPER_ADMIN') {
      return null
    }

    // Get club with subscription info
    const club = await prisma.clubs.findUnique({
      where: { id: payload.clubId },
      select: {
        id: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionExpiry: true,
        isActive: true
      }
    })

    if (!club) {
      return NextResponse.json(
        { success: false, error: 'Club not found' },
        { status: 404 }
      )
    }

    // Check if club is suspended
    if (!club.isActive || club.subscriptionStatus === 'SUSPENDED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Your club account has been suspended. Please contact support.',
          code: 'ACCOUNT_SUSPENDED'
        },
        { status: 403 }
      )
    }

    // Check if trial has expired
    if (club.subscriptionStatus === 'TRIAL' && club.trialEndsAt) {
      const now = new Date()
      const trialEnd = new Date(club.trialEndsAt)

      if (now > trialEnd) {
        // Trial expired - update status
        await prisma.clubs.update({
          where: { id: club.id },
          data: {
            subscriptionStatus: 'EXPIRED',
            updatedAt: new Date()
          }
        })

        return NextResponse.json(
          {
            success: false,
            error: 'Your trial period has ended. Please subscribe to continue.',
            code: 'TRIAL_EXPIRED',
            trialEndsAt: club.trialEndsAt
          },
          { status: 402 } // Payment Required
        )
      }
    }

    // Check if subscription has expired
    if (club.subscriptionExpiry) {
      const now = new Date()
      const expiry = new Date(club.subscriptionExpiry)

      if (now > expiry) {
        // Grace period check (7 days)
        const gracePeriodEnd = new Date(expiry)
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7)

        if (now > gracePeriodEnd) {
          // Suspend the club
          await prisma.clubs.update({
            where: { id: club.id },
            data: {
              subscriptionStatus: 'SUSPENDED',
              isActive: false,
              updatedAt: new Date()
            }
          })

          return NextResponse.json(
            {
              success: false,
              error: 'Your subscription has expired and grace period has ended. Please renew to continue.',
              code: 'SUBSCRIPTION_EXPIRED'
            },
            { status: 402 }
          )
        } else {
          // In grace period - show warning but allow access
          const daysLeft = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          // Add warning header
          const response = NextResponse.next()
          response.headers.set('X-Subscription-Warning', `Grace period ends in ${daysLeft} days`)
          return response
        }
      }
    }

    // All checks passed
    return null

  } catch (error) {
    console.error('Subscription check error:', error)
    // Don't block on errors - let the request through
    return null
  }
}

// Helper function to check subscription from API routes
export async function requireActiveSubscription(clubId: string) {
  const club = await prisma.clubs.findUnique({
    where: { id: clubId },
    select: {
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionExpiry: true,
      isActive: true
    }
  })

  if (!club || !club.isActive || club.subscriptionStatus === 'SUSPENDED') {
    throw new Error('ACCOUNT_SUSPENDED')
  }

  if (club.subscriptionStatus === 'TRIAL' && club.trialEndsAt) {
    if (new Date() > new Date(club.trialEndsAt)) {
      throw new Error('TRIAL_EXPIRED')
    }
  }

  if (club.subscriptionExpiry && new Date() > new Date(club.subscriptionExpiry)) {
    const gracePeriodEnd = new Date(club.subscriptionExpiry)
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7)

    if (new Date() > gracePeriodEnd) {
      throw new Error('SUBSCRIPTION_EXPIRED')
    }
  }

  return true
}
