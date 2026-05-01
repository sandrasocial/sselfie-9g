"use client"

import Image from "next/image"
import type { GalleryImage } from "@/lib/data/images"

interface GalleryTopSuggestionsProps {
  images: GalleryImage[]
  onSelect: () => void
}

export function GalleryTopSuggestions({ images, onSelect }: GalleryTopSuggestionsProps) {
  if (!images.length) return null

  return (
    <div className="rounded-[16px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.74)] p-4 shadow-[0_18px_50px_rgba(61,56,48,0.08)] backdrop-blur-[18px] sm:p-5">
      <h3 className="text-xs uppercase tracking-[0.3em] text-[color:var(--app-text-secondary)]">Your top 3 for profile photo</h3>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={onSelect}
            className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)]"
          >
            <Image src={img.image_url} alt="Top image" fill className="object-cover" sizes="80px" />
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs font-light text-[color:var(--app-text-secondary)]">Tap to set as profile photo</p>
    </div>
  )
}
