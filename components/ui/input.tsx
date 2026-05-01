import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full rounded-[8px]',
        'bg-[color:var(--app-input-bg)]',
        'border border-[color:var(--app-input-border)]',
        'px-3 py-2 text-sm text-[color:var(--app-text-primary)]',
        'placeholder:text-[color:var(--app-text-muted)]',
        'backdrop-blur-sm',
        'focus-visible:outline-none',
        'focus-visible:ring-1',
        'focus-visible:ring-[color:var(--app-focus-ring)]',
        'focus-visible:border-[color:var(--app-focus-ring)]',
        'transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:text-[color:var(--app-text-primary)] file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
