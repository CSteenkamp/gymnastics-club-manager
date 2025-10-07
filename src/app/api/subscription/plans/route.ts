import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET /api/subscription/plans - Get all available plans
export async function GET(request: NextRequest) {
  try {
    // Optional: verify token for authenticated requests
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    let currentPlanId: string | null = null

    if (token) {
      const payload = verifyToken(token)
      if (payload && payload.clubId) {
        const club = await prisma.club.findUnique({
          where: { id: payload.clubId },
          select: { currentSubscriptionId: true }
        })

        if (club?.currentSubscriptionId) {
          const subscription = await prisma.subscriptions.findUnique({
            where: { id: club.currentSubscriptionId },
            select: { planId: true }
          })
          currentPlanId = subscription?.planId || null
        }
      }
    }

    // Get all active plans
    const plans = await prisma.subscription_plans.findMany({
      where: { isActive: true },
      orderBy: [
        { interval: 'asc' }, // MONTHLY first, then QUARTERLY, then ANNUALLY
        { price: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        interval: true,
        maxStudents: true,
        features: true,
        trialDays: true
      }
    })

    const plansWithCurrentFlag = plans.map(plan => ({
      ...plan,
      isCurrent: currentPlanId === plan.id,
      price: Number(plan.price)
    }))

    return NextResponse.json({
      success: true,
      data: plansWithCurrentFlag
    })

  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
