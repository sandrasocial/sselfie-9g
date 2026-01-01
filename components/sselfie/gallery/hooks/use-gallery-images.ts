"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  const isLoadingMoreRef = useRef(false)

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null
    return `/api/images?limit=50&offset=${pageIndex * 50}`
  }

  const { data, error, isLoading, mutate, size, setSize } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
    revalidateFirstPage: false,
    initialSize: 1, // Start with 1 page
  })

  // useSWRInfinite returns an array of page responses
  // Each page is the response from the API: { images: [...], hasMore: true/false, total: number }
  const images: GalleryImage[] = data 
    ? data.flatMap((page) => {
        // page should be { images: [...], hasMore: ..., total: ... }
        if (!page) return []
        const pageImages = page.images || []
        if (!Array.isArray(pageImages)) {
          console.error("[Gallery] Page images is not an array:", page)
          return []
        }
        return pageImages
      })
    : []

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMoreRef.current) {
          isLoadingMoreRef.current = true
          setIsLoadingMore(true)
          setSize((prev) => prev + 1)
        }
      },
      { threshold: 0.1 },
    )

    const currentRef = loadMoreRef.current
    observer.observe(currentRef)

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
      observer.disconnect()
    }
  }, [hasMore, setSize])

  useEffect(() => {
    if (data) {
      const lastPage = data[data.length - 1]
      const newHasMore = lastPage?.hasMore || false
      setHasMore(newHasMore)
      
      // Reset loading state if we were loading more
      if (isLoadingMoreRef.current) {
        isLoadingMoreRef.current = false
        setIsLoadingMore(false)
      }
    }
  }, [data])

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMoreRef.current) return
    isLoadingMoreRef.current = true
    setIsLoadingMore(true)
    setSize((prev) => prev + 1)
  }, [hasMore, setSize])

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

