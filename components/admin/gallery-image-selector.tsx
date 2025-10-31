"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface GalleryImage {
  id: number
  image_url: string
  prompt: string
  created_at: string
  content_category?: string
  content_tags?: string[]
}

interface GalleryImageSelectorProps {
  onSelectImage: (imageUrl: string, imageId: number) => void
}

export function GalleryImageSelector({ onSelectImage }: GalleryImageSelectorProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  useEffect(() => {
    fetchImages()
  }, [selectedCategory])

  const fetchImages = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory)
      }

      const response = await fetch(`/api/admin/agent/gallery-images?${params}`)
      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error("[v0] Failed to fetch images:", error)
    } finally {
      setLoading(false)
    }
  }

  const categories = ["all", "lifestyle", "product", "portrait", "fashion", "editorial"]

  return (
    <div className="bg-stone-50 border-b border-stone-200 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <h3
          className="text-sm uppercase tracking-wider text-stone-900"
          style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
        >
          GALLERY IMAGES
        </h3>

        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
                selectedCategory === cat
                  ? "bg-stone-900 text-stone-50"
                  : "bg-stone-200 text-stone-700 hover:bg-stone-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-stone-500 text-sm">Loading images...</div>
        ) : (
          <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto">
            {images.map((image) => (
              <div
                key={image.id}
                onClick={() => onSelectImage(image.image_url, image.id)}
                className="relative aspect-square bg-stone-200 cursor-pointer hover:ring-2 hover:ring-stone-900 transition-all group"
              >
                <Image
                  src={image.image_url || "/placeholder.svg"}
                  alt={image.prompt || "Gallery image"}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/20 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                    SELECT
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && images.length === 0 && (
          <div className="text-center py-8 text-stone-500 text-sm">No images found in this category</div>
        )}
      </div>
    </div>
  )
}
