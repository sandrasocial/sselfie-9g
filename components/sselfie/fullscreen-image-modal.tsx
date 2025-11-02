"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Heart, Download, Trash2, ZoomIn, ZoomOut } from "lucide-react"
import Image from "next/image"

interface FullscreenImageModalProps {
  imageUrl: string
  imageId: number
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

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      setZoom(1)
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
    if (!onFavoriteToggle) return
    setIsFavoriting(true)
    try {
      await onFavoriteToggle()
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
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent">
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

      {/* Zoom Controls */}
      <div className="absolute top-20 right-4 sm:right-6 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 3}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-5 h-5 text-white" strokeWidth={2} />
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-5 h-5 text-white" strokeWidth={2} />
        </button>
      </div>

      {/* Actions Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          <button
            onClick={handleFavorite}
            disabled={isFavoriting}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 min-h-[44px] backdrop-blur-xl ${
              isFavorite ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/10 text-white hover:bg-white/20"
            }`}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} strokeWidth={2} />
            <span className="hidden sm:inline">{isFavorite ? "Favorited" : "Favorite"}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-white/10 text-white rounded-2xl font-semibold text-sm transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95 min-h-[44px] backdrop-blur-xl"
            aria-label="Download image"
          >
            <Download className="w-5 h-5" strokeWidth={2} />
            <span className="hidden sm:inline">Download</span>
          </button>

          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-red-500/80 text-white rounded-2xl font-semibold text-sm transition-all duration-300 hover:bg-red-500 hover:scale-105 active:scale-95 min-h-[44px] backdrop-blur-xl"
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
