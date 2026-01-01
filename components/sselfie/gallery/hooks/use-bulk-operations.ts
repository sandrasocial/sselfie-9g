"use client"

import { useState } from "react"
import { triggerHaptic, triggerSuccessHaptic, triggerErrorHaptic } from "@/lib/utils/haptics"
import type { GalleryImage } from "@/lib/data/images"
import { bulkDownloadImages } from "../utils/bulk-download"

interface UseBulkOperationsReturn {
  isProcessing: boolean
  bulkDelete: (imageIds: string[], mutate: () => void, setSelectedImages: (images: Set<string>) => void, setSelectionMode: (mode: boolean) => void) => Promise<void>
  bulkFavorite: (imageIds: string[], mutate: () => void, setSelectedImages: (images: Set<string>) => void, setSelectionMode: (mode: boolean) => void) => Promise<void>
  bulkSave: (imageIds: string[], mutate: () => void, setSelectedImages: (images: Set<string>) => void, setSelectionMode: (mode: boolean) => void) => Promise<void>
  bulkDownload: (imageIds: string[], images: GalleryImage[], setSelectedImages: (images: Set<string>) => void, setSelectionMode: (mode: boolean) => void) => Promise<void>
}

export function useBulkOperations(): UseBulkOperationsReturn {
  const [isProcessing, setIsProcessing] = useState(false)

  const bulkDelete = async (
    imageIds: string[],
    mutate: () => void,
    setSelectedImages: (images: Set<string>) => void,
    setSelectionMode: (mode: boolean) => void
  ) => {
    if (imageIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${imageIds.length} image(s)?`)) return

    setIsProcessing(true)
    triggerHaptic("medium")

    try {
      await Promise.all(
        imageIds.map((imageId) =>
          fetch("/api/images/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageId }),
          })
        )
      )
      triggerSuccessHaptic()
      mutate()
      setSelectedImages(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error("[Gallery] Error bulk deleting:", error)
      triggerErrorHaptic()
      alert("Failed to delete some images. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const bulkFavorite = async (
    imageIds: string[],
    mutate: () => void,
    setSelectedImages: (images: Set<string>) => void,
    setSelectionMode: (mode: boolean) => void
  ) => {
    if (imageIds.length === 0) return

    setIsProcessing(true)
    triggerHaptic("light")

    try {
      await Promise.all(
        imageIds.map((imageId) =>
          fetch("/api/images/favorite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageId, isFavorite: true }),
          })
        )
      )
      triggerSuccessHaptic()
      mutate()
      setSelectedImages(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error("[Gallery] Error bulk favoriting:", error)
      triggerErrorHaptic()
      alert("Failed to favorite some images. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const bulkSave = async (
    imageIds: string[],
    mutate: () => void,
    setSelectedImages: (images: Set<string>) => void,
    setSelectionMode: (mode: boolean) => void
  ) => {
    if (imageIds.length === 0) return

    setIsProcessing(true)
    triggerHaptic("medium")

    try {
      const response = await fetch("/api/images/bulk-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds }),
      })

      if (!response.ok) {
        throw new Error("Failed to save images")
      }

      triggerSuccessHaptic()
      mutate()
      setSelectedImages(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error("[Gallery] Error bulk saving:", error)
      triggerErrorHaptic()
      alert("Failed to save some images. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const bulkDownload = async (
    imageIds: string[],
    images: GalleryImage[],
    setSelectedImages: (images: Set<string>) => void,
    setSelectionMode: (mode: boolean) => void
  ) => {
    if (imageIds.length === 0) return

    setIsProcessing(true)
    triggerHaptic("light")

    try {
      await bulkDownloadImages(imageIds, images, setSelectedImages, setSelectionMode)
    } catch (error) {
      console.error("[Gallery] Error bulk downloading:", error)
      triggerErrorHaptic()
      alert("Failed to download some images. Please try again.")
      setIsProcessing(false)
    }
  }

  return {
    isProcessing,
    bulkDelete,
    bulkFavorite,
    bulkSave,
    bulkDownload,
  }
}

