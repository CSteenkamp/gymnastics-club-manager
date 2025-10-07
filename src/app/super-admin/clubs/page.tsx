'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  Calendar
} from 'lucide-react'

interface Club {
  id: string
  name: string
  email: string
  slug: string | null
  customDomain: string | null
  subscriptionStatus: string
  subscriptionTier: string
  studentCount: number
  isActive: boolean
  onboardingCompleted: boolean
  trialEndsAt: string | null
  subscriptionExpiry: string | null
  createdAt: string
  _count: {
    users: number
    children: number
  }
  subscription: {
    plan: {
      name: string
      price: number
    }
  } | null
}

export default function SuperAdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadClubs()
  }, [])

  useEffect(() => {
    filterClubs()
  }, [searchTerm, statusFilter, clubs])

  const loadClubs = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/clubs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setClubs(data.data || [])
      } else if (response.status === 403) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error loading clubs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterClubs = () => {
    let filtered = clubs

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(club => club.subscriptionStatus === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(club =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (club.slug && club.slug.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredClubs(filtered)
  }

  const handleClubAction = async (clubId: string, action: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/super-admin/clubs', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clubId, action })
      })

      if (response.ok) {
        await loadClubs()
        setShowActionMenu(null)
        alert(`Club ${action.toLowerCase()}d successfully`)
      } else {
        const error = await response.json()
        alert(error.error || 'Action failed')
      }
    } catch (error) {
      console.error('Error performing action:', error)
      alert('Action failed')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      TRIAL: 'bg-blue-100 text-blue-800',
      SUSPENDED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      EXPIRED: 'bg-orange-100 text-orange-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'TRIAL':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'SUSPENDED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/super-admin/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Club Management</h1>
                <p className="text-gray-600">{clubs.length} clubs total</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clubs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="TRIAL">Trial</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clubs Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading clubs...</div>
            ) : filteredClubs.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                {searchTerm || statusFilter !== 'ALL' ? 'No clubs match your filters' : 'No clubs found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Club
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClubs.map((club) => (
                      <tr key={club.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{club.name}</div>
                            <div className="text-sm text-gray-500">{club.email}</div>
                            {club.slug && (
                              <div className="text-xs text-gray-400 mt-1">/{club.slug}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(club.subscriptionStatus)}
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(club.subscriptionStatus)}`}>
                              {club.subscriptionStatus}
                            </span>
                          </div>
                          {club.trialEndsAt && new Date(club.trialEndsAt) > new Date() && (
                            <div className="text-xs text-blue-600 mt-1">
                              Trial ends: {new Date(club.trialEndsAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {club.subscription?.plan.name || club.subscriptionTier}
                          </div>
                          {club.subscription && (
                            <div className="text-xs text-gray-500">
                              {formatCurrency(Number(club.subscription.plan.price))}/mo
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-gray-900">
                            <Users className="h-4 w-4 text-gray-400" />
                            {club.studentCount || club._count.children}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {club._count.users}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            {new Date(club.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setShowActionMenu(showActionMenu === club.id ? null : club.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <MoreVertical className="h-5 w-5 text-gray-400" />
                            </button>

                            {showActionMenu === club.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <div className="py-1">
                                  {club.subscriptionStatus === 'SUSPENDED' ? (
                                    <button
                                      onClick={() => handleClubAction(club.id, 'ACTIVATE')}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      Activate
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleClubAction(club.id, 'SUSPEND')}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      Suspend
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleClubAction(club.id, 'EXTEND_TRIAL')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Extend Trial
                                  </button>
                                  <button
                                    onClick={() => router.push(`/super-admin/clubs/${club.id}`)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
