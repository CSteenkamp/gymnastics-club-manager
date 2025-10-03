'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'

interface MobileOptimizedCardProps {
  title: string
  description?: string
  children: ReactNode
  onClick?: () => void
  icon?: ReactNode
  actionLabel?: string
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

export function MobileOptimizedCard({
  title,
  description,
  children,
  onClick,
  icon,
  actionLabel,
  className = '',
  padding = 'md'
}: MobileOptimizedCardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const isClickable = !!onClick

  return (
    <Card 
      className={`
        ${className}
        ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] active:shadow-sm' : ''}
        touch-manipulation
      `}
      onClick={onClick}
    >
      <CardHeader className={`${paddingClasses[padding]} pb-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg leading-tight truncate">
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-sm mt-1 line-clamp-2">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          
          {(isClickable || actionLabel) && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              {actionLabel && (
                <span className="text-sm text-purple-600 font-medium hidden sm:inline">
                  {actionLabel}
                </span>
              )}
              {isClickable && (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={`${paddingClasses[padding]} pt-0`}>
        {children}
      </CardContent>
    </Card>
  )
}

// Mobile-optimized stat card
interface MobileStatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    label: string
    trend: 'up' | 'down' | 'neutral'
  }
  icon?: ReactNode
  onClick?: () => void
  className?: string
}

export function MobileStatCard({
  title,
  value,
  change,
  icon,
  onClick,
  className = ''
}: MobileStatCardProps) {
  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <MobileOptimizedCard
      title={title}
      onClick={onClick}
      icon={icon}
      className={className}
      padding="sm"
    >
      <div className="space-y-2">
        <div className="text-2xl sm:text-3xl font-bold text-gray-900">
          {value}
        </div>
        
        {change && (
          <div className="flex items-center space-x-2 text-sm">
            <span className={getTrendColor(change.trend)}>
              {change.trend === 'up' ? '↗' : change.trend === 'down' ? '↘' : '→'} {change.value}%
            </span>
            <span className="text-gray-500">{change.label}</span>
          </div>
        )}
      </div>
    </MobileOptimizedCard>
  )
}

// Mobile-optimized list item
interface MobileListItemProps {
  title: string
  subtitle?: string
  value?: string
  badge?: {
    text: string
    variant: 'success' | 'warning' | 'error' | 'info' | 'default'
  }
  onClick?: () => void
  actions?: ReactNode
  avatar?: ReactNode
}

export function MobileListItem({
  title,
  subtitle,
  value,
  badge,
  onClick,
  actions,
  avatar
}: MobileListItemProps) {
  const getBadgeColor = (variant: string) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
      default: 'bg-gray-100 text-gray-800'
    }
    return colors[variant as keyof typeof colors] || colors.default
  }

  return (
    <div 
      className={`
        flex items-center space-x-3 p-4 border-b border-gray-100 last:border-b-0
        ${onClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation' : ''}
      `}
      onClick={onClick}
    >
      {avatar && (
        <div className="flex-shrink-0">
          {avatar}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {title}
          </h3>
          {value && (
            <span className="text-sm font-medium text-gray-900 ml-2">
              {value}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-1">
          {subtitle && (
            <p className="text-sm text-gray-500 truncate">
              {subtitle}
            </p>
          )}
          
          {badge && (
            <span className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${getBadgeColor(badge.variant)}
            `}>
              {badge.text}
            </span>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
      
      {onClick && !actions && (
        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
      )}
    </div>
  )
}