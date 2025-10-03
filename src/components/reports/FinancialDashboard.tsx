'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar, 
  FileText,
  Download,
  Filter,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  LineChart,
  Activity
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface FinancialSummary {
  totalRevenue: number
  averageMonthlyRevenue: number
  pendingAmount: number
  pendingInvoiceCount: number
  activeMemberCount: number
  averageRevenuePerMember: number
}

interface ReportData {
  summary?: FinancialSummary
  monthlyBreakdown?: Array<{
    month: string
    revenue: number
    payment_count: number
  }>
  trends?: {
    trend: string
    changePercent: number
    currentValue: number
    previousValue: number
  }
  metadata?: {
    reportType: string
    dateRange: {
      startDate: string
      endDate: string
    }
    generatedAt: string
  }
}

export function FinancialDashboard() {
  const { token } = useAuth()
  const [reportData, setReportData] = useState<ReportData>({})
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState('revenue_summary')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
    endDate: new Date().toISOString().split('T')[0]
  })
  const [error, setError] = useState<string | null>(null)

  const reportTypes = [
    { 
      id: 'revenue_summary', 
      label: 'Revenue Summary', 
      icon: DollarSign,
      description: 'Overall revenue performance and trends'
    },
    { 
      id: 'payment_trends', 
      label: 'Payment Trends', 
      icon: LineChart,
      description: 'Payment patterns and method analysis'
    },
    { 
      id: 'outstanding_balances', 
      label: 'Outstanding Balances', 
      icon: AlertTriangle,
      description: 'Overdue and pending payments'
    },
    { 
      id: 'fee_type_analysis', 
      label: 'Fee Analysis', 
      icon: PieChart,
      description: 'Revenue breakdown by fee types'
    },
    { 
      id: 'discount_impact', 
      label: 'Discount Impact', 
      icon: Activity,
      description: 'Discount usage and financial impact'
    },
    { 
      id: 'member_financial_status', 
      label: 'Member Status', 
      icon: Users,
      description: 'Individual member financial overview'
    }
  ]

  useEffect(() => {
    loadReport()
  }, [activeReport, dateRange])

  const loadReport = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        reportType: activeReport,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period: 'month'
      })

      const response = await fetch(`/api/reports/financial?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setReportData(data.data)
      } else {
        setError(data.error || 'Failed to load report')
      }
    } catch (err) {
      setError('Failed to load financial report')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600'
      case 'decreasing':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const exportReport = async () => {
    try {
      // This would typically generate a PDF or Excel export
      const dataStr = JSON.stringify(reportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `financial-report-${activeReport}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to export report')
    }
  }

  if (loading && !reportData.summary) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading financial reports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Financial Reports & Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive financial insights and performance analysis
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={loadReport}>
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards for Revenue Summary */}
      {activeReport === 'revenue_summary' && reportData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(reportData.summary.totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              {reportData.trends && (
                <div className={`flex items-center mt-2 text-sm ${getTrendColor(reportData.trends.trend)}`}>
                  {getTrendIcon(reportData.trends.trend)}
                  <span className="ml-1">
                    {reportData.trends.changePercent > 0 ? '+' : ''}{reportData.trends.changePercent}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Average</p>
                  <p className="text-2xl font-bold">{formatCurrency(reportData.summary.averageMonthlyRevenue)}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Based on selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Members</p>
                  <p className="text-2xl font-bold">{reportData.summary.activeMemberCount}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Avg: {formatCurrency(reportData.summary.averageRevenuePerMember)}/member
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(reportData.summary.pendingAmount)}</p>
                </div>
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {reportData.summary.pendingInvoiceCount} pending invoices
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Type Selection and Content */}
      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="grid w-full grid-cols-6">
          {reportTypes.map((report) => (
            <TabsTrigger 
              key={report.id} 
              value={report.id} 
              className="flex items-center gap-2 text-xs"
            >
              <report.icon className="h-4 w-4" />
              <span className="hidden md:inline">{report.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {reportTypes.map((report) => (
          <TabsContent key={report.id} value={report.id} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <report.icon className="h-5 w-5" />
                  {report.label}
                </CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading {report.label.toLowerCase()}...</div>
                  </div>
                ) : (
                  <ReportContent reportType={report.id} data={reportData} formatCurrency={formatCurrency} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Report Metadata */}
      {reportData.metadata && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>Report: {reportData.metadata.reportType.replace('_', ' ')}</span>
                <span>Period: {reportData.metadata.dateRange.startDate} to {reportData.metadata.dateRange.endDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Generated: {new Date(reportData.metadata.generatedAt).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Component to render different report content based on type
function ReportContent({ 
  reportType, 
  data, 
  formatCurrency 
}: { 
  reportType: string
  data: ReportData
  formatCurrency: (amount: number) => string 
}) {
  switch (reportType) {
    case 'revenue_summary':
      return (
        <div className="space-y-4">
          {data.monthlyBreakdown && data.monthlyBreakdown.length > 0 ? (
            <div>
              <h4 className="font-semibold mb-2">Monthly Revenue Breakdown</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid gap-2">
                  {data.monthlyBreakdown.map((month, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {new Date(month.month).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(Number(month.revenue))}</span>
                        <Badge variant="outline">{month.payment_count} payments</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No revenue data available for the selected period
            </div>
          )}
        </div>
      )
      
    default:
      return (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Report visualization coming soon</p>
          <p className="text-sm mt-2">This report type is being developed</p>
        </div>
      )
  }
}