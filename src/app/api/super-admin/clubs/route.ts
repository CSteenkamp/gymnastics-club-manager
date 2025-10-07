import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET - List all clubs
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
    if (!payload || payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access denied'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}

    if (status && status !== 'ALL') {
      where.subscriptionStatus = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ]
    }

    const clubs = await prisma.club.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        customDomain: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        studentCount: true,
        isActive: true,
        onboardingCompleted: true,
        trialEndsAt: true,
        subscriptionExpiry: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            children: true
          }
        },
        subscription: {
          include: {
            plan: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: clubs
    })

  } catch (error) {
    console.error('Error fetching clubs:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PATCH - Update club status (activate/suspend)
export async function PATCH(request: NextRequest) {
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
    if (!payload || payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Access denied'
      }, { status: 403 })
    }

    const body = await request.json()
    const { clubId, action } = body

    if (!clubId || !action) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Club ID and action are required'
      }, { status: 400 })
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId }
    })

    if (!club) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Club not found'
      }, { status: 404 })
    }

    let updateData: any = {}

    switch (action) {
      case 'ACTIVATE':
        updateData = {
          isActive: true,
          subscriptionStatus: 'ACTIVE'
        }
        break
      case 'SUSPEND':
        updateData = {
          isActive: false,
          subscriptionStatus: 'SUSPENDED'
        }
        break
      case 'CANCEL':
        updateData = {
          subscriptionStatus: 'CANCELLED'
        }
        break
      case 'EXTEND_TRIAL':
        const newTrialEnd = new Date()
        newTrialEnd.setDate(newTrialEnd.getDate() + 14)
        updateData = {
          trialEndsAt: newTrialEnd,
          subscriptionStatus: 'TRIAL'
        }
        break
      default:
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

    const updatedClub = await prisma.club.update({
      where: { id: clubId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedClub,
      message: `Club ${action.toLowerCase()}d successfully`
    })

  } catch (error) {
    console.error('Error updating club:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
