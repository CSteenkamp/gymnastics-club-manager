import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { DayOfWeek } from '@prisma/client'
import { randomUUID } from 'crypto'

// GET all schedules for a club
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
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
    const level = searchParams.get('level')
    const dayOfWeek = searchParams.get('dayOfWeek')
    const isActive = searchParams.get('isActive')

    const where: any = {
      clubId: payload.clubId
    }

    if (level) where.level = level
    if (dayOfWeek) where.dayOfWeek = dayOfWeek as DayOfWeek
    if (isActive !== null) where.isActive = isActive === 'true'

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        enrollments: {
          include: {
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                level: true
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    })

    // Transform the data to match frontend expectations
    const transformedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      name: schedule.name,
      description: schedule.description || '',
      level: schedule.level,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      maxCapacity: schedule.maxCapacity,
      currentEnrollment: schedule._count.enrollments,
      venue: schedule.location || '',
      isActive: schedule.isActive,
      coach: schedule.coach,
      enrollments: schedule.enrollments
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: transformedSchedules
    })

  } catch (error) {
    console.error('Error fetching schedules:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// CREATE a new schedule
export async function POST(request: NextRequest) {
  try {
    // Verify authentication (admin only)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || !['ADMIN', 'FINANCE_ADMIN', 'COACH'].includes(payload.role)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Admin or coach access required'
      }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      level,
      coachId,
      dayOfWeek,
      startTime,
      endTime,
      maxCapacity,
      location,
      description
    } = body

    // Validate required fields
    if (!name || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: name, dayOfWeek, startTime, endTime'
      }, { status: 400 })
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid time format. Use HH:MM format (e.g., 17:00)'
      }, { status: 400 })
    }

    // Convert day names to enum values
    const dayMapping: { [key: string]: DayOfWeek } = {
      'Monday': 'MONDAY',
      'Tuesday': 'TUESDAY', 
      'Wednesday': 'WEDNESDAY',
      'Thursday': 'THURSDAY',
      'Friday': 'FRIDAY',
      'Saturday': 'SATURDAY',
      'Sunday': 'SUNDAY'
    }
    
    const mappedDay = dayMapping[dayOfWeek] || dayOfWeek
    const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    if (!validDays.includes(mappedDay)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid dayOfWeek. Must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday'
      }, { status: 400 })
    }

    // Check for schedule conflicts (same time slot)
    const conflictingSchedule = await prisma.schedule.findFirst({
      where: {
        clubId: payload.clubId,
        dayOfWeek: mappedDay as DayOfWeek,
        isActive: true,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      }
    })

    if (conflictingSchedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Schedule conflict detected with "${conflictingSchedule.name}" on ${dayOfWeek} from ${conflictingSchedule.startTime} to ${conflictingSchedule.endTime}`
      }, { status: 400 })
    }

    // Verify coach exists if provided
    if (coachId) {
      const coach = await prisma.user.findFirst({
        where: {
          id: coachId,
          clubId: payload.clubId,
          role: { in: ['COACH', 'ADMIN'] },
          isActive: true
        }
      })

      if (!coach) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid coach ID or coach not found'
        }, { status: 400 })
      }
    }

    const schedule = await prisma.schedule.create({
      data: {
        id: randomUUID(),
        clubId: payload.clubId,
        name,
        level,
        coachId: coachId || null,
        dayOfWeek: mappedDay as DayOfWeek,
        startTime,
        endTime,
        maxCapacity: maxCapacity || 12,
        location,
        description,
        updatedAt: new Date()
      },
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: schedule,
      message: 'Schedule created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating schedule:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}