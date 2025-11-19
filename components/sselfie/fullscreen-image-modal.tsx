"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Heart, Download, Trash2, ZoomIn, ZoomOut, Info } from 'lucide-react'
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
  const [zoom, setZoom] = useState(1)
  const [showInfo, setShowInfo] = useState(false)
  const [imageMetadata, setImageMetadata] = useState<{
    width?: number
    height?: number
    size?: string
    format?: string
  } | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen && imageUrl) {
      const img = document.createElement("img")
      img.onload = () => {
        setImageMetadata({
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: imageUrl.split(".").pop()?.toUpperCase() || "Unknown",
        })
      }
      img.src = imageUrl

      fetch(imageUrl, { method: "HEAD" })
        .then((response) => {
          const contentLength = response.headers.get("content-length")
          if (contentLength) {
            const sizeInBytes = Number.parseInt(contentLength)
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2)
            setImageMetadata((prev) => ({ ...prev, size: `${sizeInMB} MB` }))
          }
        })
        .catch((error) => console.error("[v0] Error fetching image size:", error))
    }
  }, [isOpen, imageUrl])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      setZoom(1)
      setShowInfo(false)
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
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
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

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent pt-[max(env(safe-area-inset-top),1rem)] pb-4">
        <h3 className="text-base sm:text-lg font-semibold text-white truncate max-w-[60%]">{title}</h3>
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-xl"
          aria-label="Close fullscreen view"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
        </button>
      </div>

      {/* Image Container */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4 overflow-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)",
        }}
      >
        <div
          className="relative max-w-full max-h-full transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
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

      <div
        className="absolute right-4 sm:right-6 z-10 flex flex-col gap-2"
        style={{ top: "calc(env(safe-area-inset-top) + 5rem)" }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowInfo(!showInfo)
          }}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-xl"
          aria-label="Toggle image info"
        >
          <Info className="w-5 h-5 text-white" strokeWidth={2} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleZoomIn()
          }}
          disabled={zoom >= 3}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-5 h-5 text-white" strokeWidth={2} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleZoomOut()
          }}
          disabled={zoom <= 0.5}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-5 h-5 text-white" strokeWidth={2} />
        </button>
      </div>

      {showInfo && imageMetadata && (
        <div
          className="absolute left-4 sm:left-6 z-10 bg-black/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 max-w-xs animate-in fade-in slide-in-from-left-2 duration-200"
          style={{ top: "calc(env(safe-area-inset-top) + 5rem)" }}
        >
          <h4 className="text-sm font-semibold text-white mb-3 tracking-wide">Image Info</h4>
          <div className="space-y-2 text-xs text-stone-300">
            <div className="flex justify-between gap-4">
              <span className="text-stone-400">Dimensions:</span>
              <span className="font-medium text-white">
                {imageMetadata.width} × {imageMetadata.height}
              </span>
            </div>
            {imageMetadata.size && (
              <div className="flex justify-between gap-4">
                <span className="text-stone-400">File Size:</span>
                <span className="font-medium text-white">{imageMetadata.size}</span>
              </div>
            )}
            {imageMetadata.format && (
              <div className="flex justify-between gap-4">
                <span className="text-stone-400">Format:</span>
                <span className="font-medium text-white">{imageMetadata.format}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-stone-400">Image ID:</span>
              <span className="font-medium text-white">#{imageId}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/80 to-transparent pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          {onFavoriteToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleFavorite()
              }}
              disabled={isFavoriting}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 min-h-[44px] backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                isFavorite ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/10 text-white hover:bg-white/20"
              }`}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} strokeWidth={2} />
              <span className="hidden sm:inline">
                {isFavoriting ? "Saving..." : isFavorite ? "Favorited" : "Favorite"}
              </span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDownload()
            }}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-white/10 text-white rounded-2xl font-semibold text-sm transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95 min-h-[44px] backdrop-blur-xl"
            aria-label="Download image"
          >
            <Download className="w-5 h-5" strokeWidth={2} />
            <span className="hidden sm:inline">Download</span>
          </button>

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-red-500/80 text-white rounded-2xl font-semibold text-sm transition-all duration-300 hover:bg-red-500 hover:scale-105 active:scale-95 min-h-[44px] backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Delete image"
            >
              <Trash2 className="w-5 h-5" strokeWidth={2} />
              <span className="hidden sm:inline">{isDeleting ? "Deleting..." : "Delete"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
