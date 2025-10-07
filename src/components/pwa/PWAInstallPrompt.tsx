'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isInWebApp = (window.navigator as any).standalone === true
    
    if (isStandalone || isInWebApp) {
      setIsInstalled(true)
      return
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('[PWA] beforeinstallprompt event fired')
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Show install prompt after a short delay
      setTimeout(() => {
        setShowInstallPrompt(true)
      }, 3000)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA] App was installed')
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      // Show the install prompt
      await deferredPrompt.prompt()
      
      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice
      
      console.log(`[PWA] User response to install prompt: ${outcome}`)
      
      if (outcome === 'accepted') {
        setShowInstallPrompt(false)
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('[PWA] Error showing install prompt:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already installed or dismissed this session
  if (isInstalled || !showInstallPrompt || !deferredPrompt) {
    return null
  }

  // Check if dismissed this session
  if (sessionStorage.getItem('pwa-install-dismissed')) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-sm">
      <Card className="border-purple-200 shadow-lg bg-white">
        <CardContent className="p-4 bg-white">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <Smartphone className="h-5 w-5 text-purple-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">
                Install Ceres Gym App
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Add to your home screen for quick access and offline features
              </p>
              
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstallClick}
                  className="bg-purple-600 hover:bg-purple-700 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Install
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  className="text-xs"
                >
                  Later
                </Button>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// PWA Update Prompt Component
export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })

      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker)
                setShowUpdatePrompt(true)
              }
            })
          }
        })
      })
    }
  }, [])

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      setShowUpdatePrompt(false)
    }
  }

  const handleDismissUpdate = () => {
    setShowUpdatePrompt(false)
  }

  if (!showUpdatePrompt) {
    return null
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:max-w-sm md:right-4">
      <Card className="border-blue-200 shadow-lg bg-white">
        <CardContent className="p-4 bg-white">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Download className="h-5 w-5 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">
                App Update Available
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                A new version is ready to install
              </p>
              
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleUpdate}
                  className="bg-blue-600 hover:bg-blue-700 text-xs"
                >
                  Update Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismissUpdate}
                  className="text-xs"
                >
                  Later
                </Button>
              </div>
            </div>
            
            <button
              onClick={handleDismissUpdate}
              className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}