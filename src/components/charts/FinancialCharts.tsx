'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  LineChart,
  Calendar
} from 'lucide-react'

interface ChartData {
  label: string
  value: number
  color?: string
  percentage?: number
}

interface TimeSeriesData {
  period: string
  value: number
  secondaryValue?: number
}

interface FinancialChartsProps {
  revenueData?: TimeSeriesData[]
  feeTypeData?: ChartData[]
  paymentMethodData?: ChartData[]
  outstandingData?: {
    current: number
    thirtyDays: number
    sixtyDays: number
    ninetyDaysPlus: number
  }
  className?: string
}

export function FinancialCharts({
  revenueData = [],
  feeTypeData = [],
  paymentMethodData = [],
  outstandingData,
  className = ''
}: FinancialChartsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const revenueChartData = useMemo(() => {
    if (revenueData.length === 0) return { data: [], trend: 'stable' }

    const maxValue = Math.max(...revenueData.map(d => d.value))
    const data = revenueData.map(item => ({
      ...item,
      height: maxValue > 0 ? (item.value / maxValue) * 100 : 0
    }))

    // Calculate trend
    const recent = revenueData.slice(-2)
    let trend = 'stable'
    if (recent.length === 2) {
      const change = ((recent[1].value - recent[0].value) / recent[0].value) * 100
      trend = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable'
    }

    return { data, trend }
  }, [revenueData])

  const feeTypeChartData = useMemo(() => {
    const total = feeTypeData.reduce((sum, item) => sum + item.value, 0)
    return feeTypeData.map((item, index) => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
      color: item.color || getChartColor(index)
    }))
  }, [feeTypeData])

  const paymentMethodChartData = useMemo(() => {
    const total = paymentMethodData.reduce((sum, item) => sum + item.value, 0)
    return paymentMethodData.map((item, index) => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
      color: item.color || getChartColor(index)
    }))
  }, [paymentMethodData])

  const outstandingChartData = useMemo(() => {
    if (!outstandingData) return []
    
    const data = [
      { label: 'Current', value: outstandingData.current, color: '#10b981' },
      { label: '1-30 Days', value: outstandingData.thirtyDays, color: '#f59e0b' },
      { label: '31-60 Days', value: outstandingData.sixtyDays, color: '#ef4444' },
      { label: '60+ Days', value: outstandingData.ninetyDaysPlus, color: '#7c2d12' }
    ]

    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }))
  }, [outstandingData])

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Revenue Trend
            {revenueChartData.trend !== 'stable' && (
              <Badge variant={revenueChartData.trend === 'increasing' ? 'default' : 'destructive'}>
                {revenueChartData.trend === 'increasing' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {revenueChartData.trend}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Monthly revenue performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueChartData.data.length > 0 ? (
            <div className="space-y-4">
              {/* Simple Bar Chart */}
              <div className="flex items-end gap-2 h-40">
                {revenueChartData.data.map((item, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${item.height}%` }}
                      title={`${item.period}: ${formatCurrency(item.value)}`}
                    />
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      {new Date(item.period + '-01').toLocaleDateString('en-US', { 
                        month: 'short' 
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  Min: {formatCurrency(Math.min(...revenueChartData.data.map(d => d.value)))}
                </span>
                <span>
                  Max: {formatCurrency(Math.max(...revenueChartData.data.map(d => d.value)))}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500">
              <div className="text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No revenue data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Revenue by Fee Type
          </CardTitle>
          <CardDescription>Distribution of revenue across different fee categories</CardDescription>
        </CardHeader>
        <CardContent>
          {feeTypeChartData.length > 0 ? (
            <div className="space-y-4">
              {/* Horizontal Bar Chart */}
              <div className="space-y-3">
                {feeTypeChartData.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{item.label.replace('_', ' ')}</span>
                      <span className="text-gray-600">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.percentage.toFixed(1)}% of total revenue
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No fee type data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>Revenue breakdown by payment method</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethodChartData.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {paymentMethodChartData.map((item, index) => (
                <div key={index} className="text-center">
                  <div 
                    className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.percentage.toFixed(0)}%
                  </div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-gray-600">{formatCurrency(item.value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No payment method data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outstanding Balances Aging */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Outstanding Balance Aging
          </CardTitle>
          <CardDescription>Age analysis of unpaid invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {outstandingChartData.length > 0 ? (
            <div className="space-y-4">
              {outstandingChartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatCurrency(item.value)}</div>
                    <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
              
              {/* Total */}
              <div className="border-t pt-2 mt-4">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Outstanding</span>
                  <span>{formatCurrency(outstandingChartData.reduce((sum, item) => sum + item.value, 0))}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500">
              <div className="text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No outstanding balance data</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to get chart colors
function getChartColor(index: number): string {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1'  // indigo
  ]
  return colors[index % colors.length]
}