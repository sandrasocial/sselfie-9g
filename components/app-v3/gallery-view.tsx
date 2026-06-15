"use client"

// SSELFIE Studio 3.0 — Gallery (MAYA-REBUILD-05 Phase H).
// "Where did my photo go?" — every image she's made, newest first. Tap to open fullscreen.
// Reuses the existing ai_images data so her past SSELFIE shoots show up here too.

import { memo, startTransition, useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { ImageLightbox } from "./image-lightbox"

// Memoized with a STABLE onOpen, so opening the lightbox/composer (a state change) does not
// re-render every gallery image at once (that synchronous commit tripped INP).
const GalleryTile = memo(function GalleryTile({
  url,
  index,
  onOpen,
}: {
  url: string
  index: number
  onOpen: (i: number) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className="group relative aspect-[4/5] overflow-hidden rounded-[6px] border border-[#C5C6C8]/50 bg-[#F1F2F2]"
    >
      <Image
        src={url}
        alt={`Gallery image ${index + 1}`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        sizes="(max-width:640px) 45vw, 240px"
      />
    </button>
  )
})

export function GalleryView() {
  const [images, setImages] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Stable so the memoized tiles don't re-render when the lightbox/composer opens.
  const openLightbox = useCallback((i: number) => startTransition(() => setLightboxIndex(i)), [])

  useEffect(() => {
    fetch("/api/app-v3/gallery")
      .then(r => r.json())
      .then(d => setImages(Array.isArray(d?.images) ? d.images : []))
      .catch(() => setError("Couldn't load your gallery. Try again."))
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Photos</p>
          <h1 className="mt-2 font-serif text-[28px] font-light leading-tight text-[#0D0E10] sm:text-[30px]">
            Everything you&apos;ve made
          </h1>
        </div>
      </header>

      {images === null && !error && (
        <p className="text-[13px] text-[#818283]">Loading your gallery…</p>
      )}
      {error && <p className="text-[13px] text-[#282728]">{error}</p>}
      {images && images.length === 0 && (
        <div className="rounded-[8px] border border-dashed border-[#C5C6C8] bg-white p-8 text-center">
          <p className="text-[15px] text-[#282728]">Nothing here yet.</p>
          <p className="mt-1 text-[13px] text-[#818283]">
            Create your first shot and it&apos;ll live here.
          </p>
        </div>
      )}

      {images && images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((url, i) => (
            <GalleryTile key={url} url={url} index={i} onOpen={openLightbox} />
          ))}
        </div>
      )}

      {lightboxIndex !== null && images && (
        <ImageLightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
