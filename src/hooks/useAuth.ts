import { useState, useEffect } from 'react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  clubId: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const storedToken = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (storedToken && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setToken(storedToken)
      } catch (error) {
        console.error('Error parsing user data:', error)
        // Clear invalid data
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    
    setLoading(false)
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
  }

  const login = (userData: User, authToken: string) => {
    localStorage.setItem('token', authToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    setToken(authToken)
  }

  return {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'FINANCE_ADMIN',
    logout,
    login
  }
}