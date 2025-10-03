'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBackOnlineMessage, setShowBackOnlineMessage] = useState(false)
  const [hasBeenOffline, setHasBeenOffline] = useState(false)

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return

    // Set initial online status
    const initialOnlineStatus = navigator.onLine
    setIsOnline(initialOnlineStatus)

    const handleOnline = () => {
      console.log('[PWA] App is back online')
      setIsOnline(true)
      
      // Show brief "back online" message only if we were offline before
      if (hasBeenOffline) {
        setShowBackOnlineMessage(true)
        setTimeout(() => {
          setShowBackOnlineMessage(false)
        }, 3000)
      }
    }

    const handleOffline = () => {
      console.log('[PWA] App is offline')
      setIsOnline(false)
      setHasBeenOffline(true)
      setShowBackOnlineMessage(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [hasBeenOffline])

  // Only show indicator when offline OR when showing back online message
  if (isOnline && !showBackOnlineMessage) {
    return null
  }

  return (
    <div className="fixed top-16 left-4 right-4 z-50 lg:top-4 lg:right-4 lg:left-auto lg:max-w-sm">
      <Alert className={`
        ${isOnline ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}
        shadow-lg
      `}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-600" />
          )}
          
          <AlertDescription className={isOnline ? 'text-green-800' : 'text-amber-800'}>
            {isOnline && showBackOnlineMessage ? (
              <span className="flex items-center gap-2">
                <span>Back online</span>
                <RefreshCw className="h-3 w-3 animate-spin" />
              </span>
            ) : (
              <div>
                <div className="font-medium">You&apos;re offline</div>
                <div className="text-sm">Some features may be limited</div>
              </div>
            )}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  )
}

// Network status hook
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSlowConnection, setIsSlowConnection] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check connection speed if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      const updateConnectionStatus = () => {
        // Consider 2G and slow 3G as slow connections
        setIsSlowConnection(
          connection.effectiveType === 'slow-2g' || 
          connection.effectiveType === '2g' ||
          (connection.effectiveType === '3g' && connection.downlink < 1)
        )
      }

      updateConnectionStatus()
      connection.addEventListener('change', updateConnectionStatus)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        connection.removeEventListener('change', updateConnectionStatus)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, isSlowConnection }
}

// Sync status indicator for when data is being synced
interface SyncIndicatorProps {
  isSync: boolean
  message?: string
}

export function SyncIndicator({ isSync, message = 'Syncing...' }: SyncIndicatorProps) {
  if (!isSync) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 lg:bottom-4 lg:right-4 lg:left-auto lg:max-w-sm">
      <Alert className="border-blue-200 bg-blue-50 shadow-lg">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            {message}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  )
}