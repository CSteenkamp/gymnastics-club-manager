'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { PREDEFINED_THEMES, generateCSSVariables, ClubThemeConfig } from '@/lib/branding/themes'

interface ClubBranding {
  id: string
  name: string
  logo?: string
  favicon?: string
  colors?: any
  theme: string
  customCss?: string
  effectiveColors: any
}

interface BrandingContextType {
  branding: ClubBranding | null
  loading: boolean
  refreshBranding: () => Promise<void>
  updateTheme: (themeKey: string) => void
  updateColors: (colors: any) => void
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  initialBranding?: ClubBranding
}

export function ThemeProvider({ children, initialBranding }: ThemeProviderProps) {
  const [branding, setBranding] = useState<ClubBranding | null>(initialBranding || null)
  const [loading, setLoading] = useState(!initialBranding)

  const loadBranding = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/branding', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBranding(data.data)
          applyTheme(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading branding:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyTheme = (brandingData: ClubBranding) => {
    if (!brandingData) return

    let themeConfig: ClubThemeConfig

    // Use predefined theme or create custom theme
    if (brandingData.theme && brandingData.theme !== 'CUSTOM' && PREDEFINED_THEMES[brandingData.theme]) {
      themeConfig = PREDEFINED_THEMES[brandingData.theme]
      
      // Override with custom colors if available
      if (brandingData.colors) {
        themeConfig = {
          ...themeConfig,
          colors: { ...themeConfig.colors, ...brandingData.colors }
        }
      }
    } else {
      // Custom theme
      themeConfig = {
        name: 'Custom',
        colors: brandingData.effectiveColors || PREDEFINED_THEMES.DEFAULT.colors,
        fonts: PREDEFINED_THEMES.DEFAULT.fonts,
        borderRadius: 'lg',
        shadows: 'md',
        customCss: brandingData.customCss
      }
    }

    // Generate and inject CSS variables
    const cssVariables = generateCSSVariables(themeConfig)
    
    // Remove existing style element
    const existingStyle = document.getElementById('club-theme-variables')
    if (existingStyle) {
      existingStyle.remove()
    }

    // Create new style element
    const styleElement = document.createElement('style')
    styleElement.id = 'club-theme-variables'
    styleElement.textContent = cssVariables

    // Add custom CSS if available
    if (themeConfig.customCss) {
      styleElement.textContent += '\n' + themeConfig.customCss
    }

    document.head.appendChild(styleElement)

    // Update favicon if available
    if (brandingData.favicon) {
      updateFavicon(brandingData.favicon)
    }

    // Update page title
    document.title = `${brandingData.name} - Club Management`
  }

  const updateFavicon = (faviconPath: string) => {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link')
    link.type = 'image/x-icon'
    link.rel = 'shortcut icon'
    link.href = `/${faviconPath}`
    document.getElementsByTagName('head')[0].appendChild(link)
  }

  const updateTheme = async (themeKey: string) => {
    if (!branding) return

    const updatedBranding = { ...branding, theme: themeKey }
    setBranding(updatedBranding)
    applyTheme(updatedBranding)
  }

  const updateColors = async (colors: any) => {
    if (!branding) return

    const updatedBranding = { 
      ...branding, 
      colors: { ...branding.colors, ...colors },
      effectiveColors: { ...branding.effectiveColors, ...colors },
      theme: 'CUSTOM'
    }
    setBranding(updatedBranding)
    applyTheme(updatedBranding)
  }

  useEffect(() => {
    if (!initialBranding) {
      loadBranding()
    } else {
      applyTheme(initialBranding)
      setLoading(false)
    }
  }, [])

  const value: BrandingContextType = {
    branding,
    loading,
    refreshBranding: loadBranding,
    updateTheme,
    updateColors
  }

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = useContext(BrandingContext)
  if (context === undefined) {
    throw new Error('useBranding must be used within a ThemeProvider')
  }
  return context
}

// HOC for pages that need branding
export function withBranding<P extends object>(
  Component: React.ComponentType<P>
) {
  return function BrandedComponent(props: P) {
    return (
      <ThemeProvider>
        <Component {...props} />
      </ThemeProvider>
    )
  }
}