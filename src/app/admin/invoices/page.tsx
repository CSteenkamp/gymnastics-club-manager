'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { FileText, Plus, Search, Download, Eye, Edit, Trash2, DollarSign, Calendar, User, Filter, CheckCircle, Clock, AlertCircle, X, Zap, TrendingDown, Receipt, Tag } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  paymentReference?: string
  userId: string
  month: number
  year: number
  dueDate: string
  status: string
  subtotal: number
  tax: number
  total: number
  paidAmount: number
  notes?: string
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  items: {
    id: string
    description: string
    amount: number
    child: {
      id: string
      firstName: string
      lastName: string
      level: string
    }
  }[]
  payments: {
    id: string
    amount: number
    method: string
    processedAt: string
  }[]
}

interface Parent {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Child {
  id: string
  firstName: string
  lastName: string
  level: string
}

interface FeeAdjustment {
  id: string
  childId: string
  type: string
  amount: number
  reason: string
  effectiveFrom: string
  effectiveTo: string | null
  recurring: boolean
  createdAt: string
  child?: {
    firstName: string
    lastName: string
  }
}

interface OneTimeItem {
  id: string
  childId: string
  description: string
  category: string
  amount: number
  billingPeriod: string
  status: string
  notes: string | null
  createdAt: string
  child?: {
    firstName: string
    lastName: string
  }
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const ADJUSTMENT_TYPES = [
  'PERMANENT_CHANGE',
  'TEMPORARY_CHANGE',
  'DISCOUNT',
  'SCHOLARSHIP',
  'SCHEDULE_CHANGE'
]

const ONE_TIME_CATEGORIES = [
  'COMPETITION',
  'EQUIPMENT',
  'CLOTHING',
  'REGISTRATION',
  'LATE_FEE',
  'OTHER'
]

const STATUS_OPTIONS = ['PENDING', 'BILLED', 'PAID', 'CANCELLED']

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'adjustments' | 'onetime'>('invoices')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [adjustments, setAdjustments] = useState<FeeAdjustment[]>([])
  const [oneTimeItems, setOneTimeItems] = useState<OneTimeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterParent, setFilterParent] = useState('')
  const [filterChild, setFilterChild] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [parents, setParents] = useState<Parent[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [createForm, setCreateForm] = useState({
    parentUserId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    dueDate: ''
  })
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkForm, setBulkForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })
  const [generatingBulk, setGeneratingBulk] = useState(false)
  const [bulkResults, setBulkResults] = useState<any>(null)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [showOneTimeModal, setShowOneTimeModal] = useState(false)
  const [adjustmentForm, setAdjustmentForm] = useState({
    childId: '',
    type: '',
    amount: '',
    reason: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    recurring: false
  })
  const [oneTimeForm, setOneTimeForm] = useState({
    childId: '',
    description: '',
    category: '',
    amount: '',
    billingPeriod: '',
    status: 'PENDING',
    notes: ''
  })

  useEffect(() => {
    loadInvoices()
    loadParents()
    loadChildren()
  }, [filterStatus, filterMonth, filterYear])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (filterStatus) params.append('status', filterStatus)
      if (filterMonth) params.append('month', filterMonth)
      if (filterYear) params.append('year', filterYear)

      const response = await fetch(`/api/invoices?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
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

  const loadParents = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users?role=PARENT', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setParents(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading parents:', error)
    }
  }

  const loadChildren = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/children', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setChildren(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading children:', error)
    }
  }

  const handleCreateInvoice = async () => {
    if (!createForm.parentUserId || !createForm.dueDate) {
      alert('Please fill in all required fields')
      return
    }

    setCreatingInvoice(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await loadInvoices()
        setShowCreateModal(false)
        setCreateForm({
          parentUserId: '',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          dueDate: ''
        })
      } else {
        alert(data.error || 'Failed to create invoice')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('Error creating invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const handleBulkGenerate = async () => {
    setGeneratingBulk(true)
    setBulkResults(null)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/invoices/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bulkForm)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setBulkResults(data.data)
        await loadInvoices()
      } else {
        alert(data.error || 'Failed to generate bulk invoices')
      }
    } catch (error) {
      console.error('Error generating bulk invoices:', error)
      alert('Error generating bulk invoices')
    } finally {
      setGeneratingBulk(false)
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        await loadInvoices()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete invoice')
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Error deleting invoice')
    }
  }

  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        await loadInvoices()
      } else {
        alert('Failed to update invoice status')
      }
    } catch (error) {
      console.error('Error updating invoice:', error)
      alert('Error updating invoice')
    }
  }

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (!confirm('Mark this invoice as paid? This will update the invoice status to PAID.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        await loadInvoices()
        alert('Invoice marked as paid successfully')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to mark invoice as paid')
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
      alert('Error marking invoice as paid')
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === '' ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${invoice.user.firstName} ${invoice.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesParent = filterParent === '' || invoice.userId === filterParent

    const matchesChild = filterChild === '' ||
      invoice.items.some(item => item.child && item.child.id === filterChild)

    return matchesSearch && matchesParent && matchesChild
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      PAID: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle }
    }
    const config = statusConfig[status] || statusConfig.PENDING
    const Icon = config.icon

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    )
  }

  const stats = {
    total: invoices.length,
    pending: invoices.filter(i => i.status === 'PENDING').length,
    paid: invoices.filter(i => i.status === 'PAID').length,
    overdue: invoices.filter(i => i.status === 'OVERDUE').length,
    totalRevenue: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0),
    outstanding: invoices.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE').reduce((sum, i) => sum + (i.total - i.paidAmount), 0)
  }

  return (
    <AdminLayout title="Invoices" description="Manage club invoices and billing">
      <div className="space-y-6">
        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">All Invoices</h3>
                <p className="text-sm text-gray-600">Showing {filteredInvoices.length} of {invoices.length} invoices</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Bulk Generate
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </button>
              </div>
            </div>
          </div>

          {/* Filters - Simplified */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by invoice #, parent name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value="">All Months</option>
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>{month}</option>
                  ))}
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value="">All Years</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
                {(filterStatus || filterMonth || filterYear || searchTerm) && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setFilterParent('')
                      setFilterChild('')
                      setFilterStatus('')
                      setFilterMonth('')
                      setFilterYear('')
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                    title="Clear filters"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-500 text-sm">
                  {searchTerm || filterStatus || filterMonth || filterYear
                    ? 'Try adjusting your filters'
                    : 'Create your first invoice to get started'
                  }
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Invoice
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Parent
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Period
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Due Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                        {invoice.paymentReference && (
                          <div className="text-xs text-blue-600 font-mono">Ref: {invoice.paymentReference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.user.firstName} {invoice.user.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{invoice.user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {MONTHS[invoice.month - 1]} {invoice.year}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.total)}</div>
                        {invoice.paidAmount > 0 && (
                          <div className="text-xs text-green-600">Paid: {formatCurrency(invoice.paidAmount)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setShowDetailModal(true)
                            }}
                            className="text-purple-600 hover:text-purple-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {invoice.status === 'PENDING' && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Mark as Paid"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="bg-white border-2 border-gray-200 rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Total Invoices</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Paid</p>
                <p className="text-xl font-bold text-gray-900">{stats.paid}</p>
                <p className="text-xs text-gray-500">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Pending</p>
                <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Overdue</p>
                <p className="text-xl font-bold text-gray-900">{stats.overdue}</p>
                <p className="text-xs text-gray-500">{formatCurrency(stats.outstanding)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Create New Invoice</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.parentUserId}
                  onChange={(e) => setCreateForm({ ...createForm, parentUserId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="">Select a parent</option>
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.firstName} {parent.lastName} ({parent.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.month}
                    onChange={(e) => setCreateForm({ ...createForm, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.year}
                    onChange={(e) => setCreateForm({ ...createForm, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.dueDate}
                  onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Invoice items will be automatically generated based on the parent's active children and their monthly fees.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                disabled={creatingInvoice}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={creatingInvoice}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {creatingInvoice ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Generate Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Generate Invoices</h3>
              <button
                onClick={() => {
                  setShowBulkModal(false)
                  setBulkResults(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!bulkResults ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Bulk Invoice Generation</strong><br />
                      This will generate invoices for all active parents who have active children in the system.
                      Each invoice will include monthly fees for all their active children.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Month <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={bulkForm.month}
                        onChange={(e) => setBulkForm({ ...bulkForm, month: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={generatingBulk}
                      >
                        {MONTHS.map((month, index) => (
                          <option key={month} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={bulkForm.year}
                        onChange={(e) => setBulkForm({ ...bulkForm, year: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={generatingBulk}
                      >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Invoices for parents who already have an invoice for this period will be skipped.
                      Due date will be automatically set to the 15th of the selected month.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">Generation Complete!</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-green-600">Total Parents:</p>
                        <p className="text-2xl font-bold text-green-800">{bulkResults.summary.total}</p>
                      </div>
                      <div>
                        <p className="text-green-600">Successful:</p>
                        <p className="text-2xl font-bold text-green-800">{bulkResults.summary.successful}</p>
                      </div>
                      <div>
                        <p className="text-red-600">Failed:</p>
                        <p className="text-2xl font-bold text-red-800">{bulkResults.summary.failed}</p>
                      </div>
                    </div>
                  </div>

                  {bulkResults.summary.failed > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Failed Invoices</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent ID</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {bulkResults.results.filter((r: any) => !r.success).map((result: any, index: number) => (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm text-gray-900">{result.parentId}</td>
                                <td className="px-4 py-3 text-sm text-red-600">{result.error}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              {!bulkResults ? (
                <>
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    disabled={generatingBulk}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkGenerate}
                    disabled={generatingBulk}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {generatingBulk ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Generate Invoices
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowBulkModal(false)
                    setBulkResults(null)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Invoice Details</h3>
                <p className="text-sm text-gray-600">{selectedInvoice.invoiceNumber}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedInvoice(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Invoice Header Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Bill To</h4>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      {selectedInvoice.user.firstName} {selectedInvoice.user.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{selectedInvoice.user.email}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Invoice Info</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Period:</span>
                      <span className="font-medium text-gray-900">
                        {MONTHS[selectedInvoice.month - 1]} {selectedInvoice.year}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span>{getStatusBadge(selectedInvoice.status)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Invoice Items</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Child</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedInvoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.child ? `${item.child.firstName} ${item.child.lastName} (${item.child.level})` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">{formatCurrency(selectedInvoice.total)}</span>
                </div>
                {selectedInvoice.paidAmount > 0 && (
                  <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                    <span className="text-green-600">Paid Amount:</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedInvoice.paidAmount)}</span>
                  </div>
                )}
                {selectedInvoice.total - selectedInvoice.paidAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Outstanding:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(selectedInvoice.total - selectedInvoice.paidAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payments */}
              {selectedInvoice.payments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment History</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedInvoice.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(payment.processedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{payment.method}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(payment.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Status Update Actions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Update Status</h4>
                <div className="flex gap-2">
                  {selectedInvoice.status !== 'PAID' && (
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedInvoice.id, 'PAID')
                        setShowDetailModal(false)
                      }}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Mark as Paid
                    </button>
                  )}
                  {selectedInvoice.status !== 'CANCELLED' && (
                    <button
                      onClick={() => {
                        handleUpdateStatus(selectedInvoice.id, 'CANCELLED')
                        setShowDetailModal(false)
                      }}
                      className="px-3 py-2 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                    >
                      Cancel Invoice
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedInvoice(null)
                }}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
