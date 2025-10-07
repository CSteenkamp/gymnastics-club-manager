import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET attendance for a class on a specific date
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload || !payload.userId || !payload.clubId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const date = searchParams.get('date')

    if (!classId || !date) {
      return NextResponse.json(
        { success: false, error: 'Class ID and date are required' },
        { status: 400 }
      )
    }

    // Verify class belongs to coach
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        clubId: payload.clubId,
        coachId: payload.userId
      }
    })

    if (!classRecord) {
      return NextResponse.json(
        { success: false, error: 'Class not found or access denied' },
        { status: 404 }
      )
    }

    // Get enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classId,
        isActive: true
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Get existing attendance for this date
    const attendanceDate = new Date(date)
    const existingAttendance = await prisma.attendance.findMany({
      where: {
        classId,
        date: attendanceDate
      }
    })

    const attendanceMap = new Map(
      existingAttendance.map(a => [a.childId, a.status])
    )

    const students = enrollments.map(e => ({
      id: e.child.id,
      firstName: e.child.firstName,
      lastName: e.child.lastName,
      status: attendanceMap.get(e.child.id) || 'PRESENT'
    }))

    return NextResponse.json({
      success: true,
      data: students
    })

  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save attendance
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload || !payload.userId || !payload.clubId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { classId, date, attendance } = await request.json()

    if (!classId || !date || !attendance) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify class belongs to coach
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        clubId: payload.clubId,
        coachId: payload.userId
      }
    })

    if (!classRecord) {
      return NextResponse.json(
        { success: false, error: 'Class not found or access denied' },
        { status: 404 }
      )
    }

    const attendanceDate = new Date(date)

    // Delete existing attendance for this class and date
    await prisma.attendance.deleteMany({
      where: {
        classId,
        date: attendanceDate
      }
    })

    // Create new attendance records
    const attendanceRecords = attendance.map((a: any) => ({
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clubId: payload.clubId,
      classId,
      childId: a.studentId,
      date: attendanceDate,
      status: a.status,
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    await prisma.attendance.createMany({
      data: attendanceRecords
    })

    return NextResponse.json({
      success: true,
      message: 'Attendance saved successfully'
    })

  } catch (error) {
    console.error('Error saving attendance:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
