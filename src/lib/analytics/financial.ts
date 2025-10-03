// Financial Analytics Utilities
export interface FinancialMetrics {
  totalRevenue: number
  averageMonthlyRevenue: number
  revenueGrowthRate: number
  memberRetentionRate: number
  averageRevenuePerUser: number
  churnRate: number
  lifetimeValue: number
}

export interface PaymentTrend {
  period: string
  revenue: number
  paymentCount: number
  averagePaymentValue: number
  growthRate: number
}

export interface OutstandingBalance {
  totalAmount: number
  overdueAmount: number
  pendingAmount: number
  memberCount: number
  averageBalance: number
  agingAnalysis: {
    current: number
    thirtyDays: number
    sixtyDays: number
    ninetyDaysPlus: number
  }
}

export class FinancialAnalytics {
  // Calculate key financial metrics
  static calculateMetrics(
    payments: any[],
    invoices: any[],
    members: any[]
  ): FinancialMetrics {
    const totalRevenue = payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const monthlyPayments = this.groupPaymentsByMonth(payments)
    const averageMonthlyRevenue = monthlyPayments.length > 0
      ? totalRevenue / monthlyPayments.length
      : 0

    const revenueGrowthRate = this.calculateGrowthRate(monthlyPayments)
    const averageRevenuePerUser = members.length > 0 ? totalRevenue / members.length : 0

    return {
      totalRevenue,
      averageMonthlyRevenue,
      revenueGrowthRate,
      memberRetentionRate: this.calculateRetentionRate(members),
      averageRevenuePerUser,
      churnRate: this.calculateChurnRate(members),
      lifetimeValue: this.calculateLifetimeValue(averageRevenuePerUser, members)
    }
  }

  // Group payments by month for trend analysis
  static groupPaymentsByMonth(payments: any[]): PaymentTrend[] {
    const monthlyGroups = payments
      .filter(p => p.status === 'COMPLETED' && p.paidAt)
      .reduce((groups, payment) => {
        const month = new Date(payment.paidAt).toISOString().slice(0, 7) // YYYY-MM
        if (!groups[month]) {
          groups[month] = []
        }
        groups[month].push(payment)
        return groups
      }, {} as Record<string, any[]>)

    return Object.entries(monthlyGroups)
      .map(([month, payments]) => {
        const revenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
        const paymentCount = payments.length
        const averagePaymentValue = paymentCount > 0 ? revenue / paymentCount : 0

        return {
          period: month,
          revenue,
          paymentCount,
          averagePaymentValue,
          growthRate: 0 // Will be calculated separately
        }
      })
      .sort((a, b) => a.period.localeCompare(b.period))
  }

  // Calculate revenue growth rate
  static calculateGrowthRate(monthlyTrends: PaymentTrend[]): number {
    if (monthlyTrends.length < 2) return 0

    const latest = monthlyTrends[monthlyTrends.length - 1]
    const previous = monthlyTrends[monthlyTrends.length - 2]

    if (previous.revenue === 0) return 0

    return ((latest.revenue - previous.revenue) / previous.revenue) * 100
  }

  // Analyze outstanding balances
  static analyzeOutstandingBalances(invoices: any[]): OutstandingBalance {
    const outstandingInvoices = invoices.filter(i => 
      ['PENDING', 'OVERDUE'].includes(i.status)
    )

    const totalAmount = outstandingInvoices.reduce((sum, i) => sum + Number(i.total), 0)
    const overdueAmount = invoices
      .filter(i => i.status === 'OVERDUE')
      .reduce((sum, i) => sum + Number(i.total), 0)
    const pendingAmount = invoices
      .filter(i => i.status === 'PENDING')
      .reduce((sum, i) => sum + Number(i.total), 0)

    // Unique members with outstanding balances
    const memberIds = new Set(outstandingInvoices.map(i => i.userId))
    const memberCount = memberIds.size

    const averageBalance = memberCount > 0 ? totalAmount / memberCount : 0

    // Aging analysis
    const now = new Date()
    const agingAnalysis = outstandingInvoices.reduce((aging, invoice) => {
      const dueDate = new Date(invoice.dueDate)
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const amount = Number(invoice.total)

      if (daysPastDue <= 0) {
        aging.current += amount
      } else if (daysPastDue <= 30) {
        aging.thirtyDays += amount
      } else if (daysPastDue <= 60) {
        aging.sixtyDays += amount
      } else {
        aging.ninetyDaysPlus += amount
      }

      return aging
    }, { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDaysPlus: 0 })

    return {
      totalAmount,
      overdueAmount,
      pendingAmount,
      memberCount,
      averageBalance,
      agingAnalysis
    }
  }

  // Calculate member retention rate
  static calculateRetentionRate(members: any[]): number {
    const activeMembers = members.filter(m => m.status === 'ACTIVE').length
    const totalMembers = members.length
    return totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0
  }

  // Calculate churn rate
  static calculateChurnRate(members: any[]): number {
    const churnedMembers = members.filter(m => 
      ['INACTIVE', 'WITHDRAWN'].includes(m.status)
    ).length
    const totalMembers = members.length
    return totalMembers > 0 ? (churnedMembers / totalMembers) * 100 : 0
  }

  // Calculate customer lifetime value
  static calculateLifetimeValue(averageRevenuePerUser: number, members: any[]): number {
    const retentionRate = this.calculateRetentionRate(members) / 100
    const churnRate = this.calculateChurnRate(members) / 100
    
    if (churnRate === 0) return averageRevenuePerUser * 12 // Assume 1 year if no churn

    const averageLifespan = 1 / churnRate // In months
    return averageRevenuePerUser * averageLifespan
  }

  // Generate financial forecasts
  static generateForecast(
    historicalData: PaymentTrend[],
    months: number = 6
  ): PaymentTrend[] {
    if (historicalData.length < 3) {
      return [] // Need at least 3 months of data for forecasting
    }

    // Simple linear regression for trend prediction
    const recentTrends = historicalData.slice(-6) // Use last 6 months
    const avgGrowthRate = recentTrends.reduce((sum, trend, index) => {
      if (index === 0) return sum
      const previousRevenue = recentTrends[index - 1].revenue
      const currentRevenue = trend.revenue
      const growthRate = previousRevenue > 0 ? (currentRevenue - previousRevenue) / previousRevenue : 0
      return sum + growthRate
    }, 0) / (recentTrends.length - 1)

    const lastMonth = historicalData[historicalData.length - 1]
    const forecasts: PaymentTrend[] = []

    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(lastMonth.period + '-01')
      forecastDate.setMonth(forecastDate.getMonth() + i)
      const forecastPeriod = forecastDate.toISOString().slice(0, 7)

      const baseRevenue = i === 1 ? lastMonth.revenue : forecasts[i - 2].revenue
      const forecastRevenue = baseRevenue * (1 + avgGrowthRate)

      forecasts.push({
        period: forecastPeriod,
        revenue: Math.max(0, forecastRevenue), // Ensure non-negative
        paymentCount: Math.round(forecastRevenue / (lastMonth.averagePaymentValue || 1)),
        averagePaymentValue: lastMonth.averagePaymentValue,
        growthRate: avgGrowthRate * 100
      })
    }

    return forecasts
  }

  // Analyze fee type performance
  static analyzeFeeTypePerformance(invoiceItems: any[]): Array<{
    feeType: string
    revenue: number
    count: number
    averageAmount: number
    percentage: number
  }> {
    const feeTypeGroups = invoiceItems.reduce((groups, item) => {
      const type = item.type
      if (!groups[type]) {
        groups[type] = { revenue: 0, count: 0 }
      }
      groups[type].revenue += Number(item.amount)
      groups[type].count += 1
      return groups
    }, {} as Record<string, { revenue: number; count: number }>)

    const totalRevenue = Object.values(feeTypeGroups)
      .reduce((sum, group) => sum + group.revenue, 0)

    return Object.entries(feeTypeGroups)
      .map(([feeType, data]) => ({
        feeType,
        revenue: data.revenue,
        count: data.count,
        averageAmount: data.count > 0 ? data.revenue / data.count : 0,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }

  // Calculate payment method efficiency
  static analyzePaymentMethods(payments: any[]): Array<{
    method: string
    revenue: number
    count: number
    averageAmount: number
    successRate: number
    averageProcessingTime: number
  }> {
    const methodGroups = payments.reduce((groups, payment) => {
      const method = payment.method
      if (!groups[method]) {
        groups[method] = {
          revenue: 0,
          count: 0,
          successCount: 0,
          totalProcessingTime: 0
        }
      }

      groups[method].count += 1
      if (payment.status === 'COMPLETED') {
        groups[method].revenue += Number(payment.amount)
        groups[method].successCount += 1

        // Calculate processing time if available
        if (payment.paidAt && payment.createdAt) {
          const processingTime = new Date(payment.paidAt).getTime() - 
                               new Date(payment.createdAt).getTime()
          groups[method].totalProcessingTime += processingTime
        }
      }

      return groups
    }, {} as Record<string, any>)

    return Object.entries(methodGroups)
      .map(([method, data]) => ({
        method,
        revenue: data.revenue,
        count: data.count,
        averageAmount: data.successCount > 0 ? data.revenue / data.successCount : 0,
        successRate: data.count > 0 ? (data.successCount / data.count) * 100 : 0,
        averageProcessingTime: data.successCount > 0 
          ? data.totalProcessingTime / data.successCount / (1000 * 60 * 60) // Convert to hours
          : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }
}

// Export utility functions
export const formatCurrency = (amount: number, currency = 'ZAR'): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency
  }).format(amount)
}

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`
}

export const formatNumber = (value: number, decimals = 0): string => {
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}