import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'
import { AttendanceStatus } from '@prisma/client'

// GET attendance records
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
    const classId = searchParams.get('classId')
    const childId = searchParams.get('childId')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: any = {
      clubId: payload.clubId
    }

    if (classId) where.classId = classId
    if (childId) where.childId = childId
    if (status) where.status = status as AttendanceStatus

    // For parents, only show their children's attendance
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

    // Filter by date range if provided
    if (dateFrom || dateTo) {
      where.classes = {
        date: {}
      }
      if (dateFrom) where.classes.date.gte = new Date(dateFrom)
      if (dateTo) where.classes.date.lte = new Date(dateTo)
    }

    const attendance = await prisma.attendance.findMany({
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
                email: true
              }
            }
          }
        },
        classes: {
          select: {
            id: true,
            name: true,
            level: true,
            date: true,
            startTime: true,
            endTime: true,
            location: true,
            schedules: {
              select: {
                id: true,
                name: true,
                dayOfWeek: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: [
        { classes: { date: 'desc' } },
        { children: { firstName: 'asc' } }
      ]
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: attendance
    })

  } catch (error) {
    console.error('Error fetching attendance:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// CREATE or UPDATE attendance record
export async function POST(request: NextRequest) {
  try {
    // Verify authentication (admin/coach only for marking attendance)
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
    const { classId, childId, status, notes } = body

    // Validate required fields
    if (!classId || !childId || !status) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: classId, childId, status'
      }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      }, { status: 400 })
    }

    // Verify class exists and belongs to club
    const classInstance = await prisma.class.findFirst({
      where: {
        id: classId,
        clubId: payload.clubId
      }
    })

    if (!classInstance) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Class not found'
      }, { status: 404 })
    }

    // Verify child exists and belongs to club
    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        clubId: payload.clubId
      }
    })

    if (!child) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found'
      }, { status: 404 })
    }

    // Check if attendance record already exists
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        classId,
        childId
      }
    })

    let attendance
    if (existingAttendance) {
      // Update existing attendance
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status: status as AttendanceStatus,
          notes,
          markedAt: new Date(),
          markedBy: payload.userId
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
          class: {
            select: {
              id: true,
              name: true,
              date: true,
              startTime: true,
              endTime: true
            }
          },
          markedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      })
    } else {
      // Create new attendance record
      attendance = await prisma.attendance.create({
        data: {
          clubId: payload.clubId,
          classId,
          childId,
          status: status as AttendanceStatus,
          notes,
          markedBy: payload.userId
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
          class: {
            select: {
              id: true,
              name: true,
              date: true,
              startTime: true,
              endTime: true
            }
          },
          markedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: attendance,
      message: 'Attendance marked successfully'
    })

  } catch (error) {
    console.error('Error marking attendance:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// BULK UPDATE attendance for a class
export async function PUT(request: NextRequest) {
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
    const { classId, attendanceRecords } = body

    // Validate required fields
    if (!classId || !Array.isArray(attendanceRecords)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: classId, attendanceRecords (array)'
      }, { status: 400 })
    }

    // Verify class exists and belongs to club
    const classInstance = await prisma.class.findFirst({
      where: {
        id: classId,
        clubId: payload.clubId
      }
    })

    if (!classInstance) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Class not found'
      }, { status: 404 })
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']
    const updatedAttendance = []

    // Process each attendance record
    for (const record of attendanceRecords) {
      const { childId, status, notes } = record

      if (!childId || !status || !validStatuses.includes(status)) {
        continue // Skip invalid records
      }

      // Upsert attendance record
      const attendance = await prisma.attendance.upsert({
        where: {
          classId_childId: {
            classId,
            childId
          }
        },
        update: {
          status: status as AttendanceStatus,
          notes,
          markedAt: new Date(),
          markedBy: payload.userId
        },
        create: {
          clubId: payload.clubId,
          classId,
          childId,
          status: status as AttendanceStatus,
          notes,
          markedBy: payload.userId
        },
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
      })

      updatedAttendance.push(attendance)
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedAttendance,
      message: `Bulk attendance updated for ${updatedAttendance.length} children`
    })

  } catch (error) {
    console.error('Error bulk updating attendance:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}