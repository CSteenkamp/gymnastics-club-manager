'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  CreditCard, 
  FileText, 
  Settings, 
  Menu, 
  X,
  Bell,
  User,
  LogOut,
  BarChart3,
  Calendar,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavigationItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const parentNavItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: Home },
  { id: 'payments', label: 'Payments', href: '/payments', icon: CreditCard },
  { id: 'documents', label: 'Documents', href: '/documents', icon: FileText },
  { id: 'credits', label: 'Credits', href: '/credits', icon: DollarSign }
]

const adminNavItems: NavigationItem[] = [
  { id: 'overview', label: 'Overview', href: '/admin', icon: Home },
  { id: 'members', label: 'Members', href: '/admin?tab=members', icon: Users },
  { id: 'finances', label: 'Finances', href: '/admin?tab=finances', icon: DollarSign },
  { id: 'reports', label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { id: 'documents', label: 'Documents', href: '/admin?tab=documents', icon: FileText },
  { id: 'schedules', label: 'Schedules', href: '/admin/schedules', icon: Calendar }
]

interface MobileNavigationProps {
  userRole?: string
  onLogout?: () => void
}

export function MobileNavigation({ userRole, onLogout }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const navItems = userRole === 'ADMIN' || userRole === 'FINANCE_ADMIN' 
    ? adminNavItems 
    : parentNavItems

  const handleNavigation = (href: string) => {
    router.push(href)
    setIsOpen(false)
  }

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/admin') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Navigation Bar */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Ceres Gym
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <Bell className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsOpen(false)}>
          <div 
            className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CG</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Ceres Gymnastics</h2>
                  <p className="text-sm text-gray-500 capitalize">{userRole?.toLowerCase()} Portal</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      active
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-purple-600' : 'text-gray-500'}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4">
              <Button
                variant="outline"
                className="w-full flex items-center space-x-2"
                onClick={() => {
                  onLogout?.()
                  setIsOpen(false)
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation for Mobile (Alternative approach) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 gap-1">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center py-2 px-1 text-xs transition-colors ${
                  active
                    ? 'text-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-5 w-5 mb-1 ${active ? 'text-purple-600' : 'text-gray-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// Hook for mobile detection
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useState(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  })

  return isMobile
}