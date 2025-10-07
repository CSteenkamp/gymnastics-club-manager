'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ParentLayout } from '@/components/layout/ParentLayout'
import { FileText, Download, Eye, Clock, CheckCircle, AlertCircle, DollarSign, Calendar, Building2, Copy, Check } from 'lucide-react'
import { downloadInvoicePDF } from '@/utils/pdfGenerator'

interface Invoice {
  id: string
  invoiceNumber: string
  paymentReference?: string
  month: number
  year: number
  total: number
  status: string
  dueDate: string
  createdAt: string
  items: {
    id: string
    description: string
    amount: number
    quantity: number
    child?: {
      firstName: string
      lastName: string
      level: string
    }
  }[]
}

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
  invoice: {
    id: string
    invoiceNumber: string
    month: number
    year: number
  }
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function ParentInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEftModal, setShowEftModal] = useState(false)
  const [eftDetails, setEftDetails] = useState<any>(null)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices')
  const router = useRouter()

  useEffect(() => {
    loadInvoices()
    loadPayments()
    loadEftDetails()
  }, [])

  const loadPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPayments(data.data.payments || [])
        }
      }
    } catch (error) {
      console.error('Error loading payments:', error)
    }
  }

  const loadEftDetails = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/clubs/branding', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.settings?.eftDetails) {
          setEftDetails(data.data.settings.eftDetails)
        }
      }
    } catch (error) {
      console.error('Error loading EFT details:', error)
    }
  }

  const handleCopyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const loadInvoices = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setInvoices(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
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
          itemDescription: `Monthly fees`,
          returnUrl: `${window.location.origin}/invoices?payment=success`,
          cancelUrl: `${window.location.origin}/invoices?payment=cancelled`
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

  const handleDownloadPDF = (invoice: Invoice) => {
    const userData = localStorage.getItem('user')
    if (!userData) return

    const user = JSON.parse(userData)

    downloadInvoicePDF({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.createdAt,
      dueDate: invoice.dueDate,
      month: invoice.month,
      year: invoice.year,
      status: invoice.status,
      total: invoice.total,
      paymentReference: invoice.paymentReference,
      parentName: `${user.firstName} ${user.lastName}`,
      parentEmail: user.email,
      childName: invoice.items[0]?.child ? `${invoice.items[0].child.firstName} ${invoice.items[0].child.lastName}` : 'Student',
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        amount: item.amount
      })),
      clubName: user.club?.name || 'Gymnastics Club',
      clubEmail: user.club?.email || 'info@club.com'
    })
  }

  const filteredInvoices = invoices.filter(invoice => {
    if (filterStatus === '') return true
    return invoice.status === filterStatus
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const getMonthName = (month: number) => {
    return MONTHS[month - 1] || 'Unknown'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: any }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      PAID: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle }
    }
    return configs[status] || configs.PENDING
  }

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'PENDING').length,
    paid: invoices.filter(i => i.status === 'PAID').length,
    overdue: invoices.filter(i => i.status === 'OVERDUE').length,
    outstanding: invoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE').reduce((sum, i) => sum + i.total, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading invoices...</div>
      </div>
    )
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

  return (
    <ParentLayout title="My Invoices" description="View and manage your billing">
      <div className="space-y-6">
          {/* Filters & Invoices */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900">All Invoices</h2>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
            </div>

            {/* Invoices List */}
            <div className="divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  No invoices found.
                </div>
              ) : (
                filteredInvoices.map((invoice) => {
                  const statusConfig = getStatusConfig(invoice.status)
                  const StatusIcon = statusConfig.icon

                  return (
                    <div key={invoice.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Invoice Details */}
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-gray-400 mt-1" />
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {invoice.invoiceNumber}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {getMonthName(invoice.month)} {invoice.year}
                              </p>
                              {invoice.paymentReference && (
                                <p className="text-sm text-blue-600 font-mono mt-1">
                                  EFT Reference: <span className="font-semibold">{invoice.paymentReference}</span>
                                </p>
                              )}
                              <p className="text-sm text-gray-500 mt-1">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                Due: {formatDate(invoice.dueDate)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center gap-4 lg:ml-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(invoice.total)}
                            </p>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} mt-2`}>
                              <StatusIcon className="h-3 w-3" />
                              {invoice.status}
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setShowDetailModal(true)
                              }}
                              className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                            {(invoice.status === 'PENDING' || invoice.status === 'OVERDUE') && (
                              <button
                                onClick={() => handlePayFastPayment(invoice)}
                                disabled={paymentLoading === invoice.id}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                                  paymentLoading === invoice.id
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                              >
                                {paymentLoading === invoice.id ? (
                                  <>Processing...</>
                                ) : (
                                  <>
                                    <DollarSign className="h-4 w-4" />
                                    Pay Now
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Stats Cards - Compact */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-lg shadow border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
                </div>
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow border-2 border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.pending}</p>
                </div>
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow border-2 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.paid}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow border-2 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Outstanding</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{formatCurrency(stats.outstanding)}</p>
                </div>
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Invoice Details</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold text-gray-900">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Period</p>
                  <p className="font-semibold text-gray-900">{getMonthName(selectedInvoice.month)} {selectedInvoice.year}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusConfig(selectedInvoice.status).bg} ${getStatusConfig(selectedInvoice.status).text}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                {selectedInvoice.paymentReference && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">EFT Payment Reference</p>
                    <p className="font-semibold text-blue-600 font-mono text-lg">{selectedInvoice.paymentReference}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Items</h4>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        {item.child && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.child.firstName} {item.child.lastName} - {item.child.level}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-gray-900">{formatCurrency(item.amount * item.quantity)}</p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-gray-500">{formatCurrency(item.amount)} × {item.quantity}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>

              {(selectedInvoice.status === 'PENDING' || selectedInvoice.status === 'OVERDUE') && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Payment Options:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => handlePayFastPayment(selectedInvoice)}
                      disabled={paymentLoading === selectedInvoice.id}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <DollarSign className="h-5 w-5" />
                      {paymentLoading === selectedInvoice.id ? 'Processing...' : 'Pay Online'}
                    </button>
                    {eftDetails && (
                      <button
                        onClick={() => setShowEftModal(true)}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Building2 className="h-5 w-5" />
                        Pay via EFT
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EFT Payment Modal */}
      {showEftModal && eftDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-purple-600" />
                <h3 className="text-xl font-semibold text-gray-900">EFT Payment Details</h3>
              </div>
              <button
                onClick={() => setShowEftModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Important:</strong> Please use your invoice number as the payment reference when making the transfer.
                  {selectedInvoice && (
                    <span className="block mt-2 font-mono font-bold text-blue-700">
                      Reference: {selectedInvoice.invoiceNumber}
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Bank Name</p>
                    <p className="text-base font-semibold text-gray-900">{eftDetails.bankName}</p>
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(eftDetails.bankName, 'bank')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedField === 'bank' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Account Holder</p>
                    <p className="text-base font-semibold text-gray-900">{eftDetails.accountHolder}</p>
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(eftDetails.accountHolder, 'holder')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedField === 'holder' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Account Number</p>
                    <p className="text-base font-semibold text-gray-900 font-mono">{eftDetails.accountNumber}</p>
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(eftDetails.accountNumber, 'account')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedField === 'account' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Branch Code</p>
                    <p className="text-base font-semibold text-gray-900 font-mono">{eftDetails.branchCode}</p>
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(eftDetails.branchCode, 'branch')}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedField === 'branch' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Account Type</p>
                    <p className="text-base font-semibold text-gray-900">{eftDetails.accountType}</p>
                  </div>
                </div>

                {selectedInvoice && (
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Payment Reference</p>
                      <p className="text-base font-bold text-purple-900 font-mono">{selectedInvoice.invoiceNumber}</p>
                    </div>
                    <button
                      onClick={() => handleCopyToClipboard(selectedInvoice.invoiceNumber, 'reference')}
                      className="p-2 hover:bg-purple-200 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedField === 'reference' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-purple-700" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900">
                  <strong>Note:</strong> Please allow 24-48 hours for payment processing. Your invoice will be updated once payment is confirmed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEftModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ParentLayout>
  )
}
