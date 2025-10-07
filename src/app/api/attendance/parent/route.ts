import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET - Fetch attendance records for parent's children
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
    if (!payload || payload.role !== 'PARENT') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Parent access required'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const childId = searchParams.get('childId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    if (!childId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child ID is required'
      }, { status: 400 })
    }

    // Verify child belongs to this parent
    const child = await prisma.child.findFirst({
      where: {
        id: childId,
        parents: {
          some: {
            id: payload.userId
          }
        }
      }
    })

    if (!child) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Child not found or access denied'
      }, { status: 404 })
    }

    // Build date filter
    const dateFilter: any = {}
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom)
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      dateFilter.lte = toDate
    }

    // Get attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        childId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      include: {
        schedules: {
          select: {
            id: true,
            name: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true
          }
        },
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Calculate stats
    const totalSessions = attendanceRecords.length
    const presentCount = attendanceRecords.filter(r => r.status === 'PRESENT').length
    const absentCount = attendanceRecords.filter(r => r.status === 'ABSENT').length
    const lateCount = attendanceRecords.filter(r => r.status === 'LATE').length
    const excusedCount = attendanceRecords.filter(r => r.status === 'EXCUSED').length
    const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0

    // Format response
    const formattedRecords = attendanceRecords.map(record => ({
      id: record.id,
      date: record.date.toISOString(),
      status: record.status,
      notes: record.notes,
      class: {
        id: record.schedules.id,
        name: record.schedules.name,
        dayOfWeek: record.schedules.dayOfWeek,
        startTime: record.schedules.startTime,
        endTime: record.schedules.endTime
      },
      child: record.child
    }))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        records: formattedRecords,
        stats: {
          totalSessions,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          attendanceRate
        }
      }
    })

  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
