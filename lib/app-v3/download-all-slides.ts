"use client"

// Shared bulk-download helper for any multi-image Maya result (carousel, story sequence,
// full photoshoot). One zip, one click, instead of downloading each slide one by one.
// Mirrors the existing house pattern in components/feed-planner/feed-post-card.tsx.

import { safeFilename } from "@/lib/app-v3/download-asset"

/**
 * Fetches every url, bundles them into a single .zip, and triggers one browser download.
 * Returns false (never throws) if any slide could not be fetched, so the caller can show a
 * plain "try again" state instead of a half-downloaded, silently-missing-slides zip.
 */
export async function downloadAllSlidesAsZip(
  urls: string[],
  filenamePrefix: string
): Promise<boolean> {
  if (typeof document === "undefined" || urls.length === 0) return false

  try {
    const { default: JSZip } = await import("jszip")
    const zip = new JSZip()
    const prefix = safeFilename(filenamePrefix).replace(/\.[a-z0-9]+$/i, "") || "sselfie-slides"

    await Promise.all(
      urls.map(async (url, index) => {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Slide ${index + 1} could not be downloaded`)
        zip.file(`${prefix}-slide-${String(index + 1).padStart(2, "0")}.png`, await response.arrayBuffer())
      })
    )

    const bundle = await zip.generateAsync({ type: "blob" })
    const downloadUrl = URL.createObjectURL(bundle)
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = `${prefix}.zip`
    link.rel = "noreferrer"
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 30_000)
    return true
  } catch {
    return false
  }
}
