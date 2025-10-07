'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Plus, Edit2, Trash2, Check, X } from 'lucide-react'

interface FeeStructure {
  id: string
  level: string
  monthlyFee: number
  description?: string
  isActive: boolean
}

interface Level {
  id: string
  name: string
  displayOrder: number
}

export function FeeStructuresSettings() {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    level: '',
    monthlyFee: '',
    description: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadFeeStructures(), loadLevels()])
    setLoading(false)
  }

  const loadFeeStructures = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/fees/structures', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setFeeStructures(data.data)
      } else {
        setError(data.error || 'Failed to load fee structures')
      }
    } catch (err) {
      setError('Failed to load fee structures')
      console.error(err)
    }
  }

  const loadLevels = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/levels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setLevels(data.data)
      }
    } catch (err) {
      console.error('Failed to load levels:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.level || !formData.monthlyFee) {
      setMessage({ type: 'error', text: 'Level and monthly fee are required' })
      return
    }

    try {
      const token = localStorage.getItem('token')
      const url = editingId ? `/api/fees/structures/${editingId}` : '/api/fees/structures'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level: formData.level,
          monthlyFee: parseFloat(formData.monthlyFee),
          description: formData.description || null
        })
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: editingId ? 'Fee structure updated' : 'Fee structure created' })
        setShowAddForm(false)
        setEditingId(null)
        resetForm()
        await loadFeeStructures()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save fee structure' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save fee structure' })
      console.error(err)
    }
  }

  const handleEdit = (fee: FeeStructure) => {
    setEditingId(fee.id)
    setFormData({
      level: fee.level,
      monthlyFee: fee.monthlyFee.toString(),
      description: fee.description || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/fees/structures/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Fee structure deleted' })
        await loadFeeStructures()
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete fee structure' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete fee structure' })
      console.error(err)
    }
  }

  const resetForm = () => {
    setFormData({
      level: '',
      monthlyFee: '',
      description: ''
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Monthly Fee Structures
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Set the default monthly fees for each gymnastic level. These fees will be used when generating invoices.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm ? (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Fee Structure' : 'Add Fee Structure'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level *
                </label>
                <select
                  required
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={!!editingId}
                >
                  <option value="">Select a level</option>
                  {levels.map(level => (
                    <option key={level.id} value={level.name}>
                      {level.name}
                    </option>
                  ))}
                </select>
                {levels.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    No levels found. Add levels in the Levels tab first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Fee (R) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.monthlyFee}
                  onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={2}
                placeholder="Optional description..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingId(null)
                  resetForm()
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Fee Structure
        </button>
      )}

      {/* Fee Structures Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {feeStructures.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No fee structures configured yet. Add your first fee structure to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {feeStructures.map((fee) => (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{fee.level}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900 font-semibold">
                      {formatCurrency(fee.monthlyFee)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {fee.description || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(fee)}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(fee.id)}
                      className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Each level should have one default monthly fee</li>
          <li>These fees are used when generating monthly invoices</li>
          <li>Individual member fees can be adjusted in the Members section</li>
          <li>Fee adjustments (temporary or permanent) can be set per child in the Fees tab</li>
        </ul>
      </div>
    </div>
  )
}
