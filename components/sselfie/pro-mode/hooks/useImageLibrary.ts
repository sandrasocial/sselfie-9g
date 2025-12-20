/**
 * useImageLibrary Hook
 * 
 * Centralized image library state management for Pro Mode.
 * Handles database persistence, localStorage sync, and all library operations.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ImageLibrary } from '@/lib/maya/pro/category-system'

const LOCAL_STORAGE_KEY = 'maya_pro_image_library'
const API_BASE = '/api/maya/pro/library'

export type ImageCategory = 'selfies' | 'products' | 'people' | 'vibes'

interface UseImageLibraryReturn {
  library: ImageLibrary
  isLoading: boolean
  error: string | null
  totalImages: number
  loadLibrary: () => Promise<void>
  saveLibrary: (updates: Partial<ImageLibrary>) => Promise<void>
  addImages: (category: ImageCategory, imageUrls: string[]) => Promise<void>
  removeImages: (category: ImageCategory, imageUrls: string[]) => Promise<void>
  clearLibrary: () => Promise<void>
  updateIntent: (intent: string) => Promise<void>
  refreshLibrary: () => Promise<void>
}

/**
 * Get total image count across all categories
 */
function getTotalImageCount(library: ImageLibrary): number {
  return (
    library.selfies.length +
    library.products.length +
    library.people.length +
    library.vibes.length
  )
}

/**
 * Get current user ID from Supabase auth
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      console.error('[useImageLibrary] Auth error:', error)
      return null
    }

    // Get Neon user ID by calling user info API
    try {
      const response = await fetch('/api/user/info')
      if (response.ok) {
        const data = await response.json()
        return data.user?.id || null
      }
    } catch (apiError) {
      console.error('[useImageLibrary] Error fetching user info:', apiError)
    }

    // Fallback: return Supabase auth user ID (may need mapping)
    return user.id
  } catch (error) {
    console.error('[useImageLibrary] Error getting user ID:', error)
    return null
  }
}

/**
 * Load library from localStorage (for immediate UI update)
 */
function loadLibraryFromLocalStorage(): ImageLibrary | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as ImageLibrary
    }
  } catch (error) {
    console.error('[useImageLibrary] Error loading from localStorage:', error)
  }
  return null
}

/**
 * Save library to localStorage (for offline access and sync)
 */
function saveLibraryToLocalStorage(library: ImageLibrary): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(library))
  } catch (error) {
    console.error('[useImageLibrary] Error saving to localStorage:', error)
  }
}

/**
 * useImageLibrary Hook
 * 
 * Provides centralized image library state management with:
 * - Database persistence
 * - localStorage sync
 * - Add/remove images
 * - Clear library
 * - Update intent
 */
export function useImageLibrary(): UseImageLibraryReturn {
  const [library, setLibrary] = useState<ImageLibrary>({
    selfies: [],
    products: [],
    people: [],
    vibes: [],
    intent: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load library from database
   */
  const loadLibrary = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First, try to load from localStorage for immediate UI update
      const cachedLibrary = loadLibraryFromLocalStorage()
      if (cachedLibrary) {
        setLibrary(cachedLibrary)
      }

      // Then load from database (API handles authentication server-side)
      const response = await fetch(`${API_BASE}/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({}), // Empty body, auth handled server-side
      })

      if (!response.ok) {
        // If authentication fails, use localStorage only
        if (response.status === 401) {
          console.warn('[useImageLibrary] User not authenticated, using localStorage only')
          const cachedLibrary = loadLibraryFromLocalStorage()
          if (cachedLibrary) {
            setLibrary(cachedLibrary)
            setError('Not authenticated - using local data only')
          }
          setIsLoading(false)
          return
        }
        throw new Error(`Failed to load library: ${response.statusText}`)
      }

      const data = await response.json()
      const loadedLibrary: ImageLibrary = {
        selfies: data.selfies || [],
        products: data.products || [],
        people: data.people || [],
        vibes: data.vibes || [],
        intent: data.current_intent || data.intent || '',
      }

      setLibrary(loadedLibrary)
      saveLibraryToLocalStorage(loadedLibrary)
      setError(null) // Clear any previous errors
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load library'
      console.error('[useImageLibrary] Error loading library:', err)
      
      // If it's an auth error, don't break the UI - just use localStorage
      if (errorMessage.includes('not authenticated') || errorMessage.includes('Unauthorized')) {
        const cachedLibrary = loadLibraryFromLocalStorage()
        if (cachedLibrary) {
          setLibrary(cachedLibrary)
          setError('Not authenticated - using local data only')
        }
      } else {
        setError(errorMessage)
        // If database load fails, use localStorage if available
        const cachedLibrary = loadLibraryFromLocalStorage()
        if (cachedLibrary) {
          setLibrary(cachedLibrary)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Save library to database and localStorage
   */
  const saveLibrary = useCallback(
    async (updates: Partial<ImageLibrary>) => {
      setError(null)

      try {
        // Merge updates with current library
        const updatedLibrary: ImageLibrary = {
          ...library,
          ...updates,
        }

        // Update state immediately (optimistic update)
        setLibrary(updatedLibrary)
        saveLibraryToLocalStorage(updatedLibrary)

        // Save to database (API handles authentication server-side)
        const response = await fetch(`${API_BASE}/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            ...updates,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }))
          // If authentication fails, still keep localStorage but show error
          if (response.status === 401) {
            console.warn('[useImageLibrary] User not authenticated, saving to localStorage only')
            setError('Not authenticated - changes saved locally only')
            return // Don't throw, just save locally
          }
          throw new Error(errorData.error || `Failed to save library: ${response.statusText}`)
        }

        // Reload from database to ensure sync
        await loadLibrary()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save library'
        console.error('[useImageLibrary] Error saving library:', err)
        
        // If it's an auth error, don't break the UI - just save locally
        if (errorMessage.includes('not authenticated') || errorMessage.includes('Unauthorized')) {
          console.warn('[useImageLibrary] Authentication issue, keeping localStorage save')
          setError('Not authenticated - changes saved locally only')
          return
        }
        
        setError(errorMessage)
        // Revert optimistic update on error (but keep localStorage)
        const cachedLibrary = loadLibraryFromLocalStorage()
        if (cachedLibrary) {
          setLibrary(cachedLibrary)
        }
      }
    },
    [library, loadLibrary]
  )

  /**
   * Add images to a category
   */
  const addImages = useCallback(
    async (category: ImageCategory, imageUrls: string[]) => {
      if (imageUrls.length === 0) return

      const currentImages = library[category] || []
      const newImages = [...new Set([...currentImages, ...imageUrls])] // Remove duplicates

      await saveLibrary({
        [category]: newImages,
      })
    },
    [library, saveLibrary]
  )

  /**
   * Remove images from a category
   */
  const removeImages = useCallback(
    async (category: ImageCategory, imageUrls: string[]) => {
      if (imageUrls.length === 0) return

      const currentImages = library[category] || []
      const filteredImages = currentImages.filter((url) => !imageUrls.includes(url))

      await saveLibrary({
        [category]: filteredImages,
      })
    },
    [library, saveLibrary]
  )

  /**
   * Clear entire library
   */
  const clearLibrary = useCallback(async () => {
    const emptyLibrary: ImageLibrary = {
      selfies: [],
      products: [],
      people: [],
      vibes: [],
      intent: '',
    }

    await saveLibrary(emptyLibrary)
  }, [saveLibrary])

  /**
   * Update intent description
   */
  const updateIntent = useCallback(
    async (intent: string) => {
      await saveLibrary({
        intent,
      })
    },
    [saveLibrary]
  )

  /**
   * Refresh library from database
   */
  const refreshLibrary = useCallback(async () => {
    await loadLibrary()
  }, [loadLibrary])

  // Load library on mount
  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  // Calculate total images
  const totalImages = getTotalImageCount(library)

  return {
    library,
    isLoading,
    error,
    totalImages,
    loadLibrary,
    saveLibrary,
    addImages,
    removeImages,
    clearLibrary,
    updateIntent,
    refreshLibrary,
  }
}
