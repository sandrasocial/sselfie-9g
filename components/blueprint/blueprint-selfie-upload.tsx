"use client"

import { useState } from "react"
import { Upload, X, Loader2 } from "lucide-react"

interface BlueprintSelfieUploadProps {
  onUploadComplete: (imageUrls: string[]) => void
  maxImages?: number
  initialImages?: string[]
  email?: string
}

// Compress image for mobile optimization
const compressImage = (file: File, maxWidth = 1600, quality = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Skip compression for small files (< 2MB) or non-image types
    if (file.size < 2 * 1024 * 1024 || !file.type.startsWith("image/")) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file) // Fallback to original if canvas fails
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file) // Fallback to original
              return
            }
            // Sanitize filename for compressed file (same logic as API)
            const sanitizeFilename = (filename: string): string => {
              const lastDotIndex = filename.lastIndexOf('.')
              const hasExtension = lastDotIndex > 0 && lastDotIndex < filename.length - 1
              const extension = hasExtension ? filename.substring(lastDotIndex) : '.jpg'
              const baseName = hasExtension ? filename.substring(0, lastDotIndex) : filename
              const sanitized = baseName
                .replace(/[^a-zA-Z0-9_-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .substring(0, 100)
              return `${sanitized || 'image'}${extension}`
            }
            const compressedFile = new File([blob], sanitizeFilename(file.name), {
              type: file.type || "image/jpeg",
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          file.type || "image/jpeg",
          quality
        )
      }
      img.onerror = () => resolve(file) // Fallback to original on error
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file) // Fallback to original on error
  })
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
    if (files.length === 0) {
      // Reset input to allow re-selecting same file
      e.target.value = ""
      return
    }

    // Check if adding these files would exceed max
    const remainingSlots = maxImages - uploadedImages.length
    if (files.length > remainingSlots) {
      setError(`You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? "s" : ""}`)
      e.target.value = ""
      return
    }

    // Email is optional for authenticated users (handled by API)
    // Only show error if this is required by the parent component
    // (The API endpoint will handle authentication and email-based lookup)

    // Validate files before upload
    const invalidFiles: string[] = []
    const heicFiles: string[] = []
    const oversizedFiles: string[] = []

    files.forEach((file) => {
      // Check for HEIC files
      const isHEIC = file.type === "image/heic" || 
                     file.type === "image/heif" ||
                     file.name.toLowerCase().endsWith(".heic") ||
                     file.name.toLowerCase().endsWith(".heif")
      if (isHEIC) {
        heicFiles.push(file.name)
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        invalidFiles.push(file.name)
      }

      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        oversizedFiles.push(file.name)
      }
    })

    if (heicFiles.length > 0) {
      setError(`${heicFiles.join(", ")} ${heicFiles.length > 1 ? "are" : "is"} in HEIC format. Please convert to JPG or PNG first.`)
      e.target.value = ""
      return
    }

    if (invalidFiles.length > 0) {
      setError(`${invalidFiles.join(", ")} ${invalidFiles.length > 1 ? "are" : "is"} not valid image files.`)
      e.target.value = ""
      return
    }

    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.join(", ")} ${oversizedFiles.length > 1 ? "are" : "is"} too large. Maximum 10MB per image.`)
      e.target.value = ""
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Compress images for mobile optimization (especially large files)
      const processedFiles = await Promise.all(
        files.map((file) => compressImage(file))
      )

      const formData = new FormData()
      // Email is optional - API will use auth session if available
      if (email) {
        formData.append("email", email)
      }
      processedFiles.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/blueprint/upload-selfies", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error messages
        let errorMessage = data.error || "Upload failed"
        
        // Check if it's a pattern mismatch error
        if (errorMessage.includes("pattern") || errorMessage.includes("match")) {
          errorMessage = "Invalid filename. Please rename your photo to remove special characters and try again."
        }
        
        throw new Error(errorMessage)
      }

      if (data.imageUrls && data.imageUrls.length > 0) {
        const newUrls = [...uploadedImages, ...data.imageUrls]
        setUploadedImages(newUrls)
        onUploadComplete(newUrls)
        setError(null)
      } else {
        // No image URLs returned - upload failed silently
        throw new Error("Upload failed: No image URLs returned")
      }
    } catch (err) {
      console.error("[Blueprint] Upload error:", err)
      const errorMessage = err instanceof Error ? err.message : "Upload failed. Please try again."
      setError(errorMessage)
      // Don't update state or call onUploadComplete if upload failed
      // This keeps the upload UI visible so user can try again
    } finally {
      setUploading(false)
      // Reset input to allow re-selecting same file
      e.target.value = ""
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
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {uploadedImages.map((url, index) => (
          <div key={index} className="relative aspect-square group">
            <img
              src={url}
              alt={`Selfie ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border-2 border-stone-200"
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full p-1.5 sm:p-2 touch-manipulation opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
              type="button"
            >
              <X size={14} className="sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        ))}

        {uploadedImages.length < maxImages && (
          <label className="aspect-square border-2 border-dashed border-stone-300 rounded-lg flex items-center justify-center cursor-pointer active:border-stone-400 active:bg-stone-50 sm:hover:border-stone-400 sm:hover:bg-stone-50 transition-colors touch-manipulation min-h-[100px] sm:min-h-0">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple={maxImages - uploadedImages.length > 1}
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className="text-center px-2">
              {uploading ? (
                <Loader2 size={20} className="mx-auto mb-1.5 sm:mb-2 text-stone-400 animate-spin sm:w-6 sm:h-6" />
              ) : (
                <Upload size={20} className="mx-auto mb-1.5 sm:mb-2 text-stone-400 sm:w-6 sm:h-6" />
              )}
              <p className="text-[10px] sm:text-xs text-stone-500 font-light">
                {uploading ? "Uploading..." : "Upload"}
              </p>
            </div>
          </label>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
          <p className="text-xs sm:text-sm text-red-600 leading-relaxed">{error}</p>
          {error.includes("HEIC") && (
            <p className="text-xs text-red-500 mt-2 leading-relaxed">
              Tip: Open the photo in your gallery, share/export as JPG or PNG, then upload the converted file.
            </p>
          )}
          {error.includes("filename") && (
            <p className="text-xs text-red-500 mt-2 leading-relaxed">
              Tip: Try renaming your photo to remove spaces and special characters.
            </p>
          )}
        </div>
      )}

      {uploadedImages.length > 0 && !error && (
        <p className="text-xs text-stone-500 font-light text-center">
          {uploadedImages.length} of {maxImages} selfie{uploadedImages.length !== 1 ? "s" : ""} uploaded
        </p>
      )}
    </div>
  )
}
