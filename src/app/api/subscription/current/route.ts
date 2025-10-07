import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload || !payload.clubId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Fetch club with subscription info
    const club = await prisma.club.findUnique({
      where: { id: payload.clubId },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionExpiry: true,
        studentCount: true,
        currentSubscriptionId: true
      }
    })

    if (!club) {
      return NextResponse.json(
        { success: false, error: 'Club not found' },
        { status: 404 }
      )
    }

    // Fetch current subscription if exists
    let subscription = null
    if (club.currentSubscriptionId) {
      subscription = await prisma.subscriptions.findUnique({
        where: { id: club.currentSubscriptionId },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
              interval: true,
              maxStudents: true,
              features: true
            }
          }
        }
      })
    }

    // Fetch recent payment history (last 10 payments)
    const payments = await prisma.platform_payments.findMany({
      where: { clubId: club.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paidAt: true,
        createdAt: true,
        stripeInvoiceId: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        club: {
          name: club.name,
          email: club.email,
          subscriptionStatus: club.subscriptionStatus,
          trialEndsAt: club.trialEndsAt,
          studentCount: club.studentCount
        },
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialStart: subscription.trialStart,
          trialEnd: subscription.trialEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          plan: {
            id: subscription.plan.id,
            name: subscription.plan.name,
            description: subscription.plan.description,
            price: subscription.plan.price,
            currency: subscription.plan.currency,
            interval: subscription.plan.interval,
            maxStudents: subscription.plan.maxStudents,
            features: subscription.plan.features
          }
        } : null,
        payments: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          paidAt: p.paidAt,
          createdAt: p.createdAt,
          invoiceId: p.stripeInvoiceId
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching subscription data:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
