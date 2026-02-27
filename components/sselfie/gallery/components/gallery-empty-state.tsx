"use client"

import { ArrowRight } from "lucide-react"

interface GalleryEmptyStateProps {
  onStartNow: () => void
}

export function GalleryEmptyState({ onStartNow }: GalleryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 text-center">
      <h2 className="text-2xl sm:text-3xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
        Ready to see what you actually look like?
      </h2>
      <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed max-w-md mb-8">
        Generate your first 3 brand photos in 2 minutes. No waiting. No overthinking.
        <br />
        <br />
        You&apos;re about to see yourself as a brand. It changes everything.
      </p>
      <button
        onClick={onStartNow}
        className="px-10 py-4 bg-stone-950 text-white text-sm uppercase tracking-[0.3em] font-medium hover:bg-stone-800 transition-all flex items-center gap-2"
      >
        Start Now
        <ArrowRight size={16} />
      </button>
      <p className="text-xs text-stone-500 font-light mt-4">
        First 3 photos on us. No credit card required.
      </p>
    </div>
  )
}
