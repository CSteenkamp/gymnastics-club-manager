'use client'

import { useState } from 'react'
import { CSVImportTool } from '@/components/import/CSVImportTool'
import { FileSpreadsheet, Users, CreditCard, Info, Download } from 'lucide-react'

interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export function ImportSettings() {
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null)

  const handleImportComplete = (result: ImportResult) => {
    setLastImportResult(result)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Data Import
        </h3>
        <p className="text-sm text-gray-600 mt-1">Import historical data and bulk member information via CSV files</p>
      </div>

      {/* Recent Import Summary */}
      {lastImportResult && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Last Import Summary</p>
              <p className="text-sm text-blue-700 mt-1">
                {lastImportResult.created} created • {lastImportResult.updated} updated • {lastImportResult.skipped} skipped
              </p>
              {lastImportResult.errors.length > 0 && (
                <p className="text-sm text-red-600 mt-1">{lastImportResult.errors.length} errors occurred</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Tools */}
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">Import Members</h4>
              </div>
              <button
                type="button"
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                onClick={() => {
                  // Download sample CSV
                  const csv = 'firstName,lastName,dateOfBirth,gender,level,monthlyFee,parentEmail,parentPhone\nJohn,Doe,2015-03-15,MALE,BEGINNER,350,john.doe@example.com,+27123456789'
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'members-sample.csv'
                  a.click()
                }}
              >
                <Download className="h-4 w-4" />
                Download Sample
              </button>
            </div>
          </div>
          <div className="p-4">
            <CSVImportTool onImportComplete={handleImportComplete} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">Import Payments</h4>
              </div>
              <button
                type="button"
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                onClick={() => {
                  // Download sample CSV
                  const csv = 'parentEmail,amount,method,date,reference\njohn.doe@example.com,350,EFT,2025-01-15,INV-001'
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'payments-sample.csv'
                  a.click()
                }}
              >
                <Download className="h-4 w-4" />
                Download Sample
              </button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Upload a CSV file with payment records. Required columns: parentEmail, amount, method, date, reference
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-500">Payment import coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Import Guidelines */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">Import Guidelines</h4>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>Ensure your CSV file is properly formatted with headers</li>
          <li>Date fields should be in YYYY-MM-DD format</li>
          <li>Email addresses must be valid and unique</li>
          <li>Phone numbers should include country code (+27 for South Africa)</li>
          <li>Large imports may take a few minutes to process</li>
          <li>Download sample templates to ensure correct format</li>
        </ul>
      </div>
    </div>
  )
}
