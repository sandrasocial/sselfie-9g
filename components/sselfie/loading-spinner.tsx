interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * LoadingSpinner - Reusable spinner component for buttons and inline use
 * 
 * Sizes:
 * - sm: w-4 h-4 (for buttons)
 * - md: w-6 h-6 (for inline content)
 * - lg: w-8 h-8 (for sections)
 */
export default function LoadingSpinner({ 
  size = "md",
  className = ""
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="relative w-full h-full">
        {/* Spinning circle */}
        <div className="absolute inset-0 border-2 border-stone-200 rounded-full"></div>
        <div className="absolute inset-0 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  )
}

