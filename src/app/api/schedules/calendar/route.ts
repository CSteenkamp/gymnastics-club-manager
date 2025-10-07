import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ApiResponse {
  success: boolean
  data?: any
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authorization token required'
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 401 })
    }

    // Get user's children
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        children: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    const childrenIds = user.children.map(c => c.id)

    // Get all schedules with enrollment information
    const schedules = await prisma.schedule.findMany({
      where: {
        clubId: payload.clubId
      },
      include: {
        coach: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        enrollments: {
          where: {
            childId: { in: childrenIds },
            isActive: true
          },
          select: {
            id: true,
            childId: true
          }
        },
        _count: {
          select: {
            enrollments: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    })

    // Transform data to include enrollment status
    const schedulesWithEnrollment = schedules.map(schedule => ({
      id: schedule.id,
      name: schedule.name,
      level: schedule.level,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      maxCapacity: schedule.maxCapacity,
      currentEnrollment: schedule._count.enrollments,
      venue: schedule.venue,
      coach: schedule.coach,
      isEnrolled: schedule.enrollments.length > 0,
      enrolledChildren: schedule.enrollments.map(e => e.childId),
      isExtraLesson: schedule.isExtraLesson || false // Assuming we add this field
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: schedulesWithEnrollment
    })

  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Failed to fetch schedules'
    }, { status: 500 })
  }
}
