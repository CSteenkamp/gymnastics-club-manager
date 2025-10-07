'use client'

import { useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreditManager } from '@/components/credits/CreditManager'
import { OverpaymentManager } from '@/components/credits/OverpaymentManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp,
  Users,
  AlertTriangle
} from 'lucide-react'

export default function CreditsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <AdminLayout title="Credit Management" description="Manage prepayments, credit balances, and overpayments">
      <div className="space-y-6">

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credits">Credit Management</TabsTrigger>
          <TabsTrigger value="overpayments">Overpayments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Credit Balance</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R 0.00</div>
                  <p className="text-xs text-muted-foreground">
                    Across all accounts
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    With credit balances
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Overpayments</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Requiring action
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Credits Used</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R 0.00</div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common credit management tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div 
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setActiveTab('credits')}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-medium">Add Credit</h3>
                        <p className="text-sm text-gray-600">Add credit to a parent&apos;s account</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setActiveTab('credits')}
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-medium">Apply Credit</h3>
                        <p className="text-sm text-gray-600">Apply credit to an invoice</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setActiveTab('overpayments')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                      <div>
                        <h3 className="font-medium">Process Overpayments</h3>
                        <p className="text-sm text-gray-600">Handle payment overages</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit System Information */}
            <Card>
              <CardHeader>
                <CardTitle>Credit System Overview</CardTitle>
                <CardDescription>
                  How the credit and prepayment system works
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-4 border-l-blue-500 pl-4">
                    <h4 className="font-medium">Automatic Credit Creation</h4>
                    <p className="text-sm text-gray-600">
                      Credit accounts are automatically created for parents when they make overpayments or when credits are manually added.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-l-green-500 pl-4">
                    <h4 className="font-medium">Credit Sources</h4>
                    <p className="text-sm text-gray-600">
                      Credits can come from overpayments, refunds, promotional credits, manual additions by admins, or system adjustments.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-l-purple-500 pl-4">
                    <h4 className="font-medium">Automatic Application</h4>
                    <p className="text-sm text-gray-600">
                      Credits can be automatically applied to new invoices or manually applied to existing outstanding balances.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-l-orange-500 pl-4">
                    <h4 className="font-medium">Overpayment Processing</h4>
                    <p className="text-sm text-gray-600">
                      When payments exceed invoice amounts, you can convert the overpayment to credit, apply it to the next invoice, or process a refund.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="credits">
          <CreditManager />
        </TabsContent>

        <TabsContent value="overpayments">
          <OverpaymentManager />
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  )
}