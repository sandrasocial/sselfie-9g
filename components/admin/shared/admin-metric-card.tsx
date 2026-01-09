/**
 * AdminMetricCard - Standardized metric display card for admin pages
 * Ensures visual consistency across all admin dashboards
 */

import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface AdminMetricCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: {
    direction: 'up' | 'down'
    value: string
  }
  variant?: 'default' | 'primary' | 'compact'
  subtitle?: string
}

export function AdminMetricCard({
  label,
  value,
  icon,
  trend,
  variant = 'default',
  subtitle,
}: AdminMetricCardProps) {
  const isPrimary = variant === 'primary'
  const isCompact = variant === 'compact'

  return (
    <div
      className={`rounded-none border transition-colors ${
        isPrimary
          ? 'bg-stone-950 text-white border-stone-800'
          : 'bg-white border-stone-200 hover:border-stone-300'
      } ${isCompact ? 'p-4' : 'p-4 sm:p-6 lg:p-8'}`}
      role="article"
      aria-label={`${label}: ${value}`}
    >
      {/* Icon and Trend Row */}
      {(icon || trend) && (
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          {icon && (
            <div className={isPrimary ? 'text-white/70' : 'text-stone-600'}>
              {icon}
            </div>
          )}
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs ${
                trend.direction === 'up'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {trend.direction === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      )}

      {/* Value */}
      <p
        className={`font-['Times_New_Roman'] font-extralight mb-1 sm:mb-2 ${
          isCompact
            ? 'text-xl sm:text-2xl'
            : 'text-2xl sm:text-3xl lg:text-4xl'
        } ${isPrimary ? 'text-white' : 'text-stone-950'}`}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      {/* Label */}
      <p
        className={`text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase ${
          isPrimary ? 'text-stone-300' : 'text-stone-400'
        }`}
      >
        {label}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p
          className={`text-[8px] mt-1 ${
            isPrimary ? 'text-stone-400' : 'text-stone-500'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
