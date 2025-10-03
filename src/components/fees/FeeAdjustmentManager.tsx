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
  DollarSign, 
  Plus, 
  Edit2, 
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface FeeAdjustment {
  id: string
  adjustmentType: 'PERMANENT' | 'TEMPORARY'
  originalFee: number
  adjustedFee: number
  reason: string
  effectiveMonth: number
  effectiveYear: number
  expiryMonth?: number
  expiryYear?: number
  isActive: boolean
  appliedAt: string
  notes?: string
  child: {
    id: string
    firstName: string
    lastName: string
    level: string
    monthlyFee?: number
  }
}

interface Child {
  id: string
  firstName: string
  lastName: string
  level: string
  monthlyFee?: number
  status: string
}

export function FeeAdjustmentManager() {
  const { token } = useAuth()
  const [adjustments, setAdjustments] = useState<FeeAdjustment[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [formData, setFormData] = useState({
    childId: '',
    adjustmentType: 'PERMANENT' as 'PERMANENT' | 'TEMPORARY',
    adjustedFee: '',
    reason: '',
    effectiveMonth: new Date().getMonth() + 1,
    effectiveYear: new Date().getFullYear(),
    expiryMonth: new Date().getMonth() + 2,
    expiryYear: new Date().getFullYear(),
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadAdjustments(),
        loadChildren()
      ])
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadAdjustments = async () => {
    try {
      const response = await fetch('/api/fees/adjustments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setAdjustments(data.data.adjustments)
      } else {
        setError(data.error || 'Failed to load fee adjustments')
      }
    } catch {
      setError('Failed to load fee adjustments')
    }
  }

  const loadChildren = async () => {
    try {
      const response = await fetch('/api/children', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setChildren(data.data.filter((child: Child) => child.status === 'ACTIVE'))
      }
    } catch (err) {
      console.error('Failed to load children:', err)
    }
  }

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.childId || !formData.adjustedFee || !formData.reason) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/fees/adjustments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          adjustedFee: parseFloat(formData.adjustedFee)
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage(data.message || 'Fee adjustment created successfully')
        setFormData({
          childId: '',
          adjustmentType: 'PERMANENT',
          adjustedFee: '',
          reason: '',
          effectiveMonth: new Date().getMonth() + 1,
          effectiveYear: new Date().getFullYear(),
          expiryMonth: new Date().getMonth() + 2,
          expiryYear: new Date().getFullYear(),
          notes: ''
        })
        setShowCreateForm(false)
        loadAdjustments()
      } else {
        setError(data.error || 'Failed to create fee adjustment')
      }
    } catch {
      setError('Failed to create fee adjustment')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }


  const getAdjustmentBadgeColor = (type: string) => {
    switch (type) {
      case 'PERMANENT':
        return 'bg-blue-100 text-blue-800'
      case 'TEMPORARY':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isExpired = (adjustment: FeeAdjustment) => {
    if (adjustment.adjustmentType !== 'TEMPORARY' || !adjustment.expiryMonth || !adjustment.expiryYear) {
      return false
    }
    
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    
    return adjustment.expiryYear < currentYear || 
           (adjustment.expiryYear === currentYear && adjustment.expiryMonth < currentMonth)
  }

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months[month - 1]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading fee adjustments...</div>
      </div>
    )
  }

  // Calculate statistics
  const activeAdjustments = adjustments.filter(adj => adj.isActive && !isExpired(adj))
  const permanentAdjustments = activeAdjustments.filter(adj => adj.adjustmentType === 'PERMANENT')
  const temporaryAdjustments = activeAdjustments.filter(adj => adj.adjustmentType === 'TEMPORARY')
  const totalSavings = activeAdjustments.reduce((sum, adj) => sum + (adj.originalFee - adj.adjustedFee), 0)

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

      {/* Fee Adjustment Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fee Adjustment Management
              </CardTitle>
              <CardDescription>
                Manage individual monthly fee adjustments for members
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Adjustment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600">Active Adjustments</p>
                  <p className="text-xl font-bold text-blue-800">{activeAdjustments.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600">Permanent Changes</p>
                  <p className="text-xl font-bold text-purple-800">{permanentAdjustments.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600">Temporary Adjustments</p>
                  <p className="text-xl font-bold text-orange-800">{temporaryAdjustments.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Monthly Savings</p>
                  <p className="text-xl font-bold text-green-800">{formatCurrency(totalSavings)}</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Active Adjustments</TabsTrigger>
              <TabsTrigger value="all">All Adjustments</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeAdjustments.map((adjustment) => (
                <Card key={adjustment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {adjustment.child.firstName} {adjustment.child.lastName}
                          </h3>
                          <Badge className={getAdjustmentBadgeColor(adjustment.adjustmentType)}>
                            {adjustment.adjustmentType}
                          </Badge>
                          {isExpired(adjustment) && (
                            <Badge className="bg-red-100 text-red-800">
                              Expired
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span>
                              <span className="line-through text-gray-500">{formatCurrency(adjustment.originalFee)}</span>
                              {' → '}
                              <span className="font-medium text-green-600">{formatCurrency(adjustment.adjustedFee)}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span>From {getMonthName(adjustment.effectiveMonth)} {adjustment.effectiveYear}</span>
                          </div>
                          {adjustment.adjustmentType === 'TEMPORARY' && adjustment.expiryMonth && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-500" />
                              <span>Until {getMonthName(adjustment.expiryMonth)} {adjustment.expiryYear}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span>{adjustment.child.level}</span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Reason:</strong> {adjustment.reason}
                        </div>

                        {adjustment.notes && (
                          <div className="text-sm text-gray-600">
                            <strong>Notes:</strong> {adjustment.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // TODO: Implement edit functionality
                            console.log('Edit adjustment:', adjustment.id)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {activeAdjustments.length === 0 && (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active adjustments</h3>
                  <p className="text-gray-500 mb-4">Create fee adjustments to manage individual monthly fees</p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Adjustment
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {adjustments.map((adjustment) => (
                <Card key={adjustment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {adjustment.child.firstName} {adjustment.child.lastName}
                          </h3>
                          <Badge className={getAdjustmentBadgeColor(adjustment.adjustmentType)}>
                            {adjustment.adjustmentType}
                          </Badge>
                          {!adjustment.isActive && (
                            <Badge className="bg-gray-100 text-gray-800">
                              Inactive
                            </Badge>
                          )}
                          {isExpired(adjustment) && (
                            <Badge className="bg-red-100 text-red-800">
                              Expired
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span>
                              <span className="line-through text-gray-500">{formatCurrency(adjustment.originalFee)}</span>
                              {' → '}
                              <span className="font-medium text-green-600">{formatCurrency(adjustment.adjustedFee)}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span>From {getMonthName(adjustment.effectiveMonth)} {adjustment.effectiveYear}</span>
                          </div>
                          {adjustment.adjustmentType === 'TEMPORARY' && adjustment.expiryMonth && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-orange-500" />
                              <span>Until {getMonthName(adjustment.expiryMonth)} {adjustment.expiryYear}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            <span>{adjustment.child.level}</span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Reason:</strong> {adjustment.reason}
                        </div>

                        <div className="text-xs text-gray-500">
                          Applied: {new Date(adjustment.appliedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Adjustment Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create Fee Adjustment</CardTitle>
              <CardDescription>Adjust a member&apos;s monthly fee</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAdjustment} className="space-y-4">
                <div>
                  <Label htmlFor="childId">Member *</Label>
                  <select
                    id="childId"
                    value={formData.childId}
                    onChange={(e) => setFormData({...formData, childId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select member...</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.firstName} {child.lastName} ({child.level})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="adjustmentType">Adjustment Type *</Label>
                  <select
                    id="adjustmentType"
                    value={formData.adjustmentType}
                    onChange={(e) => setFormData({...formData, adjustmentType: e.target.value as 'PERMANENT' | 'TEMPORARY'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="PERMANENT">Permanent Change</option>
                    <option value="TEMPORARY">Temporary Adjustment</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="adjustedFee">New Monthly Fee *</Label>
                  <Input
                    id="adjustedFee"
                    type="number"
                    step="0.01"
                    value={formData.adjustedFee}
                    onChange={(e) => setFormData({...formData, adjustedFee: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    placeholder="e.g., Reduced to 1x per week, Financial hardship"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="effectiveMonth">Effective Month *</Label>
                    <select
                      id="effectiveMonth"
                      value={formData.effectiveMonth}
                      onChange={(e) => setFormData({...formData, effectiveMonth: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      {Array.from({length: 12}, (_, i) => {
                        const month = i + 1
                        const monthName = new Date(2024, i).toLocaleString('default', { month: 'long' })
                        return (
                          <option key={month} value={month}>{monthName}</option>
                        )
                      })}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="effectiveYear">Effective Year *</Label>
                    <Input
                      id="effectiveYear"
                      type="number"
                      value={formData.effectiveYear}
                      onChange={(e) => setFormData({...formData, effectiveYear: parseInt(e.target.value)})}
                      min="2020"
                      max="2030"
                      required
                    />
                  </div>
                </div>

                {formData.adjustmentType === 'TEMPORARY' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryMonth">Expiry Month *</Label>
                      <select
                        id="expiryMonth"
                        value={formData.expiryMonth}
                        onChange={(e) => setFormData({...formData, expiryMonth: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      >
                        {Array.from({length: 12}, (_, i) => {
                          const month = i + 1
                          const monthName = new Date(2024, i).toLocaleString('default', { month: 'long' })
                          return (
                            <option key={month} value={month}>{monthName}</option>
                          )
                        })}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="expiryYear">Expiry Year *</Label>
                      <Input
                        id="expiryYear"
                        type="number"
                        value={formData.expiryYear}
                        onChange={(e) => setFormData({...formData, expiryYear: parseInt(e.target.value)})}
                        min="2020"
                        max="2030"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Adjustment</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}