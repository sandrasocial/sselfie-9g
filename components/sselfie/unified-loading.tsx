interface UnifiedLoadingProps {
  message?: string
  variant?: "screen" | "section" | "inline"
  className?: string
}

/**
 * UnifiedLoading - Consistent loading component across SSELFIE app
 * 
 * Variants:
 * - screen: Large loading state for full screen loads (default)
 * - section: Medium loading state for section loads
 * - inline: Small loading state for inline content
 */
export default function UnifiedLoading({ 
  message = "Loading...", 
  variant = "screen",
  className = ""
}: UnifiedLoadingProps) {
  // Size configurations based on variant
  const sizeConfig = {
    screen: {
      container: "min-h-[400px]",
      spinner: "w-24 h-24",
      logo: "p-4",
      message: "text-sm",
      spacing: "space-y-6"
    },
    section: {
      container: "min-h-[200px]",
      spinner: "w-16 h-16",
      logo: "p-3",
      message: "text-xs",
      spacing: "space-y-4"
    },
    inline: {
      container: "min-h-0",
      spinner: "w-8 h-8",
      logo: "p-2",
      message: "text-xs",
      spacing: "space-y-2"
    }
  }

  const config = sizeConfig[variant]
  const showMessage = variant !== "inline" || message !== "Loading..."

  return (
    <div className={`flex items-center justify-center ${config.container} ${className}`}>
      <div className={`text-center ${config.spacing}`}>
        {/* Logo with spinning circle */}
        <div className={`relative ${config.spinner} mx-auto`}>
          {/* Spinning circle */}
          <div className="absolute inset-0 border-2 border-stone-200 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>

          {/* Logo in center */}
          <div className={`absolute inset-0 flex items-center justify-center ${config.logo}`}>
            <img 
              src="/icon-192.png" 
              alt="SSELFIE" 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>

        {/* Loading text - only show for screen and section variants, or if custom message provided for inline */}
        {showMessage && (
          <p className={`${config.message} tracking-[0.15em] uppercase font-light text-stone-600`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
