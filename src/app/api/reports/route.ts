import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET analytics and reports data
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Reports API called')

    // Verify authentication (admin only)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    console.log('Token present:', !!token)
    
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

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Set default date range (last 12 months)
    const defaultFromDate = new Date()
    defaultFromDate.setFullYear(defaultFromDate.getFullYear() - 1)
    
    const fromDate = dateFrom ? new Date(dateFrom) : defaultFromDate
    const toDate = dateTo ? new Date(dateTo) : new Date()

    let reportData: any = {}

    switch (reportType) {
      case 'overview':
        reportData = await getOverviewReport(payload.clubId, fromDate, toDate)
        break
      case 'financial':
        reportData = await getFinancialReport(payload.clubId, fromDate, toDate)
        break
      case 'membership':
        reportData = await getMembershipReport(payload.clubId, fromDate, toDate)
        break
      case 'attendance':
        reportData = await getAttendanceReport(payload.clubId, fromDate, toDate)
        break
      default:
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Invalid report type'
        }, { status: 400 })
    }

    // Convert BigInt values to numbers for JSON serialization
    const jsonSafeData = JSON.parse(JSON.stringify(reportData, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    ))

    console.log('Report data sample:', JSON.stringify(jsonSafeData).substring(0, 500))

    return NextResponse.json<ApiResponse>({
      success: true,
      data: jsonSafeData
    })

  } catch (error) {
    console.error('Error generating report:', error)
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Overview Report - High-level metrics
async function getOverviewReport(clubId: string, fromDate: Date, toDate: Date) {
  const [
    totalMembers,
    activeMembersByLevel,
    totalRevenue,
    outstandingInvoices,
    recentActivity,
    monthlyGrowth
  ] = await Promise.all([
    // Total active members
    prisma.child.count({
      where: {
        clubId,
        status: 'ACTIVE'
      }
    }),

    // Active members by level
    prisma.child.groupBy({
      by: ['level'],
      where: {
        clubId,
        status: 'ACTIVE'
      },
      _count: {
        id: true
      }
    }),

    // Total revenue in date range
    prisma.payment.aggregate({
      where: {
        clubId,
        processedAt: {
          gte: fromDate,
          lte: toDate
        }
      },
      _sum: {
        amount: true
      }
    }),

    // Outstanding invoices
    prisma.invoice.aggregate({
      where: {
        clubId,
        status: { in: ['PENDING', 'OVERDUE'] }
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    }),

    // Recent activity (last 30 days)
    prisma.child.findMany({
      where: {
        clubId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        firstName: true,
        lastName: true,
        level: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    }),

    // Monthly growth (last 12 months)
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as new_members
      FROM children
      WHERE "clubId" = ${clubId}
        AND "createdAt" >= ${fromDate}
        AND "createdAt" <= ${toDate}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `
  ])

  return {
    summary: {
      totalMembers,
      totalRevenue: totalRevenue._sum.amount || 0,
      outstandingAmount: outstandingInvoices._sum.total || 0,
      outstandingCount: outstandingInvoices._count.id || 0
    },
    membersByLevel: activeMembersByLevel,
    recentActivity,
    monthlyGrowth
  }
}

// Financial Report - Revenue, payments, outstanding
async function getFinancialReport(clubId: string, fromDate: Date, toDate: Date) {
  const [
    monthlyRevenue,
    paymentMethods,
    outstandingByAge,
    levelRevenue
  ] = await Promise.all([
    // Monthly revenue breakdown
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "processedAt") as month,
        SUM(amount) as revenue,
        COUNT(*) as payment_count
      FROM payments
      WHERE "clubId" = ${clubId}
        AND "processedAt" >= ${fromDate}
        AND "processedAt" <= ${toDate}
      GROUP BY DATE_TRUNC('month', "processedAt")
      ORDER BY month DESC
    `,

    // Payment methods distribution
    prisma.payment.groupBy({
      by: ['method'],
      where: {
        clubId,
        processedAt: {
          gte: fromDate,
          lte: toDate
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    }),

    // Outstanding invoices by age
    prisma.$queryRaw`
      SELECT
        CASE
          WHEN "dueDate" >= CURRENT_DATE THEN 'Current'
          WHEN "dueDate" >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 days overdue'
          WHEN "dueDate" >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 days overdue'
          ELSE '60+ days overdue'
        END as age_group,
        COUNT(*) as invoice_count,
        SUM(total) as total_amount
      FROM invoices
      WHERE "clubId" = ${clubId}
        AND status IN ('PENDING', 'OVERDUE')
      GROUP BY age_group
    `,

    // Revenue by level
    prisma.$queryRaw`
      SELECT
        ii.description as level,
        SUM(ii.amount * ii.quantity) as revenue,
        COUNT(DISTINCT i.id) as invoice_count
      FROM invoice_items ii
      JOIN invoices i ON ii."invoiceId" = i.id
      WHERE i."clubId" = ${clubId}
        AND i."createdAt" >= ${fromDate}
        AND i."createdAt" <= ${toDate}
        AND i.status = 'PAID'
      GROUP BY ii.description
      ORDER BY revenue DESC
    `
  ])

  return {
    monthlyRevenue,
    paymentMethods,
    outstandingByAge,
    levelRevenue
  }
}

// Membership Report - Growth, retention, demographics
async function getMembershipReport(clubId: string, fromDate: Date, toDate: Date) {
  const [
    membershipGrowth,
    levelDistribution,
    ageDistribution,
    retentionData
  ] = await Promise.all([
    // Membership growth over time
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as new_members,
        SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', "createdAt")) as cumulative_members
      FROM children
      WHERE "clubId" = ${clubId}
        AND "createdAt" >= ${fromDate}
        AND "createdAt" <= ${toDate}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month
    `,

    // Level distribution
    prisma.child.groupBy({
      by: ['level', 'status'],
      where: {
        clubId
      },
      _count: {
        id: true
      }
    }),

    // Age distribution (if birth date available)
    prisma.$queryRaw`
      SELECT
        CASE
          WHEN "dateOfBirth" IS NULL THEN 'Unknown'
          WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) < 6 THEN 'Under 6'
          WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) < 10 THEN '6-9 years'
          WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) < 15 THEN '10-14 years'
          ELSE '15+ years'
        END as age_group,
        COUNT(*) as member_count
      FROM children
      WHERE "clubId" = ${clubId}
        AND status = 'ACTIVE'
      GROUP BY age_group
      ORDER BY age_group
    `,

    // Retention data (active vs withdrawn)
    prisma.child.groupBy({
      by: ['status'],
      where: {
        clubId,
        createdAt: {
          gte: fromDate,
          lte: toDate
        }
      },
      _count: {
        id: true
      }
    })
  ])

  return {
    membershipGrowth,
    levelDistribution,
    ageDistribution,
    retentionData
  }
}

// Attendance Report - Class attendance, popular times
async function getAttendanceReport(clubId: string, fromDate: Date, toDate: Date) {
  const [
    attendanceByDay,
    attendanceByLevel,
    popularTimeSlots,
    attendanceRates
  ] = await Promise.all([
    // Attendance by day of week
    prisma.$queryRaw`
      SELECT
        s."dayOfWeek",
        COUNT(a.id) as total_sessions,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent_count,
        ROUND(
          COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) * 100.0 / COUNT(a.id),
          2
        ) as attendance_rate
      FROM attendance a
      JOIN classes c ON a."classId" = c.id
      JOIN schedules s ON c."scheduleId" = s.id
      WHERE a."clubId" = ${clubId}
        AND a."markedAt" >= ${fromDate}
        AND a."markedAt" <= ${toDate}
      GROUP BY s."dayOfWeek"
      ORDER BY attendance_rate DESC
    `,

    // Attendance by level
    prisma.$queryRaw`
      SELECT
        c.level,
        COUNT(a.id) as total_sessions,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present_count,
        ROUND(
          COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) * 100.0 / COUNT(a.id),
          2
        ) as attendance_rate
      FROM attendance a
      JOIN classes c ON a."classId" = c.id
      WHERE a."clubId" = ${clubId}
        AND a."markedAt" >= ${fromDate}
        AND a."markedAt" <= ${toDate}
      GROUP BY c.level
      ORDER BY attendance_rate DESC
    `,

    // Popular time slots
    prisma.$queryRaw`
      SELECT
        s."startTime",
        s."endTime",
        s."dayOfWeek",
        COUNT(DISTINCT a.id) as total_attendances,
        COUNT(DISTINCT e."childId") as enrolled_children
      FROM schedules s
      LEFT JOIN enrollments e ON s.id = e."scheduleId" AND e."isActive" = true
      LEFT JOIN classes c ON s.id = c."scheduleId"
      LEFT JOIN attendance a ON c.id = a."classId"
        AND a."markedAt" >= ${fromDate}
        AND a."markedAt" <= ${toDate}
      WHERE s."clubId" = ${clubId}
        AND s."isActive" = true
      GROUP BY s.id, s."startTime", s."endTime", s."dayOfWeek"
      ORDER BY total_attendances DESC
      LIMIT 10
    `,

    // Overall attendance rates by month
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', a."markedAt") as month,
        COUNT(a.id) as total_sessions,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present_count,
        ROUND(
          COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) * 100.0 / COUNT(a.id),
          2
        ) as attendance_rate
      FROM attendance a
      WHERE a."clubId" = ${clubId}
        AND a."markedAt" >= ${fromDate}
        AND a."markedAt" <= ${toDate}
      GROUP BY DATE_TRUNC('month', a."markedAt")
      ORDER BY month DESC
    `
  ])

  return {
    attendanceByDay,
    attendanceByLevel,
    popularTimeSlots,
    attendanceRates
  }
}