'use client'

import { useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { FeeTypeManager } from '@/components/fees/FeeTypeManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  Percent, 
  Users, 
  Settings, 
  TrendingUp,
  Calculator,
  Gift,
  Info
} from 'lucide-react'

export default function FeesPage() {
  const [, setRefreshTrigger] = useState(0)

  const handleFeeTypeChange = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <AdminLayout title="Fee Management" description="Manage fee types, discounts, and pricing structures for your gymnastics club">
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Fee Types</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">+2 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Discounts</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <Percent className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">3 family discounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Monthly Fee</p>
                  <p className="text-2xl font-bold">R485</p>
                </div>
                <Calculator className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Based on current members</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold">R61,200</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Including all fee types</p>
            </CardContent>
          </Card>
        </div>

        {/* Fee Management System Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Enhanced fee management system supports multiple fee types, automated discounts, and family pricing.</span>
              <Badge variant="outline">
                Enhanced System
              </Badge>
            </div>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="fee-types" className="space-y-6">
          <TabsList>
            <TabsTrigger value="fee-types" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fee Types
            </TabsTrigger>
            <TabsTrigger value="discounts" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Discounts & Scholarships
            </TabsTrigger>
            <TabsTrigger value="pricing-rules" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Pricing Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fee-types" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Fee Types Management
                </CardTitle>
                <CardDescription>
                  Create and manage different types of fees including monthly fees, registration fees, 
                  equipment costs, competition fees, and more. Set up automatic application rules and level restrictions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FeeTypeManager onFeeTypeChange={handleFeeTypeChange} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Discounts & Scholarships
                </CardTitle>
                <CardDescription>
                  Create flexible discount structures including family discounts, sibling discounts, 
                  early payment discounts, and scholarship programs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-r from-green-50 to-green-100">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-700">Total Savings</p>
                            <p className="text-xl font-bold text-green-800">R8,450</p>
                          </div>
                          <Percent className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-xs text-green-600 mt-1">This month</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-700">Family Discounts</p>
                            <p className="text-xl font-bold text-blue-800">23</p>
                          </div>
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-xs text-blue-600 mt-1">Active families</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-700">Scholarships</p>
                            <p className="text-xl font-bold text-purple-800">7</p>
                          </div>
                          <Gift className="h-6 w-6 text-purple-600" />
                        </div>
                        <p className="text-xs text-purple-600 mt-1">Recipients</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Available Discount Types */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Family Discounts</CardTitle>
                        <CardDescription>
                          Automatic discounts for families with multiple children
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">Sibling Discount</p>
                              <p className="text-sm text-gray-600">2+ children</p>
                            </div>
                            <Badge variant="outline">15% off 2nd child</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">Large Family</p>
                              <p className="text-sm text-gray-600">3+ children</p>
                            </div>
                            <Badge variant="outline">25% off 3rd+ child</Badge>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full mt-4">
                          Manage Family Discounts
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Special Programs</CardTitle>
                        <CardDescription>
                          Scholarships and special assistance programs
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">Early Payment</p>
                              <p className="text-sm text-gray-600">Pay by 25th</p>
                            </div>
                            <Badge variant="outline">5% discount</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">Annual Payment</p>
                              <p className="text-sm text-gray-600">Pay full year</p>
                            </div>
                            <Badge variant="outline">1 month free</Badge>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full mt-4">
                          Manage Special Programs
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-center">
                    <Button className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Create New Discount
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing-rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Automated Pricing Rules
                </CardTitle>
                <CardDescription>
                  Configure automatic fee application, age-based pricing, and level progression rules.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Automation Rules */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-dashed">
                      <CardContent className="p-6">
                        <div className="text-center">
                          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Auto-Application Rules</h3>
                          <p className="text-gray-600 mb-4">
                            Set up rules to automatically apply fees when new members join or existing members change levels.
                          </p>
                          <Button variant="outline">Configure Rules</Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-dashed">
                      <CardContent className="p-6">
                        <div className="text-center">
                          <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Dynamic Pricing</h3>
                          <p className="text-gray-600 mb-4">
                            Create age-based pricing tiers and automatic adjustments based on member progression.
                          </p>
                          <Button variant="outline">Setup Pricing</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Current Rules Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">Active Pricing Rules</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-800">SAGF Registration auto-applies to new members</span>
                        <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-800">Competition fees applied when registering for events</span>
                        <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-800">Family discount triggers with 2+ children</span>
                        <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}