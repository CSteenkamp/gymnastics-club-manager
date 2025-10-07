'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Check,
  X,
  Clock,
  Save,
  UserCheck,
  UserX
} from 'lucide-react'

interface Student {
  id: string
  firstName: string
  lastName: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
}

interface Class {
  id: string
  name: string
  level: string
  date: string
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadClasses()
  }, [])

  useEffect(() => {
    if (selectedClass && selectedDate) {
      loadStudents()
    }
  }, [selectedClass, selectedDate])

  const loadClasses = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/coach/classes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setClasses(data.data || [])
        if (data.data.length > 0) {
          setSelectedClass(data.data[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/coach/attendance?classId=${selectedClass}&date=${selectedDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setStudents(data.data || [])
      }
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  const toggleAttendance = (studentId: string, status: Student['status']) => {
    setStudents(students.map(s =>
      s.id === studentId ? { ...s, status } : s
    ))
  }

  const markAllPresent = () => {
    setStudents(students.map(s => ({ ...s, status: 'PRESENT' })))
  }

  const markAllAbsent = () => {
    setStudents(students.map(s => ({ ...s, status: 'ABSENT' })))
  }

  const saveAttendance = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/coach/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classId: selectedClass,
          date: selectedDate,
          attendance: students.map(s => ({
            studentId: s.id,
            status: s.status
          }))
        })
      })

      if (response.ok) {
        alert('Attendance saved successfully!')
      } else {
        alert('Failed to save attendance')
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      alert('Error saving attendance')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: Student['status']) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800 border-green-300'
      case 'ABSENT': return 'bg-red-100 text-red-800 border-red-300'
      case 'LATE': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'EXCUSED': return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  const getStatusIcon = (status: Student['status']) => {
    switch (status) {
      case 'PRESENT': return <Check className="h-4 w-4" />
      case 'ABSENT': return <X className="h-4 w-4" />
      case 'LATE': return <Clock className="h-4 w-4" />
      case 'EXCUSED': return <UserX className="h-4 w-4" />
    }
  }

  const presentCount = students.filter(s => s.status === 'PRESENT').length
  const absentCount = students.filter(s => s.status === 'ABSENT').length
  const attendanceRate = students.length > 0
    ? Math.round((presentCount / students.length) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/coach/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mark Attendance</h1>
                <p className="text-gray-600">Record student attendance for your classes</p>
              </div>
            </div>
            <Button
              onClick={saveAttendance}
              disabled={saving || students.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - {cls.level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 mt-4">
              <Button variant="outline" size="sm" onClick={markAllPresent}>
                <UserCheck className="h-4 w-4 mr-2" />
                Mark All Present
              </Button>
              <Button variant="outline" size="sm" onClick={markAllAbsent}>
                <UserX className="h-4 w-4 mr-2" />
                Mark All Absent
              </Button>
            </div>
          </div>

          {/* Stats */}
          {students.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{students.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-purple-600">{attendanceRate}%</p>
              </div>
            </div>
          )}

          {/* Student List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Students</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No students found for this class
                </div>
              ) : (
                students.map((student) => (
                  <div
                    key={student.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAttendance(student.id, 'PRESENT')}
                        className={`px-4 py-2 rounded-md border-2 transition-colors ${
                          student.status === 'PRESENT'
                            ? getStatusColor('PRESENT')
                            : 'border-gray-200 text-gray-600 hover:border-green-300'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleAttendance(student.id, 'LATE')}
                        className={`px-4 py-2 rounded-md border-2 transition-colors ${
                          student.status === 'LATE'
                            ? getStatusColor('LATE')
                            : 'border-gray-200 text-gray-600 hover:border-yellow-300'
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleAttendance(student.id, 'ABSENT')}
                        className={`px-4 py-2 rounded-md border-2 transition-colors ${
                          student.status === 'ABSENT'
                            ? getStatusColor('ABSENT')
                            : 'border-gray-200 text-gray-600 hover:border-red-300'
                        }`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleAttendance(student.id, 'EXCUSED')}
                        className={`px-4 py-2 rounded-md border-2 transition-colors ${
                          student.status === 'EXCUSED'
                            ? getStatusColor('EXCUSED')
                            : 'border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
