'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

interface CSVImportToolProps {
  onImportComplete?: (result: ImportResult) => void
}

export function CSVImportTool({ onImportComplete }: CSVImportToolProps) {
  const { token } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [overwriteExisting, setOverwriteExisting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/import/members', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'member_import_template.csv'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error('Failed to download template')
      }
    } catch (err) {
      setError('Failed to download template')
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setImporting(true)
    setProgress(0)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('overwriteExisting', overwriteExisting.toString())

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/import/members', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
        setFile(null)
        if (onImportComplete) {
          onImportComplete(data.data)
        }
      } else {
        throw new Error(data.error || 'Import failed')
      }
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const resetImport = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setProgress(0)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV Member Import
          </CardTitle>
          <CardDescription>
            Import member and financial data from a CSV file. This tool can handle historical data including balances, fees, and payment records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">Download CSV Template</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Download the CSV template with all required columns and example data to ensure proper formatting.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadTemplate}
                  className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <div className="flex items-center gap-4">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={importing}
                className="flex-1"
              />
              {file && (
                <div className="text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="overwrite"
                checked={overwriteExisting}
                onCheckedChange={(checked) => setOverwriteExisting(checked as boolean)}
                disabled={importing}
              />
              <Label htmlFor="overwrite" className="text-sm font-normal">
                Overwrite existing members with same name and parent
              </Label>
            </div>
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {result && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Import completed successfully!</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Total records: {result.total}</div>
                    <div>Created: {result.created}</div>
                    <div>Updated: {result.updated}</div>
                    <div>Skipped: {result.skipped}</div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-3">
                      <div className="font-medium text-red-600 mb-1">Errors:</div>
                      <div className="text-xs bg-red-50 border border-red-200 rounded p-2 max-h-32 overflow-y-auto">
                        {result.errors.map((error, index) => (
                          <div key={index} className="text-red-700">{error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={!file || importing}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? 'Importing...' : 'Import Data'}
            </Button>
            
            {(result || error) && (
              <Button
                variant="outline"
                onClick={resetImport}
                disabled={importing}
              >
                Import Another File
              </Button>
            )}
          </div>

          {/* Import Guidelines */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Import Guidelines</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Ensure all required fields (firstName, lastName, parentEmail, level, monthlyFee) are provided</li>
              <li>• Use the exact format shown in the template for dates (YYYY-MM-DD) and currency (R amounts)</li>
              <li>• Status values must be ACTIVE, INACTIVE, or WITHDRAWN</li>
              <li>• Gender values must be MALE or FEMALE</li>
              <li>• Existing members with the same name and parent will be skipped unless overwrite is enabled</li>
              <li>• Financial data (balances, fees) will create appropriate invoice and payment records</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}