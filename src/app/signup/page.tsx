'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, Building2, User, Mail, Lock, Phone, MapPin, ArrowRight, ArrowLeft } from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  interval: string
  maxStudents: number | null
  features: any
  trialDays: number
}

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Step 1: Club Info
    clubName: '',
    clubEmail: '',
    clubPhone: '',
    clubAddress: '',
    // Step 2: Admin Info
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const response = await fetch('/api/signup')
      if (response.ok) {
        const data = await response.json()
        setPlans(data.data || [])
      }
    } catch (error) {
      console.error('Error loading plans:', error)
    }
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.clubName.trim()) {
      newErrors.clubName = 'Club name is required'
    }
    if (!formData.clubEmail.trim()) {
      newErrors.clubEmail = 'Club email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clubEmail)) {
      newErrors.clubEmail = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.adminFirstName.trim()) {
      newErrors.adminFirstName = 'First name is required'
    }
    if (!formData.adminLastName.trim()) {
      newErrors.adminLastName = 'Last name is required'
    }
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Invalid email format'
    }
    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Password is required'
    } else if (formData.adminPassword.length < 6) {
      newErrors.adminPassword = 'Password must be at least 6 characters'
    }
    if (formData.adminPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
    setErrors({})
  }

  const handleSubmit = async () => {
    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          planId: selectedPlan
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Save token and user data
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify({
          ...data.data.user,
          club: { name: data.data.club.name }
        }))

        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        setErrors({ general: data.error || 'Signup failed' })
      }
    } catch (error) {
      console.error('Signup error:', error)
      setErrors({ general: 'An error occurred during signup' })
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

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[length:20px_20px]"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">
                Launch Your Gymnastics Club
              </h1>
              <p className="text-xl text-purple-200 leading-relaxed">
                Join leading gymnastics clubs across South Africa with our comprehensive management platform
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold mb-1">14-Day Free Trial</h3>
                  <p className="text-purple-200 text-sm">No credit card required to get started</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold mb-1">Complete Management Suite</h3>
                  <p className="text-purple-200 text-sm">Invoicing, scheduling, attendance, and parent portal</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold mb-1">Instant Setup</h3>
                  <p className="text-purple-200 text-sm">Get your club online in under 5 minutes</p>
                </div>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="mt-12 pt-8 border-t border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-200">Setup Progress</span>
                <span className="text-sm text-white font-medium">Step {step} of 3</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-400 to-blue-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(step / 3) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {step === 1 && 'Club Information'}
                {step === 2 && 'Administrator Account'}
                {step === 3 && 'Choose Your Plan'}
              </h2>
              <p className="text-gray-500">
                {step === 1 && 'Tell us about your gymnastics club'}
                {step === 2 && 'Create your admin account'}
                {step === 3 && 'Select the plan that fits your needs'}
              </p>
            </div>

          {/* Step 1: Club Information */}
          {step === 1 && (
            <div className="space-y-6">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Club Name *
                </label>
                <input
                  type="text"
                  value={formData.clubName}
                  onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${errors.clubName ? 'border-red-500' : 'border-gray-300'} transition-colors`}
                  placeholder="e.g., Ceres Gymnastics Club"
                />
                {errors.clubName && <p className="text-red-500 text-sm mt-1">{errors.clubName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Club Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.clubEmail}
                    onChange={(e) => setFormData({ ...formData, clubEmail: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${errors.clubEmail ? 'border-red-500' : 'border-gray-300'} transition-colors`}
                    placeholder="info@yourclub.com"
                  />
                </div>
                {errors.clubEmail && <p className="text-red-500 text-sm mt-1">{errors.clubEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.clubPhone}
                    onChange={(e) => setFormData({ ...formData, clubPhone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    placeholder="+27 XX XXX XXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.clubAddress}
                    onChange={(e) => setFormData({ ...formData, clubAddress: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    placeholder="123 Main Street, City"
                  />
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Next Step
              </button>
            </div>
          )}

          {/* Step 2: Admin Account */}
          {step === 2 && (
            <div className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.adminFirstName}
                    onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${errors.adminFirstName ? 'border-red-500' : 'border-gray-300'} transition-colors`}
                    placeholder="John"
                  />
                  {errors.adminFirstName && <p className="text-red-500 text-sm mt-1">{errors.adminFirstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.adminLastName}
                    onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${errors.adminLastName ? 'border-red-500' : 'border-gray-300'} transition-colors`}
                    placeholder="Smith"
                  />
                  {errors.adminLastName && <p className="text-red-500 text-sm mt-1">{errors.adminLastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${errors.adminEmail ? 'border-red-500' : 'border-gray-300'} transition-colors`}
                    placeholder="admin@yourclub.com"
                  />
                </div>
                {errors.adminEmail && <p className="text-red-500 text-sm mt-1">{errors.adminEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${errors.adminPassword ? 'border-red-500' : 'border-gray-300'} transition-colors`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.adminPassword && <p className="text-red-500 text-sm mt-1">{errors.adminPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} transition-colors`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 px-4 rounded-xl font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Next Step
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Choose Plan */}
          {step === 3 && (
            <div className="space-y-6">
              {plans.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Loading plans...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
                        selectedPlan === plan.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {selectedPlan === plan.id && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle className="h-6 w-6 text-purple-600" />
                        </div>
                      )}

                      <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatCurrency(Number(plan.price))}
                        </span>
                        <span className="text-gray-600">/{plan.interval.toLowerCase()}</span>
                      </div>

                      <ul className="space-y-2 text-sm text-gray-600">
                        {plan.maxStudents ? (
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Up to {plan.maxStudents} students
                          </li>
                        ) : (
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Unlimited students
                          </li>
                        )}
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {plan.trialDays}-day free trial
                        </li>
                        {plan.features && Object.entries(plan.features).map(([key, value]) => (
                          <li key={key} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            {String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                  {errors.general}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !selectedPlan}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                    loading || !selectedPlan
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
                >
                  {loading ? 'Creating Account...' : 'Start Free Trial'}
                </button>
              </div>
            </div>
          )}

            {/* Footer */}
            <div className="text-center mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="font-medium text-purple-600 hover:text-purple-500 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
