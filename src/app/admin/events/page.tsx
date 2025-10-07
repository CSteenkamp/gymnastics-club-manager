'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import {
  CalendarDays,
  Trophy,
  Award,
  Users,
  DollarSign,
  MapPin,
  Clock,
  Plus,
  Edit,
  Trash2,
  X
} from 'lucide-react'

interface EventRegistration {
  id: string
  childId: string
  status: string
}

interface Event {
  id: string
  title: string
  description?: string
  eventType: string
  date: string
  endDate?: string
  location?: string
  registrationDeadline?: string
  maxParticipants?: number
  cost?: number
  isPublic: boolean
  targetLevels: string[]
  notes?: string
  registrations: EventRegistration[]
  createdAt: string
  updatedAt: string
}

type FilterTab = 'all' | 'upcoming' | 'past'

const EVENT_TYPES = [
  { value: 'GYM_GAMES', label: 'Gym Games', color: 'blue' },
  { value: 'TRIALS', label: 'Trials', color: 'blue' },
  { value: 'PROVINCIAL_COMPETITION', label: 'Provincial Competition', color: 'blue' },
  { value: 'NATIONAL_COMPETITION', label: 'National Competition', color: 'blue' },
  { value: 'SHOWCASE', label: 'Showcase', color: 'purple' },
  { value: 'WORKSHOP', label: 'Workshop', color: 'green' },
  { value: 'SOCIAL_EVENT', label: 'Social Event', color: 'purple' },
  { value: 'OTHER', label: 'Other', color: 'gray' }
]

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'GYM_GAMES',
    date: '',
    endDate: '',
    location: '',
    registrationDeadline: '',
    maxParticipants: '',
    cost: '',
    targetLevels: '',
    notes: '',
    isPublic: true
  })

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEvents(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async () => {
    try {
      const token = localStorage.getItem('token')

      // Process target levels (comma-separated string to array)
      const targetLevelsArray = formData.targetLevels
        .split(',')
        .map(level => level.trim())
        .filter(level => level.length > 0)

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          eventType: formData.eventType,
          date: formData.date,
          endDate: formData.endDate || null,
          location: formData.location || null,
          registrationDeadline: formData.registrationDeadline || null,
          maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          targetLevels: targetLevelsArray,
          notes: formData.notes || null,
          isPublic: formData.isPublic
        })
      })

      if (response.ok) {
        setShowCreateModal(false)
        setFormData({
          title: '',
          description: '',
          eventType: 'GYM_GAMES',
          date: '',
          endDate: '',
          location: '',
          registrationDeadline: '',
          maxParticipants: '',
          cost: '',
          targetLevels: '',
          notes: '',
          isPublic: true
        })
        await loadEvents()
      } else {
        alert('Failed to create event')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      alert('Error creating event')
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Free'
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEventTypeConfig = (type: string) => {
    const config = EVENT_TYPES.find(t => t.value === type)
    return config || { value: type, label: type, color: 'gray' }
  }

  const getEventTypeBadge = (type: string) => {
    const config = getEventTypeConfig(type)
    const colorClasses: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-800' },
      green: { bg: 'bg-green-100', text: 'text-green-800' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-800' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-800' }
    }
    const colors = colorClasses[config.color] || colorClasses.gray
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
        {config.label}
      </span>
    )
  }

  const isUpcoming = (date: string) => {
    return new Date(date) >= new Date()
  }

  const filteredEvents = events.filter(event => {
    if (filterTab === 'upcoming') {
      return isUpcoming(event.date)
    } else if (filterTab === 'past') {
      return !isUpcoming(event.date)
    }
    return true
  })

  const upcomingEvents = events.filter(event => isUpcoming(event.date))
  const totalRegistrations = events.reduce((sum, event) => sum + event.registrations.length, 0)

  return (
    <AdminLayout title="Events" description="Manage club events and competitions">
      <div className="space-y-6">
        {/* Events Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Events Management</h3>
                <p className="text-sm text-gray-600">Manage all club events and competitions</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Event
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterTab === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setFilterTab('upcoming')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterTab === 'upcoming'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Upcoming Events
              </button>
              <button
                onClick={() => setFilterTab('past')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterTab === 'past'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Past Events
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading events...</div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-gray-900 mt-2">No events found</h3>
                <p className="text-gray-500 text-sm">
                  {filterTab === 'upcoming'
                    ? 'No upcoming events scheduled'
                    : filterTab === 'past'
                    ? 'No past events'
                    : 'Create your first event to get started'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registrations
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Max Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {event.title}
                            </div>
                            {event.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {event.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getEventTypeBadge(event.eventType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center gap-1">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            {formatDate(event.date)}
                          </div>
                          {event.endDate && (
                            <div className="text-xs text-gray-500">
                              to {formatDate(event.endDate)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {event.location ? (
                            <div className="text-sm text-gray-900 flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              {event.location}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not set</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            {event.registrations.length}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.maxParticipants || 'Unlimited'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            {formatCurrency(event.cost)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => alert('Edit functionality coming soon!')}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => alert('Delete functionality coming soon!')}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Event Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Create New Event</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Event title"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Event description"
                  />
                </div>

                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    {EVENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date and End Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Event location"
                  />
                </div>

                {/* Registration Deadline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.registrationDeadline}
                    onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Max Participants and Cost */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Leave empty for unlimited"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost (ZAR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                </div>

                {/* Target Levels */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Levels
                  </label>
                  <input
                    type="text"
                    value={formData.targetLevels}
                    onChange={(e) => setFormData({ ...formData, targetLevels: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Comma-separated (e.g., 1, 2, 3)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter levels separated by commas</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Additional notes"
                  />
                </div>

                {/* Is Public */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                    Make this event public (visible to all members)
                  </label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={!formData.title || !formData.eventType || !formData.date}
                  className="px-4 py-2 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
