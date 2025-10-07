'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface Event {
  id: string
  title: string
  description?: string
  eventType: string
  startDate: string
  endDate?: string
  location?: string
  isAllDay: boolean
  creator: {
    firstName: string
    lastName: string
    role: string
  }
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadEvents()
  }, [currentDate])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')

      // Get first and last day of current month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const response = await fetch(
        `/api/events?startDate=${firstDay.toISOString()}&endDate=${lastDay.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setEvents(data.data || [])
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getEventsForDate = (date: Date | null) => {
    if (!date) return []

    return events.filter(event => {
      const eventDate = new Date(event.startDate)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const today = () => {
    setCurrentDate(new Date())
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      CLASS: 'bg-blue-100 text-blue-800 border-blue-300',
      COMPETITION: 'bg-purple-100 text-purple-800 border-purple-300',
      PERFORMANCE: 'bg-pink-100 text-pink-800 border-pink-300',
      ASSESSMENT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      HOLIDAY: 'bg-green-100 text-green-800 border-green-300',
      MEETING: 'bg-gray-100 text-gray-800 border-gray-300',
      OTHER: 'bg-orange-100 text-orange-800 border-orange-300'
    }
    return colors[type] || colors.OTHER
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
                <h1 className="text-3xl font-bold text-gray-900">Event Calendar</h1>
                <p className="text-gray-600">View club events, classes, and competitions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Calendar Header */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={today}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
              {/* Day headers */}
              {dayNames.map(day => (
                <div
                  key={day}
                  className="bg-gray-100 p-2 text-center text-sm font-semibold text-gray-700"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {loading ? (
                <div className="col-span-7 bg-white p-12 text-center text-gray-500">
                  Loading calendar...
                </div>
              ) : (
                getDaysInMonth().map((date, index) => {
                  const dateEvents = date ? getEventsForDate(date) : []
                  const isToday = date &&
                    date.getDate() === new Date().getDate() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear()

                  return (
                    <div
                      key={index}
                      className={`bg-white min-h-[120px] p-2 ${
                        !date ? 'bg-gray-50' : ''
                      } ${isToday ? 'ring-2 ring-purple-500' : ''}`}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${
                            isToday ? 'bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-900'
                          }`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dateEvents.slice(0, 3).map(event => (
                              <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate border ${getEventTypeColor(event.eventType)}`}
                              >
                                {event.isAllDay ? '🕐 ' : formatTime(event.startDate) + ' '}
                                {event.title}
                              </div>
                            ))}
                            {dateEvents.length > 3 && (
                              <div className="text-xs text-gray-500 pl-1">
                                +{dateEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Event Types</h3>
            <div className="flex flex-wrap gap-3">
              {['CLASS', 'COMPETITION', 'PERFORMANCE', 'ASSESSMENT', 'HOLIDAY', 'MEETING', 'OTHER'].map(type => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border ${getEventTypeColor(type)}`}></div>
                  <span className="text-sm text-gray-700">{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Detail Modal */}
          {selectedEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getEventTypeColor(selectedEvent.eventType)}`}>
                          {selectedEvent.eventType}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
                    </div>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Date & Time</h3>
                      <p className="text-gray-900">
                        {selectedEvent.isAllDay ? (
                          <>
                            All Day - {new Date(selectedEvent.startDate).toLocaleDateString()}
                          </>
                        ) : (
                          <>
                            {new Date(selectedEvent.startDate).toLocaleString()}
                            {selectedEvent.endDate && (
                              <> - {new Date(selectedEvent.endDate).toLocaleString()}</>
                            )}
                          </>
                        )}
                      </p>
                    </div>

                    {selectedEvent.location && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Location</h3>
                        <p className="text-gray-900">{selectedEvent.location}</p>
                      </div>
                    )}

                    {selectedEvent.description && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedEvent.description}</p>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Created By</h3>
                      <p className="text-gray-900">
                        {selectedEvent.creator.firstName} {selectedEvent.creator.lastName} ({selectedEvent.creator.role})
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button onClick={() => setSelectedEvent(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
