'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CreditCard, 
  Plus, 
  Minus,
  ArrowUpDown,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  History,
  Banknote,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface CreditAccount {
  id: string
  userId: string
  currentBalance: number
  totalCreditsAdded: number
  totalCreditsUsed: number
  isActive: boolean
  minimumBalance: number
  lastActivity?: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
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

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

export function CreditManager() {
  const { token } = useAuth()
  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedAccount, setSelectedAccount] = useState<CreditAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showAddCredit, setShowAddCredit] = useState(false)
  const [showApplyCredit, setShowApplyCredit] = useState(false)

  const [addCreditForm, setAddCreditForm] = useState({
    userId: '',
    amount: '',
    description: '',
    source: 'MANUAL_ADDITION' as const,
    reference: '',
    notes: ''
  })

  const [applyCreditForm, setApplyCreditForm] = useState({
    userId: '',
    invoiceId: '',
    amount: '',
    description: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadCreditAccounts(),
        loadUsers()
      ])
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadCreditAccounts = async () => {
    try {
      // For admin view, we need to get all credit accounts
      // This would require a new API endpoint for admin overview
      const response = await fetch('/api/credits?includeTransactions=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setCreditAccounts(Array.isArray(data.data) ? data.data : [data.data])
      } else {
        setError(data.error || 'Failed to load credit accounts')
      }
    } catch (err) {
      setError('Failed to load credit accounts')
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setUsers(data.data.filter((user: User) => user.id !== 'current_user'))
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!addCreditForm.userId || !addCreditForm.amount || !addCreditForm.description) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'add_credit',
          ...addCreditForm,
          amount: parseFloat(addCreditForm.amount)
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage(data.message || 'Credit added successfully')
        setAddCreditForm({
          userId: '',
          amount: '',
          description: '',
          source: 'MANUAL_ADDITION',
          reference: '',
          notes: ''
        })
        setShowAddCredit(false)
        loadCreditAccounts()
      } else {
        setError(data.error || 'Failed to add credit')
      }
    } catch (err) {
      setError('Failed to add credit')
    }
  }

  const handleApplyCredit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!applyCreditForm.userId || !applyCreditForm.invoiceId || !applyCreditForm.amount) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'apply_credit',
          ...applyCreditForm,
          amount: parseFloat(applyCreditForm.amount)
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage(data.message || 'Credit applied successfully')
        setApplyCreditForm({
          userId: '',
          invoiceId: '',
          amount: '',
          description: ''
        })
        setShowApplyCredit(false)
        loadCreditAccounts()
      } else {
        setError(data.error || 'Failed to apply credit')
      }
    } catch (err) {
      setError('Failed to apply credit')
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
        return <RefreshCw className="h-4 w-4 text-blue-600" />
      case 'CREDIT_REVERSED':
        return <ArrowUpDown className="h-4 w-4 text-orange-600" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading credit management...</div>
      </div>
    )
  }

  // Calculate statistics
  const totalBalance = creditAccounts.reduce((sum, account) => sum + Number(account.currentBalance), 0)
  const totalCreditsAdded = creditAccounts.reduce((sum, account) => sum + Number(account.totalCreditsAdded), 0)
  const totalCreditsUsed = creditAccounts.reduce((sum, account) => sum + Number(account.totalCreditsUsed), 0)
  const activeAccounts = creditAccounts.filter(account => account.isActive).length

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

      {/* Credit Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Credit Management
              </CardTitle>
              <CardDescription>
                Manage prepayments, credits, and overpayments
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowAddCredit(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Credit
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowApplyCredit(true)}
                className="flex items-center gap-2"
              >
                <Minus className="h-4 w-4" />
                Apply Credit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Credit Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600">Total Balance</p>
                  <p className="text-xl font-bold text-blue-800">{formatCurrency(totalBalance)}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Credits Added</p>
                  <p className="text-xl font-bold text-green-800">{formatCurrency(totalCreditsAdded)}</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-red-600">Credits Used</p>
                  <p className="text-xl font-bold text-red-800">{formatCurrency(totalCreditsUsed)}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600">Active Accounts</p>
                  <p className="text-xl font-bold text-purple-800">{activeAccounts}</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="accounts">
            <TabsList>
              <TabsTrigger value="accounts">Credit Accounts</TabsTrigger>
              <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="accounts" className="space-y-4">
              {creditAccounts.map((account) => (
                <Card key={account.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {account.user.firstName} {account.user.lastName}
                          </h3>
                          <Badge className={account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Balance: {formatCurrency(Number(account.currentBalance))}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span>Added: {formatCurrency(Number(account.totalCreditsAdded))}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            <span>Used: {formatCurrency(Number(account.totalCreditsUsed))}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>
                              Last: {account.lastActivity 
                                ? new Date(account.lastActivity).toLocaleDateString()
                                : 'Never'
                              }
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-sm text-gray-600">
                          <span>{account.user.email}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAccount(account)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {creditAccounts.length === 0 && (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No credit accounts found</h3>
                  <p className="text-gray-500 mb-4">Credit accounts are created automatically when credits are added</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              {creditAccounts.flatMap(account => 
                (account.transactions || []).map(transaction => (
                  <Card key={transaction.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-gray-600">
                              {account.user.firstName} {account.user.lastName}
                            </p>
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
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <Badge className={getSourceBadgeColor(transaction.source)}>
                          {transaction.source.replace('_', ' ')}
                        </Badge>
                        <span className="text-gray-500">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </span>
                        {transaction.isReversed && (
                          <Badge className="bg-red-100 text-red-800">
                            Reversed
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Credit Modal */}
      {showAddCredit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Credit</CardTitle>
              <CardDescription>Add credit to a user's account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCredit} className="space-y-4">
                <div>
                  <Label htmlFor="userId">User *</Label>
                  <select
                    id="userId"
                    value={addCreditForm.userId}
                    onChange={(e) => setAddCreditForm({...addCreditForm, userId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={addCreditForm.amount}
                    onChange={(e) => setAddCreditForm({...addCreditForm, amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={addCreditForm.description}
                    onChange={(e) => setAddCreditForm({...addCreditForm, description: e.target.value})}
                    placeholder="Reason for adding credit"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="source">Source</Label>
                  <select
                    id="source"
                    value={addCreditForm.source}
                    onChange={(e) => setAddCreditForm({...addCreditForm, source: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="MANUAL_ADDITION">Manual Addition</option>
                    <option value="REFUND">Refund</option>
                    <option value="PROMOTION">Promotion</option>
                    <option value="SYSTEM_ADJUSTMENT">System Adjustment</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    value={addCreditForm.reference}
                    onChange={(e) => setAddCreditForm({...addCreditForm, reference: e.target.value})}
                    placeholder="Optional reference"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddCredit(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Add Credit</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Apply Credit Modal */}
      {showApplyCredit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Apply Credit</CardTitle>
              <CardDescription>Apply credit to an outstanding invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleApplyCredit} className="space-y-4">
                <div>
                  <Label htmlFor="applyUserId">User *</Label>
                  <select
                    id="applyUserId"
                    value={applyCreditForm.userId}
                    onChange={(e) => setApplyCreditForm({...applyCreditForm, userId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="invoiceId">Invoice ID *</Label>
                  <Input
                    id="invoiceId"
                    value={applyCreditForm.invoiceId}
                    onChange={(e) => setApplyCreditForm({...applyCreditForm, invoiceId: e.target.value})}
                    placeholder="Invoice ID"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="applyAmount">Amount *</Label>
                  <Input
                    id="applyAmount"
                    type="number"
                    step="0.01"
                    value={applyCreditForm.amount}
                    onChange={(e) => setApplyCreditForm({...applyCreditForm, amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="applyDescription">Description</Label>
                  <Input
                    id="applyDescription"
                    value={applyCreditForm.description}
                    onChange={(e) => setApplyCreditForm({...applyCreditForm, description: e.target.value})}
                    placeholder="Optional description"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowApplyCredit(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Apply Credit</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}