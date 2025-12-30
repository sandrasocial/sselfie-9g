import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import LoadingSpinner from "./loading-spinner"
import { cn } from "@/lib/utils"

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean
  loadingText?: string
}

/**
 * LoadingButton - Button component with built-in loading state
 * 
 * Automatically shows spinner and disables button when isLoading is true
 */
export default function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || isLoading}
      className={cn("relative", className)}
      {...props}
    >
      {isLoading && (
        <LoadingSpinner 
          size="sm" 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" 
        />
      )}
      <span className={cn("flex items-center gap-2", isLoading && "opacity-0")}>
        {loadingText && isLoading ? loadingText : children}
      </span>
    </Button>
  )
}

