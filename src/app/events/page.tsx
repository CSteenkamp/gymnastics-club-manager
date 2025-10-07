'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParentLayout } from '@/components/layout/ParentLayout'
import { Calendar, MapPin, Users, DollarSign, Clock, Trophy, Award } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string | null
  eventType: string
  date: string
  endDate: string | null
  location: string | null
  registrationDeadline: string | null
  maxParticipants: number | null
  cost: number | null
  targetLevels: string[]
  notes: string | null
  registrations: Array<{
    id: string
    childId: string
    status: string
  }>
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const router = useRouter()

  useEffect(() => {
    loadEvents()
  }, [filter])

  const loadEvents = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams()
      if (filter === 'upcoming') {
        params.append('upcoming', 'true')
      }

      const response = await fetch(`/api/events?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const filteredEvents = data.data.filter((event: Event) => {
            const eventDate = new Date(event.date)
            const now = new Date()
            
            if (filter === 'upcoming') {
              return eventDate >= now
            } else if (filter === 'past') {
              return eventDate < now
            }
            return true
          })
          setEvents(filteredEvents)
        }
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'GYM_GAMES':
      case 'PROVINCIAL_COMPETITION':
      case 'NATIONAL_COMPETITION':
        return <Trophy className="h-6 w-6" />
      case 'TRIALS':
        return <Award className="h-6 w-6" />
      default:
        return <Calendar className="h-6 w-6" />
    }
  }

  const getEventTypeLabel = (eventType: string) => {
    return eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <ParentLayout title="Events" description="View upcoming gymnastics events">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading events...</div>
        </div>
      </ParentLayout>
    )
  }

  return (
    <ParentLayout title="Events" description="View upcoming gymnastics events">
      <div className="space-y-6">
        {/* Filter Tabs */}
        <div className="bg-white border-b border-gray-200 rounded-t-lg">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setFilter('upcoming')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'upcoming'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Upcoming Events
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'past'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Past Events
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'all'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Events
            </button>
          </nav>
        </div>

        {/* Events List */}
        <div className="grid grid-cols-1 gap-6">
          {events.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-500">
                {filter === 'upcoming' && 'There are no upcoming events at the moment.'}
                {filter === 'past' && 'No past events to display.'}
                {filter === 'all' && 'No events have been created yet.'}
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow-sm border-2 border-purple-100 hover:border-purple-300 transition-all p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                      {getEventIcon(event.eventType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {getEventTypeLabel(event.eventType)}
                        </span>
                      </div>
                      
                      {event.description && (
                        <p className="text-gray-600 mb-4">{event.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(event.date)}</span>
                          {event.endDate && (
                            <span className="text-gray-500">- {formatDate(event.endDate)}</span>
                          )}
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {event.registrationDeadline && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>Register by: {formatDate(event.registrationDeadline)}</span>
                          </div>
                        )}

                        {event.cost !== null && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span>{formatCurrency(event.cost)}</span>
                          </div>
                        )}

                        {event.maxParticipants && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>
                              {event.registrations.length} / {event.maxParticipants} participants
                            </span>
                          </div>
                        )}

                        {event.targetLevels.length > 0 && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Award className="h-4 w-4 text-gray-400" />
                            <span>Levels: {event.targetLevels.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {event.notes && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900">{event.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ParentLayout>
  )
}
