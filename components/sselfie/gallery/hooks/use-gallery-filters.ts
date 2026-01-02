"use client"

import { useState, useMemo } from "react"
import { useDebounce } from "./use-debounce"
import type { GalleryImage } from "@/lib/data/images"

interface UseGalleryFiltersReturn {
  contentFilter: "photos" | "videos" | "favorited" | "feed"
  setContentFilter: (filter: "photos" | "videos" | "favorited" | "feed") => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  sortBy: "date-desc" | "date-asc" | "favorites"
  setSortBy: (sort: "date-desc" | "date-asc" | "favorites") => void
  displayImages: GalleryImage[]
  displayVideos: any[]
}

export function useGalleryFilters(
  allImages: GalleryImage[],
  allVideos: any[],
  favorites: Set<string>,
  feedImages?: GalleryImage[]
): UseGalleryFiltersReturn {
  const [contentFilter, setContentFilter] = useState<"photos" | "videos" | "favorited" | "feed">("photos")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "favorites">("date-desc")

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Ensure allImages is always an array
  const safeAllImages = Array.isArray(allImages) ? allImages : []

  const favoritedImages = useMemo(
    () => safeAllImages.filter((img) => img.is_favorite || favorites.has(img.id)),
    [safeAllImages, favorites]
  )

  const filteredImages = useMemo(() => {
    let filtered = safeAllImages

    // Content filter: favorited
    if (contentFilter === "favorited") {
      filtered = favoritedImages
    } else if (contentFilter === "feed") {
      // Feed filter: use feed images if provided
      filtered = feedImages || []
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
  }, [safeAllImages, contentFilter, debouncedSearchQuery, sortBy, favorites, favoritedImages, feedImages])

  const { images: displayImages, videos: displayVideos } = useMemo(() => {
    const safeAllVideos = Array.isArray(allVideos) ? allVideos : []
    let result: { images: GalleryImage[]; videos: any[] }
    
    if (contentFilter === "photos") {
      result = { images: filteredImages, videos: [] }
    } else if (contentFilter === "videos") {
      result = { images: [], videos: safeAllVideos }
    } else if (contentFilter === "favorited") {
      // Favourites filter shows only favorited images (no videos)
      result = { images: filteredImages, videos: [] }
    } else if (contentFilter === "feed") {
      // Feed filter shows only feed images (no videos)
      result = { images: filteredImages, videos: [] }
    } else {
      result = { images: filteredImages, videos: safeAllVideos }
    }
    
    return result
  }, [contentFilter, filteredImages, allVideos])

  return {
    contentFilter,
    setContentFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    displayImages: displayImages ?? [],
    displayVideos: displayVideos ?? [],
  }
}

