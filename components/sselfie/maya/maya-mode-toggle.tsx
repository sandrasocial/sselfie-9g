"use client"

interface MayaModeToggleProps {
  currentMode: "classic" | "pro"
  onToggle: () => void
  variant?: "button" | "compact"
  className?: string
  /** When false, hides the one-line legend under the compact control (e.g. Feed Planner header). Default true. */
  showModeHint?: boolean
}

/**
 * Segmented control: **My Model** (classic) vs **Selfie** (pro).
 * - My Model: photos lean on your trained likeness.
 * - Selfie: library images, references, and uploads in chat.
 */
export default function MayaModeToggle({
  currentMode,
  onToggle,
  variant = "button",
  className = "",
  showModeHint = true,
}: MayaModeToggleProps) {
  const isProMode = currentMode === "pro"
  const isClassicMode = currentMode === "classic"

  if (variant === "compact") {
    if (className.includes("pointer-events-none")) {
      return (
        <div className={`flex items-center ${className}`}>
          <span className="text-sm font-medium text-[#8a8780]">
            {isProMode ? "SELFIE" : "MY MODEL"}
          </span>
        </div>
      )
    }

    const myModelActive = !isProMode
    const selfieActive = isProMode

    const control = (
      <div
        className={`inline-flex max-w-full rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] p-0.5 ${className}`}
      >
        <button
          type="button"
          onClick={() => {
            if (isProMode) {
              onToggle()
            }
          }}
          className={`px-2 sm:px-3 py-1.5 rounded-md transition-all touch-manipulation active:scale-95 min-h-[36px] sm:min-h-[40px] flex flex-col items-center justify-center gap-0 ${
            isProMode
              ? "bg-transparent text-[#8a8780] hover:bg-[rgba(175,170,162,0.10)] cursor-pointer"
              : "bg-[rgba(175,170,162,0.25)] text-[#f0ede8] cursor-default"
          }`}
          aria-pressed={myModelActive}
          aria-label={
            myModelActive
              ? "My Model — active. Photos use your trained likeness."
              : "Switch to My Model — photos use your trained likeness."
          }
          title="My Model: one trained face across your photos. Best when you have finished training."
          disabled={!isProMode}
        >
          <span className="text-[9px] sm:text-xs md:text-sm font-serif font-extralight tracking-[0.12em] sm:tracking-[0.2em] uppercase whitespace-nowrap">
            <span className="sm:hidden">Model</span>
            <span className="hidden sm:inline">MY MODEL</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isProMode) {
              onToggle()
            }
          }}
          className={`px-2 sm:px-3 py-1.5 rounded-md transition-all touch-manipulation active:scale-95 min-h-[36px] sm:min-h-[40px] flex flex-col items-center justify-center gap-0 ${
            isProMode
              ? "bg-[rgba(175,170,162,0.25)] text-[#f0ede8] cursor-default"
              : "bg-transparent text-[#8a8780] hover:bg-[rgba(175,170,162,0.10)] cursor-pointer"
          }`}
          aria-pressed={selfieActive}
          aria-label={
            selfieActive
              ? "Selfie mode — active. Library, references, and uploads in chat."
              : "Switch to Selfie mode — library, references, and uploads in chat."
          }
          title="Selfie: use your image library, reference uploads, and chat-first workflow (no training required)."
          disabled={isProMode}
        >
          <span className="text-[9px] sm:text-xs md:text-sm font-serif font-extralight tracking-[0.12em] sm:tracking-[0.2em] uppercase whitespace-nowrap">
            <span className="sm:hidden">Selfie</span>
            <span className="hidden sm:inline">SELFIE</span>
          </span>
        </button>
      </div>
    )

    if (!showModeHint) {
      return control
    }

    return (
      <div className="flex flex-col items-stretch gap-1">
        {control}
        <p className="hidden sm:block text-[9px] leading-snug text-[#8a8780] max-w-[14rem] md:max-w-[16rem]">
          <span className="font-medium text-[#a8a49c]">My model</span> uses your trained look.
          <span className="mx-1 text-[#666666]">·</span>
          <span className="font-medium text-[#a8a49c]">Selfie</span> uses references and uploads.
        </p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-stretch gap-1 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="touch-manipulation active:scale-95 px-4 py-2 rounded-lg transition-colors bg-[rgba(175,170,162,0.10)] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.20)] border border-[rgba(195,190,182,0.25)] min-h-[36px]"
        aria-label={
          isClassicMode
            ? "Switch to Selfie mode — library, references, and uploads in chat"
            : "Switch to My Model — trained likeness in every photo"
        }
        title={
          isClassicMode
            ? "Selfie: library images, references, and uploads. No training required."
            : "My Model: uses your trained likeness once training is complete."
        }
      >
        <span className="text-xs sm:text-sm font-serif font-extralight tracking-[0.2em] uppercase">
          {isClassicMode ? "Switch to Selfie mode" : "Switch to My Model"}
        </span>
      </button>
      {showModeHint ? (
        <p className="text-[9px] leading-snug text-[#8a8780] max-w-[17rem]">
          {isClassicMode
            ? "You are in My Model. Tap to use Selfie (library and uploads)."
            : "You are in Selfie. Tap to use My Model (trained likeness)."}
        </p>
      ) : null}
    </div>
  )
}
