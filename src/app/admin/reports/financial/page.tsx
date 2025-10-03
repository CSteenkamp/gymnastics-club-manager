'use client'

import { AdminLayout } from '@/components/layout/AdminLayout'
import { FinancialDashboard } from '@/components/reports/FinancialDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Shield, 
  Calendar, 
  Info,
  CheckCircle
} from 'lucide-react'

export default function FinancialReportsPage() {
  return (
    <AdminLayout 
      title="Financial Reports" 
      description="Advanced financial analytics and reporting for your gymnastics club"
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Financial reports provide comprehensive insights into your club&apos;s performance, 
                revenue trends, and member payment patterns.
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  POPI Compliant
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Real-time Data
                </Badge>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Key Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Revenue Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track total revenue, monthly trends, and performance metrics with detailed breakdowns by fee types and payment methods.
              </CardDescription>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Monthly revenue trends
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Payment method analysis
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Year-over-year comparison
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Cash Flow Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor outstanding balances, overdue payments, and cash flow projections to maintain healthy finances.
              </CardDescription>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Outstanding balance tracking
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Overdue payment alerts
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Cash flow projections
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                Member Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Analyze member financial status, discount usage, and payment patterns to optimize pricing strategies.
              </CardDescription>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Individual member status
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Discount impact analysis
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Payment behavior insights
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Financial Dashboard */}
        <FinancialDashboard />

        {/* Footer Information */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  All financial data is encrypted and POPI Act compliant
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Reports updated in real-time
                </span>
              </div>
              <div className="text-gray-500">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}