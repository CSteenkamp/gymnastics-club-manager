'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Users, 
  MapPin, 
  User,
  Plus,
  Edit2
} from 'lucide-react'

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
}

interface WeeklyTimetableProps {
  classes: Class[]
  onCreateClass?: (dayOfWeek: string, timeSlot: string) => void
  onEditClass?: (classItem: Class) => void
}

export function WeeklyTimetable({ classes, onCreateClass, onEditClass }: WeeklyTimetableProps) {
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [selectedWeek, setSelectedWeek] = useState(0) // 0 = current week

  const daysOfWeek = [
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'
  ]

  const dayNames = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ]

  useEffect(() => {
    generateTimeSlots()
  }, [classes])

  const generateTimeSlots = () => {
    // Always show 1PM to 5PM time slots (13:00 to 17:00)
    const timeSlots = [
      '13:00', '14:00', '15:00', '16:00', '17:00'
    ]
    setTimeSlots(timeSlots)
  }

  const getClassesForSlot = (day: string, timeSlot: string) => {
    return classes.filter(c => {
      if (c.dayOfWeek !== day || !c.startTime) return false
      
      const classStartHour = parseInt(c.startTime.split(':')[0])
      const slotHour = parseInt(timeSlot.split(':')[0])
      
      return classStartHour === slotHour
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    const time = new Date(`2000-01-01T${timeString}`)
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const getCapacityColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio >= 1) return 'bg-red-100 text-red-800'
    if (ratio >= 0.8) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const handleSlotClick = (day: string, timeSlot: string) => {
    const existingClasses = getClassesForSlot(day, timeSlot)
    if (existingClasses.length === 0 && onCreateClass) {
      onCreateClass(day, timeSlot)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Weekly Timetable</h2>
          <p className="text-sm text-gray-600">Visual overview of all class schedules</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedWeek(selectedWeek - 1)}
            className="text-xs px-2 py-1 h-7"
          >
            ← Prev
          </Button>
          <span className="text-xs text-gray-600 px-2">
            {selectedWeek === 0 ? 'Current' : `${Math.abs(selectedWeek)}w ${selectedWeek < 0 ? 'ago' : 'ahead'}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedWeek(selectedWeek + 1)}
            className="text-xs px-2 py-1 h-7"
          >
            Next →
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-100 border border-green-200 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-100 border border-yellow-200 rounded"></div>
          <span>Almost Full</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-100 border border-red-200 rounded"></div>
          <span>Full</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-100 border border-gray-200 rounded"></div>
          <span>Empty</span>
        </div>
      </div>

      {/* Timetable Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header Row */}
              <div className="grid grid-cols-6 border-b border-gray-200 bg-gray-50">
                <div className="p-2 text-xs font-medium text-gray-600 border-r border-gray-200">
                  Time
                </div>
                {dayNames.map((day, index) => (
                  <div key={day} className={`p-2 text-xs font-medium text-gray-900 text-center ${index < 4 ? 'border-r border-gray-200' : ''}`}>
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* Time Slot Rows */}
              {timeSlots.map((timeSlot, rowIndex) => (
                <div key={timeSlot} className={`grid grid-cols-6 ${rowIndex < timeSlots.length - 1 ? 'border-b border-gray-200' : ''}`}>
                  {/* Time Column */}
                  <div className="p-2 text-xs font-medium text-gray-600 border-r border-gray-200 bg-gray-50">
                    {formatTime(timeSlot)}
                  </div>

                  {/* Day Columns */}
                  {daysOfWeek.map((day, dayIndex) => {
                    const dayClasses = getClassesForSlot(day, timeSlot)

                    return (
                      <div
                        key={`${day}-${timeSlot}`}
                        className={`p-1 min-h-[40px] ${dayIndex < 4 ? 'border-r border-gray-200' : ''} ${dayClasses.length === 0 ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                        onClick={() => handleSlotClick(day, timeSlot)}
                      >
                        {dayClasses.length === 0 ? (
                          // Empty slot
                          <div className="h-full flex items-center justify-center text-gray-400">
                            {onCreateClass && (
                              <Plus className="h-3 w-3" />
                            )}
                          </div>
                        ) : (
                          // Classes in this slot
                          <div className="space-y-0.5">
                            {dayClasses.map((classItem) => (
                              <div
                                key={classItem.id}
                                className={`p-1 rounded text-xs cursor-pointer hover:shadow-sm transition-shadow ${getCapacityColor(classItem.currentEnrollment, classItem.maxCapacity)}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditClass?.(classItem)
                                }}
                              >
                                <div className="font-medium truncate text-xs">{classItem.name}</div>
                                <div className="text-[10px] opacity-75 truncate">{classItem.level}</div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <div className="flex items-center gap-0.5 text-[10px]">
                                    <Clock className="h-2 w-2" />
                                    <span>{formatTime(classItem.startTime)}-{formatTime(classItem.endTime)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <div className="flex items-center gap-0.5 text-[10px]">
                                    <Users className="h-2 w-2" />
                                    <span>{classItem.currentEnrollment}/{classItem.maxCapacity}</span>
                                  </div>
                                  {onEditClass && (
                                    <Edit2 className="h-2 w-2 opacity-50" />
                                  )}
                                </div>
                                {classItem.venue && (
                                  <div className="flex items-center gap-0.5 mt-0.5 text-[10px]">
                                    <MapPin className="h-2 w-2" />
                                    <span className="truncate">{classItem.venue}</span>
                                  </div>
                                )}
                                {classItem.coach && (
                                  <div className="flex items-center gap-0.5 mt-0.5 text-[10px]">
                                    <User className="h-2 w-2" />
                                    <span className="truncate">{classItem.coach.firstName} {classItem.coach.lastName}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}