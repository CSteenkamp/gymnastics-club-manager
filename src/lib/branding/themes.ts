// Predefined theme configurations for clubs
export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  success: string
  warning: string
  error: string
  info: string
}

export interface ClubThemeConfig {
  name: string
  colors: ThemeColors
  fonts: {
    heading: string
    body: string
  }
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  shadows: 'none' | 'sm' | 'md' | 'lg'
  customCss?: string
}

export const PREDEFINED_THEMES: Record<string, ClubThemeConfig> = {
  DEFAULT: {
    name: 'Default',
    colors: {
      primary: '#7c3aed', // Purple
      secondary: '#06b6d4', // Cyan
      accent: '#f59e0b', // Amber
      background: '#f9fafb', // Gray-50
      surface: '#ffffff',
      text: '#111827', // Gray-900
      textSecondary: '#6b7280', // Gray-500
      success: '#10b981', // Emerald
      warning: '#f59e0b', // Amber
      error: '#ef4444', // Red
      info: '#3b82f6' // Blue
    },
    fonts: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif'
    },
    borderRadius: 'lg',
    shadows: 'md'
  },

  MODERN: {
    name: 'Modern',
    colors: {
      primary: '#6366f1', // Indigo
      secondary: '#8b5cf6', // Violet
      accent: '#ec4899', // Pink
      background: '#fafafa',
      surface: '#ffffff',
      text: '#0f172a',
      textSecondary: '#64748b',
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444',
      info: '#06b6d4'
    },
    fonts: {
      heading: 'Poppins, sans-serif',
      body: 'Inter, sans-serif'
    },
    borderRadius: 'xl',
    shadows: 'lg'
  },

  CLASSIC: {
    name: 'Classic',
    colors: {
      primary: '#1f2937', // Gray-800
      secondary: '#374151', // Gray-700
      accent: '#d97706', // Amber-600
      background: '#f7fafc',
      surface: '#ffffff',
      text: '#1a202c',
      textSecondary: '#718096',
      success: '#38a169',
      warning: '#d69e2e',
      error: '#e53e3e',
      info: '#3182ce'
    },
    fonts: {
      heading: 'Georgia, serif',
      body: 'system-ui, sans-serif'
    },
    borderRadius: 'md',
    shadows: 'sm'
  },

  COLORFUL: {
    name: 'Colorful',
    colors: {
      primary: '#ff6b6b', // Red
      secondary: '#4ecdc4', // Teal
      accent: '#45b7d1', // Blue
      background: '#f8f9fa',
      surface: '#ffffff',
      text: '#2d3436',
      textSecondary: '#636e72',
      success: '#00b894',
      warning: '#fdcb6e',
      error: '#e17055',
      info: '#74b9ff'
    },
    fonts: {
      heading: 'Nunito, sans-serif',
      body: 'Nunito, sans-serif'
    },
    borderRadius: 'xl',
    shadows: 'md'
  },

  MINIMAL: {
    name: 'Minimal',
    colors: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#0070f3',
      background: '#fafafa',
      surface: '#ffffff',
      text: '#000000',
      textSecondary: '#666666',
      success: '#0070f3',
      warning: '#f5a623',
      error: '#e00',
      info: '#0070f3'
    },
    fonts: {
      heading: 'system-ui, sans-serif',
      body: 'system-ui, sans-serif'
    },
    borderRadius: 'none',
    shadows: 'none'
  },

  DARK: {
    name: 'Dark',
    colors: {
      primary: '#bb86fc',
      secondary: '#03dac6',
      accent: '#cf6679',
      background: '#121212',
      surface: '#1e1e1e',
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3'
    },
    fonts: {
      heading: 'Roboto, sans-serif',
      body: 'Roboto, sans-serif'
    },
    borderRadius: 'lg',
    shadows: 'lg'
  },

  SPORT: {
    name: 'Sport',
    colors: {
      primary: '#ff4757', // Red
      secondary: '#2ed573', // Green
      accent: '#ffa502', // Orange
      background: '#f1f2f6',
      surface: '#ffffff',
      text: '#2f3542',
      textSecondary: '#57606f',
      success: '#2ed573',
      warning: '#ffa502',
      error: '#ff4757',
      info: '#3742fa'
    },
    fonts: {
      heading: 'Montserrat, sans-serif',
      body: 'Open Sans, sans-serif'
    },
    borderRadius: 'lg',
    shadows: 'md'
  }
}

export function generateCSSVariables(theme: ClubThemeConfig): string {
  const { colors } = theme
  return `
    :root {
      --color-primary: ${colors.primary};
      --color-secondary: ${colors.secondary};
      --color-accent: ${colors.accent};
      --color-background: ${colors.background};
      --color-surface: ${colors.surface};
      --color-text: ${colors.text};
      --color-text-secondary: ${colors.textSecondary};
      --color-success: ${colors.success};
      --color-warning: ${colors.warning};
      --color-error: ${colors.error};
      --color-info: ${colors.info};
      
      --font-heading: ${theme.fonts.heading};
      --font-body: ${theme.fonts.body};
      
      --border-radius: ${getBorderRadiusValue(theme.borderRadius)};
      --shadow: ${getShadowValue(theme.shadows)};
    }
  `
}

function getBorderRadiusValue(radius: string): string {
  const values = {
    none: '0px',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem'
  }
  return values[radius as keyof typeof values] || values.md
}

function getShadowValue(shadow: string): string {
  const values = {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
  }
  return values[shadow as keyof typeof values] || values.md
}

export function validateThemeColors(colors: Partial<ThemeColors>): boolean {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  
  for (const [key, value] of Object.entries(colors)) {
    if (value && !hexColorRegex.test(value)) {
      console.warn(`Invalid color for ${key}: ${value}`)
      return false
    }
  }
  
  return true
}

export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const color = hexColor.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff'
}