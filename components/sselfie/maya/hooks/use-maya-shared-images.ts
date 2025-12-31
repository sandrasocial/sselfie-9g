/**
 * useMayaSharedImages Hook
 * 
 * Manages shared images between Photos and Videos tabs:
 * - Tracks images generated in Photos tab
 * - Provides shared images to Videos tab
 * - Persists shared images in session (optional)
 * - Deduplicates images
 * 
 * **Usage:**
 * - Call `addImage()` when an image is generated in Photos tab
 * - Call `getSharedImages()` to get images for Videos tab
 * - Call `clearSharedImages()` to reset (e.g., on new chat)
 */

import { useState, useCallback, useMemo } from "react"

export interface SharedImage {
  url: string
  id: string
  prompt?: string
  description?: string
  category?: string
  createdAt: number
}

interface UseMayaSharedImagesReturn {
  // Shared images array
  sharedImages: SharedImage[]
  
  // Operations
  addImage: (image: Omit<SharedImage, "createdAt">) => void
  addImages: (images: Array<Omit<SharedImage, "createdAt">>) => void
  removeImage: (imageId: string) => void
  clearSharedImages: () => void
  
  // Getters
  getSharedImages: () => SharedImage[]
  hasSharedImages: boolean
  sharedImagesCount: number
}

const STORAGE_KEY = "mayaSharedImages"

/**
 * Load shared images from sessionStorage (optional persistence)
 */
function loadSharedImagesFromStorage(): SharedImage[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    
    const parsed = JSON.parse(saved) as SharedImage[]
    // Filter out old images (older than 24 hours)
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    return parsed.filter(img => (now - img.createdAt) < oneDay)
  } catch (error) {
    console.error("[useMayaSharedImages] ❌ Error loading shared images from storage:", error)
    return []
  }
}

/**
 * Save shared images to sessionStorage (optional persistence)
 */
function saveSharedImagesToStorage(images: SharedImage[]) {
  if (typeof window === "undefined") {
    return
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(images))
  } catch (error) {
    console.error("[useMayaSharedImages] ❌ Error saving shared images to storage:", error)
  }
}

/**
 * Extract images from message parts
 */
function extractImagesFromMessage(message: any): SharedImage[] {
  if (!message?.parts || !Array.isArray(message.parts)) {
    return []
  }

  const images: SharedImage[] = []
  
  message.parts.forEach((part: any, index: number) => {
    if (part.type === "image" && part.image) {
      images.push({
        url: part.image,
        id: `msg-${message.id || Date.now()}-${index}`,
        prompt: message.content || "",
        description: message.content || "",
        category: undefined,
        createdAt: Date.now(),
      })
    }
  })

  return images
}

/**
 * Extract images from messages array
 */
function extractImagesFromMessages(messages: any[]): SharedImage[] {
  const allImages: SharedImage[] = []
  
  messages.forEach((message) => {
    const images = extractImagesFromMessage(message)
    allImages.push(...images)
  })

  // Deduplicate by URL
  const seen = new Set<string>()
  return allImages.filter((img) => {
    if (seen.has(img.url)) {
      return false
    }
    seen.add(img.url)
    return true
  })
}

export function useMayaSharedImages(
  options: {
    persistToStorage?: boolean
    autoExtractFromMessages?: boolean
    messages?: any[]
  } = {}
): UseMayaSharedImagesReturn {
  const { persistToStorage = true, autoExtractFromMessages = false, messages = [] } = options

  // Initialize from storage if persistence is enabled
  const [sharedImages, setSharedImages] = useState<SharedImage[]>(() => {
    if (persistToStorage) {
      return loadSharedImagesFromStorage()
    }
    return []
  })

  // Auto-extract images from messages if enabled
  useMemo(() => {
    if (autoExtractFromMessages && messages.length > 0) {
      const extracted = extractImagesFromMessages(messages)
      if (extracted.length > 0) {
        setSharedImages((prev) => {
          // Merge with existing, deduplicate by URL
          const merged = [...prev]
          const seen = new Set(prev.map(img => img.url))
          
          extracted.forEach((img) => {
            if (!seen.has(img.url)) {
              merged.push(img)
              seen.add(img.url)
            }
          })
          
          return merged
        })
      }
    }
  }, [autoExtractFromMessages, messages])

  // Save to storage when images change (if persistence enabled)
  useMemo(() => {
    if (persistToStorage) {
      saveSharedImagesToStorage(sharedImages)
    }
  }, [persistToStorage, sharedImages])

  /**
   * Add a single image
   */
  const addImage = useCallback((image: Omit<SharedImage, "createdAt">) => {
    setSharedImages((prev) => {
      // Check if image already exists (by URL)
      const exists = prev.some((img) => img.url === image.url)
      if (exists) {
        return prev
      }

      const newImage: SharedImage = {
        ...image,
        createdAt: Date.now(),
      }

      return [...prev, newImage]
    })
  }, [])

  /**
   * Add multiple images
   */
  const addImages = useCallback((images: Array<Omit<SharedImage, "createdAt">>) => {
    setSharedImages((prev) => {
      const seen = new Set(prev.map((img) => img.url))
      const newImages: SharedImage[] = []

      images.forEach((image) => {
        if (!seen.has(image.url)) {
          seen.add(image.url)
          newImages.push({
            ...image,
            createdAt: Date.now(),
          })
        }
      })

      return [...prev, ...newImages]
    })
  }, [])

  /**
   * Remove an image by ID
   */
  const removeImage = useCallback((imageId: string) => {
    setSharedImages((prev) => prev.filter((img) => img.id !== imageId))
  }, [])

  /**
   * Clear all shared images
   */
  const clearSharedImages = useCallback(() => {
    setSharedImages([])
    if (persistToStorage && typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [persistToStorage])

  /**
   * Get shared images (for Videos tab)
   */
  const getSharedImages = useCallback(() => {
    return sharedImages
  }, [sharedImages])

  const hasSharedImages = sharedImages.length > 0
  const sharedImagesCount = sharedImages.length

  return {
    sharedImages,
    addImage,
    addImages,
    removeImage,
    clearSharedImages,
    getSharedImages,
    hasSharedImages,
    sharedImagesCount,
  }
}

