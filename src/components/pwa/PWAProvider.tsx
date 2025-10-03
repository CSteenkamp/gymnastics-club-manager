'use client'

import { useEffect } from 'react'

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      console.log('[PWA] Registering service worker...')
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('[PWA] Service worker registered successfully:', registration)

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        console.log('[PWA] New service worker found')

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            console.log(`[PWA] Service worker state changed: ${newWorker.state}`)
            
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content is available; please refresh.')
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[PWA] Message from service worker:', event.data)
        
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          console.log('[PWA] Cache updated, new content available')
        }
      })

      // Check if there's an update available immediately
      registration.update()

    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error)
    }
  }

  // Add offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('[PWA] App is online')
      // Optionally show a notification that the app is back online
    }

    const handleOffline = () => {
      console.log('[PWA] App is offline')
      // Optionally show a notification that the app is offline
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Add beforeunload handler for PWA
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only show confirmation if there's unsaved data
      // This is particularly useful for forms in the PWA
      const hasUnsavedData = false // You can implement logic to check for unsaved data
      
      if (hasUnsavedData) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return <>{children}</>
}

// Hook for PWA functionality
export function usePWA() {
  const isOnline = typeof window !== 'undefined' ? navigator.onLine : true
  const isStandalone = typeof window !== 'undefined' 
    ? window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true
    : false

  const requestPersistentStorage = async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const isPersistent = await navigator.storage.persist()
        console.log(`[PWA] Persistent storage: ${isPersistent}`)
        return isPersistent
      } catch (error) {
        console.error('[PWA] Failed to request persistent storage:', error)
        return false
      }
    }
    return false
  }

  const getStorageEstimate = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        console.log('[PWA] Storage estimate:', estimate)
        return estimate
      } catch (error) {
        console.error('[PWA] Failed to get storage estimate:', error)
        return null
      }
    }
    return null
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission()
        console.log(`[PWA] Notification permission: ${permission}`)
        return permission === 'granted'
      } catch (error) {
        console.error('[PWA] Failed to request notification permission:', error)
        return false
      }
    }
    return false
  }

  const shareContent = async (shareData: ShareData) => {
    if ('share' in navigator) {
      try {
        await navigator.share(shareData)
        return true
      } catch (error) {
        console.error('[PWA] Failed to share content:', error)
        return false
      }
    }
    return false
  }

  return {
    isOnline,
    isStandalone,
    requestPersistentStorage,
    getStorageEstimate,
    requestNotificationPermission,
    shareContent
  }
}