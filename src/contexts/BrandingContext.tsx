'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface ClubBranding {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  logo: string | null
  colors: {
    primary?: string
    secondary?: string
    accent?: string
    background?: string
    text?: string
  } | null
  settings: {
    favicon?: string
    customCss?: string
  } | null
}

interface BrandingContextType {
  branding: ClubBranding | null
  isLoading: boolean
  refreshBranding: () => Promise<void>
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<ClubBranding | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadBranding = async () => {
    try {
      const response = await fetch('/api/clubs/branding')
      if (response.ok) {
        const data = await response.json()
        setBranding(data.data)

        // Apply branding to document
        if (data.data) {
          applyBranding(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to load club branding:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyBranding = (branding: ClubBranding) => {
    // Apply colors as CSS variables
    if (branding.colors) {
      const root = document.documentElement
      if (branding.colors.primary) {
        root.style.setProperty('--club-primary', branding.colors.primary)
      }
      if (branding.colors.secondary) {
        root.style.setProperty('--club-secondary', branding.colors.secondary)
      }
      if (branding.colors.accent) {
        root.style.setProperty('--club-accent', branding.colors.accent)
      }
      if (branding.colors.background) {
        root.style.setProperty('--club-background', branding.colors.background)
      }
      if (branding.colors.text) {
        root.style.setProperty('--club-text', branding.colors.text)
      }
    }

    // Apply custom CSS from settings
    const settings = branding.settings as any
    if (settings?.customCss) {
      let styleEl = document.getElementById('club-custom-css')
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = 'club-custom-css'
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = settings.customCss
    }

    // Update page title and favicon
    if (branding.name) {
      document.title = branding.name
    }
    if (settings?.favicon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = settings.favicon
    }
  }

  useEffect(() => {
    loadBranding()
  }, [])

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refreshBranding: loadBranding }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = useContext(BrandingContext)
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider')
  }
  return context
}
