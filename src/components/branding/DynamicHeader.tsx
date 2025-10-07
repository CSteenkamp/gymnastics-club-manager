'use client'

import { useBranding } from '@/contexts/BrandingContext'
import Image from 'next/image'

interface DynamicHeaderProps {
  title?: string
  showLogo?: boolean
  children?: React.ReactNode
}

export function DynamicHeader({ title, showLogo = true, children }: DynamicHeaderProps) {
  const { branding, isLoading } = useBranding()

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      {showLogo && branding?.logo && (
        <Image
          src={branding.logo}
          alt={branding.name}
          width={120}
          height={40}
          className="h-10 w-auto"
          priority
        />
      )}
      {!branding?.logo && (
        <span className="text-sm font-medium" style={{ color: branding?.colors?.primary || '#7c3aed' }}>
          {branding?.name || 'Gymnastics Club'}
        </span>
      )}
      {children}
    </div>
  )
}
