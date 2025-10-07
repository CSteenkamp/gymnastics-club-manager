'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParentLayout } from '@/components/layout/ParentLayout'

interface Payment {
  id: string
  amount: number
  status: string
  method: string
  reference: string
  createdAt: string
  processedAt?: string
  externalTransactionId?: string
  payfastTransactionId?: string
  parent: {
    firstName: string
    lastName: string
    email: string
  }
  invoice: {
    id: string
    number: string
    dueDate: string
    child: {
      firstName: string
      lastName: string
    }
  }
  latestActivity?: {
    type: string
    description: string
    createdAt: string
  }
}

interface Invoice {
  id: string
  number: string
  month: number
  year: number
  total: number
  status: string
  dueDate: string
  child: {
    firstName: string
    lastName: string
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'payfast' | 'yoco'>('payfast')
  const [activeTab, setActiveTab] = useState<'payments' | 'unpaid'>('payments')
  const router = useRouter()

  useEffect(() => {
    loadPaymentsData()
  }, [])

  const loadPaymentsData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      setIsLoading(true)

      // Load payments
      const paymentsResponse = await fetch('/api/payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        setPayments(paymentsData.data.payments || [])
      }

      // Load unpaid invoices
      const invoicesResponse = await fetch('/api/invoices?status=PENDING,OVERDUE', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        setUnpaidInvoices(invoicesData.data || [])
      }

    } catch (error) {
      console.error('Error loading payments data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async (invoice: Invoice, method: 'payfast' | 'yoco' = selectedPaymentMethod) => {
    try {
      setPaymentLoading(invoice.id)
      const token = localStorage.getItem('token')
      
      if (!token) {
        router.push('/login')
        return
      }

      const endpoint = method === 'payfast' ? '/api/payments/payfast/create' : '/api/payments/yoco/create'
      const paymentData = method === 'payfast' 
        ? {
            invoiceId: invoice.id,
            amount: invoice.total,
            itemName: `${invoice.number} - ${getMonthName(invoice.month)} ${invoice.year}`,
            itemDescription: `Monthly fees for ${invoice.child.firstName} ${invoice.child.lastName}`,
            returnUrl: `${window.location.origin}/payments?payment=success`,
            cancelUrl: `${window.location.origin}/payments?payment=cancelled`
          }
        : {
            invoiceId: invoice.id,
            amount: invoice.total,
            description: `${invoice.number} - Monthly fees for ${invoice.child.firstName} ${invoice.child.lastName}`,
            successUrl: `${window.location.origin}/payments?payment=success`,
            cancelUrl: `${window.location.origin}/payments?payment=cancelled`
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      })

      if (response.ok) {
        const data = await response.json()
        const redirectUrl = data.data.paymentUrl || data.data.checkoutUrl
        if (data.success && redirectUrl) {
          // Redirect to payment gateway
          window.location.href = redirectUrl
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentStatusBadge = (status: string) => {
    const config = {
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      FAILED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
    }
    const statusConfig = config[status] || config.PENDING
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
        {statusConfig.label}
      </span>
    )
  }

  const getInvoiceStatusBadge = (status: string) => {
    const config = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' },
      PAID: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' }
    }
    const statusConfig = config[status] || config.PENDING
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
        {statusConfig.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading payments...</div>
      </div>
    )
  }

  return (
    <ParentLayout title="Payments" description="Manage your payment history and pay outstanding invoices">
      <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💳 Payment History
            </button>
            <button
              onClick={() => setActiveTab('unpaid')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'unpaid'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📄 Unpaid Invoices
              {unpaidInvoices.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {unpaidInvoices.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
          {activeTab === 'payments' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                {payments.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No payments found.
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {payment.method} Payment
                              </div>
                              <div className="text-sm text-gray-500">
                                Ref: {payment.reference}
                              </div>
                              {payment.payfastTransactionId && (
                                <div className="text-xs text-gray-400">
                                  PayFast ID: {payment.payfastTransactionId}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {payment.invoice.number}
                              </div>
                              <div className="text-sm text-gray-500">
                                {payment.invoice.child.firstName} {payment.invoice.child.lastName}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPaymentStatusBadge(payment.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(payment.processedAt || payment.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'unpaid' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Unpaid Invoices</h2>
                    <p className="text-sm text-gray-600">Choose your payment method and click "Pay Now"</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Payment Method:</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedPaymentMethod('payfast')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedPaymentMethod === 'payfast'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        PayFast
                      </button>
                      <button
                        onClick={() => setSelectedPaymentMethod('yoco')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedPaymentMethod === 'yoco'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Yoco
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {unpaidInvoices.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <span className="text-4xl">✅</span>
                    <h3 className="text-lg font-medium text-gray-900 mt-2">All caught up!</h3>
                    <p>You have no outstanding invoices.</p>
                  </div>
                ) : (
                  unpaidInvoices.map((invoice) => (
                    <div key={invoice.id} className="px-6 py-4 flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900">
                            {invoice.number}
                          </h3>
                          {getInvoiceStatusBadge(invoice.status)}
                        </div>
                        <p className="text-gray-600">
                          {getMonthName(invoice.month)} {invoice.year} - {invoice.child.firstName} {invoice.child.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Due: {new Date(invoice.dueDate).toLocaleDateString('en-ZA')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(invoice.total)}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePayment(invoice, selectedPaymentMethod)}
                          disabled={paymentLoading === invoice.id}
                          className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                            paymentLoading === invoice.id
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : selectedPaymentMethod === 'payfast'
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
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
                              {selectedPaymentMethod === 'payfast' ? '💳' : '🏦'} Pay with {selectedPaymentMethod === 'payfast' ? 'PayFast' : 'Yoco'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
      </div>
    </ParentLayout>
  )
}