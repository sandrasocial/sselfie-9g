"use client"

// Shared bulk-download helper for any multi-image Maya result (carousel, story sequence,
// full photoshoot). 2026-07-29 (Sandra): save every photo straight to the device — a .zip
// was a dead end on phones (members couldn't open it or get the images into their camera
// roll). Each slide downloads as its own image file, sequentially, so mobile browsers
// register every save.

import { safeFilename } from "@/lib/app-v3/download-asset"

function clickDownload(url: string, filename: string): void {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noreferrer"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

/**
 * Downloads every url as its own image file. Returns false if any slide could not be
 * fetched, so the caller can show a "try again" state (already-saved slides stay saved).
 */
export async function downloadAllSlides(urls: string[], filenamePrefix: string): Promise<boolean> {
  if (typeof document === "undefined" || urls.length === 0) return false

  const prefix = safeFilename(filenamePrefix).replace(/\.[a-z0-9]+$/i, "") || "sselfie-slides"
  let allSaved = true
  for (let index = 0; index < urls.length; index += 1) {
    try {
      const response = await fetch(urls[index])
      if (!response.ok) throw new Error(`Slide ${index + 1} could not be downloaded`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      clickDownload(objectUrl, `${prefix}-${String(index + 1).padStart(2, "0")}.png`)
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
    } catch {
      allSaved = false
    }
    // A short beat between saves keeps mobile browsers from dropping downloads.
    if (index < urls.length - 1) await new Promise(resolve => setTimeout(resolve, 400))
  }
  return allSaved
}

/** @deprecated 2026-07-29 — kept as an alias so nothing bundles a zip anymore. */
export const downloadAllSlidesAsZip = downloadAllSlides
