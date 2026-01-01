"use client"

import { triggerSuccessHaptic } from "@/lib/utils/haptics"
import type { GalleryImage } from "@/lib/data/images"
import { categorizeImage } from "./categorize-image"

export async function bulkDownloadImages(
  imageIds: string[],
  images: GalleryImage[],
  setSelectedImages: (images: Set<string>) => void,
  setSelectionMode: (mode: boolean) => void
): Promise<void> {
  if (imageIds.length === 0) return

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const selectedImageList = imageIds

  // On mobile, use Share API for camera roll saving
  if (isMobile && navigator.share) {
    try {
      // Fetch all images as blobs
      const imagePromises = selectedImageList.map(async (imageId) => {
        const image = images.find((img) => img.id === imageId)
        if (!image) return null

        const response = await fetch(image.image_url)
        if (!response.ok) throw new Error(`Failed to fetch image ${imageId}`)
        const blob = await response.blob()
        const fileName = `${categorizeImage(image)}-${imageId}.png`
        return new File([blob], fileName, { type: "image/png" })
      })

      const files = (await Promise.all(imagePromises)).filter((f): f is File => f !== null)

      if (files.length === 0) {
        throw new Error("No valid images to download")
      }

      // Try sharing all files at once (supported on iOS 14.5+ and some Android browsers)
      try {
        const shareData: ShareData = {
          files: files,
          title: files.length === 1 ? "sselfie Image" : `${files.length} sselfie Images`,
        }

        // Check if we can share multiple files (if canShare is available)
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData)
          triggerSuccessHaptic()
          setSelectedImages(new Set())
          setSelectionMode(false)
          return
        }
      } catch (shareError: any) {
        // If sharing multiple files fails or is not supported, share one by one
        if (shareError.name !== "AbortError" && files.length > 1) {
          for (let i = 0; i < files.length; i++) {
            try {
              const shareData: ShareData = {
                files: [files[i]],
                title: `sselfie Image ${i + 1} of ${files.length}`,
              }

              if (!navigator.canShare || navigator.canShare(shareData)) {
                await navigator.share(shareData)
                // Small delay between shares to avoid overwhelming the user
                if (i < files.length - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 500))
                }
              }
            } catch (singleShareError: any) {
              if (singleShareError.name === "AbortError") {
                // User cancelled - stop sharing remaining images
                break
              }
              console.error(`[Gallery] Error sharing image ${i + 1}:`, singleShareError)
            }
          }

          triggerSuccessHaptic()
          setSelectedImages(new Set())
          setSelectionMode(false)
          return
        } else if (shareError.name === "AbortError") {
          // User cancelled
          return
        }
      }
    } catch (shareError: any) {
      // Share API failed, fall through to download method
      // Share API failed, falling back to download method
      console.error("[Gallery] Share API failed:", shareError?.message)
    }
  }

  // Fallback: Desktop or Share API not available - use download method
  for (let i = 0; i < selectedImageList.length; i++) {
    const imageId = selectedImageList[i]
    const image = images.find((img) => img.id === imageId)
    if (image) {
      try {
        const response = await fetch(image.image_url)
        if (!response.ok) throw new Error(`Failed to fetch image ${imageId}`)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${categorizeImage(image)}-${imageId}.png`
        a.style.display = "none"
        document.body.appendChild(a)
        a.click()

        setTimeout(() => {
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }, 100)

        // Add delay between downloads to avoid browser blocking
        if (i < selectedImageList.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      } catch (error) {
        console.error(`[Gallery] Error downloading image ${imageId}:`, error)
      }
    }
  }

  triggerSuccessHaptic()
  setSelectedImages(new Set())
  setSelectionMode(false)
}

