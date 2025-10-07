'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

interface PlatformStats {
  totalClubs: number
  activeClubs: number
  trialingClubs: number
  suspendedClubs: number
  totalRevenue: number
  monthlyRecurringRevenue: number
  totalStudents: number
  churnRate: number
}

interface RecentClub {
  id: string
  name: string
  slug: string
  subscriptionStatus: string
  studentCount: number
  createdAt: string
  trialEndsAt?: string
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats>({
    totalClubs: 0,
    activeClubs: 0,
    trialingClubs: 0,
    suspendedClubs: 0,
    totalRevenue: 0,
    monthlyRecurringRevenue: 0,
    totalStudents: 0,
    churnRate: 0
  })
  const [recentClubs, setRecentClubs] = useState<RecentClub[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is super admin
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const user = JSON.parse(userData)
    if (user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }

    loadDashboardData()
  }, [router])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || stats)
        setRecentClubs(data.recentClubs || [])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      TRIALING: 'bg-blue-100 text-blue-800',
      SUSPENDED: 'bg-red-100 text-red-800',
      TRIAL: 'bg-yellow-100 text-yellow-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'TRIALING':
      case 'TRIAL':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'SUSPENDED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-gray-600">Platform Management & Analytics</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => router.push('/super-admin/clubs')}>
                Manage Clubs
              </Button>
              <Button variant="outline" onClick={() => router.push('/super-admin/subscriptions')}>
                Subscriptions
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Total Clubs</h3>
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalClubs}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {stats.activeClubs} active
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Total Students</h3>
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Across all clubs
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">MRR</h3>
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(stats.monthlyRecurringRevenue)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Monthly recurring
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Trialing</h3>
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.trialingClubs}</p>
                  <p className="text-sm text-blue-600 mt-1">
                    In trial period
                  </p>
                </div>
              </div>

              {/* Status Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Active Clubs</h3>
                  </div>
                  <p className="text-4xl font-bold text-green-600">{stats.activeClubs}</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="h-6 w-6 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Trial Clubs</h3>
                  </div>
                  <p className="text-4xl font-bold text-blue-600">{stats.trialingClubs}</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <h3 className="font-semibold text-gray-900">Suspended</h3>
                  </div>
                  <p className="text-4xl font-bold text-red-600">{stats.suspendedClubs}</p>
                </div>
              </div>

              {/* Recent Clubs */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Clubs</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentClubs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No clubs yet</div>
                  ) : (
                    recentClubs.map((club) => (
                      <div key={club.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{club.name}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(club.subscriptionStatus)}`}>
                                {club.subscriptionStatus}
                              </span>
                            </div>
                            <div className="flex gap-6 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{club.studentCount} students</span>
                              </div>
                              <div>Slug: {club.slug || 'Not set'}</div>
                              <div>Joined: {new Date(club.createdAt).toLocaleDateString()}</div>
                              {club.trialEndsAt && (
                                <div className="text-blue-600">
                                  Trial ends: {new Date(club.trialEndsAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/super-admin/clubs/${club.id}`)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
