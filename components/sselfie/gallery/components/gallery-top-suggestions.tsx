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
    <div className="border border-stone-200 bg-white/80 p-4 sm:p-5">
      <h3 className="text-xs uppercase tracking-[0.3em] text-stone-500">Your top 3 for profile photo</h3>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={onSelect}
            className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200"
          >
            <Image src={img.image_url} alt="Top image" fill className="object-cover" sizes="80px" />
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-500 font-light">Tap to set as profile photo</p>
    </div>
  )
}
