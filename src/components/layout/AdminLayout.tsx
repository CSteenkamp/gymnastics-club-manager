'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export function AdminLayout({ children, title = "Admin Dashboard", description }: AdminLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const pathname = usePathname()

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

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
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
              <h1 className="text-3xl font-bold text-gray-900">
                {title}
              </h1>
              {description && (
                <p className="text-gray-600">{description}</p>
              )}
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

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: '📊', path: '/admin' },
              { id: 'members', name: 'Members', icon: '👥', path: '/admin' },
              { id: 'fees', name: 'Fees', icon: '💳', path: '/admin/fees' },
              { id: 'import', name: 'Import', icon: '📥', path: '/admin/import' },
              { id: 'documents', name: 'Documents', icon: '📄', path: '/admin/documents' },
              { id: 'finances', name: 'Finances', icon: '💰', path: '/admin/finances' },
              { id: 'classes', name: 'Classes', icon: '🏃', path: '/admin/classes' },
              { id: 'reports', name: 'Reports', icon: '📈', path: '/admin/reports' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => router.push(tab.path)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  pathname === tab.path || 
                  (tab.id === 'import' && pathname?.includes('/admin/import')) ||
                  (tab.id === 'fees' && pathname?.includes('/admin/fees'))
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}