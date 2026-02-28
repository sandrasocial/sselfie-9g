"use client"

interface GalleryEmptyStateProps {
  onStartNow: () => void
}

export function GalleryEmptyState({ onStartNow }: GalleryEmptyStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="mb-4 text-2xl font-serif font-extralight uppercase tracking-[0.2em] text-white sm:text-3xl">
        Ready to see what you actually look like?
      </h2>
      <p className="mb-8 max-w-md text-sm font-light leading-relaxed text-white/65 sm:text-base">
        Generate your first 3 brand photos in 2 minutes. No waiting. No overthinking.
        <br />
        <br />
        You&apos;re about to see yourself as a brand. It changes everything.
      </p>
      <button
        onClick={onStartNow}
        className="rounded-full border border-white/20 bg-white/8 px-10 py-4 text-sm font-medium uppercase tracking-[0.3em] text-white backdrop-blur-xl transition-all hover:bg-white/15"
      >
        CREATE WITH MAYA -&gt;
      </button>
      <p className="mt-4 text-xs font-light text-white/45">
        First 3 photos on us. No credit card required.
      </p>
    </div>
  )
}
