import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { DayOfWeek } from '@prisma/client'

// GET a specific schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: params.id,
        clubId: payload.clubId
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
        enrollments: {
          include: {
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                level: true,
                parents: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            }
          },
          where: {
            isActive: true
          }
        },
        classes: {
          orderBy: {
            date: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    if (!schedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule not found'
      }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: schedule
    })

  } catch (error) {
    console.error('Error fetching schedule:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// UPDATE a schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication (admin/coach only)
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

    // Check if schedule exists and belongs to club
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        id: params.id,
        clubId: payload.clubId
      }
    })

    if (!existingSchedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule not found'
      }, { status: 404 })
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
      description,
      isActive
    } = body

    // Validate time format if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (startTime && !timeRegex.test(startTime)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid startTime format. Use HH:MM format (e.g., 17:00)'
      }, { status: 400 })
    }
    if (endTime && !timeRegex.test(endTime)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid endTime format. Use HH:MM format (e.g., 18:00)'
      }, { status: 400 })
    }

    // Validate dayOfWeek if provided
    if (dayOfWeek) {
      const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
      if (!validDays.includes(dayOfWeek)) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid dayOfWeek. Must be one of: ' + validDays.join(', ')
        }, { status: 400 })
      }
    }

    // Check for schedule conflicts if time/day is being changed
    if (dayOfWeek || startTime || endTime) {
      const newDayOfWeek = dayOfWeek || existingSchedule.dayOfWeek
      const newStartTime = startTime || existingSchedule.startTime
      const newEndTime = endTime || existingSchedule.endTime

      const conflictingSchedule = await prisma.schedule.findFirst({
        where: {
          clubId: payload.clubId,
          dayOfWeek: newDayOfWeek as DayOfWeek,
          isActive: true,
          id: { not: params.id }, // Exclude current schedule
          OR: [
            {
              AND: [
                { startTime: { lte: newStartTime } },
                { endTime: { gt: newStartTime } }
              ]
            },
            {
              AND: [
                { startTime: { lt: newEndTime } },
                { endTime: { gte: newEndTime } }
              ]
            },
            {
              AND: [
                { startTime: { gte: newStartTime } },
                { endTime: { lte: newEndTime } }
              ]
            }
          ]
        }
      })

      if (conflictingSchedule) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: `Schedule conflict detected with "${conflictingSchedule.name}" on ${newDayOfWeek} from ${conflictingSchedule.startTime} to ${conflictingSchedule.endTime}`
        }, { status: 400 })
      }
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

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (level !== undefined) updateData.level = level
    if (coachId !== undefined) updateData.coachId = coachId
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek as DayOfWeek
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (maxCapacity !== undefined) updateData.maxCapacity = maxCapacity
    if (location !== undefined) updateData.location = location
    if (description !== undefined) updateData.description = description
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedSchedule = await prisma.schedule.update({
      where: { id: params.id },
      data: updateData,
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
      data: updatedSchedule,
      message: 'Schedule updated successfully'
    })

  } catch (error) {
    console.error('Error updating schedule:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE a schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!payload || !['ADMIN', 'FINANCE_ADMIN'].includes(payload.role)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Admin access required'
      }, { status: 403 })
    }

    // Check if schedule exists and belongs to club
    const existingSchedule = await prisma.schedule.findFirst({
      where: {
        id: params.id,
        clubId: payload.clubId
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            classes: true
          }
        }
      }
    })

    if (!existingSchedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule not found'
      }, { status: 404 })
    }

    // Check if schedule has enrollments or classes
    if (existingSchedule._count.enrollments > 0 || existingSchedule._count.classes > 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Cannot delete schedule with existing enrollments or classes. Deactivate it instead.'
      }, { status: 400 })
    }

    await prisma.schedule.delete({
      where: { id: params.id }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Schedule deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting schedule:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}