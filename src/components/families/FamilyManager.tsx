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
  Users, 
  Plus, 
  Edit2, 
  UserPlus, 
  UserMinus, 
  DollarSign,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Family as FamilyIcon,
  Settings
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface Child {
  id: string
  firstName: string
  lastName: string
  level: string
  status: string
  monthlyFee: number
  joinDate: string
}

interface Family {
  id: string
  familyName: string
  primaryContact?: string
  isActive: boolean
  registrationDate: string
  children: Child[]
  primaryParent?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  statistics: {
    totalChildren: number
    activeChildren: number
    totalMonthlyFees: number
    averageFeePerChild: number
  }
  communicationPreferences?: {
    email?: boolean
    sms?: boolean
    phone?: boolean
    preferredTime?: string
  }
  emergencyContacts?: Array<{
    name: string
    relationship: string
    phone: string
    email?: string
  }>
  notes?: string
}

export function FamilyManager() {
  const { token } = useAuth()
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showFamilyDetails, setShowFamilyDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    familyName: '',
    notes: ''
  })

  useEffect(() => {
    loadFamilies()
  }, [])

  const loadFamilies = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/families?includeMemberCount=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setFamilies(data.data)
      } else {
        setError(data.error || 'Failed to load families')
      }
    } catch (err) {
      setError('Failed to load families')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const response = await fetch('/api/families', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage('Family created successfully!')
        setFormData({ familyName: '', notes: '' })
        setShowCreateForm(false)
        loadFamilies()
      } else {
        setError(data.error || 'Failed to create family')
      }
    } catch (err) {
      setError('Failed to create family')
    }
  }

  const handleViewFamily = async (family: Family) => {
    try {
      const response = await fetch(`/api/families/${family.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        setSelectedFamily(data.data)
        setShowFamilyDetails(true)
      } else {
        setError(data.error || 'Failed to load family details')
      }
    } catch (err) {
      setError('Failed to load family details')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'INACTIVE':
        return 'bg-yellow-100 text-yellow-800'
      case 'WITHDRAWN':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading families...</div>
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

      {/* Family Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FamilyIcon className="h-5 w-5" />
                Family Management
              </CardTitle>
              <CardDescription>
                Manage family groups and member relationships
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Family
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Family Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <FamilyIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600">Total Families</p>
                  <p className="text-xl font-bold text-blue-800">{families.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Total Members</p>
                  <p className="text-xl font-bold text-green-800">
                    {families.reduce((sum, family) => sum + family.statistics.totalChildren, 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600">Monthly Revenue</p>
                  <p className="text-xl font-bold text-purple-800">
                    {formatCurrency(families.reduce((sum, family) => sum + family.statistics.totalMonthlyFees, 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600">Avg Family Size</p>
                  <p className="text-xl font-bold text-orange-800">
                    {families.length > 0 
                      ? (families.reduce((sum, family) => sum + family.statistics.totalChildren, 0) / families.length).toFixed(1)
                      : '0'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Families List */}
          <div className="space-y-4">
            {families.map((family) => (
              <Card key={family.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{family.familyName}</h3>
                        <Badge className={family.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {family.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{family.statistics.totalChildren} children</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{family.statistics.activeChildren} active</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-purple-500" />
                          <span>{formatCurrency(family.statistics.totalMonthlyFees)}/month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span>Since {new Date(family.registrationDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {family.primaryParent && (
                        <div className="mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {family.primaryParent.email}
                            </span>
                            {family.primaryParent.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {family.primaryParent.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewFamily(family)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {families.length === 0 && (
              <div className="text-center py-8">
                <FamilyIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No families found</h3>
                <p className="text-gray-500 mb-4">Start by creating your first family group</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Family
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Family Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Family</CardTitle>
              <CardDescription>Add a new family group to organize members</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateFamily} className="space-y-4">
                <div>
                  <Label htmlFor="familyName">Family Name *</Label>
                  <Input
                    id="familyName"
                    value={formData.familyName}
                    onChange={(e) => setFormData({...formData, familyName: e.target.value})}
                    placeholder="e.g., Smith Family"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Optional family notes..."
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
                  <Button type="submit">Create Family</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Family Details Modal */}
      {showFamilyDetails && selectedFamily && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FamilyIcon className="h-5 w-5" />
                    {selectedFamily.familyName}
                  </CardTitle>
                  <CardDescription>Family details and member management</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFamilyDetails(false)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="members">Members ({selectedFamily.children.length})</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {/* Family Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-600">Total Children</p>
                      <p className="text-xl font-bold text-blue-800">{selectedFamily.statistics.totalChildren}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-600">Active Members</p>
                      <p className="text-xl font-bold text-green-800">{selectedFamily.statistics.activeChildren}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-purple-600">Monthly Fees</p>
                      <p className="text-xl font-bold text-purple-800">{formatCurrency(selectedFamily.statistics.totalMonthlyFees)}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm text-orange-600">Avg Fee/Child</p>
                      <p className="text-xl font-bold text-orange-800">{formatCurrency(selectedFamily.statistics.averageFeePerChild)}</p>
                    </div>
                  </div>

                  {/* Primary Contact */}
                  {selectedFamily.primaryParent && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Primary Contact</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="font-medium">{selectedFamily.primaryParent.firstName} {selectedFamily.primaryParent.lastName}</p>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {selectedFamily.primaryParent.email}
                              </p>
                              {selectedFamily.primaryParent.phone && (
                                <p className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  {selectedFamily.primaryParent.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="members" className="space-y-4">
                  <div className="space-y-3">
                    {selectedFamily.children.map((child) => (
                      <Card key={child.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{child.firstName} {child.lastName}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Level: {child.level}</span>
                                <span>{formatCurrency(child.monthlyFee)}/month</span>
                                <span>Joined: {new Date(child.joinDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <Badge className={getStatusBadgeColor(child.status)}>
                              {child.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Family Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-gray-500">
                        <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>Family settings configuration coming soon</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}