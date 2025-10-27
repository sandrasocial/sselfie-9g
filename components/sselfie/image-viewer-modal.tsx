"use client"

import { useState } from "react"
import { X, Heart, Download, Trash2 } from "lucide-react"
import Image from "next/image"

interface ImageViewerModalProps {
  imageUrl: string
  imageId: number
  title: string
  isOpen: boolean
  onClose: () => void
  isFavorite?: boolean
  onFavoriteToggle?: () => void
  onDelete?: () => void
}

export default function ImageViewerModal({
  imageUrl,
  imageId,
  title,
  isOpen,
  onClose,
  isFavorite = false,
  onFavoriteToggle,
  onDelete,
}: ImageViewerModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)

  if (!isOpen) return null

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-6 bg-gradient-to-b from-black/60 to-transparent">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Image */}
        <div className="relative w-full h-[70vh]">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            fill
            className="object-contain"
            sizes="(max-width: 1200px) 100vw, 1200px"
            priority
          />
        </div>

        {/* Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleFavorite}
              disabled={isFavoriting}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 ${
                isFavorite ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "Favorited" : "Favorite"}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl font-semibold text-sm transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95"
            >
              <Download className="w-5 h-5" />
              Download
            </button>

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-6 py-3 bg-red-500/80 text-white rounded-2xl font-semibold text-sm transition-all duration-300 hover:bg-red-500 hover:scale-105 active:scale-95"
            >
              <Trash2 className="w-5 h-5" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
