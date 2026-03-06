"use client"

interface GalleryEmptyStateProps {
  onStartNow: () => void
}

export function GalleryEmptyState({ onStartNow }: GalleryEmptyStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-full max-w-md bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl px-8 py-12">
        <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780] mb-4">Gallery</p>
        <h2 className="mb-4 text-2xl font-['Cormorant_Garamond'] font-light text-[#f0ede8] sm:text-3xl">
          Ready to see what you actually look like?
        </h2>
        <p className="mb-8 max-w-md text-sm font-light leading-relaxed text-[#8a8780] sm:text-base">
          Generate your first 3 brand photos in 2 minutes. No waiting. No overthinking.
          <br />
          <br />
          You&apos;re about to see yourself as a brand. It changes everything.
        </p>
        <button
          onClick={onStartNow}
          className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors"
        >
          CREATE WITH MAYA
        </button>
        <p className="mt-4 text-xs font-light text-[#8a8780]">
          First 3 photos on us. No credit card required.
        </p>
      </div>
    </div>
  )
}
