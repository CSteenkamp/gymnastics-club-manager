'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Send, Mail, MailOpen, Inbox, SendIcon, PlusCircle, X } from 'lucide-react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

interface Message {
  id: string
  subject: string
  body: string
  isRead: boolean
  createdAt: string
  sender?: User
  recipient?: User
}

export default function MessagesPage() {
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox')
  const [messages, setMessages] = useState<Message[]>([])
  const [contacts, setContacts] = useState<User[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState({
    recipientId: '',
    subject: '',
    body: ''
  })
  const router = useRouter()

  useEffect(() => {
    loadMessages()
    loadContacts()
  }, [folder])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/messages?folder=${folder}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.data || [])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/messages/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setContacts(data.data || [])
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.subject || !newMessage.body || !newMessage.recipientId) {
      alert('Please fill in all fields')
      return
    }

    setSending(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newMessage)
      })

      if (response.ok) {
        setShowCompose(false)
        setNewMessage({ recipientId: '', subject: '', body: '' })
        loadMessages()
        alert('Message sent successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message)

    // Mark as read if inbox message and unread
    if (folder === 'inbox' && !message.isRead) {
      try {
        const token = localStorage.getItem('token')
        await fetch('/api/messages', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messageId: message.id })
        })

        // Update local state
        setMessages(messages.map(m =>
          m.id === message.id ? { ...m, isRead: true } : m
        ))
      } catch (error) {
        console.error('Error marking message as read:', error)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const unreadCount = messages.filter(m => !m.isRead).length

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
                <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
                <p className="text-gray-600">Communicate with coaches and administrators</p>
              </div>
            </div>
            <Button onClick={() => setShowCompose(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Message List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                {/* Folder Tabs */}
                <div className="border-b border-gray-200">
                  <div className="flex">
                    <button
                      onClick={() => {
                        setFolder('inbox')
                        setSelectedMessage(null)
                      }}
                      className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        folder === 'inbox'
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Inbox className="h-4 w-4 inline mr-2" />
                      Inbox
                      {unreadCount > 0 && folder === 'inbox' && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setFolder('sent')
                        setSelectedMessage(null)
                      }}
                      className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        folder === 'sent'
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <SendIcon className="h-4 w-4 inline mr-2" />
                      Sent
                    </button>
                  </div>
                </div>

                {/* Message List */}
                <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                  ) : messages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Mail className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      No messages
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        onClick={() => handleSelectMessage(message)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedMessage?.id === message.id ? 'bg-purple-50' : ''
                        } ${!message.isRead && folder === 'inbox' ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          {folder === 'inbox' ? (
                            message.isRead ? (
                              <MailOpen className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            )
                          ) : (
                            <Send className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="font-medium text-gray-900 truncate">
                                {folder === 'inbox'
                                  ? `${message.sender?.firstName} ${message.sender?.lastName}`
                                  : `${message.recipient?.firstName} ${message.recipient?.lastName}`
                                }
                              </div>
                              <div className="text-xs text-gray-500 flex-shrink-0">
                                {formatDate(message.createdAt)}
                              </div>
                            </div>
                            <div className={`text-sm truncate ${!message.isRead && folder === 'inbox' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                              {message.subject}
                            </div>
                            <div className="text-xs text-gray-500 truncate mt-1">
                              {message.body}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Message Detail */}
            <div className="lg:col-span-2">
              {selectedMessage ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="border-b border-gray-200 pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedMessage.subject}</h2>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div>
                        <span className="font-medium">
                          {folder === 'inbox' ? 'From:' : 'To:'}
                        </span>{' '}
                        {folder === 'inbox'
                          ? `${selectedMessage.sender?.firstName} ${selectedMessage.sender?.lastName} (${selectedMessage.sender?.role})`
                          : `${selectedMessage.recipient?.firstName} ${selectedMessage.recipient?.lastName} (${selectedMessage.recipient?.role})`
                        }
                      </div>
                      <div>{new Date(selectedMessage.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700">{selectedMessage.body}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <Mail className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Message Selected</h3>
                  <p className="text-gray-500">Select a message from the list to view its contents</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">New Message</h2>
                <button
                  onClick={() => setShowCompose(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                  <select
                    value={newMessage.recipientId}
                    onChange={(e) => setNewMessage({ ...newMessage, recipientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select recipient...</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName} ({contact.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={newMessage.body}
                    onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Type your message here..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCompose(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
