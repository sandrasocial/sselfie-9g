"use client"

// SSELFIE Studio 3.0 — reference library picker (MAYA-REBUILD-05 Phase B).
// Pick a previously uploaded selfie instead of re-uploading. Loads the admin's saved
// app-v3 reference selfies from /api/app-v3/reference-library.

import { useEffect, useState } from "react"
import Image from "next/image"

interface ReferenceLibraryModalProps {
  open: boolean
  onClose: () => void
  onPick: (url: string) => void
}

export function ReferenceLibraryModal({ open, onClose, onPick }: ReferenceLibraryModalProps) {
  const [images, setImages] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setImages(null)
    setError(null)
    fetch("/api/app-v3/reference-library")
      .then((r) => r.json())
      .then((d) => setImages(Array.isArray(d?.images) ? d.images : []))
      .catch(() => setError("Couldn't load your photos. Try again."))
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0D0E10]/40 p-6 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none">
      <div className="w-full max-w-md rounded-[10px] bg-[#F8FAFA] p-6 shadow-xl animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Your selfies</p>
            <h3 className="mt-2 font-serif text-[22px] font-light leading-tight text-[#0D0E10]">Use a past selfie</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Close
          </button>
        </div>

        <div className="mt-5">
          {images === null && !error && <p className="text-[13px] text-[#818283]">Loading…</p>}
          {error && <p className="text-[13px] text-[#282728]">{error}</p>}
          {images && images.length === 0 && (
            <p className="text-[13px] leading-relaxed text-[#818283]">
              No saved selfies yet. Upload one and it'll show up here next time.
            </p>
          )}
          {images && images.length > 0 && (
            <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto">
              {images.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    onPick(url)
                    onClose()
                  }}
                  className="relative aspect-square overflow-hidden rounded-[4px] border border-[#C5C6C8]/60 transition-colors hover:border-[#0D0E10]"
                >
                  <Image src={url} alt="Past selfie" fill className="object-cover" sizes="120px" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
