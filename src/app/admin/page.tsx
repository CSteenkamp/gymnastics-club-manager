'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FeeAdjustmentManager } from '@/components/fees/FeeAdjustmentManager'

interface DashboardStats {
  totalMembers: number
  totalInvoices: number
  totalRevenue: number
  pendingPayments: number
  outstandingBalance: number
  newMembersThisMonth: number
}

interface RecentActivity {
  id: string
  type: 'payment' | 'registration' | 'invoice'
  description: string
  timestamp: string
  amount?: number
}

interface Child {
  id: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  gender?: string
  level: string
  monthlyFee: number
  status: string
  notes?: string
  parents: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }[]
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    outstandingBalance: 0,
    newMembersThisMonth: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [members, setMembers] = useState<Child[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [showAddMember] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in and has admin role
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'FINANCE_ADMIN') {
      router.push('/dashboard')
      return
    }

    setUser(parsedUser)
    loadDashboardData()
  }, [router])

  useEffect(() => {
    if (activeTab === 'members' && user) {
      loadMembers()
    }
  }, [activeTab, user])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Simulate loading dashboard data
      // In a real app, you would fetch this from your API
      setTimeout(() => {
        setStats({
          totalMembers: 127,
          totalInvoices: 45,
          totalRevenue: 45280,
          pendingPayments: 12,
          outstandingBalance: 8400,
          newMembersThisMonth: 8
        })
        
        setRecentActivity([
          {
            id: '1',
            type: 'payment',
            description: 'Sarah Johnson paid monthly fee',
            timestamp: '2 hours ago',
            amount: 850
          },
          {
            id: '2',
            type: 'registration',
            description: 'New member: Emma Smith registered',
            timestamp: '5 hours ago'
          },
          {
            id: '3',
            type: 'invoice',
            description: 'Monthly invoices generated for March',
            timestamp: '1 day ago'
          },
          {
            id: '4',
            type: 'payment',
            description: 'Michael Brown paid registration fee',
            timestamp: '2 days ago',
            amount: 1200
          }
        ])
        
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setIsLoading(false)
    }
  }

  const loadMembers = async () => {
    setMembersLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/children', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMembers(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setMembersLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Call logout API to clear cookie
      await fetch('/api/auth/logout', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear localStorage and redirect
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💳'
      case 'registration':
        return '👤'
      case 'invoice':
        return '📄'
      default:
        return '📋'
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = searchTerm === '' || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.parents.some(parent => 
        `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    
    const matchesLevel = filterLevel === '' || member.level === filterLevel
    const matchesStatus = filterStatus === '' || member.status === filterStatus
    const matchesGender = filterGender === '' || member.gender === filterGender
    
    return matchesSearch && matchesLevel && matchesStatus && matchesGender
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
      SUSPENDED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspended' },
      TRIAL: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' }
    }
    const config = statusConfig[status] || statusConfig.ACTIVE
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return 'N/A'
    const today = new Date()
    const birth = new Date(dateOfBirth)
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1
    }
    return age
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">Welcome back, {user.firstName}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Ceres Gymnastics Club
              </div>
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'members', name: 'Members', icon: '👥' },
              { id: 'documents', name: 'Documents', icon: '📄' },
              { id: 'finances', name: 'Finances', icon: '💰' },
              { id: 'credits', name: 'Credits', icon: '💳' },
              { id: 'fee-adjustments', name: 'Fee Adjustments', icon: '⚖️' },
              { id: 'classes', name: 'Classes', icon: '🏃‍♀️' },
              { id: 'reports', name: 'Reports', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <span className="text-2xl">👥</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Members</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalMembers}</p>
                      <p className="text-sm text-green-600">+{stats.newMembersThisMonth} this month</p>
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
                      <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                      <p className="text-sm text-gray-500">This month</p>
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
                      <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.outstandingBalance)}</p>
                      <p className="text-sm text-orange-600">{stats.pendingPayments} pending payments</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                </div>
                <div className="p-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">Loading activity...</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">{getActivityIcon(activity.type)}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                              <p className="text-xs text-gray-500">{activity.timestamp}</p>
                            </div>
                          </div>
                          {activity.amount && (
                            <span className="text-green-600 font-semibold">
                              {formatCurrency(activity.amount)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button 
                      onClick={() => router.push('/admin/reports')}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-center">
                        <span className="text-3xl">📊</span>
                        <p className="text-sm font-medium text-gray-900 mt-2">Reports</p>
                      </div>
                    </button>
                    <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="text-center">
                        <span className="text-3xl">📄</span>
                        <p className="text-sm font-medium text-gray-900 mt-2">Generate Invoices</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => router.push('/admin/notifications')}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-center">
                        <span className="text-3xl">📧</span>
                        <p className="text-sm font-medium text-gray-900 mt-2">Notifications</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => router.push('/admin/schedules')}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-center">
                        <span className="text-3xl">📅</span>
                        <p className="text-sm font-medium text-gray-900 mt-2">Schedules</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => router.push('/admin/credits')}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-center">
                        <span className="text-3xl">💳</span>
                        <p className="text-sm font-medium text-gray-900 mt-2">Credits</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Members Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Members Management</h3>
                      <p className="text-sm text-gray-600">Manage club members and their information</p>
                    </div>
                    <button
                      onClick={() => alert('Add member functionality coming soon!')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Add New Member
                    </button>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="p-6 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                      <input
                        type="text"
                        placeholder="Search members or parents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                      <select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">All Levels</option>
                        <option value="Level RR">Level RR</option>
                        <option value="Level R">Level R</option>
                        <option value="Level 1">Level 1</option>
                        <option value="Level 2">Level 2</option>
                        <option value="Level 3">Level 3</option>
                        <option value="Level 4">Level 4</option>
                        <option value="Level 5">Level 5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="TRIAL">Trial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                      <select
                        value={filterGender}
                        onChange={(e) => setFilterGender(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">All Genders</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Members List */}
                <div className="p-6">
                  {membersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">Loading members...</div>
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-4xl">👥</span>
                      <h3 className="text-lg font-medium text-gray-900 mt-2">No members found</h3>
                      <p className="text-gray-500">
                        {searchTerm || filterLevel || filterStatus || filterGender
                          ? 'Try adjusting your search criteria' 
                          : 'Add your first member to get started'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Member
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Level
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gender
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Parent(s)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Monthly Fee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {member.firstName} {member.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Age: {calculateAge(member.dateOfBirth)}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  {member.level}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  member.gender === 'MALE' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : member.gender === 'FEMALE'
                                    ? 'bg-pink-100 text-pink-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {member.gender === 'MALE' ? 'Male' : member.gender === 'FEMALE' ? 'Female' : 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(member.status)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  {member.parents.map((parent) => (
                                    <div key={parent.id} className="text-sm">
                                      <div className="font-medium text-gray-900">
                                        {parent.firstName} {parent.lastName}
                                      </div>
                                      <div className="text-gray-500">{parent.email}</div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(member.monthlyFee)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button className="text-purple-600 hover:text-purple-900">
                                    Edit
                                  </button>
                                  <button className="text-red-600 hover:text-red-900">
                                    Delete
                                  </button>
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
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Documents Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Document Management</h3>
                      <p className="text-sm text-gray-600">Upload and manage club documents and forms</p>
                    </div>
                    <button
                      onClick={() => alert('Document upload coming soon!')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      📄 Upload Document
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="text-center py-8">
                    <span className="text-6xl">📄</span>
                    <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                      Document Management System
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Complete POPI Act compliant document management with digital signatures.
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-green-800">
                        <strong>✅ Features Available:</strong>
                      </p>
                      <ul className="text-sm text-green-700 mt-2 space-y-1">
                        <li>• Document upload and categorization</li>
                        <li>• Digital signature collection</li>
                        <li>• Consent tracking and management</li>
                        <li>• POPI Act compliance audit trails</li>
                        <li>• Automated reminders for unsigned documents</li>
                      </ul>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <span className="text-2xl">📋</span>
                        <h4 className="font-medium text-gray-900 mt-2">Policies & Forms</h4>
                        <p className="text-sm text-gray-600">Privacy policies, terms, consent forms</p>
                      </div>
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <span className="text-2xl">✍️</span>
                        <h4 className="font-medium text-gray-900 mt-2">Digital Signatures</h4>
                        <p className="text-sm text-gray-600">Collect legally binding signatures</p>
                      </div>
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <span className="text-2xl">🔒</span>
                        <h4 className="font-medium text-gray-900 mt-2">POPI Compliance</h4>
                        <p className="text-sm text-gray-600">Full audit trails and consent tracking</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <p className="text-sm text-gray-500">
                        API endpoints are ready. Frontend interface coming soon!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credits' && (
            <div className="space-y-6">
              {/* Credits Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Credit Management</h3>
                      <p className="text-sm text-gray-600">Manage prepayments, credit balances, and overpayments</p>
                    </div>
                    <button
                      onClick={() => router.push('/admin/credits')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      💳 Open Credit Manager
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="text-center py-8">
                    <span className="text-6xl">💳</span>
                    <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                      Credit & Prepayment System
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Complete credit management system for handling prepayments and overpayments.
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-green-800">
                        <strong>✅ Features Available:</strong>
                      </p>
                      <ul className="text-sm text-green-700 mt-2 space-y-1">
                        <li>• Automatic credit account creation</li>
                        <li>• Credit balance tracking and management</li>
                        <li>• Overpayment processing and conversion</li>
                        <li>• Credit application to invoices</li>
                        <li>• Transaction history and audit trails</li>
                        <li>• Parent credit account dashboard</li>
                      </ul>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <span className="text-2xl">💰</span>
                        <h4 className="font-medium text-gray-900 mt-2">Credit Accounts</h4>
                        <p className="text-sm text-gray-600">Manage user credit balances and prepayments</p>
                      </div>
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <span className="text-2xl">🔄</span>
                        <h4 className="font-medium text-gray-900 mt-2">Overpayment Processing</h4>
                        <p className="text-sm text-gray-600">Handle payment overages automatically</p>
                      </div>
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <span className="text-2xl">📊</span>
                        <h4 className="font-medium text-gray-900 mt-2">Transaction History</h4>
                        <p className="text-sm text-gray-600">Complete audit trails and reporting</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <button
                        onClick={() => router.push('/admin/credits')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                      >
                        Open Credit Management Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fee-adjustments' && (
            <FeeAdjustmentManager />
          )}

          {(activeTab !== 'overview' && activeTab !== 'members' && activeTab !== 'documents' && activeTab !== 'credits' && activeTab !== 'fee-adjustments') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <span className="text-6xl">🚧</span>
                <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Section
                </h3>
                <p className="text-gray-600 mb-6">
                  This section is currently under development. Advanced functionality will be available soon.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Coming Soon:</strong> Comprehensive {activeTab} management with full CRUD operations, 
                    search functionality, and detailed reporting.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}