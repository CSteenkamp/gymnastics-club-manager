import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { ClassStatus } from '@prisma/client'

// GET all classes for a club
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
    const level = searchParams.get('level')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const coachId = searchParams.get('coachId')

    const where: any = {
      clubId: payload.clubId
    }

    if (scheduleId) where.scheduleId = scheduleId
    if (level) where.level = level
    if (status) where.status = status as ClassStatus
    if (coachId) where.coachId = coachId

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        schedule: {
          select: {
            id: true,
            name: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            maxCapacity: true
          }
        },
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        attendance: {
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
            attendance: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { startTime: 'desc' }
      ]
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: classes
    })

  } catch (error) {
    console.error('Error fetching classes:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// CREATE a new class instance
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      scheduleId,
      name,
      level,
      coachId,
      date,
      startTime,
      endTime,
      maxCapacity,
      location,
      notes,
      description,
      status
    } = body

    // Validate required fields
    if (!name || !date) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: name, date'
      }, { status: 400 })
    }

    // If linked to a schedule, verify it exists
    if (scheduleId) {
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

    // Create class instance
    const classInstance = await prisma.class.create({
      data: {
        clubId: payload.clubId,
        scheduleId,
        name,
        level,
        coachId,
        date: new Date(date),
        startTime: startTime ? new Date(`${date}T${startTime}`) : null,
        endTime: endTime ? new Date(`${date}T${endTime}`) : null,
        maxCapacity: maxCapacity || 12,
        location,
        notes,
        description,
        status: (status as ClassStatus) || 'SCHEDULED'
      },
      include: {
        schedule: {
          select: {
            id: true,
            name: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            maxCapacity: true
          }
        },
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
            attendance: true
          }
        }
      }
    })

    // If linked to a schedule, automatically create attendance records for enrolled children
    if (scheduleId) {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          scheduleId,
          isActive: true,
          startDate: { lte: new Date(date) },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date(date) } }
          ]
        },
        select: {
          childId: true
        }
      })

      if (enrollments.length > 0) {
        await prisma.attendance.createMany({
          data: enrollments.map(enrollment => ({
            clubId: payload.clubId,
            classId: classInstance.id,
            childId: enrollment.childId,
            status: 'PRESENT' // Default to present, coaches can mark absent
          }))
        })
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: classInstance,
      message: 'Class created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating class:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}