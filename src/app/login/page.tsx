'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      console.log('🔄 Attempting login to:', window.location.origin + '/api/auth/login')
      console.log('📝 Form data:', form)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log('📦 Response data:', data)

      if (data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data.user))

        // Check for redirect URL from query params
        const urlParams = new URLSearchParams(window.location.search)
        const redirectTo = urlParams.get('redirectTo')

        if (redirectTo && redirectTo !== '/login') {
          window.location.replace(redirectTo)
        } else if (data.data.user.role === 'SUPER_ADMIN') {
          window.location.replace('/super-admin')
        } else if (data.data.user.role === 'ADMIN' || data.data.user.role === 'FINANCE_ADMIN') {
          window.location.replace('/admin')
        } else {
          window.location.replace('/dashboard')
        }
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      setError(`Network error: ${error.message}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const fillDemoCredentials = (type: 'admin' | 'parent') => {
    if (type === 'admin') {
      setForm({
        email: 'admin@ceresgymnastics.co.za',
        password: 'admin123'
      })
    } else {
      setForm({
        email: 'parent@example.com',
        password: 'parent123'
      })
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Left Side - Image/Branding */}
      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[length:20px_20px]"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">
                Ceres Gymnastics Club
              </h1>
              <p className="text-xl text-purple-200 leading-relaxed">
                Professional management system for gymnastics clubs across South Africa
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold mb-1">Streamlined Fee Management</h3>
                  <p className="text-purple-200 text-sm">Automated invoicing and payment tracking</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold mb-1">Parent Portal</h3>
                  <p className="text-purple-200 text-sm">Easy access to schedules and account information</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h3 className="font-semibold mb-1">Multi-Club Support</h3>
                  <p className="text-purple-200 text-sm">Scalable solution for clubs of all sizes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back
              </h2>
              <p className="text-gray-500">
                Sign in to your account
              </p>
            </div>

            {/* Demo Credentials */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Demo Accounts</h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('admin')}
                  className="w-full text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Administrator</div>
                      <div className="text-xs text-gray-500">admin@ceresgymnastics.co.za</div>
                    </div>
                    <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('parent')}
                  className="w-full text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Parent Account</div>
                      <div className="text-xs text-gray-500">parent@example.com</div>
                    </div>
                    <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-red-800">{error}</span>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-400 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-400 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/register"
                    className="font-medium text-purple-600 hover:text-purple-500 transition-colors"
                  >
                    Contact your club administrator
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}