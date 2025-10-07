'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Schedule {
  id: string
  name: string
  level?: string
  dayOfWeek: string
  startTime: string
  endTime: string
  maxCapacity: number
  location?: string
  description?: string
  isActive: boolean
  coach?: {
    id: string
    firstName: string
    lastName: string
  }
  _count: {
    enrollments: number
  }
}

interface User {
  id: string
  firstName: string
  lastName: string
  role: string
}

const DAYS_OF_WEEK = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
]

const LEVELS = [
  'RR', 'R', 'Pre-Level 1', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'
]

export default function SchedulesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [coaches, setCoaches] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [filterDay, setFilterDay] = useState<string>('')
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    level: '',
    coachId: '',
    dayOfWeek: 'MONDAY',
    startTime: '',
    endTime: '',
    maxCapacity: 12,
    location: '',
    description: ''
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
    if (!['ADMIN', 'FINANCE_ADMIN', 'COACH'].includes(parsedUser.role)) {
      router.push('/dashboard')
      return
    }

    setUser(parsedUser)
    loadSchedules()
    loadCoaches()
  }, [router])

  const loadSchedules = async () => {
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (filterDay) params.append('dayOfWeek', filterDay)
      if (filterLevel) params.append('level', filterLevel)

      const response = await fetch(`/api/schedules?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSchedules(data.data)
      }
    } catch (error) {
      console.error('Failed to load schedules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCoaches = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users?role=COACH', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCoaches(data.data)
      }
    } catch (error) {
      console.error('Failed to load coaches:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      const url = editingSchedule ? `/api/schedules/${editingSchedule.id}` : '/api/schedules'
      const method = editingSchedule ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setShowCreateForm(false)
        setEditingSchedule(null)
        setFormData({
          name: '',
          level: '',
          coachId: '',
          dayOfWeek: 'MONDAY',
          startTime: '',
          endTime: '',
          maxCapacity: 12,
          location: '',
          description: ''
        })
        loadSchedules()
      } else {
        alert(data.error || 'Failed to save schedule')
      }
    } catch (error) {
      console.error('Error saving schedule:', error)
      alert('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (schedule: Schedule) => {
    setFormData({
      name: schedule.name,
      level: schedule.level || '',
      coachId: schedule.coach?.id || '',
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      maxCapacity: schedule.maxCapacity,
      location: schedule.location || '',
      description: schedule.description || ''
    })
    setEditingSchedule(schedule)
    setShowCreateForm(true)
  }

  const handleToggleActive = async (schedule: Schedule) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isActive: !schedule.isActive
        })
      })

      if (response.ok) {
        loadSchedules()
      }
    } catch (error) {
      console.error('Error toggling schedule status:', error)
    }
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

  const formatTime = (time: string) => {
    return time.substring(0, 5) // Remove seconds if present
  }

  const getDayColor = (day: string) => {
    const colors: Record<string, string> = {
      'MONDAY': 'bg-blue-100 text-blue-800',
      'TUESDAY': 'bg-green-100 text-green-800',
      'WEDNESDAY': 'bg-yellow-100 text-yellow-800',
      'THURSDAY': 'bg-purple-100 text-purple-800',
      'FRIDAY': 'bg-pink-100 text-pink-800',
      'SATURDAY': 'bg-indigo-100 text-indigo-800',
      'SUNDAY': 'bg-gray-100 text-gray-800'
    }
    return colors[day] || 'bg-gray-100 text-gray-800'
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
                Schedule Management
              </h1>
              <p className="text-gray-600">Manage class schedules and timetables</p>
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
          
          {/* Filters and Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Day
                  </label>
                  <select
                    value={filterDay}
                    onChange={(e) => setFilterDay(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">All Days</option>
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day} value={day}>
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Level
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">All Levels</option>
                    {LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={loadSchedules}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowCreateForm(true)
                  setEditingSchedule(null)
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Add Schedule
              </button>
            </div>
          </div>

          {/* Schedules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
                  !schedule.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {schedule.name}
                    </h3>
                    {schedule.level && (
                      <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                        {schedule.level}
                      </span>
                    )}
                  </div>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${getDayColor(schedule.dayOfWeek)}`}>
                    {schedule.dayOfWeek.charAt(0) + schedule.dayOfWeek.slice(1).toLowerCase()}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <span className="font-medium">Time:</span>
                    <span className="ml-2">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                  </div>
                  
                  {schedule.location && (
                    <div className="flex items-center">
                      <span className="font-medium">Location:</span>
                      <span className="ml-2">{schedule.location}</span>
                    </div>
                  )}
                  
                  {schedule.coach && (
                    <div className="flex items-center">
                      <span className="font-medium">Coach:</span>
                      <span className="ml-2">{schedule.coach.firstName} {schedule.coach.lastName}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <span className="font-medium">Capacity:</span>
                    <span className="ml-2">
                      {schedule._count.enrollments}/{schedule.maxCapacity}
                      {schedule._count.enrollments >= schedule.maxCapacity && (
                        <span className="text-red-600 ml-1">(Full)</span>
                      )}
                    </span>
                  </div>
                </div>

                {schedule.description && (
                  <p className="text-sm text-gray-600 mb-4">{schedule.description}</p>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    schedule.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {schedule.isActive ? 'Active' : 'Inactive'}
                  </span>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="text-purple-600 hover:text-purple-700 text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(schedule)}
                      className={`text-sm transition-colors ${
                        schedule.isActive 
                          ? 'text-red-600 hover:text-red-700' 
                          : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {schedule.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {schedules.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No schedules found</div>
              <p className="text-gray-400">Create your first schedule to get started</p>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingSchedule(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Schedule Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="e.g., Level 1 Monday Evening"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Level
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select Level</option>
                      {LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Day of Week *
                    </label>
                    <select
                      value={formData.dayOfWeek}
                      onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day} value={day}>
                          {day.charAt(0) + day.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coach
                    </label>
                    <select
                      value={formData.coachId}
                      onChange={(e) => setFormData(prev => ({ ...prev, coachId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select Coach</option>
                      {coaches.map(coach => (
                        <option key={coach.id} value={coach.id}>
                          {coach.firstName} {coach.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      min="13:00"
                      max="17:00"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      min="13:00"
                      max="17:00"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.maxCapacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxCapacity: parseInt(e.target.value) }))}
                      min="1"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Main Gym, Studio A"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Optional description of the class..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setEditingSchedule(null)
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      isLoading
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {isLoading ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}