"use client"

function safeFilename(value: string): string {
  const cleaned = value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "")
  return cleaned || "sselfie-creation.png"
}

function clickDownload(url: string, filename: string): void {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = safeFilename(filename)
  anchor.rel = "noreferrer"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function vercelBlobDownloadUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (!url.hostname.endsWith(".blob.vercel-storage.com")) return null
    // Vercel Blob's download URL sets Content-Disposition: attachment. A plain cross-origin
    // `download` attribute is allowed to open a preview tab instead, which is not a download.
    url.searchParams.set("download", "1")
    return url.toString()
  } catch {
    return null
  }
}

/**
 * Initiates a browser download and returns only after the click has been dispatched.
 * Analytics should be recorded after this returns true, never for opening a preview tab.
 */
export async function initiateAssetDownload(url: string, filename: string): Promise<boolean> {
  if (!url || typeof document === "undefined") return false

  const blobDownloadUrl = vercelBlobDownloadUrl(url)
  if (blobDownloadUrl) {
    clickDownload(blobDownloadUrl, filename)
    return true
  }

  try {
    const parsed = new URL(url, window.location.href)
    if (
      parsed.origin === window.location.origin ||
      parsed.protocol === "blob:" ||
      parsed.protocol === "data:"
    ) {
      clickDownload(parsed.toString(), filename)
      return true
    }

    // Non-Blob providers do not share Vercel's ?download=1 contract. Fetch their asset first
    // and download a same-origin object URL; if CORS blocks it, return false and do not record
    // a successful download or review-eligibility event.
    const response = await fetch(parsed.toString(), { credentials: "omit" })
    if (!response.ok) return false
    const objectUrl = URL.createObjectURL(await response.blob())
    clickDownload(objectUrl, filename)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
    return true
  } catch {
    return false
  }
}
