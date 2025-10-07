'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Users,
  Calendar,
  ClipboardCheck,
  TrendingUp,
  Clock,
  Award,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface ClassStats {
  id: string
  name: string
  level: string
  studentCount: number
  nextSession?: string
  attendanceRate: number
}

interface CoachStats {
  totalClasses: number
  totalStudents: number
  todaysClasses: number
  upcomingClasses: number
  averageAttendance: number
}

export default function CoachDashboard() {
  const [stats, setStats] = useState<CoachStats | null>(null)
  const [classes, setClasses] = useState<ClassStats[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/coach/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.data.stats)
        setClasses(data.data.classes)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Coach Dashboard</h1>
              <p className="text-gray-600">Manage your classes and track student progress</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => router.push('/coach/attendance')}>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
              <Button variant="outline" onClick={() => router.push('/coach/classes')}>
                View All Classes
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Classes</p>
                      <p className="text-3xl font-bold text-gray-900">{stats?.totalClasses || 0}</p>
                    </div>
                    <Users className="h-10 w-10 text-purple-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Students</p>
                      <p className="text-3xl font-bold text-gray-900">{stats?.totalStudents || 0}</p>
                    </div>
                    <Award className="h-10 w-10 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Today's Classes</p>
                      <p className="text-3xl font-bold text-gray-900">{stats?.todaysClasses || 0}</p>
                    </div>
                    <Clock className="h-10 w-10 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Upcoming</p>
                      <p className="text-3xl font-bold text-gray-900">{stats?.upcomingClasses || 0}</p>
                    </div>
                    <Calendar className="h-10 w-10 text-orange-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Attendance</p>
                      <p className={`text-3xl font-bold ${getAttendanceColor(stats?.averageAttendance || 0)}`}>
                        {stats?.averageAttendance || 0}%
                      </p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-indigo-600" />
                  </div>
                </div>
              </div>

              {/* My Classes */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">My Classes</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {classes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No classes assigned yet
                    </div>
                  ) : (
                    classes.map((classItem) => (
                      <div
                        key={classItem.id}
                        className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/coach/classes/${classItem.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {classItem.name}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm text-gray-600">
                                Level: {classItem.level}
                              </span>
                              <span className="text-sm text-gray-600">
                                {classItem.studentCount} students
                              </span>
                              {classItem.nextSession && (
                                <span className="text-sm text-blue-600">
                                  Next: {new Date(classItem.nextSession).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Attendance Rate</p>
                              <p className={`text-lg font-semibold ${getAttendanceColor(classItem.attendanceRate)}`}>
                                {classItem.attendanceRate}%
                              </p>
                            </div>
                            {classItem.attendanceRate >= 80 ? (
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : classItem.attendanceRate < 60 ? (
                              <XCircle className="h-6 w-6 text-red-600" />
                            ) : (
                              <Clock className="h-6 w-6 text-yellow-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => router.push('/coach/attendance')}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
                >
                  <ClipboardCheck className="h-8 w-8 text-purple-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Mark Attendance</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Record student attendance for today's classes
                  </p>
                </button>

                <button
                  onClick={() => router.push('/coach/progress')}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
                >
                  <TrendingUp className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Track Progress</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Monitor and update student progress and achievements
                  </p>
                </button>

                <button
                  onClick={() => router.push('/coach/reports')}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
                >
                  <Calendar className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900">View Reports</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Access class reports and analytics
                  </p>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
