'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ParentCreditAccount } from '@/components/credits/ParentCreditAccount'
import { ArrowLeft } from 'lucide-react'

export default function CreditsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Credit Account
                </h1>
                <p className="text-gray-600">Manage your prepayments and credit balance</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <ParentCreditAccount />
        </div>
      </main>
    </div>
  )
}