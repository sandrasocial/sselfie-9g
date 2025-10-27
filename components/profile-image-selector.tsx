"use client"

import type React from "react"

import { useState } from "react"
import { X, Upload, Check } from "lucide-react"
import type { GalleryImage } from "@/lib/data/images"

interface ProfileImageSelectorProps {
  images: GalleryImage[]
  currentAvatar: string
  onSelect: (imageUrl: string) => void
  onClose: () => void
}

export function ProfileImageSelector({ images, currentAvatar, onSelect, onClose }: ProfileImageSelectorProps) {
  const [selectedImage, setSelectedImage] = useState<string>(currentAvatar)
  const [isSaving, setIsSaving] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const imageUrl = reader.result as string
        setSelectedImage(imageUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/user/profile-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: selectedImage }),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile image")
      }

      onSelect(selectedImage)
      onClose()
    } catch (error) {
      console.error("[v0] Error saving profile image:", error)
      alert("Failed to save profile image. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <h2 className="text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase">
            Select Profile Image
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X size={20} className="text-stone-600" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload option */}
          <div className="mb-6">
            <label className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-stone-300 rounded-2xl hover:border-stone-400 hover:bg-stone-50 transition-all cursor-pointer">
              <Upload size={20} className="text-stone-600" strokeWidth={1.5} />
              <span className="text-sm font-light text-stone-600">Upload from device</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Generated images grid */}
          <div className="space-y-4">
            <h3 className="text-sm tracking-[0.1em] uppercase font-light text-stone-600">Your Generated Images</h3>
            <div className="grid grid-cols-4 gap-4">
              {images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(image.image_url)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === image.image_url
                      ? "border-stone-950 ring-2 ring-stone-950 ring-offset-2"
                      : "border-stone-200 hover:border-stone-400"
                  } relative`}
                >
                  <img src={image.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                  {selectedImage === image.image_url && (
                    <div className="absolute inset-0 bg-stone-950/40 flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <Check size={16} className="text-stone-950" strokeWidth={2.5} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light text-stone-600 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 text-sm tracking-[0.1em] uppercase font-light bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
