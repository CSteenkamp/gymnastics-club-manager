'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  UserPlus,
  CheckCircle2
} from 'lucide-react'

interface Child {
  id: string
  firstName: string
  lastName: string
}

interface Schedule {
  id: string
  name: string
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
  enrolledChildren?: string[] // IDs of enrolled children
  isExtraLesson?: boolean
}

interface ClassCalendarProps {
  schedules: Schedule[]
  children: Child[]
  onBookExtraLesson: (scheduleId: string, childId: string) => void
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIME_SLOTS = [
  '13:00', '14:00', '15:00', '16:00', '17:00'
]

export default function ClassCalendar({ schedules, children, onBookExtraLesson }: ClassCalendarProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [showBookingModal, setShowBookingModal] = useState(false)

  const getSchedulesForDay = (day: string) => {
    return schedules
      .filter(schedule => schedule.dayOfWeek.toUpperCase() === day.toUpperCase())
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const handleBookLesson = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setShowBookingModal(true)
  }

  const confirmBooking = () => {
    if (selectedSchedule && selectedChild) {
      onBookExtraLesson(selectedSchedule.id, selectedChild)
      setShowBookingModal(false)
      setSelectedSchedule(null)
      setSelectedChild('')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Weekly Class Schedule</h2>
        <p className="text-sm text-gray-600 mt-1">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></span>
            Your enrolled classes
          </span>
          <span className="inline-flex items-center gap-1 ml-4">
            <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
            Extra lessons available
          </span>
        </p>
      </div>

      {/* Weekly Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-6 min-w-[800px]">
          {/* Time Column Header */}
          <div className="border-r border-b border-gray-200 bg-gray-50 p-3">
            <span className="text-sm font-semibold text-gray-700">Time</span>
          </div>

          {/* Day Headers */}
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="border-r border-b border-gray-200 bg-gray-50 p-3">
              <div className="text-sm font-semibold text-gray-900">{day}</div>
            </div>
          ))}

          {/* Time Slots with Classes */}
          {TIME_SLOTS.map((timeSlot) => {
            const hour = parseInt(timeSlot.split(':')[0])

            return (
              <div key={timeSlot} className="contents">
                {/* Time Label */}
                <div className="border-r border-b border-gray-200 bg-gray-50 p-2 text-xs text-gray-600 font-medium">
                  {formatTime(timeSlot)}
                </div>

                {/* Classes for each day at this time */}
                {DAYS_OF_WEEK.map((day) => {
                  const daySchedules = getSchedulesForDay(day)
                  const schedulesAtTime = daySchedules.filter(schedule => {
                    const scheduleHour = parseInt(schedule.startTime.split(':')[0])
                    return scheduleHour === hour
                  })

                  return (
                    <div key={`${day}-${timeSlot}`} className="border-r border-b border-gray-200 p-1 min-h-[60px]">
                      <div className="space-y-1">
                        {schedulesAtTime.map((schedule) => (
                          <div
                            key={schedule.id}
                            onClick={() => schedule.isExtraLesson && !schedule.isEnrolled ? handleBookLesson(schedule) : setSelectedSchedule(schedule)}
                            className={`text-xs p-2 rounded cursor-pointer transition-all ${
                              schedule.isEnrolled
                                ? 'bg-purple-100 border border-purple-300 hover:bg-purple-200'
                                : schedule.isExtraLesson
                                ? 'bg-green-100 border border-green-300 hover:bg-green-200'
                                : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {schedule.isEnrolled && (
                                <CheckCircle2 className="h-3 w-3 text-purple-600 flex-shrink-0" />
                              )}
                              {schedule.isExtraLesson && !schedule.isEnrolled && (
                                <UserPlus className="h-3 w-3 text-green-600 flex-shrink-0" />
                              )}
                              <span className={`font-semibold truncate ${
                                schedule.isEnrolled
                                  ? 'text-purple-900'
                                  : schedule.isExtraLesson
                                  ? 'text-green-900'
                                  : 'text-gray-900'
                              }`}>
                                {schedule.name}
                              </span>
                            </div>
                            <div className={`text-xs flex items-center gap-1 ${
                              schedule.isEnrolled
                                ? 'text-purple-700'
                                : schedule.isExtraLesson
                                ? 'text-green-700'
                                : 'text-gray-600'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </div>
                            <div className={`text-xs mt-1 ${
                              schedule.isEnrolled
                                ? 'text-purple-600'
                                : schedule.isExtraLesson
                                ? 'text-green-600'
                                : 'text-gray-500'
                            }`}>
                              {schedule.level}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Class Details Modal */}
      {selectedSchedule && !showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedSchedule.name}</h3>
                <p className="text-sm text-gray-600">{selectedSchedule.level}</p>
              </div>
              {selectedSchedule.isEnrolled && (
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              )}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="h-4 w-4" />
                <span>{selectedSchedule.dayOfWeek}, {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="h-4 w-4" />
                <span>{selectedSchedule.venue}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Users className="h-4 w-4" />
                <span>{selectedSchedule.currentEnrollment} / {selectedSchedule.maxCapacity} enrolled</span>
              </div>
              {selectedSchedule.coach && (
                <div className="text-gray-700">
                  <span className="font-medium">Coach:</span> {selectedSchedule.coach.firstName} {selectedSchedule.coach.lastName}
                </div>
              )}
            </div>

            {selectedSchedule.isExtraLesson && !selectedSchedule.isEnrolled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800 font-medium">Extra Lesson Available</p>
                <p className="text-xs text-green-700 mt-1">Book this extra lesson for your child</p>
              </div>
            )}

            <div className="flex gap-3">
              {selectedSchedule.isExtraLesson && !selectedSchedule.isEnrolled && (
                <Button
                  onClick={() => {
                    setShowBookingModal(true)
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Book Lesson
                </Button>
              )}
              <Button
                onClick={() => setSelectedSchedule(null)}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {showBookingModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Book Extra Lesson</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Booking: <span className="font-semibold text-gray-900">{selectedSchedule.name}</span>
              </p>
              <p className="text-sm text-gray-600">
                {selectedSchedule.dayOfWeek}, {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Child
              </label>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Choose a child...</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.firstName} {child.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmBooking}
                disabled={!selectedChild}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Confirm Booking
              </Button>
              <Button
                onClick={() => {
                  setShowBookingModal(false)
                  setSelectedChild('')
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
