'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated via cookie
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include' // Include cookies
        })

        if (response.ok) {
          const data = await response.json()
          const user = data.data
          
          // Redirect based on user role
          if (user.role === 'SUPER_ADMIN') {
            router.replace('/super-admin')
          } else if (user.role === 'ADMIN' || user.role === 'FINANCE_ADMIN') {
            router.replace('/admin')
          } else {
            router.replace('/dashboard')
          }
        } else {
          // Not authenticated, redirect to login
          router.replace('/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        // Fallback: try localStorage
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')
        
        if (token && user) {
          const userData = JSON.parse(user)
          if (userData.role === 'SUPER_ADMIN') {
            router.replace('/super-admin')
          } else if (userData.role === 'ADMIN' || userData.role === 'FINANCE_ADMIN') {
            router.replace('/admin')
          } else {
            router.replace('/dashboard')
          }
        } else {
          router.replace('/login')
        }
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Ceres Gymnastics Club
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Management System
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    </div>
  )
}
