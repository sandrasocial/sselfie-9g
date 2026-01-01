"use client"

import { useState, useMemo } from "react"
import { useDebounce } from "./use-debounce"
import type { GalleryImage } from "@/lib/data/images"
import { categorizeImage } from "../utils/categorize-image"

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

  // Ensure allImages is always an array
  const safeAllImages = Array.isArray(allImages) ? allImages : []

  const favoritedImages = useMemo(
    () => safeAllImages.filter((img) => img.is_favorite || favorites.has(img.id)),
    [safeAllImages, favorites]
  )

  const filteredImages = useMemo(() => {
    let filtered = safeAllImages

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
  }, [safeAllImages, selectedCategory, debouncedSearchQuery, sortBy, favorites, favoritedImages])

  const { images: displayImages, videos: displayVideos } = useMemo(() => {
    const safeAllVideos = Array.isArray(allVideos) ? allVideos : []
    let result: { images: GalleryImage[]; videos: any[] }
    
    if (contentFilter === "photos") {
      result = { images: filteredImages, videos: [] }
    } else if (contentFilter === "videos") {
      result = { images: [], videos: safeAllVideos }
    } else {
      result = { images: filteredImages, videos: safeAllVideos }
    }
    
    return result
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
    displayImages: displayImages ?? [],
    displayVideos: displayVideos ?? [],
  }
}

