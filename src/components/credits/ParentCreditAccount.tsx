'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  Info,
  Download,
  Eye
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface CreditAccount {
  id: string
  currentBalance: number
  totalCreditsAdded: number
  totalCreditsUsed: number
  isActive: boolean
  minimumBalance: number
  lastActivity?: string
  transactions?: CreditTransaction[]
}

interface CreditTransaction {
  id: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  reference?: string
  source: string
  createdAt: string
  isReversed: boolean
  invoice?: {
    id: string
    invoiceNumber: string
    total: number
  }
  payment?: {
    id: string
    amount: number
    reference: string
  }
}

export function ParentCreditAccount() {
  const { token } = useAuth()
  const [creditAccount, setCreditAccount] = useState<CreditAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  useEffect(() => {
    loadCreditAccount()
  }, [])

  const loadCreditAccount = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/credits?includeTransactions=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setCreditAccount(data.data)
      } else {
        setError(data.error || 'Failed to load credit account')
      }
    } catch (err) {
      setError('Failed to load credit account')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'CREDIT_ADDED':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'CREDIT_USED':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'CREDIT_REFUNDED':
        return <DollarSign className="h-4 w-4 text-blue-600" />
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionDescription = (transaction: CreditTransaction) => {
    switch (transaction.type) {
      case 'CREDIT_ADDED':
        return `Credit Added: ${transaction.description}`
      case 'CREDIT_USED':
        return `Credit Applied: ${transaction.description}`
      case 'CREDIT_REFUNDED':
        return `Credit Refunded: ${transaction.description}`
      default:
        return transaction.description
    }
  }

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'PAYMENT_OVERPAYMENT':
        return 'bg-blue-100 text-blue-800'
      case 'MANUAL_ADDITION':
        return 'bg-green-100 text-green-800'
      case 'REFUND':
        return 'bg-purple-100 text-purple-800'
      case 'PROMOTION':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const displayedTransactions = showAllTransactions 
    ? creditAccount?.transactions || []
    : (creditAccount?.transactions || []).slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading credit account...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!creditAccount) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Account
          </CardTitle>
          <CardDescription>
            Your prepayment and credit balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No credit account found</h3>
            <p className="text-gray-500">Your credit account will be created when you make your first prepayment</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasLowBalance = Number(creditAccount.currentBalance) <= Number(creditAccount.minimumBalance)
  const hasPositiveBalance = Number(creditAccount.currentBalance) > 0

  return (
    <div className="space-y-6">
      {/* Credit Balance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Account
          </CardTitle>
          <CardDescription>
            Your prepayment and credit balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Balance Alert */}
          {hasLowBalance && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your credit balance is low. Consider adding credit to avoid payment delays.
              </AlertDescription>
            </Alert>
          )}

          {/* Balance Display */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-50 rounded-full mb-4">
              <CreditCard className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(Number(creditAccount.currentBalance))}
            </h2>
            <p className="text-gray-600">Available Credit Balance</p>
            {!creditAccount.isActive && (
              <Badge className="mt-2 bg-yellow-100 text-yellow-800">
                Account Inactive
              </Badge>
            )}
          </div>

          {/* Credit Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm text-green-600">Total Credits Added</p>
              <p className="text-lg font-bold text-green-800">
                {formatCurrency(Number(creditAccount.totalCreditsAdded))}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <TrendingDown className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <p className="text-sm text-red-600">Total Credits Used</p>
              <p className="text-lg font-bold text-red-800">
                {formatCurrency(Number(creditAccount.totalCreditsUsed))}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-blue-600">Last Activity</p>
              <p className="text-lg font-bold text-blue-800">
                {creditAccount.lastActivity 
                  ? new Date(creditAccount.lastActivity).toLocaleDateString()
                  : 'Never'
                }
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          {hasPositiveBalance && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Available Actions</h3>
              <p className="text-sm text-gray-600 mb-3">
                Your credit balance can be automatically applied to future invoices or used for immediate payments.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Statement
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Usage History
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Recent credit activities on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayedTransactions.length > 0 ? (
            <div className="space-y-4">
              {displayedTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="font-medium">{getTransactionDescription(transaction)}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                        <Badge className={getSourceBadgeColor(transaction.source)}>
                          {transaction.source.replace('_', ' ')}
                        </Badge>
                        {transaction.isReversed && (
                          <Badge className="bg-red-100 text-red-800">
                            Reversed
                          </Badge>
                        )}
                      </div>
                      {transaction.reference && (
                        <p className="text-xs text-gray-500 mt-1">
                          Ref: {transaction.reference}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.type === 'CREDIT_ADDED' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'CREDIT_ADDED' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                    </p>
                    <p className="text-sm text-gray-500">
                      Balance: {formatCurrency(Number(transaction.balanceAfter))}
                    </p>
                  </div>
                </div>
              ))}

              {!showAllTransactions && (creditAccount.transactions?.length || 0) > 5 && (
                <div className="text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAllTransactions(true)}
                  >
                    Show All Transactions ({creditAccount.transactions?.length || 0})
                  </Button>
                </div>
              )}

              {showAllTransactions && (
                <div className="text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAllTransactions(false)}
                  >
                    Show Less
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-500">Your credit transactions will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Information */}
      <Card>
        <CardHeader>
          <CardTitle>How Credits Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Adding Credits</h4>
                <p className="text-gray-600">
                  Credits are added when you make overpayments, receive refunds, or when administrators add promotional credits to your account.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <TrendingDown className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Using Credits</h4>
                <p className="text-gray-600">
                  Credits are automatically applied to new invoices or can be manually applied by administrators to outstanding balances.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Credit Expiry</h4>
                <p className="text-gray-600">
                  Credits do not expire and will remain in your account until used or refunded upon request.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}