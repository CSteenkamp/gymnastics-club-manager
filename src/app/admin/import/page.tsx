'use client'

import { useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { CSVImportTool } from '@/components/import/CSVImportTool'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, Users, CreditCard, Info } from 'lucide-react'

interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export default function ImportPage() {
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null)

  const handleImportComplete = (result: ImportResult) => {
    setLastImportResult(result)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
          <p className="text-muted-foreground">
            Import historical data and manage bulk data operations for your gymnastics club.
          </p>
        </div>

        {/* Recent Import Summary */}
        {lastImportResult && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>Last import: {lastImportResult.created} created, {lastImportResult.updated} updated</span>
                <Badge variant="outline">
                  {lastImportResult.total} total records
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members & Financial Data
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2" disabled>
              <CreditCard className="h-4 w-4" />
              Payment History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <CSVImportTool onImportComplete={handleImportComplete} />
            
            {/* Data Mapping Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Data Mapping Guide
                </CardTitle>
                <CardDescription>
                  Understanding how your CSV data maps to the system fields
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Required Fields</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">firstName</span>
                        <span>Child&apos;s first name</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">lastName</span>
                        <span>Child&apos;s last name</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">parentEmail</span>
                        <span>Parent&apos;s email address</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">level</span>
                        <span>Gymnastics level (RR, R, Level 1-5)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">monthlyFee</span>
                        <span>Monthly fee amount (R250)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Financial Fields</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">currentBalance</span>
                        <span>Outstanding balance</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">sagfFee</span>
                        <span>SAGF registration fee</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">equipmentFee</span>
                        <span>Equipment or clothing fees</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">competitionFee</span>
                        <span>Competition entry fees</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">lastPaymentDate</span>
                        <span>Date of last payment (YYYY-MM-DD)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h5 className="font-medium text-amber-800 mb-2">Important Notes</h5>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Currency amounts should include &apos;R&apos; prefix (e.g., R350)</li>
                    <li>• Negative balances indicate credit amounts</li>
                    <li>• The system will automatically create invoices and payment records</li>
                    <li>• Parent accounts will be created automatically if they don&apos;t exist</li>
                    <li>• Use the overwrite option carefully as it will update existing member data</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History Import</CardTitle>
                <CardDescription>
                  Import historical payment records and transaction data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Payment history import is coming soon. For now, use the member import to include 
                    last payment information which will create payment records automatically.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}