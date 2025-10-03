import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { ApiResponse } from '@/types'

// GET analytics and reports data
export async function GET(request: NextRequest) {
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

    return NextResponse.json<ApiResponse>({
      success: true,
      data: reportData
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
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_members
      FROM children 
      WHERE club_id = ${clubId}
        AND created_at >= ${fromDate}
        AND created_at <= ${toDate}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `
  ])

  return {
    summary: {
      totalMembers,
      totalRevenue: totalRevenue._sum.amount || 0,
      outstandingAmount: outstandingInvoices._sum.total || 0,
      outstandingCount: outstandingInvoices._count || 0
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
        DATE_TRUNC('month', processed_at) as month,
        SUM(amount) as revenue,
        COUNT(*) as payment_count
      FROM payments 
      WHERE club_id = ${clubId}
        AND processed_at >= ${fromDate}
        AND processed_at <= ${toDate}
      GROUP BY DATE_TRUNC('month', processed_at)
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
          WHEN due_date >= CURRENT_DATE THEN 'Current'
          WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 days overdue'
          WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 days overdue'
          ELSE '60+ days overdue'
        END as age_group,
        COUNT(*) as invoice_count,
        SUM(total) as total_amount
      FROM invoices 
      WHERE club_id = ${clubId}
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
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.club_id = ${clubId}
        AND i.created_at >= ${fromDate}
        AND i.created_at <= ${toDate}
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
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_members,
        SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) as cumulative_members
      FROM children 
      WHERE club_id = ${clubId}
        AND created_at >= ${fromDate}
        AND created_at <= ${toDate}
      GROUP BY DATE_TRUNC('month', created_at)
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
          WHEN date_of_birth IS NULL THEN 'Unknown'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 6 THEN 'Under 6'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 10 THEN '6-9 years'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 15 THEN '10-14 years'
          ELSE '15+ years'
        END as age_group,
        COUNT(*) as member_count
      FROM children 
      WHERE club_id = ${clubId}
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
        s.day_of_week,
        COUNT(a.id) as total_sessions,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent_count,
        ROUND(
          COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) * 100.0 / COUNT(a.id), 
          2
        ) as attendance_rate
      FROM attendance a
      JOIN classes c ON a.class_id = c.id
      JOIN schedules s ON c.schedule_id = s.id
      WHERE a.club_id = ${clubId}
        AND a.marked_at >= ${fromDate}
        AND a.marked_at <= ${toDate}
      GROUP BY s.day_of_week
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
      JOIN classes c ON a.class_id = c.id
      WHERE a.club_id = ${clubId}
        AND a.marked_at >= ${fromDate}
        AND a.marked_at <= ${toDate}
      GROUP BY c.level
      ORDER BY attendance_rate DESC
    `,

    // Popular time slots
    prisma.$queryRaw`
      SELECT 
        s.start_time,
        s.end_time,
        s.day_of_week,
        COUNT(DISTINCT a.id) as total_attendances,
        COUNT(DISTINCT e.child_id) as enrolled_children
      FROM schedules s
      LEFT JOIN enrollments e ON s.id = e.schedule_id AND e.is_active = true
      LEFT JOIN classes c ON s.id = c.schedule_id
      LEFT JOIN attendance a ON c.id = a.class_id 
        AND a.marked_at >= ${fromDate}
        AND a.marked_at <= ${toDate}
      WHERE s.club_id = ${clubId}
        AND s.is_active = true
      GROUP BY s.id, s.start_time, s.end_time, s.day_of_week
      ORDER BY total_attendances DESC
      LIMIT 10
    `,

    // Overall attendance rates by month
    prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', a.marked_at) as month,
        COUNT(a.id) as total_sessions,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present_count,
        ROUND(
          COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) * 100.0 / COUNT(a.id), 
          2
        ) as attendance_rate
      FROM attendance a
      WHERE a.club_id = ${clubId}
        AND a.marked_at >= ${fromDate}
        AND a.marked_at <= ${toDate}
      GROUP BY DATE_TRUNC('month', a.marked_at)
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