import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid token'
      }, { status: 401 })
    }

    // Check if user is super admin
    if (payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access denied. Super admin only.'
      }, { status: 403 })
    }

    // Get all clubs with counts
    const clubs = await prisma.club.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        studentCount: true,
        isActive: true,
        createdAt: true,
        trialEndsAt: true,
        _count: {
          select: {
            children: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate stats
    const totalClubs = clubs.length
    const activeClubs = clubs.filter(c => c.subscriptionStatus === 'ACTIVE' && c.isActive).length
    const trialingClubs = clubs.filter(c =>
      c.subscriptionStatus === 'TRIAL' ||
      (c.trialEndsAt && new Date(c.trialEndsAt) > new Date())
    ).length
    const suspendedClubs = clubs.filter(c => c.subscriptionStatus === 'SUSPENDED' || !c.isActive).length

    const totalStudents = clubs.reduce((sum, club) => sum + (club.studentCount || club._count.children), 0)

    // Get subscription data for MRR calculation
    const activeSubscriptions = await prisma.subscriptions.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'TRIALING']
        }
      },
      include: {
        plan: true
      }
    })

    // Calculate MRR (Monthly Recurring Revenue)
    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => {
      if (sub.plan.interval === 'MONTHLY') {
        return sum + Number(sub.plan.price)
      } else if (sub.plan.interval === 'ANNUALLY') {
        return sum + (Number(sub.plan.price) / 12)
      } else if (sub.plan.interval === 'QUARTERLY') {
        return sum + (Number(sub.plan.price) / 3)
      }
      return sum
    }, 0)

    // Get total revenue from platform payments
    const totalRevenueResult = await prisma.platform_payments.aggregate({
      where: {
        status: 'SUCCEEDED'
      },
      _sum: {
        amount: true
      }
    })

    const totalRevenue = Number(totalRevenueResult._sum.amount || 0)

    // Get recent clubs (last 10)
    const recentClubs = clubs.slice(0, 10).map(club => ({
      id: club.id,
      name: club.name,
      slug: club.slug,
      subscriptionStatus: club.subscriptionStatus,
      studentCount: club.studentCount || club._count.children,
      createdAt: club.createdAt,
      trialEndsAt: club.trialEndsAt
    }))

    // Calculate churn rate (simplified - last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const churnedClubs = await prisma.club.count({
      where: {
        subscriptionStatus: 'CANCELLED',
        updatedAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    const churnRate = totalClubs > 0 ? (churnedClubs / totalClubs) * 100 : 0

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        stats: {
          totalClubs,
          activeClubs,
          trialingClubs,
          suspendedClubs,
          totalRevenue,
          monthlyRecurringRevenue,
          totalStudents,
          churnRate: Math.round(churnRate * 100) / 100
        },
        recentClubs
      }
    })

  } catch (error) {
    console.error('Error fetching super admin stats:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
