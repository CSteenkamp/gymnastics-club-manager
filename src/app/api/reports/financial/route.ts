import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/types'

const reportQuerySchema = z.object({
  reportType: z.enum([
    'revenue_summary',
    'payment_trends',
    'outstanding_balances',
    'fee_type_analysis',
    'discount_impact',
    'member_financial_status',
    'cash_flow',
    'monthly_comparison'
  ]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['month', 'quarter', 'year', 'custom']).optional(),
  groupBy: z.enum(['month', 'level', 'fee_type', 'payment_method']).optional(),
  includeProjections: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clubId = request.headers.get('x-club-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !clubId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Only admins and finance admins can access financial reports
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(userRole || '')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Insufficient permissions'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = {
      reportType: searchParams.get('reportType') || 'revenue_summary',
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      period: searchParams.get('period') || 'month',
      groupBy: searchParams.get('groupBy'),
      includeProjections: searchParams.get('includeProjections') === 'true'
    }

    const validatedParams = reportQuerySchema.parse(queryParams)

    // Set default date range if not provided
    const endDate = validatedParams.endDate ? new Date(validatedParams.endDate) : new Date()
    const startDate = validatedParams.startDate 
      ? new Date(validatedParams.startDate)
      : new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1) // Last 12 months

    let reportData
    
    switch (validatedParams.reportType) {
      case 'revenue_summary':
        reportData = await generateRevenueSummary(clubId, startDate, endDate)
        break
      case 'payment_trends':
        reportData = await generatePaymentTrends(clubId, startDate, endDate, validatedParams.groupBy)
        break
      case 'outstanding_balances':
        reportData = await generateOutstandingBalances(clubId)
        break
      case 'fee_type_analysis':
        reportData = await generateFeeTypeAnalysis(clubId, startDate, endDate)
        break
      case 'discount_impact':
        reportData = await generateDiscountImpact(clubId, startDate, endDate)
        break
      case 'member_financial_status':
        reportData = await generateMemberFinancialStatus(clubId)
        break
      case 'cash_flow':
        reportData = await generateCashFlow(clubId, startDate, endDate)
        break
      case 'monthly_comparison':
        reportData = await generateMonthlyComparison(clubId, startDate, endDate)
        break
      default:
        reportData = await generateRevenueSummary(clubId, startDate, endDate)
    }

    // Log the report access
    await prisma.dataProcessingLog.create({
      data: {
        clubId,
        userId,
        action: 'read',
        purpose: `Financial report accessed: ${validatedParams.reportType}`,
        dataTypes: ['financial_data', 'reporting'],
        legalBasis: 'LEGITIMATE_INTERESTS',
        source: 'admin_portal',
        metadata: {
          reportType: validatedParams.reportType,
          dateRange: { startDate, endDate }
        }
      }
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...reportData,
        metadata: {
          reportType: validatedParams.reportType,
          dateRange: { startDate, endDate },
          generatedAt: new Date(),
          parameters: validatedParams
        }
      }
    })

  } catch (error: any) {
    console.error('Financial report error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid report parameters',
        message: error.errors[0]?.message || 'Validation failed'
      }, { status: 400 })
    }

    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Revenue Summary Report
async function generateRevenueSummary(clubId: string, startDate: Date, endDate: Date) {
  const [
    totalRevenue,
    paidInvoices,
    pendingInvoices,
    monthlyBreakdown,
    memberCount
  ] = await Promise.all([
    // Total revenue from completed payments
    prisma.payment.aggregate({
      where: {
        clubId,
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    }),
    
    // Paid invoices
    prisma.invoice.findMany({
      where: {
        clubId,
        status: 'PAID',
        paidAt: { gte: startDate, lte: endDate }
      },
      select: {
        total: true,
        month: true,
        year: true,
        paidAt: true
      }
    }),
    
    // Pending invoices
    prisma.invoice.aggregate({
      where: {
        clubId,
        status: { in: ['PENDING', 'OVERDUE'] },
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { total: true },
      _count: true
    }),
    
    // Monthly revenue breakdown
    prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', paid_at) as month,
        SUM(amount) as revenue,
        COUNT(*) as payment_count
      FROM payments 
      WHERE club_id = ${clubId} 
        AND status = 'COMPLETED'
        AND paid_at >= ${startDate}
        AND paid_at <= ${endDate}
      GROUP BY DATE_TRUNC('month', paid_at)
      ORDER BY month
    `,
    
    // Active member count
    prisma.child.count({
      where: {
        clubId,
        status: 'ACTIVE'
      }
    })
  ])

  return {
    summary: {
      totalRevenue: totalRevenue._sum.amount || 0,
      averageMonthlyRevenue: (totalRevenue._sum.amount || 0) / 12,
      pendingAmount: pendingInvoices._sum.total || 0,
      pendingInvoiceCount: pendingInvoices._count,
      activeMemberCount: memberCount,
      averageRevenuePerMember: memberCount > 0 ? (totalRevenue._sum.amount || 0) / memberCount : 0
    },
    monthlyBreakdown,
    trends: calculateTrends(monthlyBreakdown as any[])
  }
}

// Payment Trends Analysis
async function generatePaymentTrends(clubId: string, startDate: Date, endDate: Date, groupBy?: string) {
  const baseQuery = {
    where: {
      clubId,
      status: 'COMPLETED',
      paidAt: { gte: startDate, lte: endDate }
    }
  }

  if (groupBy === 'payment_method') {
    const methodTrends = await prisma.payment.groupBy({
      by: ['method'],
      where: baseQuery.where,
      _sum: { amount: true },
      _count: true
    })
    
    return { methodTrends, totalPayments: methodTrends.reduce((sum, item) => sum + (item._sum.amount || 0), 0) }
  }

  // Default monthly trends
  const monthlyTrends = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', paid_at) as month,
      method,
      SUM(amount) as amount,
      COUNT(*) as count
    FROM payments 
    WHERE club_id = ${clubId} 
      AND status = 'COMPLETED'
      AND paid_at >= ${startDate}
      AND paid_at <= ${endDate}
    GROUP BY DATE_TRUNC('month', paid_at), method
    ORDER BY month, method
  `

  return { monthlyTrends }
}

// Outstanding Balances Report
async function generateOutstandingBalances(clubId: string) {
  const [overdueInvoices, pendingInvoices, memberBalances] = await Promise.all([
    // Overdue invoices
    prisma.invoice.findMany({
      where: {
        clubId,
        status: 'OVERDUE'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        items: {
          include: {
            child: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    }),
    
    // Pending invoices
    prisma.invoice.findMany({
      where: {
        clubId,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    }),
    
    // Member balance summary
    prisma.$queryRaw`
      SELECT 
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        COALESCE(SUM(CASE WHEN i.status IN ('PENDING', 'OVERDUE') THEN i.total ELSE 0 END), 0) as outstanding_balance,
        COUNT(CASE WHEN i.status = 'OVERDUE' THEN 1 END) as overdue_count,
        MIN(CASE WHEN i.status = 'OVERDUE' THEN i.due_date END) as oldest_overdue_date
      FROM users u
      LEFT JOIN invoices i ON u.id = i.user_id AND i.club_id = ${clubId}
      WHERE u.club_id = ${clubId} AND u.role = 'PARENT'
      GROUP BY u.id, u.first_name, u.last_name, u.email
      HAVING SUM(CASE WHEN i.status IN ('PENDING', 'OVERDUE') THEN i.total ELSE 0 END) > 0
      ORDER BY outstanding_balance DESC
    `
  ])

  return {
    summary: {
      totalOverdue: overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0),
      totalPending: pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.total), 0),
      overdueCount: overdueInvoices.length,
      pendingCount: pendingInvoices.length
    },
    overdueInvoices,
    pendingInvoices,
    memberBalances
  }
}

// Fee Type Analysis
async function generateFeeTypeAnalysis(clubId: string, startDate: Date, endDate: Date) {
  const feeTypeRevenue = await prisma.invoiceItem.groupBy({
    by: ['type'],
    where: {
      invoice: {
        clubId,
        status: 'PAID',
        paidAt: { gte: startDate, lte: endDate }
      }
    },
    _sum: { amount: true },
    _count: true
  })

  return { feeTypeRevenue }
}

// Discount Impact Analysis
async function generateDiscountImpact(clubId: string, startDate: Date, endDate: Date) {
  const discountApplications = await prisma.discountApplication.findMany({
    where: {
      appliedAt: { gte: startDate, lte: endDate },
      discount: { clubId }
    },
    include: {
      discount: {
        select: {
          name: true,
          type: true,
          code: true
        }
      },
      child: {
        select: {
          firstName: true,
          lastName: true,
          level: true
        }
      }
    }
  })

  const totalDiscountAmount = discountApplications.reduce((sum, app) => sum + Number(app.amount), 0)
  
  const discountsByType = discountApplications.reduce((acc, app) => {
    const type = app.discount.type
    if (!acc[type]) {
      acc[type] = { amount: 0, count: 0 }
    }
    acc[type].amount += Number(app.amount)
    acc[type].count += 1
    return acc
  }, {} as Record<string, { amount: number; count: number }>)

  return {
    summary: {
      totalDiscountAmount,
      applicationCount: discountApplications.length
    },
    discountsByType,
    applications: discountApplications
  }
}

// Member Financial Status
async function generateMemberFinancialStatus(clubId: string) {
  const memberStatus = await prisma.$queryRaw`
    SELECT 
      c.id as child_id,
      c.first_name,
      c.last_name,
      c.level,
      c.status,
      c.monthly_fee,
      u.first_name as parent_first_name,
      u.last_name as parent_last_name,
      u.email as parent_email,
      COALESCE(outstanding.balance, 0) as outstanding_balance,
      COALESCE(payments.total_paid, 0) as total_paid_ytd,
      COALESCE(payments.last_payment_date, NULL) as last_payment_date
    FROM children c
    JOIN users u ON u.id = ANY(
      SELECT unnest(ARRAY(
        SELECT user_id FROM "_ChildToUser" WHERE child_id = c.id
      ))
    )
    LEFT JOIN (
      SELECT 
        user_id,
        SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total ELSE 0 END) as balance
      FROM invoices 
      WHERE club_id = ${clubId}
      GROUP BY user_id
    ) outstanding ON outstanding.user_id = u.id
    LEFT JOIN (
      SELECT 
        parent_id,
        SUM(amount) as total_paid,
        MAX(paid_at) as last_payment_date
      FROM payments 
      WHERE club_id = ${clubId} 
        AND status = 'COMPLETED'
        AND paid_at >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY parent_id
    ) payments ON payments.parent_id = u.id
    WHERE c.club_id = ${clubId}
    ORDER BY c.first_name, c.last_name
  `

  return { memberStatus }
}

// Cash Flow Analysis
async function generateCashFlow(clubId: string, startDate: Date, endDate: Date) {
  const cashFlow = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', paid_at) as month,
      SUM(amount) as cash_in,
      0 as cash_out,
      SUM(amount) as net_flow
    FROM payments 
    WHERE club_id = ${clubId} 
      AND status = 'COMPLETED'
      AND paid_at >= ${startDate}
      AND paid_at <= ${endDate}
    GROUP BY DATE_TRUNC('month', paid_at)
    ORDER BY month
  `

  return { cashFlow }
}

// Monthly Comparison
async function generateMonthlyComparison(clubId: string, startDate: Date, endDate: Date) {
  const monthlyData = await prisma.$queryRaw`
    SELECT 
      DATE_PART('year', paid_at) as year,
      DATE_PART('month', paid_at) as month,
      SUM(amount) as revenue,
      COUNT(DISTINCT parent_id) as paying_members,
      COUNT(*) as payment_count,
      AVG(amount) as avg_payment_amount
    FROM payments 
    WHERE club_id = ${clubId} 
      AND status = 'COMPLETED'
      AND paid_at >= ${startDate}
      AND paid_at <= ${endDate}
    GROUP BY DATE_PART('year', paid_at), DATE_PART('month', paid_at)
    ORDER BY year, month
  `

  return { monthlyData }
}

// Helper function to calculate trends
function calculateTrends(data: any[]) {
  if (data.length < 2) return { trend: 'insufficient_data' }
  
  const latest = data[data.length - 1]
  const previous = data[data.length - 2]
  
  const latestRevenue = Number(latest?.revenue || 0)
  const previousRevenue = Number(previous?.revenue || 0)
  
  if (previousRevenue === 0) return { trend: 'no_baseline' }
  
  const changePercent = ((latestRevenue - previousRevenue) / previousRevenue) * 100
  
  return {
    trend: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable',
    changePercent: Math.round(changePercent * 100) / 100,
    currentValue: latestRevenue,
    previousValue: previousRevenue
  }
}