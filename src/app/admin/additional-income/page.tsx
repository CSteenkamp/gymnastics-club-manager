'use client'

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Plus, DollarSign, Calendar, Tag, FileText, TrendingUp } from 'lucide-react'

interface AdditionalIncome {
  id: string
  amount: number
  date: string
  source: string
  description: string
  notes: string | null
  createdAt: string
}

const SOURCES = [
  'BANK_INTEREST',
  'FUNDRAISER',
  'DONATION',
  'GRANT',
  'SPONSORSHIP',
  'OTHER'
]

export default function AdditionalIncomePage() {
  const [incomes, setIncomes] = useState<AdditionalIncome[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterSource, setFilterSource] = useState('')
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    source: '',
    description: '',
    notes: ''
  })

  useEffect(() => {
    loadIncomes()
  }, [filterSource])

  const loadIncomes = async () => {
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams()
      if (filterSource) {
        params.append('source', filterSource)
      }

      const response = await fetch(`/api/additional-income?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setIncomes(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading additional income:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/additional-income', {
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
        loadIncomes()
      }
    } catch (error) {
      console.error('Error creating additional income:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      source: '',
      description: '',
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

  const getSourceLabel = (source: string) => {
    return source.replace(/_/g, ' ')
  }

  const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0)

  if (loading) {
    return (
      <AdminLayout title="Additional Income" description="Manage additional income sources">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading additional income...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Additional Income" description="Track bank interest, fundraisers, donations, and other income">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border-2 border-green-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Additional Income</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-blue-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{incomes.length}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Income
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Source
              </label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Sources</option>
                {SOURCES.map(source => (
                  <option key={source} value={source}>{getSourceLabel(source)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Income Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incomes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No additional income recorded yet. Click "Add Income" to get started.
                    </td>
                  </tr>
                ) : (
                  incomes.map((income) => (
                    <tr key={income.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(income.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {income.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {getSourceLabel(income.source)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {formatCurrency(Number(income.amount))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {income.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Income Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900">Add Additional Income</h2>
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
                    Source *
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select source...</option>
                    {SOURCES.map(source => (
                      <option key={source} value={source}>{getSourceLabel(source)}</option>
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
                    placeholder="e.g., Monthly bank interest"
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
                    Add Income
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
