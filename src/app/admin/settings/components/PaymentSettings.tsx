'use client'

import { useState, useEffect } from 'react'
import { Building2, Copy, Check } from 'lucide-react'

interface EFTDetails {
  bankName: string
  accountHolder: string
  accountNumber: string
  branchCode: string
  accountType: string
  reference: string
}

export function PaymentSettings() {
  const [eftDetails, setEftDetails] = useState<EFTDetails>({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    branchCode: '',
    accountType: 'Cheque',
    reference: 'Invoice Number'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadEftDetails()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const token = localStorage.getItem('token')

      // Get current branding data first
      const currentResponse = await fetch('/api/clubs/branding', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!currentResponse.ok) {
        throw new Error('Failed to load current settings')
      }

      const currentData = await currentResponse.json()
      const currentSettings = (currentData.data.settings as any) || {}

      // Update with EFT details
      const response = await fetch('/api/clubs/branding', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings: {
            ...currentSettings,
            eftDetails
          }
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'EFT details saved successfully!' })
      } else {
        throw new Error('Failed to save EFT details')
      }
    } catch (error) {
      console.error('Error saving EFT details:', error)
      setMessage({ type: 'error', text: 'Failed to save EFT details. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading payment settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-blue-900">EFT Payment Information</h3>
          <p className="text-sm text-blue-700 mt-1">
            Configure your bank account details for EFT (Electronic Funds Transfer) payments. These details will be displayed to parents when they choose to pay via EFT.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Bank Account Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name *
            </label>
            <input
              type="text"
              value={eftDetails.bankName}
              onChange={(e) => setEftDetails({ ...eftDetails, bankName: e.target.value })}
              placeholder="e.g., First National Bank"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Holder *
            </label>
            <input
              type="text"
              value={eftDetails.accountHolder}
              onChange={(e) => setEftDetails({ ...eftDetails, accountHolder: e.target.value })}
              placeholder="e.g., ABC Gymnastics Club"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number *
            </label>
            <input
              type="text"
              value={eftDetails.accountNumber}
              onChange={(e) => setEftDetails({ ...eftDetails, accountNumber: e.target.value })}
              placeholder="e.g., 1234567890"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch Code *
            </label>
            <input
              type="text"
              value={eftDetails.branchCode}
              onChange={(e) => setEftDetails({ ...eftDetails, branchCode: e.target.value })}
              placeholder="e.g., 250655"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Type *
            </label>
            <select
              value={eftDetails.accountType}
              onChange={(e) => setEftDetails({ ...eftDetails, accountType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="Cheque">Cheque / Current</option>
              <option value="Savings">Savings</option>
              <option value="Transmission">Transmission</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Reference Instructions
            </label>
            <input
              type="text"
              value={eftDetails.reference}
              onChange={(e) => setEftDetails({ ...eftDetails, reference: e.target.value })}
              placeholder="e.g., Invoice Number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Instruction for parents on what to use as payment reference
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving || !eftDetails.bankName || !eftDetails.accountHolder || !eftDetails.accountNumber || !eftDetails.branchCode}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {saving ? 'Saving...' : 'Save EFT Details'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {eftDetails.bankName && eftDetails.accountNumber && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview (As shown to parents)</h3>
          <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-6 w-6 text-purple-600" />
              <h4 className="text-lg font-bold text-gray-900">EFT Payment Details</h4>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-sm font-medium text-gray-600">Bank:</span>
                <span className="text-sm text-gray-900">{eftDetails.bankName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-sm font-medium text-gray-600">Account Holder:</span>
                <span className="text-sm text-gray-900">{eftDetails.accountHolder}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-sm font-medium text-gray-600">Account Number:</span>
                <span className="text-sm text-gray-900 font-mono">{eftDetails.accountNumber}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-sm font-medium text-gray-600">Branch Code:</span>
                <span className="text-sm text-gray-900 font-mono">{eftDetails.branchCode}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-sm font-medium text-gray-600">Account Type:</span>
                <span className="text-sm text-gray-900">{eftDetails.accountType}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-sm font-medium text-gray-600">Reference:</span>
                <span className="text-sm text-gray-900 italic">{eftDetails.reference}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
