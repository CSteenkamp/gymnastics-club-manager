import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET enrollments (with filtering)
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
    const scheduleId = searchParams.get('scheduleId')
    const childId = searchParams.get('childId')
    const isActive = searchParams.get('isActive')

    const where: any = {
      clubId: payload.clubId
    }

    if (scheduleId) where.scheduleId = scheduleId
    if (childId) where.childId = childId
    if (isActive !== null) where.isActive = isActive === 'true'

    // For parents, only show their children's enrollments
    if (payload.role === 'PARENT') {
      const parentChildren = await prisma.child.findMany({
        where: {
          clubId: payload.clubId,
          parents: {
            some: {
              id: payload.userId
            }
          }
        },
        select: { id: true }
      })

      where.childId = {
        in: parentChildren.map(child => child.id)
      }
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
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
        },
        schedule: {
          select: {
            id: true,
            name: true,
            level: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            location: true,
            maxCapacity: true,
            coach: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: enrollments
    })

  } catch (error) {
    console.error('Error fetching enrollments:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// CREATE a new enrollment
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { childId, scheduleId, startDate, endDate, notes } = body

    // Validate required fields
    if (!childId || !scheduleId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: childId, scheduleId'
      }, { status: 400 })
    }

    // Verify child exists and belongs to club
    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        clubId: payload.clubId
      },
      include: {
        parents: {
          select: { id: true }
        }
      }
    })

    if (!child) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found'
      }, { status: 404 })
    }

    // For parents, verify they can enroll this child
    if (payload.role === 'PARENT') {
      const isParentOfChild = child.parents.some(parent => parent.id === payload.userId)
      if (!isParentOfChild) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'You can only enroll your own children'
        }, { status: 403 })
      }
    }

    // Verify schedule exists and belongs to club
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        clubId: payload.clubId,
        isActive: true
      }
    })

    if (!schedule) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule not found or inactive'
      }, { status: 404 })
    }

    // Check if child is already enrolled in this schedule
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        childId,
        scheduleId,
        isActive: true
      }
    })

    if (existingEnrollment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child is already enrolled in this schedule'
      }, { status: 400 })
    }

    // Check schedule capacity
    const currentEnrollments = await prisma.enrollment.count({
      where: {
        scheduleId,
        isActive: true
      }
    })

    if (currentEnrollments >= schedule.maxCapacity) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Schedule is at maximum capacity'
      }, { status: 400 })
    }

    // Check for schedule conflicts (same time slots)
    const conflictingEnrollments = await prisma.enrollment.findMany({
      where: {
        childId,
        isActive: true,
        schedule: {
          dayOfWeek: schedule.dayOfWeek,
          OR: [
            {
              AND: [
                { startTime: { lte: schedule.startTime } },
                { endTime: { gt: schedule.startTime } }
              ]
            },
            {
              AND: [
                { startTime: { lt: schedule.endTime } },
                { endTime: { gte: schedule.endTime } }
              ]
            },
            {
              AND: [
                { startTime: { gte: schedule.startTime } },
                { endTime: { lte: schedule.endTime } }
              ]
            }
          ]
        }
      },
      include: {
        schedule: {
          select: {
            name: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true
          }
        }
      }
    })

    if (conflictingEnrollments.length > 0) {
      const conflict = conflictingEnrollments[0]
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Schedule conflict: Child is already enrolled in "${conflict.schedule.name}" on ${conflict.schedule.dayOfWeek} from ${conflict.schedule.startTime} to ${conflict.schedule.endTime}`
      }, { status: 400 })
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        clubId: payload.clubId,
        childId,
        scheduleId,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        notes
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            level: true
          }
        },
        schedule: {
          select: {
            id: true,
            name: true,
            level: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            location: true,
            coach: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: enrollment,
      message: 'Enrollment created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating enrollment:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}