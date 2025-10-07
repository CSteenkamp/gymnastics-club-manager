'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParentLayout } from '@/components/layout/ParentLayout'
import { Button } from '@/components/ui/button'
import { Calendar, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Child {
  id: string
  firstName: string
  lastName: string
  level: string
}

interface AttendanceRecord {
  id: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  notes?: string
  class: {
    id: string
    name: string
    dayOfWeek: string
    startTime: string
    endTime: string
  }
  child: {
    id: string
    firstName: string
    lastName: string
  }
}

interface AttendanceStats {
  totalSessions: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendanceRate: number
}

export default function AttendancePage() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    to: new Date().toISOString().split('T')[0]
  })
  const router = useRouter()

  useEffect(() => {
    loadChildren()
  }, [])

  useEffect(() => {
    if (selectedChild) {
      loadAttendance()
    }
  }, [selectedChild, dateRange])

  const loadChildren = async () => {
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')

      if (!token || !userData) {
        router.push('/login')
        return
      }

      const user = JSON.parse(userData)
      if (user.children && user.children.length > 0) {
        setChildren(user.children)
        setSelectedChild(user.children[0].id)
      }
    } catch (error) {
      console.error('Error loading children:', error)
    }
  }

  const loadAttendance = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        childId: selectedChild,
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      })

      const response = await fetch(`/api/attendance/parent?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAttendanceRecords(data.data.records || [])
          setStats(data.data.stats || null)
        }
      }
    } catch (error) {
      console.error('Error loading attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any }> = {
      PRESENT: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      ABSENT: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      LATE: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      EXCUSED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle }
    }
    const config = configs[status] || configs.ABSENT
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const selectedChildData = children.find(c => c.id === selectedChild)

  return (
    <ParentLayout title="Attendance" description="Track your child's class attendance">
      <div className="space-y-6">

          {/* Child & Date Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Child</label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {children.map(child => (
                    <option key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-sm text-purple-600 font-medium">Attendance Rate</p>
                <p className="text-3xl font-bold text-purple-900">{stats.attendanceRate.toFixed(1)}%</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm text-blue-600 font-medium">Total Sessions</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalSessions}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-sm text-green-600 font-medium">Present</p>
                <p className="text-3xl font-bold text-green-900">{stats.presentCount}</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <p className="text-sm text-red-600 font-medium">Absent</p>
                <p className="text-3xl font-bold text-red-900">{stats.absentCount}</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <p className="text-sm text-yellow-600 font-medium">Late/Excused</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.lateCount + stats.excusedCount}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading attendance records...</div>
            </div>
          )}

          {/* No Data */}
          {!loading && attendanceRecords.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
              <p className="text-gray-500">
                {selectedChildData
                  ? `No attendance records found for ${selectedChildData.firstName} in this date range.`
                  : 'No children registered yet.'}
              </p>
            </div>
          )}

          {/* Attendance Records */}
          {!loading && attendanceRecords.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendance History ({attendanceRecords.length} records)
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {attendanceRecords.map((record) => (
                  <div key={record.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="h-5 w-5 text-purple-600" />
                          <div>
                            <h4 className="font-semibold text-gray-900">{record.class.name}</h4>
                            <p className="text-sm text-gray-600">
                              {formatDate(record.date)} • {formatTime(record.class.startTime)} - {formatTime(record.class.endTime)}
                            </p>
                          </div>
                        </div>
                        {record.notes && (
                          <p className="text-sm text-gray-600 ml-8 mt-2">
                            <span className="font-medium">Note:</span> {record.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(record.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </ParentLayout>
  )
}
