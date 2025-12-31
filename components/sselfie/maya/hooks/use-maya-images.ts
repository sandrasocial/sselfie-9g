/**
 * useMayaImages Hook
 * 
 * Manages all image-related state for Maya:
 * - Pro Mode: Uses useImageLibrary hook for image library
 * - Classic Mode: Legacy uploadedImages state for backward compatibility
 * - Gallery images: Loads gallery images for Pro Mode
 * - Image persistence: localStorage for uploadedImages
 */

import { useState, useEffect, useCallback } from "react"
import { useImageLibrary } from "../../pro-mode/hooks/useImageLibrary"
import type { ImageLibrary } from "@/lib/maya/pro/category-system"

const UPLOADED_IMAGES_STORAGE_KEY = "mayaStudioProImages"

export interface UploadedImage {
  url: string
  type: "base" | "product"
  label?: string
  source?: "gallery" | "upload"
}

export interface GalleryImage {
  id: string
  image_url: string
  [key: string]: any
}

/**
 * Load uploadedImages from localStorage
 */
function loadUploadedImagesFromStorage(): UploadedImage[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const saved = localStorage.getItem(UPLOADED_IMAGES_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.error("[useMayaImages] ❌ Error loading uploadedImages from localStorage:", error)
    return []
  }
}

/**
 * Save uploadedImages to localStorage
 */
function saveUploadedImagesToStorage(images: UploadedImage[]) {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.setItem(UPLOADED_IMAGES_STORAGE_KEY, JSON.stringify(images))
    console.log("[useMayaImages] 💾 Saved uploadedImages to localStorage:", images.length, "images")
  } catch (error) {
    console.error("[useMayaImages] ❌ Error saving uploadedImages to localStorage:", error)
  }
}

export interface UseMayaImagesReturn {
  // Pro Mode: Image library (from useImageLibrary hook)
  imageLibrary: ImageLibrary
  isLibraryLoading: boolean
  libraryError: string | null
  libraryTotalImages: number
  loadLibrary: () => Promise<void>
  saveLibrary: (updates: Partial<ImageLibrary>) => Promise<void>
  addImages: (category: "selfies" | "products" | "people" | "vibes", imageUrls: string[]) => Promise<void>
  removeImages: (category: "selfies" | "products" | "people" | "vibes", imageUrls: string[]) => Promise<void>
  clearLibrary: () => Promise<void>
  updateIntent: (intent: string) => Promise<void>
  refreshLibrary: () => Promise<void>

  // Classic Mode: Legacy uploadedImages (for backward compatibility)
  uploadedImages: UploadedImage[]
  setUploadedImages: (images: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => void

  // Gallery images (for Pro Mode gallery selector)
  galleryImages: GalleryImage[]
  loadGalleryImages: () => Promise<void>
  isGalleryLoading: boolean
}

/**
 * Hook to manage Maya images
 * 
 * @param studioProMode - Whether Studio Pro Mode is enabled
 * @returns Image state and operations
 */
export function useMayaImages(studioProMode: boolean): UseMayaImagesReturn {
  // Pro Mode: Use centralized image library hook
  const {
    library: imageLibrary,
    isLoading: isLibraryLoading,
    error: libraryError,
    totalImages: libraryTotalImages,
    loadLibrary,
    saveLibrary,
    addImages,
    removeImages,
    clearLibrary,
    updateIntent,
    refreshLibrary,
  } = useImageLibrary()

  // Classic Mode: Legacy uploadedImages state (kept for backward compatibility)
  // In Pro Mode, use imageLibrary from useImageLibrary hook instead
  const [uploadedImages, setUploadedImagesState] = useState<UploadedImage[]>(() => {
    return loadUploadedImagesFromStorage()
  })

  // Gallery images state (loaded when Pro Mode is enabled)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [isGalleryLoading, setIsGalleryLoading] = useState(false)

  // Persist uploadedImages to localStorage when they change
  useEffect(() => {
    saveUploadedImagesToStorage(uploadedImages)
  }, [uploadedImages])

  // Load gallery images when Studio Pro mode is enabled
  useEffect(() => {
    if (studioProMode && galleryImages.length === 0 && !isGalleryLoading) {
      loadGalleryImages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioProMode]) // Only depend on studioProMode to trigger load

  // Wrapper for setUploadedImages that handles both direct values and updater functions
  const setUploadedImages = useCallback(
    (images: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => {
      if (typeof images === "function") {
        setUploadedImagesState(images)
      } else {
        setUploadedImagesState(images)
      }
    },
    []
  )

  // Load gallery images from API
  const loadGalleryImages = useCallback(async () => {
    setIsGalleryLoading(true)
    try {
      const response = await fetch("/api/gallery/images", {
        credentials: "include", // Include cookies for authentication
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[useMayaImages] Gallery fetch failed:", response.status, errorData)
        throw new Error(errorData.error || `Failed to load gallery: ${response.status}`)
      }

      const data = await response.json()
      if (data.images) {
        setGalleryImages(data.images)
        console.log("[useMayaImages] Loaded", data.images.length, "gallery images")
      } else {
        setGalleryImages([])
      }
    } catch (error) {
      console.error("[useMayaImages] Failed to load gallery:", error)
      // Set empty array on error so UI doesn't break
      setGalleryImages([])
    } finally {
      setIsGalleryLoading(false)
    }
  }, [])

  return {
    // Pro Mode: Image library
    imageLibrary,
    isLibraryLoading,
    libraryError,
    libraryTotalImages,
    loadLibrary,
    saveLibrary,
    addImages,
    removeImages,
    clearLibrary,
    updateIntent,
    refreshLibrary,

    // Classic Mode: Legacy uploadedImages
    uploadedImages,
    setUploadedImages,

    // Gallery images
    galleryImages,
    loadGalleryImages,
    isGalleryLoading,
  }
}
