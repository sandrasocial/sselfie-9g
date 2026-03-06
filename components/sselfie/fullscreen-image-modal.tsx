"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"

interface FullscreenImageModalProps {
  imageUrl: string
  imageId: string // Changed from number to string to match GalleryImage.id format
  title: string
  isOpen: boolean
  onClose: () => void
  isFavorite?: boolean
  onFavoriteToggle?: () => void
  onDelete?: () => void
}

export default function FullscreenImageModal({
  imageUrl,
  imageId,
  title,
  isOpen,
  onClose,
  isFavorite = false,
  onFavoriteToggle,
  onDelete,
}: FullscreenImageModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error("Failed to fetch image")
      const blob = await response.blob()
      
      // On mobile, use Share API for camera roll saving (proper image, not file)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      if (isMobile && navigator.share) {
        try {
          const fileName = `${title.replace(/\s+/g, "-").toLowerCase()}.png`
          const file = new File([blob], fileName, { type: "image/png" })
          
          const shareData: ShareData = {
            files: [file],
            title: "sselfie Image",
          }
          
          if (!navigator.canShare || navigator.canShare(shareData)) {
            await navigator.share(shareData)
            // Share API saves to camera roll as proper image ✅
            return
          }
        } catch (shareError: any) {
          // If Share API fails (user cancelled or not supported), fall through to download
          if (shareError.name === "AbortError") {
            // User cancelled - that's fine
            return
          }
          console.log("[v0] Share API failed, falling back to download:", shareError?.message)
        }
      }
      
      // Fallback: Desktop or Share API not available - use download method
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.png`
      document.body.appendChild(a)
      a.click()
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 100)
    } catch (error) {
      console.error("[v0] Error downloading image:", error)
    }
  }

  const handleFavorite = async () => {
    if (!onFavoriteToggle) {
      console.warn("[v0] No favorite toggle handler provided")
      return
    }
    setIsFavoriting(true)
    try {
      await onFavoriteToggle()
    } catch (error) {
      console.error("[v0] Error toggling favorite:", error)
    } finally {
      setIsFavoriting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm("Are you sure you want to delete this image?")) return

    setIsDeleting(true)
    try {
      await onDelete()
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(13,12,11,0.95)] backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-[rgba(13,12,11,0.80)] to-transparent pt-[max(env(safe-area-inset-top),1rem)] pb-4">
        <h3 className="text-base sm:text-lg font-semibold text-[#f0ede8] truncate max-w-[60%]">{title}</h3>
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.15)] px-3 text-[10px] uppercase tracking-[0.2em] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.25)] transition-colors backdrop-blur-xl"
          aria-label="Close fullscreen view"
        >
          Close
        </button>
      </div>

      <div
        className="relative w-full h-full flex items-center justify-center p-4 overflow-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)",
        }}
      >
        <div className="relative max-w-full max-h-full">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            width={1920}
            height={1920}
            className="w-auto h-auto max-w-full max-h-[calc(100vh-200px)] object-contain"
            sizes="100vw"
            priority
            quality={100}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-[rgba(13,12,11,0.85)] to-transparent pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 backdrop-blur-2xl sm:gap-3 sm:px-4">
          {onFavoriteToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleFavorite()
              }}
              disabled={isFavoriting}
              className={`min-h-[44px] rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#f0ede8] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                isFavorite ? "border-[rgba(195,190,182,0.45)] bg-[rgba(175,170,162,0.20)] hover:bg-[rgba(175,170,162,0.28)]" : "border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] hover:bg-[rgba(175,170,162,0.18)]"
              }`}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavoriting ? "SAVING..." : isFavorite ? "FAVOURITED" : "FAVOURITE"}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDownload()
            }}
            className="min-h-[44px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#f0ede8] transition-all duration-200 hover:bg-[rgba(175,170,162,0.18)]"
            aria-label="Download image"
          >
            DOWNLOAD
          </button>

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              disabled={isDeleting}
              className="min-h-[44px] rounded-full border border-[rgba(195,190,182,0.30)] bg-[rgba(175,170,162,0.14)] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#f0ede8] transition-all duration-200 hover:bg-[rgba(175,170,162,0.22)] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Delete image"
            >
              {isDeleting ? "DELETING..." : "DELETE"}
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-[#8a8780]">ID {imageId}</p>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
