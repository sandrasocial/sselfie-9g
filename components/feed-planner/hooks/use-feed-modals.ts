"use client"

import { useState, useEffect } from "react"

/**
 * Hook for managing modal state and preventing body scroll
 */
export function useFeedModals() {
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [showGallery, setShowGallery] = useState<number | null>(null)
  const [showProfileGallery, setShowProfileGallery] = useState(false)

  // Prevent body scroll when any modal is open
  useEffect(() => {
    const hasOpenModal = !!selectedPost || !!showGallery || showProfileGallery
    
    if (hasOpenModal) {
      // Save original overflow style
      const originalOverflow = document.body.style.overflow
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      // Cleanup: restore original overflow on unmount or when modal closes
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [selectedPost, showGallery, showProfileGallery])

  return {
    selectedPost,
    setSelectedPost,
    showGallery,
    setShowGallery,
    showProfileGallery,
    setShowProfileGallery,
  }
}

