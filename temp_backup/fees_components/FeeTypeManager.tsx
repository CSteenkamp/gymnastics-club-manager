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
  Plus, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Users, 
  Settings,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface FeeType {
  id: string
  name: string
  code: string
  category: string
  amount: number
  frequency: string
  description?: string
  isOptional: boolean
  isActive: boolean
  applicableLevels: string[]
  ageRestrictions?: {
    minAge?: number
    maxAge?: number
  }
  dateRestrictions?: {
    validFrom?: string
    validTo?: string
  }
  autoApply: boolean
  discounts: unknown[]
  _count: {
    discounts: number
  }
}

interface FeeTypeManagerProps {
  onFeeTypeChange?: () => void
}

export function FeeTypeManager({ onFeeTypeChange }: FeeTypeManagerProps) {
  const { token } = useAuth()
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingFeeType, setEditingFeeType] = useState<FeeType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'REGISTRATION',
    amount: '',
    frequency: 'ONE_TIME',
    description: '',
    isOptional: false,
    applicableLevels: [] as string[],
    autoApply: false
  })

  const categories = [
    { value: 'all', label: 'All Categories', count: feeTypes.length },
    { value: 'MONTHLY_FEE', label: 'Monthly Fees', count: feeTypes.filter(f => f.category === 'MONTHLY_FEE').length },
    { value: 'REGISTRATION', label: 'Registration', count: feeTypes.filter(f => f.category === 'REGISTRATION').length },
    { value: 'EQUIPMENT', label: 'Equipment', count: feeTypes.filter(f => f.category === 'EQUIPMENT').length },
    { value: 'COMPETITION', label: 'Competition', count: feeTypes.filter(f => f.category === 'COMPETITION').length },
    { value: 'OTHER', label: 'Other', count: feeTypes.filter(f => ['CLOTHING', 'TRAVEL', 'ASSESSMENT', 'COACHING', 'ADMINISTRATION', 'INSURANCE', 'FACILITY', 'OTHER'].includes(f.category)).length }
  ]

  const levels = ['RR', 'R', 'Pre-Level 1', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']

  useEffect(() => {
    loadFeeTypes()
  }, [])

  const loadFeeTypes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/fee-types?includeInactive=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setFeeTypes(data.data)
      } else {
        setError(data.error || 'Failed to load fee types')
      }
    } catch (err) {
      setError('Failed to load fee types')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const url = editingFeeType ? `/api/fee-types/${editingFeeType.id}` : '/api/fee-types'
      const method = editingFeeType ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage(editingFeeType ? 'Fee type updated successfully!' : 'Fee type created successfully!')
        resetForm()
        loadFeeTypes()
        if (onFeeTypeChange) onFeeTypeChange()
      } else {
        setError(data.error || 'Operation failed')
      }
    } catch (err) {
      setError('Operation failed')
    }
  }

  const handleEdit = (feeType: FeeType) => {
    setFormData({
      name: feeType.name,
      code: feeType.code,
      category: feeType.category,
      amount: feeType.amount.toString(),
      frequency: feeType.frequency,
      description: feeType.description || '',
      isOptional: feeType.isOptional,
      applicableLevels: feeType.applicableLevels,
      autoApply: feeType.autoApply
    })
    setEditingFeeType(feeType)
    setShowCreateForm(true)
  }

  const handleDelete = async (feeType: FeeType) => {
    if (!confirm(`Are you sure you want to deactivate "${feeType.name}"?`)) return

    try {
      const response = await fetch(`/api/fee-types/${feeType.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage('Fee type deactivated successfully!')
        loadFeeTypes()
        if (onFeeTypeChange) onFeeTypeChange()
      } else {
        setError(data.error || 'Failed to deactivate fee type')
      }
    } catch (err) {
      setError('Failed to deactivate fee type')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      category: 'REGISTRATION',
      amount: '',
      frequency: 'ONE_TIME',
      description: '',
      isOptional: false,
      applicableLevels: [],
      autoApply: false
    })
    setEditingFeeType(null)
    setShowCreateForm(false)
  }

  const getCategoryBadgeColor = (category: string) => {
    const colors = {
      MONTHLY_FEE: 'bg-blue-100 text-blue-800',
      REGISTRATION: 'bg-green-100 text-green-800',
      EQUIPMENT: 'bg-orange-100 text-orange-800',
      COMPETITION: 'bg-purple-100 text-purple-800',
      default: 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || colors.default
  }

  const getFrequencyBadge = (frequency: string) => {
    const frequencyLabels = {
      ONE_TIME: 'One-time',
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      ANNUAL: 'Annual',
      PER_SESSION: 'Per Session',
      PER_COMPETITION: 'Per Competition',
      PER_TERM: 'Per Term'
    }
    return frequencyLabels[frequency as keyof typeof frequencyLabels] || frequency
  }

  const filteredFeeTypes = activeCategory === 'all' 
    ? feeTypes 
    : feeTypes.filter(ft => {
        if (activeCategory === 'OTHER') {
          return ['CLOTHING', 'TRAVEL', 'ASSESSMENT', 'COACHING', 'ADMINISTRATION', 'INSURANCE', 'FACILITY', 'OTHER'].includes(ft.category)
        }
        return ft.category === activeCategory
      })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading fee types...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <div className="flex justify-between items-center">
          <TabsList className="grid w-full grid-cols-6">
            {categories.map((category) => (
              <TabsTrigger key={category.value} value={category.value} className="flex items-center gap-2">
                {category.label}
                <Badge variant="outline" className="text-xs">
                  {category.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Fee Type
          </Button>
        </div>

        <TabsContent value={activeCategory} className="mt-6">
          <div className="grid gap-4">
            {filteredFeeTypes.map((feeType) => (
              <Card key={feeType.id} className={!feeType.isActive ? 'opacity-60' : ''}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{feeType.name}</h3>
                        <Badge className={getCategoryBadgeColor(feeType.category)}>
                          {feeType.category.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {getFrequencyBadge(feeType.frequency)}
                        </Badge>
                        {!feeType.isActive && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          R{feeType.amount.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Settings className="h-4 w-4" />
                          Code: {feeType.code}
                        </div>
                        {feeType._count.discounts > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {feeType._count.discounts} discount(s)
                          </div>
                        )}
                      </div>

                      {feeType.description && (
                        <p className="text-sm text-gray-600 mb-2">{feeType.description}</p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {feeType.isOptional && (
                          <Badge variant="outline">Optional</Badge>
                        )}
                        {feeType.autoApply && (
                          <Badge variant="outline">Auto-apply</Badge>
                        )}
                        {feeType.applicableLevels.length > 0 && (
                          <Badge variant="outline">
                            Levels: {feeType.applicableLevels.join(', ')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(feeType)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(feeType)}
                        disabled={!feeType.isActive}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingFeeType ? 'Edit Fee Type' : 'Create New Fee Type'}
              </CardTitle>
              <CardDescription>
                {editingFeeType ? 'Update the fee type details' : 'Add a new fee type to your club'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      placeholder="e.g., SAGF_REG"
                      required
                      disabled={!!editingFeeType}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="MONTHLY_FEE">Monthly Fee</option>
                      <option value="REGISTRATION">Registration</option>
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="CLOTHING">Clothing</option>
                      <option value="COMPETITION">Competition</option>
                      <option value="TRAVEL">Travel</option>
                      <option value="ASSESSMENT">Assessment</option>
                      <option value="COACHING">Coaching</option>
                      <option value="ADMINISTRATION">Administration</option>
                      <option value="INSURANCE">Insurance</option>
                      <option value="FACILITY">Facility</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="frequency">Frequency *</Label>
                    <select
                      id="frequency"
                      value={formData.frequency}
                      onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="ONE_TIME">One-time</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="ANNUAL">Annual</option>
                      <option value="PER_SESSION">Per Session</option>
                      <option value="PER_COMPETITION">Per Competition</option>
                      <option value="PER_TERM">Per Term</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="amount">Amount (R) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isOptional}
                      onChange={(e) => setFormData({...formData, isOptional: e.target.checked})}
                    />
                    Optional fee
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.autoApply}
                      onChange={(e) => setFormData({...formData, autoApply: e.target.checked})}
                    />
                    Auto-apply to new members
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingFeeType ? 'Update' : 'Create'} Fee Type
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}