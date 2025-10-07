'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useBranding } from '@/contexts/BrandingContext'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
  Menu,
  Bell,
  MessageSquare,
  Wallet,
  UserCircle,
  FolderOpen,
  ClipboardCheck,
  UserPlus
} from 'lucide-react'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

interface ParentLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export function ParentLayout({ children, title = "Dashboard", description }: ParentLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapseTimeout, setCollapseTimeout] = useState<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const { branding } = useBranding()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'PARENT') {
      router.push('/admin')
      return
    }

    setUser(parsedUser)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (collapseTimeout) {
      clearTimeout(collapseTimeout)
      setCollapseTimeout(null)
    }
    // Open sidebar immediately
    setSidebarOpen(true)
  }

  const handleMouseLeave = () => {
    // Set timeout to collapse after 2 seconds
    const timeout = setTimeout(() => {
      setSidebarOpen(false)
    }, 2000)
    setCollapseTimeout(timeout)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (collapseTimeout) {
        clearTimeout(collapseTimeout)
      }
    }
  }, [collapseTimeout])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'events', name: 'Events', icon: CalendarDays, path: '/events' },
    { id: 'attendance', name: 'Attendance', icon: ClipboardCheck, path: '/attendance' },
    { id: 'invoices', name: 'Invoices', icon: FileText, path: '/invoices' },
    { id: 'payments', name: 'Payments', icon: CreditCard, path: '/payments' },
    { id: 'credits', name: 'Credits', icon: Wallet, path: '/credits' },
    { id: 'documents', name: 'Documents', icon: FolderOpen, path: '/documents' },
    { id: 'profile', name: 'Profile', icon: UserCircle, path: '/profile' }
  ]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 shadow-sm transition-all duration-300 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {sidebarOpen ? (
            branding?.logo ? (
              <img src={branding.logo} alt={branding.name} className="h-10 object-contain" />
            ) : (
              <div className="text-gray-900 font-bold text-lg">{branding?.name || 'Parent Portal'}</div>
            )
          ) : (
            branding?.logo ? (
              <img src={branding.logo} alt={branding.name} className="h-8 w-8 object-contain" />
            ) : (
              <div className="p-2 text-gray-600">
                <Menu className="h-5 w-5" />
              </div>
            )
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.path

            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                style={isActive ? {
                  backgroundColor: branding?.colors?.primary ? `${branding.colors.primary}15` : '#f3e8ff',
                  color: branding?.colors?.primary || '#7c3aed',
                  borderRightColor: branding?.colors?.primary || '#7c3aed'
                } : {}}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'border-r-4'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 p-4">
          {sidebarOpen ? (
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                <p className="text-gray-500 text-xs">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
              title="Logout"
            >
              <LogOut className="h-5 w-5 mx-auto" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {description && <p className="text-sm text-gray-600">{description}</p>}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
