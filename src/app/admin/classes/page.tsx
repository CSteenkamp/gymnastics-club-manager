'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Users, 
  Clock, 
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  UserCheck,
  AlertTriangle,
  Search,
  Filter,
  LayoutGrid,
  List
} from 'lucide-react'
import { WeeklyTimetable } from '@/components/classes/WeeklyTimetable'

interface Class {
  id: string
  name: string
  description: string
  level: string
  dayOfWeek: string
  startTime: string
  endTime: string
  maxCapacity: number
  currentEnrollment: number
  venue: string
  isActive: boolean
  coach?: {
    id: string
    firstName: string
    lastName: string
  }
  enrollments?: {
    id: string
    child: {
      id: string
      firstName: string
      lastName: string
    }
    enrolledAt: string
  }[]
}

interface Coach {
  id: string
  firstName: string
  lastName: string
  email: string
  specialties?: string[]
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterDay, setFilterDay] = useState('')
  const [currentView, setCurrentView] = useState<'list' | 'timetable'>('timetable')
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    maxCapacity: 15,
    venue: '',
    coachId: ''
  })

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]

  const levels = [
    'Level RR', 'Level R', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadClasses(),
        loadCoaches()
      ])
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/schedules', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setClasses(data.data)
      } else {
        setError(data.error || 'Failed to load classes')
      }
    } catch (err) {
      setError('Failed to load classes')
    }
  }

  const loadCoaches = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users?role=COACH', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setCoaches(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load coaches:', err)
    }
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          location: formData.venue,
          maxCapacity: parseInt(formData.maxCapacity.toString())
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage('Class created successfully')
        resetForm()
        setShowCreateForm(false)
        loadClasses()
      } else {
        setError(data.error || 'Failed to create class')
      }
    } catch (err) {
      setError('Failed to create class')
    }
  }

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClass) return

    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/schedules/${editingClass.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          location: formData.venue,
          maxCapacity: parseInt(formData.maxCapacity.toString())
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage('Class updated successfully')
        resetForm()
        setEditingClass(null)
        loadClasses()
      } else {
        setError(data.error || 'Failed to update class')
      }
    } catch (err) {
      setError('Failed to update class')
    }
  }

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/schedules/${classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage('Class deleted successfully')
        loadClasses()
      } else {
        setError(data.error || 'Failed to delete class')
      }
    } catch (err) {
      setError('Failed to delete class')
    }
  }

  const handleEditClass = (gymClass: Class) => {
    setEditingClass(gymClass)
    setFormData({
      name: gymClass.name,
      description: gymClass.description,
      level: gymClass.level,
      dayOfWeek: gymClass.dayOfWeek,
      startTime: gymClass.startTime,
      endTime: gymClass.endTime,
      maxCapacity: gymClass.maxCapacity,
      venue: gymClass.venue,
      coachId: gymClass.coach?.id || ''
    })
    setShowCreateForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      level: '',
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      maxCapacity: 15,
      venue: '',
      coachId: ''
    })
    setEditingClass(null)
  }

  const filteredClasses = classes.filter(gymClass => {
    const matchesSearch = searchTerm === '' || 
      gymClass.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gymClass.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gymClass.venue.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesLevel = filterLevel === '' || gymClass.level === filterLevel
    const matchesDay = filterDay === '' || gymClass.dayOfWeek === filterDay
    
    return matchesSearch && matchesLevel && matchesDay
  })

  const getStatusBadge = (gymClass: Class) => {
    if (!gymClass.isActive) {
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
    }
    
    const capacity = gymClass.currentEnrollment / gymClass.maxCapacity
    if (capacity >= 1) {
      return <Badge className="bg-red-100 text-red-800">Full</Badge>
    } else if (capacity >= 0.8) {
      return <Badge className="bg-yellow-100 text-yellow-800">Almost Full</Badge>
    } else {
      return <Badge className="bg-green-100 text-green-800">Available</Badge>
    }
  }

  const formatTime = (timeString: string) => {
    const time = new Date(`2000-01-01T${timeString}`)
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-gray-500">Loading classes...</div>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout title="Class Management" description="Manage class schedules and enrollments">
      <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Management</h1>
          <p className="text-gray-600 mt-1">Manage gymnastics classes, schedules, and enrollments</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setCurrentView('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentView === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4 mr-1.5 inline" />
              List
            </button>
            <button
              onClick={() => setCurrentView('timetable')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentView === 'timetable'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5 inline" />
              Timetable
            </button>
          </div>
          
          <Button
            onClick={() => setShowCreateForm(true)}
            className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Create Class
          </Button>
        </div>
      </div>


      {/* Conditional Content Based on View */}
      {currentView === 'list' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-2 border-blue-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Classes</p>
                <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-green-200 rounded-xl shadow-sm hover:shadow-md hover:border-green-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Enrollments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {classes.reduce((sum, c) => sum + c.currentEnrollment, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-purple-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <UserCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Classes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {classes.filter(c => c.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-red-200 rounded-xl shadow-sm hover:shadow-md hover:border-red-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Full Classes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {classes.filter(c => c.currentEnrollment >= c.maxCapacity).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-2 border-gray-200 rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Classes</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name, level, or venue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="filterLevel">Filter by Level</Label>
              <select
                id="filterLevel"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Levels</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="filterDay">Filter by Day</Label>
              <select
                id="filterDay"
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Days</option>
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('')
                  setFilterLevel('')
                  setFilterDay('')
                }}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredClasses.map((gymClass) => (
          <Card key={gymClass.id} className="bg-white border-2 border-purple-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-300 transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {gymClass.name}
                    {getStatusBadge(gymClass)}
                  </CardTitle>
                  <CardDescription>{gymClass.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditClass(gymClass)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteClass(gymClass.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{gymClass.level}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{gymClass.dayOfWeek}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>{formatTime(gymClass.startTime)} - {formatTime(gymClass.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{gymClass.venue}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {gymClass.currentEnrollment}/{gymClass.maxCapacity} enrolled
                    </span>
                  </div>
                  
                  {gymClass.coach && (
                    <div className="text-sm text-gray-600">
                      Coach: {gymClass.coach.firstName} {gymClass.coach.lastName}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClasses.length === 0 && (
        <Card className="bg-white border-2 border-gray-200 rounded-xl shadow-sm">
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterLevel || filterDay 
                ? 'Try adjusting your search criteria' 
                : 'Create your first class to get started'
              }
            </p>
            {!searchTerm && !filterLevel && !filterDay && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Class
              </Button>
            )}
          </CardContent>
        </Card>
      )}
        </>
      ) : (
        /* Timetable View */
        <WeeklyTimetable 
          classes={classes}
          onEditClass={(classItem) => handleEditClass(classItem)}
          onCreateClass={(dayOfWeek, timeSlot) => {
            // Pre-fill form with selected day and time
            setFormData({
              ...formData,
              dayOfWeek: dayOfWeek,
              startTime: timeSlot,
              endTime: `${(parseInt(timeSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00`
            })
            setShowCreateForm(true)
          }}
        />
      )}

      {/* Create/Edit Class Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingClass ? 'Edit Class' : 'Create New Class'}
              </h2>
              <p className="text-gray-600 mt-1">
                {editingClass ? 'Update class information' : 'Add a new gymnastics class to the schedule'}
              </p>
            </div>
            
            <div className="p-6">
              <form onSubmit={editingClass ? handleUpdateClass : handleCreateClass} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Class Name *</label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g., Beginner Gymnastics"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">Level *</label>
                    <select
                      id="level"
                      value={formData.level}
                      onChange={(e) => setFormData({...formData, level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    >
                      <option value="">Select level...</option>
                      {levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={3}
                    placeholder="Brief description of the class..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                    <input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                    <input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">Venue *</label>
                    <input
                      id="venue"
                      type="text"
                      value={formData.venue}
                      onChange={(e) => setFormData({...formData, venue: e.target.value})}
                      placeholder="e.g., Main Gymnasium"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700 mb-2">Max Capacity *</label>
                    <input
                      id="maxCapacity"
                      type="number"
                      value={formData.maxCapacity}
                      onChange={(e) => setFormData({...formData, maxCapacity: parseInt(e.target.value) || 0})}
                      min="1"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="coachId" className="block text-sm font-medium text-gray-700 mb-2">Assigned Coach</label>
                  <select
                    id="coachId"
                    value={formData.coachId}
                    onChange={(e) => setFormData({...formData, coachId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">No coach assigned</option>
                    {coaches.map(coach => (
                      <option key={coach.id} value={coach.id}>
                        {coach.firstName} {coach.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowCreateForm(false)
                      resetForm()
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-purple-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 border-2 border-purple-600 text-purple-600 hover:bg-purple-50 rounded-md focus:ring-2 focus:ring-purple-500 transition-colors"
                  >
                    {editingClass ? 'Update Class' : 'Create Class'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  )
}