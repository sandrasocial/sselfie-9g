import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full rounded-xl',
        'bg-[color:var(--glass-input-bg)]',
        'border border-[color:var(--glass-input-border)]',
        'px-3 py-2 text-sm text-[color:var(--color-porcelain)]',
        'placeholder:text-[color:var(--color-smoke)]',
        'backdrop-blur-sm',
        'focus-visible:outline-none',
        'focus-visible:ring-1',
        'focus-visible:ring-[rgba(195,190,182,0.50)]',
        'focus-visible:border-[rgba(195,190,182,0.50)]',
        'transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:text-[color:var(--color-porcelain)] file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
