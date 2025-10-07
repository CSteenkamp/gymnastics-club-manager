'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParentLayout } from '@/components/layout/ParentLayout'
import PaymentConfirmation from '@/components/PaymentConfirmation'
import { ParentCreditAccount } from '@/components/credits/ParentCreditAccount'
import ClassCalendar from '@/components/ClassCalendar'
import {
  CreditCard,
  FileText,
  Users,
  AlertCircle,
  Clock,
  DollarSign,
  ChevronRight,
  CheckCircle
} from 'lucide-react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  club: {
    name: string
  }
  children: Array<{
    id: string
    firstName: string
    lastName: string
    level: string
    status: string
    gender?: string
  }>
}

interface Invoice {
  id: string
  invoiceNumber: string
  paymentReference?: string
  month: number
  year: number
  total: number
  status: string
  dueDate: string
  child?: {
    firstName: string
    lastName: string
  }
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
  enrolledChildren?: string[]
  isExtraLesson?: boolean
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentModalType, setPaymentModalType] = useState<'success' | 'cancelled' | 'failed'>('success')
  const router = useRouter()

  useEffect(() => {
    loadDashboardData()

    // Handle payment result from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const paymentResult = urlParams.get('payment')

    if (paymentResult === 'success') {
      setPaymentModalType('success')
      setShowPaymentModal(true)
      window.history.replaceState({}, '', '/dashboard')
      loadDashboardData()
    } else if (paymentResult === 'cancelled') {
      setPaymentModalType('cancelled')
      setShowPaymentModal(true)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      // Load user data
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData.data)
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
        return
      }

      // Load invoices
      const invoicesResponse = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        setInvoices(invoicesData.data) // Show all invoices
      }

      // Load schedules for calendar
      const schedulesResponse = await fetch('/api/schedules/calendar', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json()
        setSchedules(schedulesData.data || [])
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookExtraLesson = async (scheduleId: string, childId: string) => {
    try {
      const token = localStorage.getItem('token')

      const response = await fetch('/api/schedules/book-extra-lesson', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scheduleId, childId })
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message || 'Extra lesson booked successfully!')
        // Reload schedules to update calendar
        loadDashboardData()
      } else {
        alert(data.error || 'Failed to book extra lesson')
      }
    } catch (error) {
      console.error('Error booking extra lesson:', error)
      alert('An error occurred while booking the lesson')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months[month - 1]
  }

  const handlePayFastPayment = async (invoice: Invoice) => {
    try {
      setPaymentLoading(invoice.id)
      const token = localStorage.getItem('token')

      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/payments/payfast/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.total,
          itemName: `${invoice.invoiceNumber} - ${getMonthName(invoice.month)} ${invoice.year}`,
          itemDescription: `Monthly fees for ${invoice.child?.firstName || 'student'} ${invoice.child?.lastName || ''}`,
          returnUrl: `${window.location.origin}/dashboard?payment=success`,
          cancelUrl: `${window.location.origin}/dashboard?payment=cancelled`
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.paymentUrl) {
          window.location.href = data.data.paymentUrl
        } else {
          alert('Failed to create payment: ' + (data.error || 'Unknown error'))
        }
      } else {
        const errorData = await response.json()
        alert('Payment failed: ' + (errorData.error || 'Network error'))
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Failed to process payment. Please try again.')
    } finally {
      setPaymentLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const outstandingBalance = invoices
    .filter(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.total, 0)

  const activeChildren = user.children.filter(child => child.status === 'ACTIVE')
  const overdueInvoices = invoices.filter(inv => inv.status === 'OVERDUE')

  return (
    <ParentLayout title={`Welcome back, ${user.firstName}!`} description={user.club.name}>
      <div className="space-y-6">
        {/* Alert Banner for Overdue */}
        {overdueInvoices.length > 0 && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  You have {overdueInvoices.length} overdue {overdueInvoices.length === 1 ? 'invoice' : 'invoices'}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Please make payment as soon as possible to avoid service interruption.
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard/invoices')}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                View Invoices
              </button>
            </div>
          </div>
        )}

        {/* Class Calendar - First Thing Parents See */}
        <div className="mb-6">
          <ClassCalendar
            schedules={schedules}
            children={user.children.map(c => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName
            }))}
            onBookExtraLesson={handleBookExtraLesson}
          />
        </div>

        {/* Invoice Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white p-3 rounded-lg shadow border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{invoices.length}</p>
              </div>
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow border-2 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  {invoices.filter(i => i.status === 'PENDING').length}
                </p>
              </div>
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  {invoices.filter(i => i.status === 'PAID').length}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow border-2 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Outstanding</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{formatCurrency(outstandingBalance)}</p>
              </div>
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* All Invoices Section */}
        {invoices.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                All Invoices
              </h2>
              <button
                onClick={() => router.push('/invoices')}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              >
                View Details <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{invoice.invoiceNumber}</h3>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          invoice.status === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : invoice.status === 'OVERDUE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {getMonthName(invoice.month)} {invoice.year}
                        {invoice.child && (
                          <span className="ml-2">• {invoice.child.firstName} {invoice.child.lastName}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(invoice.total)}
                        </p>
                      </div>
                      {(invoice.status === 'PENDING' || invoice.status === 'OVERDUE') && (
                        <button
                          onClick={() => handlePayFastPayment(invoice)}
                          disabled={paymentLoading === invoice.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {paymentLoading === invoice.id ? (
                            <>
                              <Clock className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4" />
                              Pay Now
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Children Widget */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Your Children
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {user.children.length > 0 ? (
                  user.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {child.firstName[0]}{child.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {child.firstName} {child.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">Level: {child.level}</p>
                      </div>
                      <div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          child.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {child.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No children registered yet</p>
                    <button
                      onClick={() => router.push('/dashboard/children')}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                      View Children
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmation
        show={showPaymentModal}
        type={paymentModalType}
        onClose={() => setShowPaymentModal(false)}
      />
    </ParentLayout>
  )
}
