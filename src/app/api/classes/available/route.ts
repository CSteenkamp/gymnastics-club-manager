import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET - Fetch available classes for enrollment
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

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')

    // Get all active schedules
    const schedules = await prisma.schedule.findMany({
      where: {
        clubId: payload.clubId,
        isActive: true
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true
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

    // If childId provided, get enrolled classes
    let enrolledScheduleIds: string[] = []
    if (childId) {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          childId,
          isActive: true
        },
        select: {
          scheduleId: true
        }
      })
      enrolledScheduleIds = enrollments.map(e => e.scheduleId)
    }

    // Format response
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      level: schedule.level,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      maxCapacity: schedule.maxCapacity,
      currentEnrollment: schedule._count.enrollments,
      venue: schedule.location || 'TBD',
      coach: schedule.users,
      isEnrolled: childId ? enrolledScheduleIds.includes(schedule.id) : false,
      enrolledChildren: childId && enrolledScheduleIds.includes(schedule.id) ? [childId] : []
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: formattedSchedules
    })

  } catch (error) {
    console.error('Error fetching available classes:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
