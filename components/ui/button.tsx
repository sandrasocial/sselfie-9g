import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive font-['Inter'] tracking-wide uppercase text-xs transition-colors duration-200",
  {
    variants: {
      variant: {
        default: 'bg-[#c8c4bb] text-[#0d0c0b] hover:bg-[#f0ede8] shadow-sm',
        destructive:
          'bg-[rgba(220,50,50,0.15)] border border-[rgba(220,50,50,0.30)] text-red-300 hover:bg-[rgba(220,50,50,0.25)]',
        outline:
          'border border-[rgba(195,190,182,0.25)] bg-transparent text-[#f0ede8] hover:bg-[rgba(175,170,162,0.10)] backdrop-blur-sm',
        secondary:
          'bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.20)] backdrop-blur-sm',
        ghost:
          'text-[#8a8780] hover:text-[#f0ede8] hover:bg-[rgba(175,170,162,0.08)]',
        link: 'text-[#a8a49c] underline-offset-4 hover:underline hover:text-[#c8c4bb]',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
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
