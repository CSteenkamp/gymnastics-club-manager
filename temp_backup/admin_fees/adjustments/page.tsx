'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FeeAdjustmentManager } from '@/components/fees/FeeAdjustmentManager'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export default function FeeAdjustmentsPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in and has admin role
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'FINANCE_ADMIN') {
      router.push('/dashboard')
      return
    }

    setUser(parsedUser)
  }, [router])

  const handleLogout = async () => {
    try {
      // Call logout API to clear cookie
      await fetch('/api/auth/logout', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear localStorage and redirect
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <button
                  onClick={() => router.push('/admin')}
                  className="hover:text-gray-700 transition-colors"
                >
                  Admin Dashboard
                </button>
                <span>›</span>
                <span className="text-gray-900 font-medium">Fee Adjustments</span>
              </nav>
              <h1 className="text-3xl font-bold text-gray-900">
                Fee Adjustment Management
              </h1>
              <p className="text-gray-600">Manage individual monthly fee adjustments for members</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Ceres Gymnastics Club
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <FeeAdjustmentManager />
        </div>
      </main>
    </div>
  )
}