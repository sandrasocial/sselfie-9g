"use client"

interface MayaModeToggleProps {
  currentMode: "classic" | "pro"
  onToggle: () => void
  variant?: "button" | "compact"
  surface?: "dark" | "light"
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
  surface = "dark",
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
            {isProMode ? "PHOTO" : "MY LOOK"}
          </span>
        </div>
      )
    }

    const myModelActive = !isProMode
    const selfieActive = isProMode
    const isLightSurface = surface === "light"

    const control = (
      <div
        className={`inline-flex max-w-full rounded-lg border p-0.5 ${
          isLightSurface
            ? "border-[#C5C6C8] bg-white"
            : "border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)]"
        } ${className}`}
      >
        <button
          type="button"
          onClick={() => {
            if (isProMode) {
              onToggle()
            }
          }}
          className={`flex min-h-11 flex-col items-center justify-center gap-0 rounded-md px-2 py-1.5 transition-all touch-manipulation active:scale-95 sm:px-3 ${
            isProMode
              ? isLightSurface
                ? "cursor-pointer bg-transparent text-[#4F5052] hover:bg-[#F1F2F2]"
                : "cursor-pointer bg-transparent text-[#8a8780] hover:bg-[rgba(175,170,162,0.10)]"
              : isLightSurface
                ? "cursor-default bg-[#0D0E10] text-white"
                : "cursor-default bg-[rgba(175,170,162,0.25)] text-[#f0ede8]"
          }`}
          aria-pressed={myModelActive}
          aria-label={
            myModelActive
              ? "My Look - active. Photos can keep your look consistent."
              : "Switch to My Look - photos can keep your look consistent."
          }
          title="My Look: use your saved photo setup for more consistent results."
          disabled={!isProMode}
        >
          <span className="text-[9px] sm:text-xs md:text-sm font-serif font-extralight tracking-[0.12em] sm:tracking-[0.2em] uppercase whitespace-nowrap">
            <span className="sm:hidden">Look</span>
            <span className="hidden sm:inline">MY LOOK</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isProMode) {
              onToggle()
            }
          }}
          className={`flex min-h-11 flex-col items-center justify-center gap-0 rounded-md px-2 py-1.5 transition-all touch-manipulation active:scale-95 sm:px-3 ${
            isProMode
              ? isLightSurface
                ? "cursor-default bg-[#0D0E10] text-white"
                : "cursor-default bg-[rgba(175,170,162,0.25)] text-[#f0ede8]"
              : isLightSurface
                ? "cursor-pointer bg-transparent text-[#4F5052] hover:bg-[#F1F2F2]"
                : "cursor-pointer bg-transparent text-[#8a8780] hover:bg-[rgba(175,170,162,0.10)]"
          }`}
          aria-pressed={selfieActive}
          aria-label={
            selfieActive
              ? "Photo mode - active. Use selfies, references, and uploads in chat."
              : "Switch to Photo mode - use selfies, references, and uploads in chat."
          }
          title="Photo: use selfies, references, and uploads. No setup required."
          disabled={isProMode}
        >
          <span className="text-[9px] sm:text-xs md:text-sm font-serif font-extralight tracking-[0.12em] sm:tracking-[0.2em] uppercase whitespace-nowrap">
            <span className="sm:hidden">Photo</span>
            <span className="hidden sm:inline">PHOTO</span>
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
          <span className="font-medium text-[#a8a49c]">My Look</span> keeps photos consistent.
          <span className="mx-1 text-[#666666]">·</span>
          <span className="font-medium text-[#a8a49c]">Photo</span> uses selfies and uploads.
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
            ? "Switch to Photo mode - selfies, references, and uploads in chat"
            : "Switch to My Look - consistent photo setup"
        }
        title={
          isClassicMode
            ? "Photo: selfies, references, and uploads. No setup required."
            : "My Look: uses your saved photo setup once it is ready."
        }
      >
        <span className="text-xs sm:text-sm font-serif font-extralight tracking-[0.2em] uppercase">
          {isClassicMode ? "Switch to Photo" : "Switch to My Look"}
        </span>
      </button>
      {showModeHint ? (
        <p className="text-[9px] leading-snug text-[#8a8780] max-w-[17rem]">
          {isClassicMode
            ? "You are using My Look. Tap to use a selfie or upload instead."
            : "You are using a photo upload. Tap to use your saved look."}
        </p>
      ) : null}
    </div>
  )
}
