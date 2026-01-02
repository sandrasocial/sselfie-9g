# Gallery Screen Refactoring Implementation Plan

**Based on:** `GALLERY_SCREEN_AUDIT.md`  
**Goal:** Reduce complexity from 1,288 lines to ~600 lines, improve maintainability and performance  
**Estimated Time:** 15-20 hours total  
**Risk Level:** MEDIUM (requires careful testing)

---

## 📋 Overview

This plan breaks down the refactoring into 5 phases, starting with the highest-impact changes first. Each phase is self-contained and can be tested independently.

### Phase Breakdown
1. **Phase 1: Extract Hooks** (4-6 hours) - Reduce complexity by ~300 lines
2. **Phase 2: Extract Components** (6-8 hours) - Reduce complexity by ~500 lines
3. **Phase 3: Optimize Performance** (3-4 hours) - 30-50% performance improvement
4. **Phase 4: Fix Issues** (2-3 hours) - Bug fixes and cleanup
5. **Phase 5: Testing & Polish** (1-2 hours) - Final verification

---

## 🎯 Phase 1: Extract Hooks (HIGH PRIORITY)

**Goal:** Extract data fetching and business logic into reusable hooks  
**Impact:** Reduces main component by ~300 lines  
**Time:** 4-6 hours  
**Risk:** LOW (hooks are isolated, easy to test)

### Step 1.1: Create `useGalleryImages` Hook

**File:** `components/sselfie/gallery/hooks/use-gallery-images.ts`

**Extract:**
- SWR infinite scroll logic (lines 131-141)
- Pagination state (`hasMore`, `isLoadingMore`)
- Intersection observer for infinite scroll (lines 159-183)
- Data transformation (`allImages`)

**Implementation:**
```typescript
import { useState, useEffect } from "react"
import useSWRInfinite from "swr/infinite"
import type { GalleryImage } from "@/lib/data/images"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface UseGalleryImagesReturn {
  images: GalleryImage[]
  isLoading: boolean
  error: any
  hasMore: boolean
  isLoadingMore: boolean
  mutate: () => void
  loadMore: () => void
  loadMoreRef: React.RefObject<HTMLDivElement>
}

export function useGalleryImages(): UseGalleryImagesReturn {
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null
    return `/api/images?limit=50&offset=${pageIndex * 50}`
  }

  const { data, error, isLoading, mutate, size, setSize } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
    revalidateFirstPage: false,
  })

  const images: GalleryImage[] = data ? data.flatMap((page) => page.images || []) : []

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true)
          setSize((prev) => prev + 1)
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, setSize])

  useEffect(() => {
    if (data) {
      const lastPage = data[data.length - 1]
      setHasMore(lastPage?.hasMore || false)
      setIsLoadingMore(false)
    }
  }, [data])

  const loadMore = () => {
    setIsLoadingMore(true)
    setSize((prev) => prev + 1)
  }

  return {
    images,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    mutate,
    loadMore,
    loadMoreRef,
  }
}
```

**Tasks:**
- [ ] Create hooks directory: `components/sselfie/gallery/hooks/`
- [ ] Create `use-gallery-images.ts`
- [ ] Copy SWR infinite scroll logic
- [ ] Copy intersection observer logic
- [ ] Export hook with return type
- [ ] Test hook in isolation (if possible)

---

### Step 1.2: Create `useDebounce` Hook (Utility)

**File:** `components/sselfie/gallery/hooks/use-debounce.ts`

**Implementation:**
```typescript
import { useState, useEffect } from "react"

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
```

**Tasks:**
- [ ] Create `use-debounce.ts`
- [ ] Implement debounce logic
- [ ] Add TypeScript generics for type safety

---

### Step 1.3: Create `useGalleryFilters` Hook

**File:** `components/sselfie/gallery/hooks/use-gallery-filters.ts`

**Extract:**
- Filter state (`contentFilter`, `selectedCategory`, `searchQuery`, `sortBy`)
- Filtering logic (lines 260-292)
- `categorizeImage` function (lines 74-92)
- Memoized filtered images

**Implementation:**
```typescript
import { useState, useMemo } from "react"
import { useDebounce } from "./use-debounce"
import type { GalleryImage } from "@/lib/data/images"

function categorizeImage(image: GalleryImage): string {
  if (image.category) {
    const cat = image.category.toLowerCase()
    if (cat.includes("close") || cat.includes("portrait")) return "close-up"
    if (cat.includes("half") || cat.includes("waist")) return "half-body"
    if (cat.includes("full")) return "full-body"
    if (cat.includes("scenery") || cat.includes("landscape")) return "scenery"
    if (cat.includes("flat")) return "flatlay"
  }

  const prompt = image.prompt?.toLowerCase() || ""
  if (prompt.includes("close") || prompt.includes("portrait") || prompt.includes("face")) return "close-up"
  if (prompt.includes("half") || prompt.includes("waist")) return "half-body"
  if (prompt.includes("full") && !prompt.includes("scenery")) return "full-body"
  if (prompt.includes("scenery") || prompt.includes("landscape")) return "scenery"
  if (prompt.includes("flat") || prompt.includes("overhead")) return "flatlay"

  return "close-up"
}

interface UseGalleryFiltersReturn {
  contentFilter: "all" | "photos" | "videos"
  setContentFilter: (filter: "all" | "photos" | "videos") => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  sortBy: "date-desc" | "date-asc" | "favorites"
  setSortBy: (sort: "date-desc" | "date-asc" | "favorites") => void
  filteredImages: GalleryImage[]
  displayImages: GalleryImage[]
  displayVideos: any[]
}

export function useGalleryFilters(
  allImages: GalleryImage[],
  allVideos: any[],
  favorites: Set<string>
): UseGalleryFiltersReturn {
  const [contentFilter, setContentFilter] = useState<"all" | "photos" | "videos">("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "favorites">("date-desc")

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const favoritedImages = useMemo(
    () => allImages.filter((img) => img.is_favorite || favorites.has(img.id)),
    [allImages, favorites]
  )

  const filteredImages = useMemo(() => {
    let filtered = allImages

    // Category filter
    if (selectedCategory === "favorited") {
      filtered = favoritedImages
    } else if (selectedCategory !== "all") {
      filtered = filtered.filter((img) => categorizeImage(img) === selectedCategory)
    }

    // Search filter (using debounced query)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (img) =>
          img.prompt?.toLowerCase().includes(query) ||
          img.category?.toLowerCase().includes(query) ||
          img.description?.toLowerCase().includes(query)
      )
    }

    // Sort
    if (sortBy === "date-desc") {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } else if (sortBy === "date-asc") {
      filtered = [...filtered].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    } else if (sortBy === "favorites") {
      filtered = [...filtered].sort((a, b) => {
        const aFav = a.is_favorite || favorites.has(a.id) ? 1 : 0
        const bFav = b.is_favorite || favorites.has(b.id) ? 1 : 0
        return bFav - aFav
      })
    }

    return filtered
  }, [allImages, selectedCategory, debouncedSearchQuery, sortBy, favorites, favoritedImages])

  const { displayImages, displayVideos } = useMemo(() => {
    if (contentFilter === "photos") return { images: filteredImages, videos: [] }
    if (contentFilter === "videos") return { images: [], videos: allVideos }
    return { images: filteredImages, videos: allVideos }
  }, [contentFilter, filteredImages, allVideos])

  return {
    contentFilter,
    setContentFilter,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filteredImages,
    displayImages,
    displayVideos,
  }
}
```

**Tasks:**
- [ ] Create `use-gallery-filters.ts`
- [ ] Move `categorizeImage` function
- [ ] Move filter state management
- [ ] Add `useDebounce` for search
- [ ] Add `useMemo` for filtered images
- [ ] Add `useMemo` for categorized images
- [ ] Export hook with return type

---

### Step 1.4: Create `useSelectionMode` Hook

**File:** `components/sselfie/gallery/hooks/use-selection-mode.ts`

**Extract:**
- Selection state (`selectionMode`, `selectedImages`)
- Long-press detection logic (lines 116-119, 881-938)
- Selection operations (`toggleImageSelection`, `selectAll`, `deselectAll`)

**Implementation:**
```typescript
import { useState, useRef, useCallback } from "react"
import { triggerHaptic } from "@/lib/utils/haptics"

interface UseSelectionModeReturn {
  selectionMode: boolean
  setSelectionMode: (mode: boolean) => void
  selectedImages: Set<string>
  toggleImageSelection: (imageId: string) => void
  selectAll: (imageIds: string[]) => void
  deselectAll: () => void
  clearSelection: () => void
  longPressHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: () => void
    onTouchCancel: () => void
    onMouseDown: (e: React.MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
  }
}

export function useSelectionMode(
  onEnterSelection: (imageId: string) => void
): UseSelectionModeReturn {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressImageId = useRef<string | null>(null)
  const wasLongPress = useRef(false)

  const toggleImageSelection = useCallback((imageId: string) => {
    setSelectedImages((prev) => {
      const newSelected = new Set(prev)
      if (newSelected.has(imageId)) {
        newSelected.delete(imageId)
      } else {
        newSelected.add(imageId)
      }
      return newSelected
    })
    triggerHaptic("light")
  }, [])

  const selectAll = useCallback((imageIds: string[]) => {
    setSelectedImages(new Set(imageIds))
  }, [])

  const deselectAll = useCallback(() => {
    setSelectedImages(new Set())
  }, [])

  const clearSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedImages(new Set())
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    wasLongPress.current = false
  }, [])

  const handleLongPressStart = useCallback((imageId: string) => {
    if (selectionMode) return
    
    wasLongPress.current = false
    longPressImageId.current = imageId
    longPressTimer.current = setTimeout(() => {
      wasLongPress.current = true
      setSelectionMode(true)
      toggleImageSelection(imageId)
      triggerHaptic("medium")
      longPressTimer.current = null
    }, 500)
  }, [selectionMode, toggleImageSelection])

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      wasLongPress.current = false
    }
  }, [])

  const longPressHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      if (!selectionMode && longPressImageId.current) {
        handleLongPressStart(longPressImageId.current)
      }
    },
    onTouchEnd: handleLongPressEnd,
    onTouchCancel: handleLongPressEnd,
    onMouseDown: (e: React.MouseEvent) => {
      if (!selectionMode && e.button === 0 && longPressImageId.current) {
        handleLongPressStart(longPressImageId.current)
      }
    },
    onMouseUp: handleLongPressEnd,
    onMouseLeave: handleLongPressEnd,
  }

  return {
    selectionMode,
    setSelectionMode,
    selectedImages,
    toggleImageSelection,
    selectAll,
    deselectAll,
    clearSelection,
    longPressHandlers,
  }
}
```

**Note:** This is a simplified version. The actual implementation needs to handle the imageId being passed to the handlers. We'll refine this in Step 2.4.

**Tasks:**
- [ ] Create `use-selection-mode.ts`
- [ ] Move selection state management
- [ ] Extract long-press logic (simplified initially)
- [ ] Add selection operations
- [ ] Export hook with return type

---

### Step 1.5: Create `useBulkOperations` Hook

**File:** `components/sselfie/gallery/hooks/use-bulk-operations.ts`

**Extract:**
- Bulk operations (`bulkDelete`, `bulkFavorite`, `bulkSave`, `bulkDownload`)
- Loading states for bulk operations
- Error handling

**Implementation:**
```typescript
import { useState } from "react"
import { triggerHaptic, triggerSuccessHaptic, triggerErrorHaptic } from "@/lib/utils/haptics"
import type { GalleryImage } from "@/lib/data/images"

interface UseBulkOperationsReturn {
  isProcessing: boolean
  bulkDelete: (imageIds: string[], mutate: () => void) => Promise<void>
  bulkFavorite: (imageIds: string[], mutate: () => void) => Promise<void>
  bulkSave: (imageIds: string[], mutate: () => void) => Promise<void>
  bulkDownload: (imageIds: string[], images: GalleryImage[]) => Promise<void>
}

export function useBulkOperations(): UseBulkOperationsReturn {
  const [isProcessing, setIsProcessing] = useState(false)

  const bulkDelete = async (imageIds: string[], mutate: () => void) => {
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
    } catch (error) {
      console.error("[Gallery] Error bulk deleting:", error)
      triggerErrorHaptic()
      alert("Failed to delete some images. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const bulkFavorite = async (imageIds: string[], mutate: () => void) => {
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
    } catch (error) {
      console.error("[Gallery] Error bulk favoriting:", error)
      triggerErrorHaptic()
      alert("Failed to favorite some images. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const bulkSave = async (imageIds: string[], mutate: () => void) => {
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
    } catch (error) {
      console.error("[Gallery] Error bulk saving:", error)
      triggerErrorHaptic()
      alert("Failed to save some images. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const bulkDownload = async (imageIds: string[], images: GalleryImage[]) => {
    if (imageIds.length === 0) return

    setIsProcessing(true)
    triggerHaptic("light")

    try {
      // Extract download logic (simplified - full version in Step 1.6)
      // This is complex, so we'll move the entire function
      // See Step 1.6 for full implementation
      
      setIsProcessing(false)
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
```

**Tasks:**
- [ ] Create `use-bulk-operations.ts`
- [ ] Move bulk delete function
- [ ] Move bulk favorite function
- [ ] Move bulk save function
- [ ] Move bulk download function (see Step 1.6)
- [ ] Add loading state
- [ ] Export hook with return type

---

### Step 1.6: Extract Bulk Download Logic

**File:** `components/sselfie/gallery/utils/bulk-download.ts`

**Extract:**
- Bulk download function (lines 492-628)
- Mobile Share API logic
- Desktop download logic
- Categorization helper

**Implementation:**
```typescript
import type { GalleryImage } from "@/lib/data/images"

// Helper function to categorize image (can be extracted to shared utils)
function categorizeImage(image: GalleryImage): string {
  // ... same as in useGalleryFilters
}

export async function bulkDownloadImages(
  imageIds: string[],
  images: GalleryImage[],
  onProgress?: (current: number, total: number) => void
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

      // Try sharing all files at once
      try {
        const shareData: ShareData = {
          files: files,
          title: files.length === 1 ? "sselfie Image" : `${files.length} sselfie Images`,
        }

        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData)
          return
        }
      } catch (shareError: any) {
        // If sharing multiple files fails, share one by one
        if (shareError.name !== "AbortError" && files.length > 1) {
          for (let i = 0; i < files.length; i++) {
            try {
              const shareData: ShareData = {
                files: [files[i]],
                title: `sselfie Image ${i + 1} of ${files.length}`,
              }

              if (!navigator.canShare || navigator.canShare(shareData)) {
                await navigator.share(shareData)
                if (i < files.length - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 500))
                }
              }
            } catch (singleShareError: any) {
              if (singleShareError.name === "AbortError") {
                break
              }
              console.error(`[Gallery] Error sharing image ${i + 1}:`, singleShareError)
            }
          }
          return
        } else if (shareError.name === "AbortError") {
          return
        }
      }
    } catch (shareError: any) {
      // Fall through to download method
      console.log("[Gallery] Share API failed, falling back to download method:", shareError?.message)
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

        if (onProgress) {
          onProgress(i + 1, selectedImageList.length)
        }

        if (i < selectedImageList.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      } catch (error) {
        console.error(`[Gallery] Error downloading image ${imageId}:`, error)
      }
    }
  }
}
```

**Tasks:**
- [ ] Create utils directory: `components/sselfie/gallery/utils/`
- [ ] Create `bulk-download.ts`
- [ ] Move bulk download logic
- [ ] Add progress callback support
- [ ] Update `useBulkOperations` to use this function

---

### Step 1.7: Update Main Component to Use Hooks

**File:** `components/sselfie/gallery-screen.tsx`

**Changes:**
- Import new hooks
- Replace inline logic with hook calls
- Remove extracted code
- Test that everything still works

**Tasks:**
- [ ] Import `useGalleryImages` hook
- [ ] Import `useGalleryFilters` hook
- [ ] Import `useSelectionMode` hook
- [ ] Import `useBulkOperations` hook
- [ ] Replace inline logic with hook calls
- [ ] Remove extracted code (keep comments for reference initially)
- [ ] Test basic functionality
- [ ] Verify no TypeScript errors
- [ ] Check that app still builds

**Expected Result:**
- Main component reduced by ~300 lines
- Logic separated into reusable hooks
- Code more testable
- Easier to understand data flow

---

## 🎯 Phase 2: Extract Components (HIGH PRIORITY)

**Goal:** Extract UI components to reduce main component size  
**Impact:** Reduces main component by ~500 lines  
**Time:** 6-8 hours  
**Risk:** MEDIUM (requires careful prop passing)

### Step 2.1: Create `GalleryHeader` Component

**File:** `components/sselfie/gallery/components/gallery-header.tsx`

**Extract:**
- Header section (lines 715-747)
- Stats display
- Search input
- Sort dropdown
- Select button

**Implementation:**
```typescript
import { Search, X } from "lucide-react"
import { DesignClasses } from "@/lib/design-tokens"

interface GalleryHeaderProps {
  stats?: {
    totalGenerated?: number
    favorites?: number
  }
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: "date-desc" | "date-asc" | "favorites"
  onSortChange: (sort: "date-desc" | "date-asc" | "favorites") => void
  onSelectClick: () => void
}

export function GalleryHeader({
  stats,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onSelectClick,
}: GalleryHeaderProps) {
  return (
    <div className="pt-3 sm:pt-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.2em] sm:tracking-[0.3em] text-stone-950 uppercase mb-2">
            Gallery
          </h1>
          {stats && (
            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-light">{stats.totalGenerated || 0}</span>
                <span className="text-stone-400">photos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-light">{stats.favorites || 0}</span>
                <span className="text-stone-400">favorites</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectClick}
            className={`px-3 sm:px-4 py-2 ${DesignClasses.typography.label.uppercase} bg-stone-100/50 ${DesignClasses.border.stone} ${DesignClasses.radius.sm} hover:bg-stone-100/70 transition-all duration-200 min-h-[36px] sm:min-h-[40px]`}
          >
            Select
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-10 py-2 ${DesignClasses.typography.body.medium} bg-stone-100/50 ${DesignClasses.border.stone} ${DesignClasses.radius.md} focus:outline-none focus:ring-2 focus:ring-stone-950/20 transition-all`}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          className={`px-3 py-2 ${DesignClasses.typography.body.small} bg-stone-100/50 ${DesignClasses.border.stone} ${DesignClasses.radius.md} focus:outline-none focus:ring-2 focus:ring-stone-950/20 transition-all appearance-none pr-8`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.5rem center",
          }}
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="favorites">Favorites First</option>
        </select>
      </div>
    </div>
  )
}
```

**Tasks:**
- [ ] Create components directory: `components/sselfie/gallery/components/`
- [ ] Create `gallery-header.tsx`
- [ ] Move header JSX
- [ ] Add props interface
- [ ] Test component in isolation

---

### Step 2.2: Create `GalleryFilters` Component

**File:** `components/sselfie/gallery/components/gallery-filters.tsx`

**Extract:**
- Content filter buttons (lines 786-802)
- Category filter scrollable list (lines 804-856)
- Scroll arrows logic

**Implementation:**
```typescript
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { DesignClasses } from "@/lib/design-tokens"

interface GalleryFiltersProps {
  contentFilter: "all" | "photos" | "videos"
  onContentFilterChange: (filter: "all" | "photos" | "videos") => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

export function GalleryFilters({
  contentFilter,
  onContentFilterChange,
  selectedCategory,
  onCategoryChange,
}: GalleryFiltersProps) {
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      if (categoryScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current
        setShowLeftArrow(scrollLeft > 10)
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
      }
    }

    const scrollContainer = categoryScrollRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll)
      handleScroll()
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll)
      }
    }
  }, [selectedCategory])

  const scrollCategory = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  const categories = [
    { key: "all", label: "All" },
    { key: "favorited", label: "Favorited" },
    { key: "close-up", label: "Close-Up" },
    { key: "half-body", label: "Half-Body" },
    { key: "full-body", label: "Full-Body" },
    { key: "scenery", label: "Scenery" },
    { key: "flatlay", label: "Flatlay" },
  ]

  return (
    <div className={`bg-stone-100/40 ${DesignClasses.radius.lg} ${DesignClasses.spacing.padding.md} ${DesignClasses.border.stone}`}>
      <div className="flex gap-2 mb-4 pb-4 border-b border-stone-200/40">
        {[
          { key: "all", label: "All Content" },
          { key: "photos", label: "Photos" },
          { key: "videos", label: "Videos" },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => onContentFilterChange(filter.key as "all" | "photos" | "videos")}
            className={`px-3 sm:px-4 py-2 text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light border border-stone-200/40 rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 min-h-[36px] sm:min-h-[40px] ${
              contentFilter === filter.key ? "bg-stone-950 text-white" : "bg-stone-50 hover:bg-stone-100"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="relative">
        {showLeftArrow && (
          <button
            onClick={() => scrollCategory("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-stone-950 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {showRightArrow && (
          <button
            onClick={() => scrollCategory("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-stone-950 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <ChevronRight size={16} />
          </button>
        )}
        <div
          ref={categoryScrollRef}
          className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide relative"
          style={{
            maskImage:
              showLeftArrow || showRightArrow
                ? "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)"
                : "none",
            WebkitMaskImage:
              showLeftArrow || showRightArrow
                ? "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)"
                : "none",
          }}
        >
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => onCategoryChange(category.key)}
              className={`px-3 sm:px-4 py-2 text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light border border-stone-200/40 rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 min-h-[36px] sm:min-h-[40px] ${
                selectedCategory === category.key ? "bg-stone-950 text-white" : "bg-stone-50 hover:bg-stone-100"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Tasks:**
- [ ] Create `gallery-filters.tsx`
- [ ] Move filter JSX
- [ ] Move scroll arrow logic
- [ ] Add props interface
- [ ] Test component

---

### Step 2.3: Create `GalleryImageCard` Component

**File:** `components/sselfie/gallery/components/gallery-image-card.tsx`

**Extract:**
- Single image card (lines 862-966)
- Selection checkbox
- Hover overlay
- Long-press handling (will be refined)

**Implementation:**
```typescript
import { CheckSquare, Square, Heart } from "lucide-react"
import { ProgressiveImage } from "../progressive-image"
import { getOptimizedImageUrl } from "../utils/image-utils"
import type { GalleryImage } from "@/lib/data/images"

interface GalleryImageCardProps {
  image: GalleryImage
  isSelected: boolean
  selectionMode: boolean
  onImageClick: () => void
  onToggleSelection: () => void
  longPressHandlers?: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: () => void
    onTouchCancel: () => void
    onMouseDown: (e: React.MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
  }
}

export function GalleryImageCard({
  image,
  isSelected,
  selectionMode,
  onImageClick,
  onToggleSelection,
  longPressHandlers,
}: GalleryImageCardProps) {
  return (
    <button
      onClick={selectionMode ? onToggleSelection : onImageClick}
      {...longPressHandlers}
      className="aspect-square relative group overflow-hidden bg-stone-200/30"
    >
      <ProgressiveImage
        src={image.image_url || "/placeholder.svg"}
        thumbnailSrc={getOptimizedImageUrl(image.image_url, 600, 80)}
        alt={image.prompt || `Gallery ${image.id}`}
        className="w-full h-full object-cover"
      />
      {selectionMode && (
        <div className="absolute top-2 right-2 z-10">
          {isSelected ? (
            <CheckSquare size={24} className="text-stone-950 bg-white rounded" fill="currentColor" />
          ) : (
            <Square size={24} className="text-white drop-shadow-lg" />
          )}
        </div>
      )}
      {!selectionMode && (
        <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-4 text-stone-50">
            <div className="flex items-center gap-1">
              <Heart size={16} fill="currentColor" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      )}
    </button>
  )
}
```

**Note:** Long-press handling needs to be refined. We'll pass the image ID to the handlers properly.

**Tasks:**
- [ ] Create `gallery-image-card.tsx`
- [ ] Move image card JSX
- [ ] Add props interface
- [ ] Extract `getOptimizedImageUrl` to utils (see Step 2.5)
- [ ] Test component

---

### Step 2.4: Create `GalleryImageGrid` Component

**File:** `components/sselfie/gallery/components/gallery-image-grid.tsx`

**Extract:**
- Grid layout (lines 860-989)
- Image cards mapping
- Video cards mapping
- Loading more section

**Implementation:**
```typescript
import { Video, Play } from "lucide-react"
import { triggerHaptic } from "@/lib/utils/haptics"
import { GalleryImageCard } from "./gallery-image-card"
import UnifiedLoading from "../unified-loading"
import type { GalleryImage } from "@/lib/data/images"

interface GeneratedVideo {
  id: number
  video_url: string
  // ... other video properties
}

interface GalleryImageGridProps {
  images: GalleryImage[]
  videos: GeneratedVideo[]
  selectedImages: Set<string>
  selectionMode: boolean
  onImageClick: (image: GalleryImage) => void
  onToggleSelection: (imageId: string) => void
  onVideoClick: (video: GeneratedVideo) => void
  hasMore: boolean
  isLoadingMore: boolean
  loadMoreRef: React.RefObject<HTMLDivElement>
  onLoadMore: () => void
  longPressHandlers?: (imageId: string) => {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: () => void
    onTouchCancel: () => void
    onMouseDown: (e: React.MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
  }
}

export function GalleryImageGrid({
  images,
  videos,
  selectedImages,
  selectionMode,
  onImageClick,
  onToggleSelection,
  onVideoClick,
  hasMore,
  isLoadingMore,
  loadMoreRef,
  onLoadMore,
  longPressHandlers,
}: GalleryImageGridProps) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        {images.map((image) => (
          <GalleryImageCard
            key={`img-${image.id}`}
            image={image}
            isSelected={selectedImages.has(image.id)}
            selectionMode={selectionMode}
            onImageClick={() => onImageClick(image)}
            onToggleSelection={() => onToggleSelection(image.id)}
            longPressHandlers={longPressHandlers?.(image.id)}
          />
        ))}

        {videos.map((video) => (
          <button
            key={`vid-${video.id}`}
            onClick={() => {
              triggerHaptic("light")
              onVideoClick(video)
            }}
            className="aspect-square relative group overflow-hidden bg-stone-200/30"
          >
            <video src={video.video_url} className="w-full h-full object-cover" muted playsInline preload="none" />
            <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play size={20} className="text-stone-950 ml-1" fill="currentColor" />
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <Video size={16} className="text-white drop-shadow-lg" />
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {isLoadingMore ? (
            <UnifiedLoading variant="inline" message="Loading more..." />
          ) : (
            <button
              onClick={onLoadMore}
              className="px-6 py-3 text-xs tracking-[0.15em] uppercase font-light bg-stone-100/50 border border-stone-200/40 rounded-xl hover:bg-stone-100/70 transition-all duration-200"
            >
              Load More Images
            </button>
          )}
        </div>
      )}
    </>
  )
}
```

**Tasks:**
- [ ] Create `gallery-image-grid.tsx`
- [ ] Move grid JSX
- [ ] Use `GalleryImageCard` component
- [ ] Add props interface
- [ ] Test component

---

### Step 2.5: Create Utility Functions

**File:** `components/sselfie/gallery/utils/image-utils.ts`

**Extract:**
- `getOptimizedImageUrl` function (lines 61-72)
- `categorizeImage` function (can be shared with filters hook)

**Implementation:**
```typescript
export function getOptimizedImageUrl(url: string, width?: number, quality?: number): string {
  if (!url) return "/placeholder.svg"

  if (url.includes("blob.vercel-storage.com") || url.includes("public.blob.vercel-storage.com")) {
    const params = new URLSearchParams()
    if (width) params.append("width", width.toString())
    if (quality) params.append("quality", quality.toString())
    return `${url}?${params.toString()}`
  }

  return url
}
```

**Tasks:**
- [ ] Create `image-utils.ts`
- [ ] Move `getOptimizedImageUrl`
- [ ] Export function

---

### Step 2.6: Create `GallerySelectionBar` Component

**File:** `components/sselfie/gallery/components/gallery-selection-bar.tsx`

**Extract:**
- Selection bar (lines 1073-1147)
- Bulk action buttons
- Selection count

**Implementation:**
```typescript
import { Save, Download, Heart, Trash2 } from "lucide-react"

interface GallerySelectionBarProps {
  selectedCount: number
  totalCount: number
  onCancel: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSave: () => void
  onDownload: () => void
  onFavorite: () => void
  onDelete: () => void
  isProcessing?: boolean
}

export function GallerySelectionBar({
  selectedCount,
  totalCount,
  onCancel,
  onSelectAll,
  onDeselectAll,
  onSave,
  onDownload,
  onFavorite,
  onDelete,
  isProcessing = false,
}: GallerySelectionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-stone-950 text-white p-3 sm:p-4 shadow-2xl z-50 border-t border-stone-800 safe-area-inset-bottom">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="text-sm font-light tracking-wide hover:text-stone-300 transition-colors min-h-[44px] px-2 touch-manipulation disabled:opacity-50"
            >
              Cancel
            </button>
            <span className="text-sm font-light">{selectedCount} selected</span>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {selectedCount < totalCount && (
              <button
                onClick={onSelectAll}
                disabled={isProcessing}
                className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-800 rounded-lg hover:bg-stone-700 transition-all min-h-[44px] touch-manipulation disabled:opacity-50"
              >
                Select All
              </button>
            )}
            {selectedCount > 0 && (
              <>
                {selectedCount === totalCount && (
                  <button
                    onClick={onDeselectAll}
                    disabled={isProcessing}
                    className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-800 rounded-lg hover:bg-stone-700 transition-all min-h-[44px] touch-manipulation disabled:opacity-50"
                  >
                    Deselect
                  </button>
                )}
                <button
                  onClick={onSave}
                  disabled={isProcessing}
                  className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-900 rounded-lg hover:bg-stone-800 transition-all flex items-center justify-center gap-2 min-h-[44px] touch-manipulation disabled:opacity-50"
                >
                  <Save size={14} />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={onDownload}
                  disabled={isProcessing}
                  className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-800 rounded-lg hover:bg-stone-700 transition-all flex items-center justify-center gap-2 min-h-[44px] touch-manipulation disabled:opacity-50"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={onFavorite}
                  disabled={isProcessing}
                  className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-800 rounded-lg hover:bg-stone-700 transition-all flex items-center justify-center gap-2 min-h-[44px] touch-manipulation disabled:opacity-50"
                >
                  <Heart size={14} />
                  <span className="hidden sm:inline">Favorite</span>
                </button>
                <button
                  onClick={onDelete}
                  disabled={isProcessing}
                  className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-red-600 rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 min-h-[44px] col-span-2 sm:col-span-1 touch-manipulation disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Tasks:**
- [ ] Create `gallery-selection-bar.tsx`
- [ ] Move selection bar JSX
- [ ] Add props interface
- [ ] Add loading/disabled states
- [ ] Test component

---

### Step 2.7: Update Main Component to Use New Components

**File:** `components/sselfie/gallery-screen.tsx`

**Changes:**
- Import new components
- Replace JSX with component calls
- Remove extracted code
- Test thoroughly

**Tasks:**
- [ ] Import all new components
- [ ] Replace header JSX with `<GalleryHeader />`
- [ ] Replace filters JSX with `<GalleryFilters />`
- [ ] Replace grid JSX with `<GalleryImageGrid />`
- [ ] Replace selection bar JSX with `<GallerySelectionBar />`
- [ ] Remove extracted JSX code
- [ ] Test all functionality
- [ ] Verify no visual regressions
- [ ] Check responsive design
- [ ] Test on mobile

**Expected Result:**
- Main component reduced by ~500 lines (total ~600 lines)
- Much easier to read and understand
- Components are reusable
- Easier to test individual pieces

---

## 🎯 Phase 3: Optimize Performance (MEDIUM PRIORITY)

**Goal:** Add performance optimizations  
**Impact:** 30-50% performance improvement  
**Time:** 3-4 hours  
**Risk:** LOW (mostly adding memoization)

### Step 3.1: Add useMemo to Expensive Calculations

**Tasks:**
- [ ] Verify `useGalleryFilters` already uses `useMemo` (from Phase 1)
- [ ] Add `React.memo` to `GalleryImageCard` if needed
- [ ] Add `React.memo` to `GalleryImageGrid` if needed
- [ ] Profile performance before/after

---

### Step 3.2: Optimize SWR Usage

**Tasks:**
- [ ] Remove unnecessary `refreshInterval` from stats API (line 154)
- [ ] Review all SWR configurations
- [ ] Ensure proper cache keys
- [ ] Test that caching works correctly

---

### Step 3.3: Optimize Image Loading

**Tasks:**
- [ ] Verify `ProgressiveImage` is optimized
- [ ] Check lazy loading is enabled
- [ ] Consider intersection observer for images (if not already done)
- [ ] Test image loading performance

---

## 🎯 Phase 4: Fix Issues (HIGH PRIORITY)

**Goal:** Fix bugs and remove dead code  
**Impact:** Better UX, cleaner code  
**Time:** 2-3 hours  
**Risk:** LOW (straightforward fixes)

### Step 4.1: Fix Studio Tab Reference

**File:** `components/sselfie/gallery-screen.tsx`

**Find:** Line ~1060
```typescript
const studioTab = document.querySelector('[data-tab="studio"]') as HTMLButtonElement
studioTab?.click()
```

**Fix:**
```typescript
window.location.hash = "maya"
// or use router.push("/#maya") if router is available
```

**Tasks:**
- [ ] Find Studio tab reference
- [ ] Replace with Maya navigation
- [ ] Test navigation works

---

### Step 4.2: Remove Dead Code

**File:** `components/sselfie/gallery-screen.tsx`

**Find:** Lines 1169-1268 (disabled navigation menu)

**Tasks:**
- [ ] Remove entire `{false && ( ... )}` block
- [ ] Remove unused imports if any
- [ ] Remove unused state variables if any
- [ ] Verify app still works

---

### Step 4.3: Improve Error Handling

**Tasks:**
- [ ] Replace `alert()` calls with toast notifications (if toast system exists)
- [ ] Or create simple error state display
- [ ] Add error boundaries if possible
- [ ] Test error scenarios

---

### Step 4.4: Add Loading States for Bulk Operations

**Tasks:**
- [ ] Verify `useBulkOperations` hook returns `isProcessing` state
- [ ] Pass `isProcessing` to `GallerySelectionBar`
- [ ] Disable buttons when `isProcessing` is true
- [ ] Show loading indicator if possible
- [ ] Test bulk operations

---

## 🎯 Phase 5: Testing & Polish (LOW PRIORITY)

**Goal:** Final verification and polish  
**Impact:** Confidence in refactoring  
**Time:** 1-2 hours  
**Risk:** LOW

### Step 5.1: Comprehensive Testing

**Test Checklist:**
- [ ] Load gallery screen
- [ ] Infinite scroll works
- [ ] Search works
- [ ] Category filters work
- [ ] Content filters work (photos/videos/all)
- [ ] Sorting works
- [ ] Selection mode works (click Select button)
- [ ] Long-press selection works (mobile)
- [ ] Bulk delete works
- [ ] Bulk favorite works
- [ ] Bulk download works
- [ ] Bulk save works
- [ ] Single image click opens modal
- [ ] Video click opens preview
- [ ] Pull-to-refresh works (mobile)
- [ ] Stats display correctly
- [ ] Empty states show correctly
- [ ] Error states work
- [ ] Responsive design works (mobile/tablet/desktop)

---

### Step 5.2: Code Review

**Checklist:**
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Code follows project conventions
- [ ] Comments are helpful (not excessive)
- [ ] Component names are clear
- [ ] Props interfaces are well-defined
- [ ] No console.logs in production code (keep error logs)

---

### Step 5.3: Performance Verification

**Tasks:**
- [ ] Measure initial load time
- [ ] Measure filter performance (with 100+ images)
- [ ] Measure scroll performance
- [ ] Compare before/after metrics
- [ ] Verify no memory leaks

---

## 📊 Progress Tracking

### Phase 1: Extract Hooks
- [ ] Step 1.1: Create `useGalleryImages` hook
- [ ] Step 1.2: Create `useDebounce` hook
- [ ] Step 1.3: Create `useGalleryFilters` hook
- [ ] Step 1.4: Create `useSelectionMode` hook
- [ ] Step 1.5: Create `useBulkOperations` hook
- [ ] Step 1.6: Extract bulk download logic
- [ ] Step 1.7: Update main component to use hooks

### Phase 2: Extract Components
- [ ] Step 2.1: Create `GalleryHeader` component
- [ ] Step 2.2: Create `GalleryFilters` component
- [ ] Step 2.3: Create `GalleryImageCard` component
- [ ] Step 2.4: Create `GalleryImageGrid` component
- [ ] Step 2.5: Create utility functions
- [ ] Step 2.6: Create `GallerySelectionBar` component
- [ ] Step 2.7: Update main component to use components

### Phase 3: Optimize Performance
- [ ] Step 3.1: Add useMemo to expensive calculations
- [ ] Step 3.2: Optimize SWR usage
- [ ] Step 3.3: Optimize image loading

### Phase 4: Fix Issues
- [ ] Step 4.1: Fix Studio tab reference
- [ ] Step 4.2: Remove dead code
- [ ] Step 4.3: Improve error handling
- [ ] Step 4.4: Add loading states for bulk operations

### Phase 5: Testing & Polish
- [ ] Step 5.1: Comprehensive testing
- [ ] Step 5.2: Code review
- [ ] Step 5.3: Performance verification

---

## 🎯 Success Criteria

Refactoring is complete when:

- [x] Main component < 600 lines ✅
- [ ] All hooks extracted to separate files
- [ ] All major components extracted
- [ ] Memoization added for expensive operations
- [ ] Debounced search implemented
- [ ] Dead code removed
- [ ] All bugs fixed (Studio tab reference)
- [ ] Error handling improved
- [ ] Loading states added
- [ ] Performance improved (measurable)
- [ ] All tests pass
- [ ] Code review approved

---

## 📝 Notes

### Implementation Order

1. **Start with Phase 1** - Hooks are isolated, easy to test, high impact
2. **Then Phase 2** - Components depend on hooks, so do Phase 1 first
3. **Then Phase 4** - Fix bugs while code is fresh
4. **Then Phase 3** - Optimize once structure is stable
5. **Finally Phase 5** - Test everything together

### Testing Strategy

- Test after each phase
- Test individual hooks/components in isolation when possible
- Test integration after combining
- Test on real devices (especially mobile for long-press)

### Rollback Plan

- Commit after each phase
- Test thoroughly before moving to next phase
- Can rollback individual phases if issues arise
- Keep original code commented initially (remove in final cleanup)

---

**Ready to start? Begin with Phase 1, Step 1.1: Create `useGalleryImages` Hook** 🚀

