/**
 * AdminErrorState - Standardized error state for admin pages
 */

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  suggestions?: string[]
  fullScreen?: boolean
}

export function AdminErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  suggestions,
  fullScreen = true,
}: AdminErrorStateProps) {
  const content = (
    <div className="max-w-md w-full">
      <div className="bg-white/50 backdrop-blur-2xl rounded-3xl p-8 border border-white/60 shadow-xl shadow-stone-900/10">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Error Icon */}
          <div className="p-6 bg-red-50 rounded-2xl">
            <AlertCircle 
              size={40} 
              className="text-red-600" 
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>

          {/* Error Message */}
          <div className="space-y-3">
            <h2 className="text-2xl font-['Times_New_Roman'] font-extralight tracking-[0.2em] uppercase text-stone-950">
              {title}
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Suggestions */}
          {suggestions && suggestions.length > 0 && (
            <div className="w-full text-left bg-stone-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-stone-700 uppercase tracking-wider">
                Try this:
              </p>
              <ul className="text-xs text-stone-600 space-y-1">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-stone-400">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="w-full flex flex-col gap-3">
            {onRetry && (
              <Button
                onClick={onRetry}
                className="w-full flex items-center justify-center gap-2 bg-stone-950 text-white hover:bg-stone-800 rounded-2xl py-5 transition-colors"
                aria-label="Retry loading data"
              >
                <RefreshCw size={16} aria-hidden="true" />
                <span className="text-sm tracking-[0.15em] uppercase">
                  Retry
                </span>
              </Button>
            )}

            <a
              href="/admin"
              className="w-full flex items-center justify-center text-sm tracking-[0.15em] uppercase font-light border rounded-2xl py-5 transition-colors hover:bg-stone-100/30 text-stone-600 border-stone-300/40"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100/50 to-stone-50 flex items-center justify-center p-4"
        role="alert"
        aria-live="assertive"
      >
        {content}
      </div>
    )
  }

  return (
    <div 
      className="flex items-center justify-center p-4"
      role="alert"
      aria-live="assertive"
    >
      {content}
    </div>
  )
}
