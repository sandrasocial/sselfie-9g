"use client"

import { useState } from "react"
import { Upload, X, Loader2 } from "lucide-react"

interface BlueprintSelfieUploadProps {
  onUploadComplete: (imageUrls: string[]) => void
  maxImages?: number
  initialImages?: string[]
  email?: string
}

export function BlueprintSelfieUpload({
  onUploadComplete,
  maxImages = 3,
  initialImages = [],
  email,
}: BlueprintSelfieUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>(initialImages)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Check if adding these files would exceed max
    const remainingSlots = maxImages - uploadedImages.length
    if (files.length > remainingSlots) {
      setError(`You can only upload ${remainingSlots} more image(s)`)
      return
    }

    // Validate email before setting uploading state
    if (!email) {
      setError("Please complete email capture first")
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("email", email)
      files.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/blueprint/upload-selfies", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      if (data.imageUrls) {
        const newUrls = [...uploadedImages, ...data.imageUrls]
        setUploadedImages(newUrls)
        onUploadComplete(newUrls)
      }
    } catch (err) {
      console.error("[Blueprint] Upload error:", err)
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    setUploadedImages(newImages)
    onUploadComplete(newImages)
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {uploadedImages.map((url, index) => (
          <div key={index} className="relative aspect-square group">
            <img
              src={url}
              alt={`Selfie ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border-2 border-stone-200"
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {uploadedImages.length < maxImages && (
          <label className="aspect-square border-2 border-dashed border-stone-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className="text-center">
              {uploading ? (
                <Loader2 size={24} className="mx-auto mb-2 text-stone-400 animate-spin" />
              ) : (
                <Upload size={24} className="mx-auto mb-2 text-stone-400" />
              )}
              <p className="text-xs text-stone-500 font-light">
                {uploading ? "Uploading..." : "Upload"}
              </p>
            </div>
          </label>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {uploadedImages.length > 0 && (
        <p className="text-xs text-stone-500 font-light text-center">
          {uploadedImages.length} of {maxImages} selfie{uploadedImages.length !== 1 ? "s" : ""} uploaded
        </p>
      )}
    </div>
  )
}
