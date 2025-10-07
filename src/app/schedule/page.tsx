'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParentLayout } from '@/components/layout/ParentLayout'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'

interface Child {
  id: string
  firstName: string
  lastName: string
  level: string
}

interface Class {
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
  enrollment?: {
    id: string
    childId: string
    enrolledAt: string
  }
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  children: Child[]
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function SchedulePage() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'PARENT') {
      router.push('/dashboard')
      return
    }

    setUser(parsedUser)
    loadSchedules()
  }, [router])

  const loadSchedules = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/schedules/enrolled', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClasses(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const filteredClasses = selectedChild === 'all'
    ? classes
    : classes.filter(c => c.enrollment?.childId === selectedChild)

  const groupedByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = filteredClasses.filter(c =>
      c.dayOfWeek.toLowerCase() === day.toLowerCase() ||
      c.dayOfWeek.toUpperCase() === day.toUpperCase()
    ).sort((a, b) => a.startTime.localeCompare(b.startTime))
    return acc
  }, {} as Record<string, Class[]>)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <ParentLayout title="Class Schedule" description="View your children's class timetable">
      <div className="space-y-6">

          {/* Child Filter */}
          {user.children && user.children.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Filter by Child
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedChild('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedChild === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Children
                </button>
                {user.children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedChild === child.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {child.firstName} {child.lastName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading schedule...</div>
            </div>
          )}

          {/* No Classes */}
          {!loading && filteredClasses.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
              <p className="text-gray-500">
                {selectedChild === 'all'
                  ? 'Your children are not enrolled in any classes yet.'
                  : 'This child is not enrolled in any classes yet.'}
              </p>
            </div>
          )}

          {/* Weekly Schedule Grid */}
          {!loading && filteredClasses.length > 0 && (
            <div className="space-y-6">
              {DAYS_OF_WEEK.map(day => {
                const dayClasses = groupedByDay[day]
                if (dayClasses.length === 0) return null

                return (
                  <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        {day}
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                        </span>
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {dayClasses.map(classItem => {
                        const enrolledChild = user.children?.find(c => c.id === classItem.enrollment?.childId)

                        return (
                          <div key={classItem.id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-semibold text-gray-900">
                                    {classItem.name}
                                  </h4>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                    {classItem.level}
                                  </span>
                                  {enrolledChild && user.children && user.children.length > 1 && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                      {enrolledChild.firstName}
                                    </span>
                                  )}
                                </div>

                                {classItem.description && (
                                  <p className="text-sm text-gray-600 mb-3">{classItem.description}</p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                    <span>{formatTime(classItem.startTime)} - {formatTime(classItem.endTime)}</span>
                                  </div>

                                  <div className="flex items-center text-sm text-gray-600">
                                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                                    <span>{classItem.venue}</span>
                                  </div>

                                  {classItem.coach && (
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                                      <span>Coach: {classItem.coach.firstName} {classItem.coach.lastName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-sm text-gray-500">
                                  Enrollment
                                </div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {classItem.currentEnrollment}/{classItem.maxCapacity}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {classItem.maxCapacity - classItem.currentEnrollment > 0
                                    ? `${classItem.maxCapacity - classItem.currentEnrollment} spots left`
                                    : 'Class full'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary Card */}
          {!loading && filteredClasses.length > 0 && (
            <div className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Weekly Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-purple-200">Total Classes</div>
                  <div className="text-2xl font-bold">{filteredClasses.length}</div>
                </div>
                <div>
                  <div className="text-purple-200">Days Per Week</div>
                  <div className="text-2xl font-bold">
                    {Object.values(groupedByDay).filter(day => day.length > 0).length}
                  </div>
                </div>
                <div>
                  <div className="text-purple-200">Children Enrolled</div>
                  <div className="text-2xl font-bold">
                    {selectedChild === 'all'
                      ? new Set(filteredClasses.map(c => c.enrollment?.childId)).size
                      : 1}
                  </div>
                </div>
                <div>
                  <div className="text-purple-200">Venues</div>
                  <div className="text-2xl font-bold">
                    {new Set(filteredClasses.map(c => c.venue)).size}
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </ParentLayout>
  )
}
