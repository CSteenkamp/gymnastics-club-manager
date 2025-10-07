'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import PlanSelectionModal from '@/components/subscription/PlanSelectionModal'
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react'

interface Subscription {
  id: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  trialStart?: string
  trialEnd?: string
  plan: {
    id: string
    name: string
    price: number
    interval: string
    maxStudents: number | null
  }
}

interface Club {
  name: string
  subscriptionStatus: string
  trialEndsAt?: string
  studentCount: number
}

interface Payment {
  id: string
  amount: number
  status: string
  paidAt?: string
  createdAt: string
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [club, setClub] = useState<Club | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/subscription/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSubscription(data.data.subscription)
        setClub(data.data.club)
        setPayments(data.data.payments || [])
      }
    } catch (error) {
      console.error('Error loading subscription:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      TRIALING: 'bg-blue-100 text-blue-800',
      TRIAL: 'bg-blue-100 text-blue-800',
      PAST_DUE: 'bg-orange-100 text-orange-800',
      CANCELED: 'bg-gray-100 text-gray-800',
      SUSPENDED: 'bg-red-100 text-red-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'TRIALING':
      case 'TRIAL':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'PAST_DUE':
      case 'SUSPENDED':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getDaysRemaining = () => {
    if (!club?.trialEndsAt) return null
    const now = new Date()
    const trialEnd = new Date(club.trialEndsAt)
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const handlePlanSelected = async (planId: string) => {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/subscription/change-plan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPlanId: planId })
    })

    if (response.ok) {
      const data = await response.json()
      if (data.data.requiresPayment) {
        // Redirect to payment flow (Stripe Checkout or Elements)
        window.location.href = `/payment?session=${data.data.clientSecret}`
      } else {
        // Plan changed successfully, reload data
        await loadSubscriptionData()
      }
    } else {
      const error = await response.json()
      alert(error.error || 'Failed to change plan')
    }
  }

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
                <h1 className="text-3xl font-bold text-gray-900">Subscription & Billing</h1>
                <p className="text-gray-600">Manage your plan and payment methods</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Trial Warning */}
              {club?.subscriptionStatus === 'TRIAL' && getDaysRemaining() !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-blue-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900">Trial Period Active</h3>
                      <p className="text-blue-700">
                        {getDaysRemaining()} days remaining in your free trial. Trial ends on {club.trialEndsAt && formatDate(club.trialEndsAt)}.
                      </p>
                    </div>
                    <Button onClick={() => setUpgradeModalOpen(true)}>
                      Subscribe Now
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Current Plan */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-6 w-6 text-purple-600" />
                      <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
                    </div>
                    {club && (
                      <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusBadge(club.subscriptionStatus)}`}>
                        {getStatusIcon(club.subscriptionStatus)}
                        {club.subscriptionStatus}
                      </span>
                    )}
                  </div>

                  {subscription ? (
                    <>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">{subscription.plan.name}</h3>
                          <p className="text-3xl font-bold text-purple-600 mt-2">
                            {formatCurrency(Number(subscription.plan.price))}
                            <span className="text-lg text-gray-600">/{subscription.plan.interval.toLowerCase()}</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                          <div>
                            <p className="text-sm text-gray-600">Student Limit</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {subscription.plan.maxStudents ? `${subscription.plan.maxStudents} students` : 'Unlimited'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Current Students</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {club?.studentCount || 0} students
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Current Period</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(subscription.currentPeriodStart)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Renews On</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(subscription.currentPeriodEnd)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                        <Button onClick={() => setUpgradeModalOpen(true)}>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Upgrade Plan
                        </Button>
                        <Button variant="outline">
                          Update Payment Method
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">No active subscription</p>
                      <Button onClick={() => setUpgradeModalOpen(true)}>
                        Subscribe Now
                      </Button>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <h3 className="font-semibold text-gray-900">Next Payment</h3>
                    </div>
                    {subscription ? (
                      <>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(Number(subscription.plan.price))}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Due on {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-600">No upcoming payment</p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                        <Download className="h-4 w-4 inline mr-2" />
                        Download Invoice
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                        View Payment History
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded">
                        Cancel Subscription
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Payment History</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {payments.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No payment history</div>
                  ) : (
                    payments.map((payment) => (
                      <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(Number(payment.amount))}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(payment.paidAt || payment.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'SUCCEEDED'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                          <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                            Download
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentPlanId={subscription?.plan.id}
        onPlanSelected={handlePlanSelected}
      />
    </div>
  )
}
