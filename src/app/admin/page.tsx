'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { WeeklyTimetable } from '@/components/classes/WeeklyTimetable'
import {
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react'

interface DashboardStats {
  totalMembers: number
  activeMembers: number
  totalRevenue: number
  monthlyRevenue: number
  pendingInvoices: number
  outstandingBalance: number
  upcomingClasses: number
  revenueChange: number
}

interface RecentActivity {
  id: string
  type: 'payment' | 'registration' | 'invoice'
  description: string
  timestamp: string
  amount?: number
}

interface ClassSchedule {
  id: string
  name: string
  description: string
  dayOfWeek: string
  startTime: string
  endTime: string
  level: string
  venue: string
  currentEnrollment: number
  maxCapacity: number
  isActive: boolean
  coach?: {
    id: string
    firstName: string
    lastName: string
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingInvoices: 0,
    outstandingBalance: 0,
    upcomingClasses: 0,
    revenueChange: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [weeklyClasses, setWeeklyClasses] = useState<ClassSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Consolidated useEffect with proper dependencies
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const loadData = async () => {
      if (pathname === '/admin' && mounted) {
        await loadDashboardData()
      }
    }

    // Load data initially
    loadData()

    // Reload data when page becomes visible (e.g., switching tabs)
    const handleVisibilityChange = () => {
      if (!document.hidden && pathname === '/admin' && mounted) {
        loadData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname])

  const loadDashboardData = async () => {
    try {
      setError(null)
      const token = localStorage.getItem('token')

      if (!token) {
        setError('No authentication token found')
        setLoading(false)
        return
      }

      // Add timeout to API calls
      const timeout = (ms: number) => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      )

      const fetchWithTimeout = (url: string, options: any, timeoutMs = 10000) => {
        return Promise.race([
          fetch(url, options),
          timeout(timeoutMs)
        ]) as Promise<Response>
      }

      const userData = localStorage.getItem('user')
      const user = userData ? JSON.parse(userData) : null

      const [childrenRes, invoicesRes, paymentsRes] = await Promise.all([
        fetchWithTimeout('/api/children', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetchWithTimeout('/api/invoices', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetchWithTimeout('/api/payments', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      // Check for HTTP errors
      if (!childrenRes.ok || !invoicesRes.ok || !paymentsRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const children = await childrenRes.json()
      const invoices = await invoicesRes.json()
      const payments = await paymentsRes.json()

      // Fetch schedules separately (optional - don't fail if this errors)
      try {
        const schedulesRes = await fetchWithTimeout('/api/schedules', {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (schedulesRes.ok) {
          const schedules = await schedulesRes.json()

          // Filter schedules for current user if they're a coach
          if (schedules.success && Array.isArray(schedules.data) && user) {
            const userSchedules = schedules.data.filter((s: any) =>
              !user.role || user.role === 'ADMIN' || user.role === 'FINANCE_ADMIN' || s.coach?.id === user.id
            ).map((s: any) => ({
              ...s,
              // Ensure all required fields are present
              name: s.name || s.level,
              description: s.description || '',
              maxCapacity: s.maxCapacity || 15,
              isActive: s.isActive !== false
            }))
            setWeeklyClasses(userSchedules)
          }
        }
      } catch (error) {
        console.log('Failed to fetch schedules (optional):', error)
        // Don't throw - schedules are optional for dashboard
      }

      if (children.success && invoices.success && payments.success) {
        const activeMembers = Array.isArray(children.data) ? children.data.filter((c: any) => c.status === 'ACTIVE').length : 0

        // Handle payments.data structure (it's an object with payments array)
        const paymentsArray = Array.isArray(payments.data?.payments) ? payments.data.payments : []
        const totalRevenue = paymentsArray
          .filter((p: any) => p.status === 'COMPLETED')
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0)

        const pendingInvoices = Array.isArray(invoices.data) ? invoices.data.filter((i: any) => i.status === 'PENDING').length : 0
        const outstandingBalance = Array.isArray(invoices.data)
          ? invoices.data
              .filter((i: any) => i.status === 'PENDING' || i.status === 'OVERDUE')
              .reduce((sum: number, i: any) => sum + Number(i.total), 0)
          : 0

        // Calculate recent activity
        const activities: RecentActivity[] = [
          ...paymentsArray.slice(0, 5).map((p: any) => ({
            id: p.id,
            type: 'payment' as const,
            description: `Payment received - R${Number(p.amount).toFixed(2)}`,
            timestamp: p.createdAt,
            amount: Number(p.amount)
          })),
          ...(Array.isArray(children.data) ? children.data.slice(0, 3).map((c: any) => ({
            id: c.id,
            type: 'registration' as const,
            description: `New member: ${c.firstName} ${c.lastName}`,
            timestamp: c.createdAt
          })) : [])
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8)

        setStats({
          totalMembers: Array.isArray(children.data) ? children.data.length : 0,
          activeMembers,
          totalRevenue,
          monthlyRevenue: totalRevenue,
          pendingInvoices,
          outstandingBalance,
          upcomingClasses: 0,
          revenueChange: 0
        })
        setRecentActivity(activities)
      } else {
        setError('Failed to load some dashboard data')
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error)
      setError(error.message || 'Failed to load dashboard data')
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

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-red-600 text-lg font-medium">{error}</div>
          <button
            onClick={() => {
              setLoading(true)
              setError(null)
              loadDashboardData()
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Dashboard" description="Overview of your gymnastics club">
      <div className="space-y-6">
        {/* Weekly Timetable - At the top */}
        {weeklyClasses.length > 0 && (
          <WeeklyTimetable
            classes={weeklyClasses}
            onEditClass={(classItem) => router.push('/admin/schedules')}
          />
        )}

        {/* Stats Grid - Compact 2-column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Members */}
          <div className="bg-white border-2 border-blue-200 rounded-xl shadow-sm p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalMembers}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stats.activeMembers} active</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white border-2 border-emerald-200 rounded-xl shadow-sm p-4 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
                <p className="text-xs text-emerald-600 mt-0.5 flex items-center font-medium">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stats.revenueChange}% vs last month
                </p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Pending Invoices */}
          <div className="bg-white border-2 border-orange-200 rounded-xl shadow-sm p-4 hover:shadow-md hover:border-orange-300 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Pending Invoices</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingInvoices}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(stats.outstandingBalance)}</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border-2 border-purple-200 rounded-xl shadow-sm p-4 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer" onClick={() => router.push('/admin/import')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Quick Actions</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">Import Members</p>
                <p className="text-xs text-gray-500 mt-0.5">Add bulk members →</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <ArrowUpRight className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
