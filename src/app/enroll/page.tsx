'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, Clock, MapPin, CheckCircle, XCircle, AlertCircle, UserPlus, UserMinus } from 'lucide-react'

interface Child {
  id: string
  firstName: string
  lastName: string
  level: string
  status: string
}

interface AvailableClass {
  id: string
  name: string
  description?: string
  level: string
  dayOfWeek: string
  startTime: string
  endTime: string
  maxCapacity: number
  currentEnrollment: number
  venue: string
  coach?: {
    firstName: string
    lastName: string
  }
  isEnrolled: boolean
  enrolledChildren: string[]
}

export default function EnrollPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterLevel, setFilterLevel] = useState('')
  const [filterDay, setFilterDay] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  useEffect(() => {
    loadChildren()
  }, [])

  useEffect(() => {
    if (selectedChild) {
      loadAvailableClasses()
    }
  }, [selectedChild])

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
        const activeChildren = user.children.filter((c: Child) => c.status === 'ACTIVE')
        setChildren(activeChildren)
        if (activeChildren.length > 0) {
          setSelectedChild(activeChildren[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading children:', error)
    }
  }

  const loadAvailableClasses = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/classes/available?childId=${selectedChild}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAvailableClasses(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (classId: string) => {
    setActionLoading(classId)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          childId: selectedChild,
          scheduleId: classId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMessage({ type: 'success', text: 'Successfully enrolled in class!' })
          loadAvailableClasses()
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to enroll' })
        }
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Failed to enroll' })
      }
    } catch (error) {
      console.error('Error enrolling:', error)
      setMessage({ type: 'error', text: 'Failed to enroll in class' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnenroll = async (classId: string) => {
    if (!confirm('Are you sure you want to unenroll from this class?')) return

    setActionLoading(classId)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/enrollments', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          childId: selectedChild,
          scheduleId: classId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMessage({ type: 'success', text: 'Successfully unenrolled from class' })
          loadAvailableClasses()
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to unenroll' })
        }
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Failed to unenroll' })
      }
    } catch (error) {
      console.error('Error unenrolling:', error)
      setMessage({ type: 'error', text: 'Failed to unenroll from class' })
    } finally {
      setActionLoading(null)
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const filteredClasses = availableClasses.filter(cls => {
    const matchesLevel = filterLevel === '' || cls.level === filterLevel
    const matchesDay = filterDay === '' || cls.dayOfWeek.toLowerCase() === filterDay.toLowerCase()
    return matchesLevel && matchesDay
  })

  const selectedChildData = children.find(c => c.id === selectedChild)
  const uniqueLevels = Array.from(new Set(availableClasses.map(c => c.level)))

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
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Class Enrollment</h1>
                <p className="text-gray-600">Enroll your children in classes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Messages */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </span>
              <button
                onClick={() => setMessage(null)}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Filters */}
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
                      {child.firstName} {child.lastName} ({child.level})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Level</label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Levels</option>
                  {uniqueLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Day</label>
                <select
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Days</option>
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading classes...</div>
            </div>
          )}

          {/* No Children */}
          {!loading && children.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Children</h3>
              <p className="text-gray-500">You need to have active children to enroll in classes.</p>
            </div>
          )}

          {/* Available Classes */}
          {!loading && children.length > 0 && filteredClasses.length > 0 && (
            <div className="space-y-4">
              {filteredClasses.map((classItem) => {
                const isFull = classItem.currentEnrollment >= classItem.maxCapacity
                const spotsLeft = classItem.maxCapacity - classItem.currentEnrollment
                const isChildEnrolled = classItem.enrolledChildren.includes(selectedChild)

                return (
                  <div key={classItem.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{classItem.name}</h3>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                            {classItem.level}
                          </span>
                          {isChildEnrolled && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Enrolled
                            </span>
                          )}
                          {isFull && !isChildEnrolled && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                              Full
                            </span>
                          )}
                        </div>

                        {classItem.description && (
                          <p className="text-gray-600 mb-3">{classItem.description}</p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {classItem.dayOfWeek} • {formatTime(classItem.startTime)} - {formatTime(classItem.endTime)}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {classItem.venue}
                          </div>
                          {classItem.coach && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              Coach: {classItem.coach.firstName} {classItem.coach.lastName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Capacity</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {classItem.currentEnrollment}/{classItem.maxCapacity}
                          </div>
                          {!isFull && !isChildEnrolled && (
                            <div className="text-xs text-green-600 mt-1">
                              {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                            </div>
                          )}
                        </div>

                        {isChildEnrolled ? (
                          <button
                            onClick={() => handleUnenroll(classItem.id)}
                            disabled={actionLoading === classItem.id}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <UserMinus className="h-4 w-4" />
                            {actionLoading === classItem.id ? 'Unenrolling...' : 'Unenroll'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnroll(classItem.id)}
                            disabled={isFull || actionLoading === classItem.id}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                              isFull
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            <UserPlus className="h-4 w-4" />
                            {actionLoading === classItem.id ? 'Enrolling...' : isFull ? 'Class Full' : 'Enroll'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* No Classes */}
          {!loading && children.length > 0 && filteredClasses.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Available</h3>
              <p className="text-gray-500">
                {filterLevel || filterDay
                  ? 'No classes match your filter criteria.'
                  : 'No classes are currently available for enrollment.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
