'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  { id: 'overview', name: 'Overview', icon: '📊' },
  { id: 'financial', name: 'Financial', icon: '💰' },
  { id: 'membership', name: 'Membership', icon: '👥' },
  { id: 'attendance', name: 'Attendance', icon: '📅' }
]

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [activeReport, setActiveReport] = useState('overview')
  const [reportData, setReportData] = useState<ReportData>({})
  const [isLoading, setIsLoading] = useState(false)
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
        console.error('Failed to load report data')
      }
    } catch (error) {
      console.error('Error loading report:', error)
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  const currentReportData = reportData[activeReport as keyof ReportData]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Reports & Analytics
              </h1>
              <p className="text-gray-600">Club performance insights and data analysis</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-purple-600 hover:text-purple-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              {/* Report Type Selector */}
              <div className="flex flex-wrap gap-2">
                {REPORT_TYPES.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => handleReportChange(report.id)}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeReport === report.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{report.icon}</span>
                    {report.name}
                  </button>
                ))}
              </div>

              {/* Date Range Selector */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    value={dateRange.dateTo}
                    onChange={(e) => setDateRange(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleDateRangeChange}
                    disabled={isLoading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <span className="text-2xl">👥</span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Members</p>
                          <p className="text-3xl font-bold text-gray-900">{reportData.overview.summary.totalMembers}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <span className="text-2xl">💰</span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                          <p className="text-3xl font-bold text-gray-900">{formatCurrency(reportData.overview.summary.totalRevenue)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <span className="text-2xl">⏳</span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Outstanding</p>
                          <p className="text-3xl font-bold text-gray-900">{formatCurrency(reportData.overview.summary.outstandingAmount)}</p>
                          <p className="text-sm text-gray-500">{reportData.overview.summary.outstandingCount} invoices</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <span className="text-2xl">📈</span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {reportData.overview.monthlyGrowth.slice(0, 3).reduce((sum, month) => sum + (month.new_members || 0), 0)}
                          </p>
                          <p className="text-sm text-gray-500">Last 3 months</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Members by Level */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Members by Level</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {reportData.overview.membersByLevel.map((level, index) => (
                          <div key={index} className="text-center">
                            <div className="bg-gray-100 rounded-lg p-4 mb-2">
                              <div className="text-2xl font-bold text-gray-900">{level._count.id}</div>
                              <div className="text-sm text-gray-600">{level.level}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Recent New Members</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {reportData.overview.recentActivity.map((activity, index) => (
                        <div key={index} className="px-6 py-4 flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">
                              {activity.firstName} {activity.lastName}
                            </p>
                            <p className="text-sm text-gray-600">Level: {activity.level}</p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      {reportData.overview.recentActivity.length === 0 && (
                        <div className="px-6 py-8 text-center text-gray-500">
                          No recent activity found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Report */}
              {activeReport === 'financial' && reportData.financial && (
                <div className="space-y-6">
                  {/* Monthly Revenue Chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {reportData.financial.monthlyRevenue.map((month, index) => (
                          <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{formatDate(month.month)}</div>
                              <div className="text-sm text-gray-600">{month.payment_count} payments</div>
                            </div>
                            <div className="text-xl font-bold text-green-600">
                              {formatCurrency(Number(month.revenue))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {reportData.financial.paymentMethods.map((method, index) => (
                          <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatCurrency(method._sum.amount || 0)}
                            </div>
                            <div className="text-sm text-gray-600">{method.method}</div>
                            <div className="text-xs text-gray-500">{method._count.id} transactions</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Outstanding by Age */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Outstanding Invoices by Age</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {reportData.financial.outstandingByAge.map((age, index) => (
                          <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{age.age_group}</div>
                              <div className="text-sm text-gray-600">{age.invoice_count} invoices</div>
                            </div>
                            <div className="text-lg font-bold text-red-600">
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
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Membership by Level & Status</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reportData.membership.levelDistribution.map((item, index) => (
                          <div key={index} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-gray-900">{item.level}</div>
                                <div className="text-sm text-gray-600">{item.status}</div>
                              </div>
                              <div className="text-2xl font-bold text-gray-900">{item._count.id}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Age Distribution */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Age Distribution</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {reportData.membership.ageDistribution.map((age, index) => (
                          <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">{age.member_count}</div>
                            <div className="text-sm text-gray-600">{age.age_group}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Retention Data */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Member Retention</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {reportData.membership.retentionData.map((retention, index) => {
                          const total = reportData.membership?.retentionData.reduce((sum, item) => sum + item._count.id, 0) || 1
                          const percentage = calculatePercentage(retention._count.id, total)
                          
                          return (
                            <div key={index} className="text-center p-6 border border-gray-200 rounded-lg">
                              <div className="text-3xl font-bold text-gray-900">{retention._count.id}</div>
                              <div className="text-sm text-gray-600">{retention.status}</div>
                              <div className="text-xs text-gray-500">{percentage}% of total</div>
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
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Attendance by Day of Week</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {reportData.attendance.attendanceByDay.map((day, index) => (
                          <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{day.day_of_week}</div>
                              <div className="text-sm text-gray-600">
                                {day.present_count} present / {day.total_sessions} total
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600">{day.attendance_rate}%</div>
                              <div className="text-xs text-gray-500">attendance rate</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Attendance by Level */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Attendance by Level</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reportData.attendance.attendanceByLevel.map((level, index) => (
                          <div key={index} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-gray-900">{level.level}</div>
                                <div className="text-sm text-gray-600">
                                  {level.present_count}/{level.total_sessions}
                                </div>
                              </div>
                              <div className="text-xl font-bold text-green-600">{level.attendance_rate}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Popular Time Slots */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Most Popular Time Slots</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {reportData.attendance.popularTimeSlots.map((slot, index) => (
                        <div key={index} className="px-6 py-4 flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">
                              {slot.day_of_week} {slot.start_time} - {slot.end_time}
                            </div>
                            <div className="text-sm text-gray-600">
                              {slot.enrolled_children} enrolled children
                            </div>
                          </div>
                          <div className="text-lg font-bold text-purple-600">
                            {slot.total_attendances} attendances
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
      </main>
    </div>
  )
}