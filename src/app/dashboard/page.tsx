'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import PaymentConfirmation from '@/components/PaymentConfirmation'
import { ParentCreditAccount } from '@/components/credits/ParentCreditAccount'

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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
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
      // Show success message and reload data
      setPaymentModalType('success')
      setShowPaymentModal(true)
      window.history.replaceState({}, '', '/dashboard')
      loadDashboardData()
    } else if (paymentResult === 'cancelled') {
      // Show cancellation message
      setPaymentModalType('cancelled')
      setShowPaymentModal(true)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('📢 No token found, redirecting to login')
        router.push('/login')
        return
      }

      console.log('📊 Loading dashboard data...')

      // Load user data
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('👤 User response status:', userResponse.status)

      if (userResponse.ok) {
        const userData = await userResponse.json()
        console.log('👤 User data loaded:', userData.data?.firstName)
        setUser(userData.data)
      } else {
        console.log('❌ User auth failed, clearing token and redirecting')
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

      console.log('📄 Invoices response status:', invoicesResponse.status)

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        console.log('📄 Invoices loaded:', invoicesData.data?.length)
        setInvoices(invoicesData.data.slice(0, 5)) // Show last 5 invoices
      } else {
        console.log('⚠️ Failed to load invoices')
      }
    } catch (error) {
      console.error('❌ Error loading dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Call logout API to clear cookie
      await fetch('/api/auth/logout', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear localStorage and redirect
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

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
          // Redirect to PayFast
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const outstandingBalance = invoices
    .filter(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {user.firstName}!
              </h1>
              <p className="text-gray-600">{user.club.name}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Active Children</h3>
              <p className="text-3xl font-bold text-blue-600">
                {user.children.filter(child => child.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Outstanding Balance</h3>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(outstandingBalance)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900">Total Invoices</h3>
              <p className="text-3xl font-bold text-gray-600">
                {invoices.length}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => router.push('/documents')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📄</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Documents & Forms</h3>
                      <p className="text-sm text-gray-600">View and sign required documents</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/payments')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">💳</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Payment History</h3>
                      <p className="text-sm text-gray-600">View all payments and invoices</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => router.push('/credits')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">💰</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Credit Account</h3>
                      <p className="text-sm text-gray-600">View your credit balance and history</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => alert('Coming soon!')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📅</span>
                    <div>
                      <h3 className="font-medium text-gray-900">Class Schedule</h3>
                      <p className="text-sm text-gray-600">View your child's classes</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Children List */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Your Children</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {user.children.map((child) => (
                <div key={child.id} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {child.firstName} {child.lastName}
                    </h3>
                    <p className="text-gray-600">Level: {child.level}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    child.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {child.status}
                  </span>
                </div>
              ))}
              {user.children.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No children registered yet.
                </div>
              )}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Recent Invoices</h2>
              <button
                onClick={() => router.push('/payments')}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                View All Payments →
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="px-6 py-4 flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </h3>
                    <p className="text-gray-600">
                      {getMonthName(invoice.month)} {invoice.year}
                      {invoice.child && (
                        <span className="ml-2 text-sm">
                          - {invoice.child.firstName} {invoice.child.lastName}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex items-center space-x-4">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(invoice.total)}
                      </p>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    {(invoice.status === 'PENDING' || invoice.status === 'OVERDUE') && (
                      <button
                        onClick={() => handlePayFastPayment(invoice)}
                        disabled={paymentLoading === invoice.id}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          paymentLoading === invoice.id
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {paymentLoading === invoice.id ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </div>
                        ) : (
                          <>
                            💳 Pay Now
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No invoices found.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmation
        show={showPaymentModal}
        type={paymentModalType}
        onClose={() => setShowPaymentModal(false)}
      />
    </div>
  )
}