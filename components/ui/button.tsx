import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[color:var(--app-focus-ring)] focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive font-['Inter'] tracking-wide uppercase text-xs transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 ease-out active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          'bg-[color:var(--app-btn-primary-bg)] border border-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] hover:opacity-90 shadow-[0_12px_32px_rgba(61,56,48,0.14)]',
        destructive:
          'bg-[rgba(164,59,46,0.16)] border border-[rgba(164,59,46,0.35)] text-[color:var(--color-porcelain)] hover:bg-[rgba(164,59,46,0.24)]',
        outline:
          'border border-[color:var(--app-border)] bg-transparent text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-bg)] backdrop-blur-sm',
        secondary:
          'bg-[color:var(--app-btn-secondary-bg)] border border-[color:var(--app-glass-border)] text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)] backdrop-blur-sm',
        ghost:
          'text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-bg)]',
        link: 'text-[color:var(--app-text-primary)] underline-offset-4 hover:underline hover:text-[color:var(--app-text-secondary)]',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-[6px] gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-[6px] px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
