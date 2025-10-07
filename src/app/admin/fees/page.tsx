'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Plus, DollarSign, TrendingDown, Receipt, Clock, Calendar, Tag, FileText, X } from 'lucide-react'

interface Child {
  id: string
  firstName: string
  lastName: string
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

export default function FeesPage() {
  const [activeTab, setActiveTab] = useState<'adjustments' | 'onetime' | 'history'>('adjustments')
  const [adjustments, setAdjustments] = useState<FeeAdjustment[]>([])
  const [oneTimeItems, setOneTimeItems] = useState<OneTimeItem[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
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
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')

      // Load children
      const childrenResponse = await fetch('/api/children', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (childrenResponse.ok) {
        const childrenData = await childrenResponse.json()
        if (childrenData.success) {
          setChildren(childrenData.data)
        }
      }

      // Load fee adjustments
      if (activeTab === 'adjustments' || activeTab === 'history') {
        const adjustmentsResponse = await fetch('/api/fees/adjustments', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (adjustmentsResponse.ok) {
          const adjustmentsData = await adjustmentsResponse.json()
          if (adjustmentsData.success) {
            setAdjustments(adjustmentsData.data)
          }
        }
      }

      // Load one-time items
      if (activeTab === 'onetime' || activeTab === 'history') {
        const oneTimeResponse = await fetch('/api/fees/one-time-items', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (oneTimeResponse.ok) {
          const oneTimeData = await oneTimeResponse.json()
          if (oneTimeData.success) {
            setOneTimeItems(oneTimeData.data)
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/fees/adjustments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(adjustmentForm)
      })

      if (response.ok) {
        setShowAdjustmentModal(false)
        resetAdjustmentForm()
        loadData()
      }
    } catch (error) {
      console.error('Error creating adjustment:', error)
    }
  }

  const handleOneTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/fees/one-time-items', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(oneTimeForm)
      })

      if (response.ok) {
        setShowOneTimeModal(false)
        resetOneTimeForm()
        loadData()
      }
    } catch (error) {
      console.error('Error creating one-time item:', error)
    }
  }

  const resetAdjustmentForm = () => {
    setAdjustmentForm({
      childId: '',
      type: '',
      amount: '',
      reason: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
      recurring: false
    })
  }

  const resetOneTimeForm = () => {
    setOneTimeForm({
      childId: '',
      description: '',
      category: '',
      amount: '',
      billingPeriod: '',
      status: 'PENDING',
      notes: ''
    })
  }

  const formatCurrency = (amount: number) => {
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

  const getAdjustmentTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ')
  }

  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ')
  }

  const getAdjustmentTypeColor = (type: string) => {
    switch (type) {
      case 'DISCOUNT':
      case 'SCHOLARSHIP':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PERMANENT_CHANGE':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'TEMPORARY_CHANGE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'SCHEDULE_CHANGE':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'BILLED':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getChildName = (childId: string, childData?: { firstName: string; lastName: string }) => {
    if (childData) {
      return `${childData.firstName} ${childData.lastName}`
    }
    const child = children.find(c => c.id === childId)
    return child ? `${child.firstName} ${child.lastName}` : 'Unknown'
  }

  const totalAdjustments = adjustments.reduce((sum, adj) => sum + Number(adj.amount), 0)
  const totalOneTime = oneTimeItems.reduce((sum, item) => sum + Number(item.amount), 0)
  const activeAdjustments = adjustments.filter(adj => {
    const now = new Date()
    const from = new Date(adj.effectiveFrom)
    const to = adj.effectiveTo ? new Date(adj.effectiveTo) : null
    return from <= now && (!to || to >= now)
  }).length

  if (loading) {
    return (
      <AdminLayout title="Fee Management" description="Manage fee adjustments and one-time items">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading fee data...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Fee Management" description="Manage fee adjustments, discounts, and one-time charges">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('adjustments')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'adjustments'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Fee Adjustments
              </button>
              <button
                onClick={() => setActiveTab('onetime')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'onetime'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                One-Time Items
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                History
              </button>
              <div className="flex-1 flex items-center justify-end px-4">
                {activeTab === 'adjustments' && (
                  <button
                    onClick={() => setShowAdjustmentModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Adjustment
                  </button>
                )}
                {activeTab === 'onetime' && (
                  <button
                    onClick={() => setShowOneTimeModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add One-Time Item
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Fee Adjustments Tab */}
          {activeTab === 'adjustments' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Child</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recurring</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No fee adjustments yet. Click "Add Adjustment" to get started.
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((adjustment) => (
                      <tr key={adjustment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getChildName(adjustment.childId, adjustment.child)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getAdjustmentTypeColor(adjustment.type)}`}>
                            {getAdjustmentTypeLabel(adjustment.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                          {Number(adjustment.amount) >= 0 ? '+' : ''}{formatCurrency(Number(adjustment.amount))}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {adjustment.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(adjustment.effectiveFrom)}
                          {adjustment.effectiveTo && (
                            <> - {formatDate(adjustment.effectiveTo)}</>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {adjustment.recurring ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Clock className="h-4 w-4" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* One-Time Items Tab */}
          {activeTab === 'onetime' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Child</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {oneTimeItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No one-time items yet. Click "Add One-Time Item" to get started.
                      </td>
                    </tr>
                  ) : (
                    oneTimeItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getChildName(item.childId, item.child)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            {getCategoryLabel(item.category)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                          {formatCurrency(Number(item.amount))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.billingPeriod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Fee Adjustments</h3>
                <div className="space-y-2">
                  {adjustments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No fee adjustments recorded yet.</div>
                  ) : (
                    adjustments.slice(0, 10).map((adjustment) => (
                      <div key={adjustment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">{getChildName(adjustment.childId, adjustment.child)}</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getAdjustmentTypeColor(adjustment.type)}`}>
                              {getAdjustmentTypeLabel(adjustment.type)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{adjustment.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-purple-600">
                            {Number(adjustment.amount) >= 0 ? '+' : ''}{formatCurrency(Number(adjustment.amount))}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(adjustment.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent One-Time Items</h3>
                <div className="space-y-2">
                  {oneTimeItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No one-time items recorded yet.</div>
                  ) : (
                    oneTimeItems.slice(0, 10).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">{getChildName(item.childId, item.child)}</span>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              {getCategoryLabel(item.category)}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-purple-600">{formatCurrency(Number(item.amount))}</p>
                          <p className="text-xs text-gray-500">{formatDate(item.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-purple-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Adjustments</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{adjustments.length}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-green-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Active Adjustments</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{activeAdjustments}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-blue-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">One-Time Items</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{oneTimeItems.length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-orange-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(totalAdjustments + totalOneTime)}
                </p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Add Fee Adjustment Modal */}
        {showAdjustmentModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Add Fee Adjustment</h2>
                <button
                  onClick={() => {
                    setShowAdjustmentModal(false)
                    resetAdjustmentForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAdjustmentSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Child *
                  </label>
                  <select
                    value={adjustmentForm.childId}
                    onChange={(e) => setAdjustmentForm({...adjustmentForm, childId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select child...</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.firstName} {child.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adjustment Type *
                    </label>
                    <select
                      value={adjustmentForm.type}
                      onChange={(e) => setAdjustmentForm({...adjustmentForm, type: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Select type...</option>
                      {ADJUSTMENT_TYPES.map(type => (
                        <option key={type} value={type}>{getAdjustmentTypeLabel(type)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (ZAR) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={adjustmentForm.amount}
                      onChange={(e) => setAdjustmentForm({...adjustmentForm, amount: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., -100 for discount, 50 for increase"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason *
                  </label>
                  <input
                    type="text"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm({...adjustmentForm, reason: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Sibling discount, Schedule change to 2 days/week"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effective From *
                    </label>
                    <input
                      type="date"
                      value={adjustmentForm.effectiveFrom}
                      onChange={(e) => setAdjustmentForm({...adjustmentForm, effectiveFrom: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effective To
                    </label>
                    <input
                      type="date"
                      value={adjustmentForm.effectiveTo}
                      onChange={(e) => setAdjustmentForm({...adjustmentForm, effectiveTo: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Leave empty for permanent"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={adjustmentForm.recurring}
                    onChange={(e) => setAdjustmentForm({...adjustmentForm, recurring: e.target.checked})}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="recurring" className="ml-2 block text-sm text-gray-900">
                    Recurring adjustment (applies every billing period)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdjustmentModal(false)
                      resetAdjustmentForm()
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add One-Time Item Modal */}
        {showOneTimeModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Add One-Time Item</h2>
                <button
                  onClick={() => {
                    setShowOneTimeModal(false)
                    resetOneTimeForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleOneTimeSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Child *
                  </label>
                  <select
                    value={oneTimeForm.childId}
                    onChange={(e) => setOneTimeForm({...oneTimeForm, childId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select child...</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.firstName} {child.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={oneTimeForm.description}
                    onChange={(e) => setOneTimeForm({...oneTimeForm, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Provincial Competition Entry Fee"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={oneTimeForm.category}
                      onChange={(e) => setOneTimeForm({...oneTimeForm, category: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Select category...</option>
                      {ONE_TIME_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (ZAR) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={oneTimeForm.amount}
                      onChange={(e) => setOneTimeForm({...oneTimeForm, amount: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 350.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Billing Period *
                    </label>
                    <input
                      type="text"
                      value={oneTimeForm.billingPeriod}
                      onChange={(e) => setOneTimeForm({...oneTimeForm, billingPeriod: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 2025-11 or November 2025"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status *
                    </label>
                    <select
                      value={oneTimeForm.status}
                      onChange={(e) => setOneTimeForm({...oneTimeForm, status: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={oneTimeForm.notes}
                    onChange={(e) => setOneTimeForm({...oneTimeForm, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOneTimeModal(false)
                      resetOneTimeForm()
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add One-Time Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
