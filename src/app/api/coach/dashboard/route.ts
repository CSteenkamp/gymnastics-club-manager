import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    // Verify user is a coach
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true }
    })

    if (!user || user.role !== 'COACH') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Coach role required.' },
        { status: 403 }
      )
    }

    // Get coach's classes
    const coachClasses = await prisma.class.findMany({
      where: {
        clubId: payload.clubId,
        coachId: payload.userId,
        isActive: true
      },
      include: {
        _count: {
          select: { enrollments: true }
        }
      }
    })

    // Calculate stats
    const totalClasses = coachClasses.length
    const totalStudents = coachClasses.reduce((sum, cls) => sum + cls._count.enrollments, 0)

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Count today's classes
    const todaysClasses = coachClasses.filter(cls => {
      if (!cls.date) return false
      const classDate = new Date(cls.date)
      return classDate >= today && classDate < tomorrow
    }).length

    // Count upcoming classes (next 7 days)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const upcomingClasses = coachClasses.filter(cls => {
      if (!cls.date) return false
      const classDate = new Date(cls.date)
      return classDate >= tomorrow && classDate < nextWeek
    }).length

    // Calculate average attendance
    let totalAttendanceRate = 0
    const classesWithAttendance = []

    for (const cls of coachClasses) {
      // Get total possible attendance (all enrollments * sessions)
      const enrollmentCount = cls._count.enrollments

      // Get actual attendance records
      const attendanceRecords = await prisma.attendance.count({
        where: {
          classId: cls.id,
          status: 'PRESENT'
        }
      })

      const totalRecords = await prisma.attendance.count({
        where: { classId: cls.id }
      })

      const attendanceRate = totalRecords > 0
        ? Math.round((attendanceRecords / totalRecords) * 100)
        : 0

      totalAttendanceRate += attendanceRate

      classesWithAttendance.push({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        studentCount: enrollmentCount,
        nextSession: cls.date,
        attendanceRate
      })
    }

    const averageAttendance = coachClasses.length > 0
      ? Math.round(totalAttendanceRate / coachClasses.length)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalClasses,
          totalStudents,
          todaysClasses,
          upcomingClasses,
          averageAttendance
        },
        classes: classesWithAttendance
      }
    })

  } catch (error) {
    console.error('Error fetching coach dashboard:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
