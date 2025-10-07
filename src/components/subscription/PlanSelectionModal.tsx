'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Check, Loader2 } from 'lucide-react'

interface Plan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  maxStudents: number | null
  features: Record<string, any>
  isCurrent?: boolean
}

interface PlanSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlanId?: string
  onPlanSelected: (planId: string) => Promise<void>
}

export default function PlanSelectionModal({
  isOpen,
  onClose,
  currentPlanId,
  onPlanSelected
}: PlanSelectionModalProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [interval, setInterval] = useState<'MONTHLY' | 'ANNUALLY'>('MONTHLY')

  useEffect(() => {
    if (isOpen) {
      loadPlans()
    }
  }, [isOpen])

  const loadPlans = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/subscription/plans', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPlans(data.data || [])
      }
    } catch (error) {
      console.error('Error loading plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async () => {
    if (!selectedPlanId) return

    setProcessing(true)
    try {
      await onPlanSelected(selectedPlanId)
      onClose()
    } catch (error) {
      console.error('Error selecting plan:', error)
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const filteredPlans = plans.filter(p => p.interval === interval)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
            <p className="text-gray-600">Select the best plan for your club</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Interval Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setInterval('MONTHLY')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  interval === 'MONTHLY'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval('ANNUALLY')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  interval === 'ANNUALLY'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual <span className="text-green-600 ml-1">(Save 20%)</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">Loading plans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    selectedPlanId === plan.id
                      ? 'border-purple-600 shadow-lg'
                      : plan.isCurrent
                      ? 'border-green-500'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  {plan.isCurrent && (
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  )}

                  <h3 className="text-xl font-bold text-gray-900 mt-4">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mt-2">{plan.description}</p>

                  <div className="mt-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-gray-600">/{plan.interval.toLowerCase()}</span>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700">
                      {plan.maxStudents ? `Up to ${plan.maxStudents} students` : 'Unlimited students'}
                    </p>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {Object.entries(plan.features || {}).map(([feature, value]) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">
                          {feature}
                          {typeof value === 'string' && value !== 'true' && (
                            <span className="text-gray-500 ml-1">({value})</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {selectedPlanId === plan.id && (
                    <div className="mt-6 p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-900 font-medium text-center">
                        ✓ Selected
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelectPlan}
              disabled={!selectedPlanId || processing || selectedPlanId === currentPlanId}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
