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
          users: {
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
        children: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            level: true,
            users: {
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
        schedules: {
          select: {
            id: true,
            name: true,
            level: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            location: true,
            maxCapacity: true,
            users: {
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
        users: {
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
      const isParentOfChild = child.users.some(parent => parent.id === payload.userId)
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
        schedules: {
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
        schedules: {
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
        error: `Schedule conflict: Child is already enrolled in "${conflict.schedules.name}" on ${conflict.schedules.dayOfWeek} from ${conflict.schedules.startTime} to ${conflict.schedules.endTime}`
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
        children: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            level: true
          }
        },
        schedules: {
          select: {
            id: true,
            name: true,
            level: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            location: true,
            users: {
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

// DELETE - Unenroll child from class
export async function DELETE(request: NextRequest) {
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

    const body = await request.json()
    const { childId, scheduleId } = body

    if (!childId || !scheduleId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child ID and Schedule ID are required'
      }, { status: 400 })
    }

    // Find enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        childId,
        scheduleId,
        isActive: true
      },
      include: {
        children: {
          include: {
            users: {
              select: { id: true }
            }
          }
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Enrollment not found'
      }, { status: 404 })
    }

    // For parents, verify they can unenroll this child
    if (payload.role === 'PARENT') {
      const isParentOfChild = enrollment.children.users.some((parent: any) => parent.id === payload.userId)
      if (!isParentOfChild) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'You can only unenroll your own children'
        }, { status: 403 })
      }
    }

    // Update enrollment to inactive
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        isActive: false,
        endDate: new Date()
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Successfully unenrolled from class'
    })

  } catch (error) {
    console.error('Error unenrolling from class:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}