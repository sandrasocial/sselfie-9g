import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full rounded-xl',
        'bg-[rgba(175,170,162,0.08)]',
        'border border-[rgba(195,190,182,0.20)]',
        'px-3 py-2 text-sm text-[#f0ede8]',
        'placeholder:text-[#8a8780]',
        'backdrop-blur-sm',
        'focus-visible:outline-none',
        'focus-visible:ring-1',
        'focus-visible:ring-[rgba(195,190,182,0.50)]',
        'focus-visible:border-[rgba(195,190,182,0.50)]',
        'transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:text-[#f0ede8] file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
