'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Plus, DollarSign, Calendar, Tag, FileText, Trash2, Edit2, Receipt } from 'lucide-react'

interface Expense {
  id: string
  amount: number
  date: string
  category: string
  description: string
  receipt: string | null
  notes: string | null
  createdAt: string
}

const CATEGORIES = [
  'SUPPLIES',
  'EQUIPMENT',
  'RENT',
  'UTILITIES',
  'STAFF',
  'MARKETING',
  'INSURANCE',
  'MAINTENANCE',
  'OTHER'
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    receipt: '',
    notes: ''
  })

  useEffect(() => {
    loadExpenses()
  }, [filterCategory])

  const loadExpenses = async () => {
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (filterCategory) {
        params.append('category', filterCategory)
      }

      const response = await fetch(`/api/expenses?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setExpenses(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowModal(false)
        resetForm()
        loadExpenses()
      }
    } catch (error) {
      console.error('Error creating expense:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      receipt: '',
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
      month: 'long',
      day: 'numeric'
    })
  }

  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ')
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

  if (loading) {
    return (
      <AdminLayout title="Expenses" description="Manage club expenses">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading expenses...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Expenses" description="Track and manage club expenses">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border-2 border-red-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-blue-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Count</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{expenses.length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No expenses recorded yet. Click "Add Expense" to get started.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {expense.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {getCategoryLabel(expense.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        {formatCurrency(Number(expense.amount))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {expense.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Expense Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900">Add New Expense</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Rent for October"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Add Expense
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
