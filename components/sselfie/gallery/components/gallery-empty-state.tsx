"use client"

interface GalleryEmptyStateProps {
  onStartNow: () => void
  hasPaidAccess?: boolean
}

export function GalleryEmptyState({ onStartNow, hasPaidAccess = false }: GalleryEmptyStateProps) {
  const headline = hasPaidAccess ? "Your gallery starts with one photo." : "Ready to see what you actually look like?"
  const body = hasPaidAccess
    ? "Create a photo in Maya and it will show up here."
    : "Generate your first 3 brand photos in 2 minutes. No waiting. No overthinking."
  const followup = hasPaidAccess
    ? "Your credits are ready when you are."
    : "You're about to see yourself as a brand. It changes everything."
  const footer = hasPaidAccess ? "Create with Maya to add your first photo." : "First 3 photos on us. No credit card required."

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-full max-w-md rounded-[16px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.74)] px-8 py-12 shadow-[0_18px_50px_rgba(61,56,48,0.08)] backdrop-blur-[18px]">
        <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[color:var(--app-text-secondary)] mb-4">Gallery</p>
        <h2 className="mb-4 text-2xl font-['Cormorant_Garamond'] font-light text-[color:var(--app-text-primary)] sm:text-3xl">
          {headline}
        </h2>
        <p className="mb-8 max-w-md text-sm font-light leading-relaxed text-[color:var(--app-text-secondary)] sm:text-base">
          {body}
          <br />
          <br />
          {followup}
        </p>
        <button
          onClick={onStartNow}
          className="rounded-[6px] bg-[color:var(--app-btn-primary-bg)] px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90"
        >
          CREATE WITH MAYA
        </button>
        <p className="mt-4 text-xs font-light text-[color:var(--app-text-secondary)]">
          {footer}
        </p>
      </div>
    </div>
  )
}
