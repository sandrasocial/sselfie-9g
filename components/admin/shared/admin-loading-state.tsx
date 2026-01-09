/**
 * AdminLoadingState - Standardized loading state for admin pages
 */

import { Loader2 } from 'lucide-react'

interface AdminLoadingStateProps {
  message?: string
  fullScreen?: boolean
}

export function AdminLoadingState({
  message = 'Loading...',
  fullScreen = true,
}: AdminLoadingStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader2 
        className="w-8 h-8 animate-spin text-stone-600" 
        aria-hidden="true"
      />
      <p className="text-sm tracking-[0.2em] uppercase text-stone-400">
        {message}
      </p>
    </div>
  )

  if (fullScreen) {
    return (
      <div 
        className="min-h-screen bg-stone-50 flex items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        {content}
      </div>
    )
  }

  return (
    <div 
      className="flex items-center justify-center p-12"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {content}
    </div>
  )
}
