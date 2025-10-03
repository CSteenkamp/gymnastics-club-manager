'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  RefreshCw,
  CreditCard,
  FileText,
  ArrowRight
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface Overpayment {
  id: string
  amount: number
  overpaymentAmount: number
  reference?: string
  status: string
  method: string
  createdAt: string
  invoice: {
    id: string
    invoiceNumber: string
    total: number
    status: string
  }
  parent: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export function OverpaymentManager() {
  const { token } = useAuth()
  const [overpayments, setOverpayments] = useState<Overpayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadOverpayments()
  }, [])

  const loadOverpayments = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/credits/overpayments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setOverpayments(data.data)
      } else {
        setError(data.error || 'Failed to load overpayments')
      }
    } catch (err) {
      setError('Failed to load overpayments')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessOverpayment = async (
    paymentId: string, 
    action: 'convert_to_credit' | 'refund' | 'apply_to_next_invoice',
    notes?: string
  ) => {
    setProcessingId(paymentId)
    setError(null)

    try {
      const response = await fetch('/api/credits/overpayments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId,
          action,
          notes
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage(data.message || 'Overpayment processed successfully')
        loadOverpayments() // Reload to update the list
      } else {
        setError(data.error || 'Failed to process overpayment')
      }
    } catch (err) {
      setError('Failed to process overpayment')
    } finally {
      setProcessingId(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const getActionButtonLabel = (action: string) => {
    switch (action) {
      case 'convert_to_credit':
        return 'Convert to Credit'
      case 'refund':
        return 'Process Refund'
      case 'apply_to_next_invoice':
        return 'Apply to Next Invoice'
      default:
        return action
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'convert_to_credit':
        return <CreditCard className="h-4 w-4" />
      case 'refund':
        return <RefreshCw className="h-4 w-4" />
      case 'apply_to_next_invoice':
        return <FileText className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading overpayments...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Overpayment Management
          </CardTitle>
          <CardDescription>
            Process payments that exceed invoice amounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overpayments.length > 0 ? (
            <div className="space-y-4">
              {overpayments.map((overpayment) => (
                <Card key={overpayment.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {overpayment.parent.firstName} {overpayment.parent.lastName}
                          </h3>
                          <Badge className="bg-orange-100 text-orange-800">
                            Overpayment
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">Payment Amount:</span>
                            <p className="font-medium">{formatCurrency(overpayment.amount)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Invoice Total:</span>
                            <p className="font-medium">{formatCurrency(overpayment.invoice.total)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Overpayment:</span>
                            <p className="font-bold text-orange-600">
                              {formatCurrency(overpayment.overpaymentAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment Method:</span>
                            <p className="font-medium">{overpayment.method}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span>Invoice: {overpayment.invoice.invoiceNumber}</span>
                          <span>•</span>
                          <span>Payment: {overpayment.reference || overpayment.id}</span>
                          <span>•</span>
                          <span>{new Date(overpayment.createdAt).toLocaleDateString()}</span>
                        </div>

                        <div className="text-sm text-gray-600">
                          <span>{overpayment.parent.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleProcessOverpayment(overpayment.id, 'convert_to_credit')}
                          disabled={processingId === overpayment.id}
                          className="flex items-center gap-2"
                        >
                          {getActionIcon('convert_to_credit')}
                          {processingId === overpayment.id ? 'Processing...' : 'Convert to Credit'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessOverpayment(overpayment.id, 'apply_to_next_invoice')}
                          disabled={processingId === overpayment.id}
                          className="flex items-center gap-2"
                        >
                          {getActionIcon('apply_to_next_invoice')}
                          Apply to Next Invoice
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessOverpayment(overpayment.id, 'refund')}
                          disabled={processingId === overpayment.id}
                          className="flex items-center gap-2"
                        >
                          {getActionIcon('refund')}
                          Process Refund
                        </Button>
                      </div>

                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Processing Options:</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-3 w-3" />
                            <span><strong>Convert to Credit:</strong> Add overpayment to user's credit account</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            <span><strong>Apply to Next Invoice:</strong> Use overpayment for next pending invoice</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-3 w-3" />
                            <span><strong>Process Refund:</strong> Create refund record for the overpayment</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No overpayments found</h3>
              <p className="text-gray-500">All payments are properly reconciled</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      {overpayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overpayment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-orange-600">Total Overpayments</p>
                    <p className="text-xl font-bold text-orange-800">{overpayments.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-red-600">Total Amount</p>
                    <p className="text-xl font-bold text-red-800">
                      {formatCurrency(overpayments.reduce((sum, op) => sum + op.overpaymentAmount, 0))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600">Avg Overpayment</p>
                    <p className="text-xl font-bold text-blue-800">
                      {formatCurrency(overpayments.reduce((sum, op) => sum + op.overpaymentAmount, 0) / overpayments.length)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}