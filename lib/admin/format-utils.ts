/**
 * Admin Formatting Utilities
 * Consistent data formatting across all admin pages
 */

/**
 * Format currency values consistently
 * @param amount - Amount in dollars (not cents)
 * @param options - Formatting options
 */
export function formatCurrency(
  amount: number,
  options: {
    showDecimals?: boolean
    showCents?: boolean
  } = {}
): string {
  const { showDecimals = false, showCents = false } = options

  // If showing cents, always show 2 decimal places
  if (showCents) {
    return `$${amount.toFixed(2)}`
  }

  // If showing decimals but amount has decimals, show them
  if (showDecimals && amount % 1 !== 0) {
    return `$${amount.toFixed(2)}`
  }

  // Default: show whole numbers with thousands separator
  return `$${Math.round(amount).toLocaleString()}`
}

/**
 * Format dates consistently for admin displays
 * @param date - Date string or Date object
 * @param format - Display format type
 */
export function formatAdminDate(
  date: string | Date,
  format: 'full' | 'short' | 'time' | 'relative' = 'short'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Check for invalid date
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }

  switch (format) {
    case 'full':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

    case 'time':
      return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })

    case 'relative':
      return getRelativeTime(dateObj)

    default:
      return dateObj.toLocaleDateString('en-US')
  }
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  // For older dates, show short format
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format percentage values consistently
 * @param value - Percentage value (can be 0-1 or 0-100)
 * @param options - Formatting options
 */
export function formatPercentage(
  value: number,
  options: {
    decimals?: number
    isDecimal?: boolean // If true, value is 0-1 instead of 0-100
  } = {}
): string {
  const { decimals = 1, isDecimal = false } = options

  // Convert decimal to percentage if needed
  const percentage = isDecimal ? value * 100 : value

  return `${percentage.toFixed(decimals)}%`
}

/**
 * Format large numbers with K/M suffixes
 * @param value - Number to format
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

/**
 * Format duration in milliseconds to human readable
 * @param ms - Duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
}
