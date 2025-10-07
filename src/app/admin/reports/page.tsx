'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'
import {
  BarChart3,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CreditCard
} from 'lucide-react'

interface User {
  id: string
  firstName: string
  lastName: string
  role: string
}

interface ReportData {
  overview?: {
    summary: {
      totalMembers: number
      totalRevenue: number
      outstandingAmount: number
      outstandingCount: number
    }
    membersByLevel: Array<{
      level: string
      _count: { id: number }
    }>
    recentActivity: Array<{
      firstName: string
      lastName: string
      level: string
      createdAt: string
    }>
    monthlyGrowth: Array<{
      month: string
      new_members: number
    }>
  }
  financial?: {
    monthlyRevenue: Array<{
      month: string
      revenue: number
      payment_count: number
    }>
    paymentMethods: Array<{
      method: string
      _sum: { amount: number }
      _count: { id: number }
    }>
    outstandingByAge: Array<{
      age_group: string
      invoice_count: number
      total_amount: number
    }>
    levelRevenue: Array<{
      level: string
      revenue: number
      invoice_count: number
    }>
  }
  membership?: {
    membershipGrowth: Array<{
      month: string
      new_members: number
      cumulative_members: number
    }>
    levelDistribution: Array<{
      level: string
      status: string
      _count: { id: number }
    }>
    ageDistribution: Array<{
      age_group: string
      member_count: number
    }>
    retentionData: Array<{
      status: string
      _count: { id: number }
    }>
  }
  attendance?: {
    attendanceByDay: Array<{
      day_of_week: string
      total_sessions: number
      present_count: number
      absent_count: number
      attendance_rate: number
    }>
    attendanceByLevel: Array<{
      level: string
      total_sessions: number
      present_count: number
      attendance_rate: number
    }>
    popularTimeSlots: Array<{
      start_time: string
      end_time: string
      day_of_week: string
      total_attendances: number
      enrolled_children: number
    }>
    attendanceRates: Array<{
      month: string
      total_sessions: number
      present_count: number
      attendance_rate: number
    }>
  }
}

const REPORT_TYPES = [
  { id: 'overview', name: 'Overview', icon: BarChart3 },
  { id: 'financial', name: 'Financial', icon: DollarSign },
  { id: 'membership', name: 'Membership', icon: Users },
  { id: 'attendance', name: 'Attendance', icon: Calendar }
]

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [activeReport, setActiveReport] = useState('overview')
  const [reportData, setReportData] = useState<ReportData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    dateFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
    dateTo: new Date().toISOString().split('T')[0] // Today
  })
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (!['ADMIN', 'FINANCE_ADMIN'].includes(parsedUser.role)) {
      router.push('/dashboard')
      return
    }

    setUser(parsedUser)
    loadReportData('overview')
  }, [router])

  const loadReportData = async (reportType: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        type: reportType,
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo
      })

      const response = await fetch(`/api/reports?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReportData(prev => ({
          ...prev,
          [reportType]: data.data
        }))
      } else {
        const errorData = await response.json()
        console.error('Failed to load report data:', response.status, errorData)
        setError(errorData.error || `Failed to load report data (${response.status})`)
      }
    } catch (error) {
      console.error('Error loading report:', error)
      setError('Network error loading report data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReportChange = (reportType: string) => {
    setActiveReport(reportType)
    if (!reportData[reportType as keyof ReportData]) {
      loadReportData(reportType)
    }
  }

  const handleDateRangeChange = () => {
    setReportData({}) // Clear cached data
    loadReportData(activeReport)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long'
    })
  }

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0
  }

  const exportReport = () => {
    const reportName = REPORT_TYPES.find(r => r.id === activeReport)?.name || activeReport
    const dataStr = JSON.stringify(currentReportData, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportName}-Report-${dateRange.dateFrom}-to-${dateRange.dateTo}.json`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  const currentReportData = reportData[activeReport as keyof ReportData]

  return (
    <AdminLayout title="Reports & Analytics" description="Club performance insights and data analysis">
      <div className="space-y-6">

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <div className="flex-1">{error}</div>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">✕</button>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
              {/* Report Type Selector */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-3">Report Type</label>
                <div className="flex flex-wrap gap-2">
                  {REPORT_TYPES.map((report) => {
                    const Icon = report.icon
                    return (
                      <button
                        key={report.id}
                        onClick={() => handleReportChange(report.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                          activeReport === report.id
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {report.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date Range Selector */}
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From
                  </label>
                  <input
                    type="date"
                    value={dateRange.dateFrom}
                    onChange={(e) => setDateRange(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To
                  </label>
                  <input
                    type="date"
                    value={dateRange.dateTo}
                    onChange={(e) => setDateRange(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={handleDateRangeChange}
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  Update
                </button>
                {currentReportData && (
                  <button
                    onClick={exportReport}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-gray-600">Loading report data...</p>
            </div>
          )}

          {/* Report Content */}
          {!isLoading && currentReportData && (
            <div className="space-y-6">
              
              {/* Overview Report */}
              {activeReport === 'overview' && reportData.overview && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-6 border border-blue-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600 mb-1">Total Members</p>
                          <p className="text-3xl font-bold text-blue-900">{reportData.overview.summary.totalMembers}</p>
                        </div>
                        <div className="p-3 bg-blue-600 rounded-lg">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-6 border border-green-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600 mb-1">Total Revenue</p>
                          <p className="text-3xl font-bold text-green-900">{formatCurrency(reportData.overview.summary.totalRevenue)}</p>
                        </div>
                        <div className="p-3 bg-green-600 rounded-lg">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-sm p-6 border border-amber-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-amber-600 mb-1">Outstanding</p>
                          <p className="text-3xl font-bold text-amber-900">{formatCurrency(reportData.overview.summary.outstandingAmount)}</p>
                          <p className="text-sm text-amber-700 mt-1">{reportData.overview.summary.outstandingCount} invoices</p>
                        </div>
                        <div className="p-3 bg-amber-600 rounded-lg">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm p-6 border border-purple-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600 mb-1">New Members</p>
                          <p className="text-3xl font-bold text-purple-900">
                            {reportData.overview.monthlyGrowth.slice(0, 3).reduce((sum, month) => sum + (month.new_members || 0), 0)}
                          </p>
                          <p className="text-sm text-purple-700 mt-1">Last 3 months</p>
                        </div>
                        <div className="p-3 bg-purple-600 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Members by Level */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        Members by Level
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-end justify-between gap-3 h-64">
                        {reportData.overview.membersByLevel.map((level, index) => {
                          const maxCount = Math.max(...reportData.overview.membersByLevel.map(l => l._count.id))
                          const heightPercentage = (level._count.id / maxCount) * 100
                          const colors = [
                            { bar: 'bg-blue-500', border: 'border-blue-500' },
                            { bar: 'bg-purple-500', border: 'border-purple-500' },
                            { bar: 'bg-pink-500', border: 'border-pink-500' },
                            { bar: 'bg-indigo-500', border: 'border-indigo-500' },
                            { bar: 'bg-violet-500', border: 'border-violet-500' },
                            { bar: 'bg-fuchsia-500', border: 'border-fuchsia-500' },
                            { bar: 'bg-cyan-500', border: 'border-cyan-500' },
                            { bar: 'bg-teal-500', border: 'border-teal-500' }
                          ]
                          const color = colors[index % colors.length]

                          return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                              <div className="relative w-full flex flex-col justify-end" style={{ height: '200px' }}>
                                <div
                                  className={`w-full ${color.bar} rounded-t-lg transition-all duration-700 ease-out flex items-start justify-center pt-2 hover:opacity-90`}
                                  style={{ height: `${Math.max(heightPercentage, 15)}%` }}
                                >
                                  <span className="text-sm font-bold text-white">{level._count.id}</span>
                                </div>
                              </div>
                              <span className="text-xs font-medium text-gray-600 text-center">{level.level}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Recent New Members
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {reportData.overview.recentActivity.map((activity, index) => (
                        <div key={index} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-full">
                              <Users className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {activity.firstName} {activity.lastName}
                              </p>
                              <p className="text-sm text-gray-600">Level: <span className="font-medium">{activity.level}</span></p>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      {reportData.overview.recentActivity.length === 0 && (
                        <div className="px-6 py-12 text-center text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No recent activity found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Report */}
              {activeReport === 'financial' && reportData.financial && (
                <div className="space-y-6">
                  {/* Income Breakdown Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-6 border border-green-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600 mb-1">Total Cash Income</p>
                          <p className="text-3xl font-bold text-green-900">
                            {formatCurrency(
                              reportData.financial.paymentMethods
                                .filter(m => m.method === 'CASH')
                                .reduce((sum, m) => sum + Number(m._sum.amount || 0), 0)
                            )}
                          </p>
                        </div>
                        <div className="p-3 bg-green-600 rounded-lg">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-6 border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600 mb-1">Total Bank Income</p>
                          <p className="text-3xl font-bold text-blue-900">
                            {formatCurrency(
                              reportData.financial.paymentMethods
                                .filter(m => ['EFT', 'CARD', 'ONLINE'].includes(m.method))
                                .reduce((sum, m) => sum + Number(m._sum.amount || 0), 0)
                            )}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">EFT + Card + Online</p>
                        </div>
                        <div className="p-3 bg-blue-600 rounded-lg">
                          <CreditCard className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm p-6 border border-purple-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600 mb-1">Grand Total Income</p>
                          <p className="text-3xl font-bold text-purple-900">
                            {formatCurrency(
                              reportData.financial.paymentMethods
                                .reduce((sum, m) => sum + Number(m._sum.amount || 0), 0)
                            )}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-600 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Revenue Chart */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Monthly Revenue
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {reportData.financial.monthlyRevenue.map((month, index) => (
                          <div key={index} className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100 hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-600 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{formatDate(month.month)}</div>
                                <div className="text-sm text-gray-600">{month.payment_count} payments</div>
                              </div>
                            </div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(Number(month.revenue))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        Payment Methods Breakdown
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {reportData.financial.paymentMethods.map((method, index) => {
                          const isCash = method.method === 'CASH'
                          const colorClass = isCash ? 'green' : 'blue'

                          return (
                            <div key={index} className={`text-center p-6 bg-gradient-to-br from-${colorClass}-50 to-${colorClass}-100 rounded-lg border border-${colorClass}-200 hover:shadow-md transition-shadow`}>
                              <CreditCard className={`h-8 w-8 mx-auto mb-3 text-${colorClass}-600`} />
                              <div className={`text-2xl font-bold text-${colorClass}-900 mb-1`}>
                                {formatCurrency(method._sum.amount || 0)}
                              </div>
                              <div className={`text-sm font-medium text-${colorClass}-700`}>{method.method}</div>
                              <div className={`text-xs text-${colorClass}-600 mt-1`}>{method._count.id} transactions</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Outstanding by Age */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-red-600" />
                        Outstanding Invoices by Age
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {reportData.financial.outstandingByAge.map((age, index) => (
                          <div key={index} className="flex justify-between items-center p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-100 hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-full">
                                <Clock className="h-4 w-4 text-red-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{age.age_group}</div>
                                <div className="text-sm text-gray-600">{age.invoice_count} invoices</div>
                              </div>
                            </div>
                            <div className="text-xl font-bold text-red-600">
                              {formatCurrency(Number(age.total_amount))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Membership Report */}
              {activeReport === 'membership' && reportData.membership && (
                <div className="space-y-6">
                  {/* Level Distribution */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Membership by Level & Status
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reportData.membership.levelDistribution.map((item, index) => (
                          <div key={index} className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold text-gray-900">{item.level}</div>
                                <div className="text-sm text-gray-600">{item.status}</div>
                              </div>
                              <div className="text-3xl font-bold text-purple-600">{item._count.id}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Age Distribution */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Age Distribution
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {reportData.membership.ageDistribution.map((age, index) => (
                          <div key={index} className="text-center p-5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-200 hover:shadow-md transition-shadow">
                            <div className="text-3xl font-bold text-indigo-900 mb-2">{age.member_count}</div>
                            <div className="text-sm font-medium text-indigo-700">{age.age_group}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Retention Data */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Member Retention
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {reportData.membership.retentionData.map((retention, index) => {
                          const total = reportData.membership?.retentionData.reduce((sum, item) => sum + item._count.id, 0) || 1
                          const percentage = calculatePercentage(retention._count.id, total)

                          return (
                            <div key={index} className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                              <div className="text-4xl font-bold text-green-900 mb-2">{retention._count.id}</div>
                              <div className="text-sm font-semibold text-green-700 mb-1">{retention.status}</div>
                              <div className="text-xs text-green-600 bg-green-100 inline-block px-3 py-1 rounded-full">{percentage}% of total</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance Report */}
              {activeReport === 'attendance' && reportData.attendance && (
                <div className="space-y-6">
                  {/* Attendance by Day */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        Attendance by Day of Week
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {reportData.attendance.attendanceByDay.map((day, index) => {
                          const rate = Number(day.attendance_rate)
                          const color = rate >= 80 ? 'green' : rate >= 60 ? 'yellow' : 'red'

                          return (
                            <div key={index} className={`flex justify-between items-center p-4 bg-gradient-to-r from-${color}-50 to-${color}-100 rounded-lg border border-${color}-200 hover:shadow-sm transition-shadow`}>
                              <div className="flex items-center gap-3">
                                <div className={`p-2 bg-${color}-600 rounded-lg`}>
                                  <Calendar className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{day.day_of_week}</div>
                                  <div className="text-sm text-gray-600">
                                    {day.present_count} present / {day.total_sessions} total
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-3xl font-bold text-${color}-600`}>{day.attendance_rate}%</div>
                                <div className="text-xs text-gray-500">attendance rate</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Attendance by Level */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-emerald-600" />
                        Attendance by Level
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reportData.attendance.attendanceByLevel.map((level, index) => {
                          const rate = Number(level.attendance_rate)
                          const color = rate >= 80 ? 'emerald' : rate >= 60 ? 'amber' : 'rose'

                          return (
                            <div key={index} className={`p-5 bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-lg border border-${color}-200 hover:shadow-md transition-shadow`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-semibold text-gray-900">{level.level}</div>
                                  <div className="text-sm text-gray-600">
                                    {level.present_count}/{level.total_sessions}
                                  </div>
                                </div>
                                <div className={`text-2xl font-bold text-${color}-600`}>{level.attendance_rate}%</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Popular Time Slots */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-purple-600" />
                        Most Popular Time Slots
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {reportData.attendance.popularTimeSlots.map((slot, index) => (
                        <div key={index} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-full">
                              <Clock className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {slot.day_of_week} • {slot.start_time} - {slot.end_time}
                              </div>
                              <div className="text-sm text-gray-600">
                                {slot.enrolled_children} enrolled children
                              </div>
                            </div>
                          </div>
                          <div className="text-xl font-bold text-purple-600 flex items-center gap-2">
                            {slot.total_attendances}
                            <ArrowUpRight className="h-5 w-5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* No Data State */}
          {!isLoading && !currentReportData && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No data available</div>
              <p className="text-gray-400">Try adjusting your date range or check back later</p>
            </div>
          )}
      </div>
    </AdminLayout>
  )
}