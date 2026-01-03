"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Camera, Aperture, ChevronRight, X } from "lucide-react"
import UnifiedLoading from "./unified-loading"
import LoadingSpinner from "./loading-spinner"
import useSWR from "swr"
import JSZip from "jszip"
import { DesignClasses } from "@/lib/design-tokens"

interface TrainingScreenProps {
  user: any
  userId: string
  setHasTrainedModel: (value: boolean) => void
  setActiveTab: (tab: string) => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const compressImage = async (file: File, maxSize = 1600, quality = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    const isHEIC =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif")

    if (isHEIC) {
      reject(
        new Error(
          `${file.name} is in HEIC format which is not supported by web browsers. Please convert to JPG/PNG first:\n\n1. Open the photo in your gallery\n2. Share/Export as JPG or PNG\n3. Try uploading again`,
        ),
      )
      return
    }

    const MAX_FILE_SIZE_MB = 15
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      reject(
        new Error(
          `${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${MAX_FILE_SIZE_MB}MB per image.`,
        ),
      )
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        let width = img.width
        let height = img.height

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }

        canvas.width = width
        canvas.height = height

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"))
              return
            }
            const compressedFile = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
            console.log(
              `[v0] Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${maxSize}px, ${(quality * 100).toFixed(0)}% quality)`,
            )
            resolve(compressedFile)
          },
          "image/jpeg",
          quality,
        )
      }
      img.onerror = () =>
        reject(
          new Error(
            `Failed to load ${file.name}. This might be an unsupported format (HEIC/HEIF). Please convert to JPG/PNG and try again.`,
          ),
        )
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
  })
}

const createZipFromFiles = async (files: File[]): Promise<Blob> => {
  const zip = new JSZip()
  files.forEach((file, i) => {
    zip.file(`image_${i + 1}.jpg`, file)
  })

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 }, // Maximum compression
  })
}

export default function TrainingScreen({ user, userId, setHasTrainedModel, setActiveTab }: TrainingScreenProps) {
  const [trainingStage, setTrainingStage] = useState<"upload" | "training" | "completed">("upload")
  const [selectedGender, setSelectedGender] = useState("")
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0, stage: "" })
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)
  const [selectedEthnicity, setSelectedEthnicity] = useState<string>("")

  const {
    data: trainingStatus,
    error,
    mutate,
  } = useSWR("/api/training/status", fetcher, {
    refreshInterval: 0,
  })

  const modelId = trainingStatus?.model?.id
  const isTraining =
    trainingStatus?.model?.training_status === "training" || trainingStatus?.model?.training_status === "processing"

  const { data: progressData } = useSWR(
    isTraining && modelId ? `/api/training/progress?modelId=${modelId}` : null,
    fetcher,
    {
      refreshInterval: isTraining ? 15000 : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  console.log("[v0] Training status data:", trainingStatus)
  if (isTraining) {
    console.log("[v0] Training progress data:", progressData)
  }
  if (progressData?.debug) {
    console.log("[v0] Progress API debug info:", progressData.debug)
  }
  if (progressData?.error) {
    console.error("[v0] Progress API error:", progressData.error)
  }

  useEffect(() => {
    const currentModel = progressData?.model || trainingStatus?.model

    if (currentModel) {
      if (currentModel.training_status === "completed") {
        setTrainingStage("completed")
        setHasTrainedModel(true)
        mutate()
      } else if (currentModel.training_status === "training" || currentModel.training_status === "processing") {
        setTrainingStage("training")
      } else {
        setTrainingStage("upload")
      }
    }
  }, [trainingStatus, progressData, setHasTrainedModel, mutate])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    console.log("[v0] Files selected:", files.length)
    console.log(
      "[v0] File types:",
      files.map((f) => `${f.name}: ${f.type}`),
    )

    const heicFiles = files.filter((file) => {
      const isHEIC =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif")
      return isHEIC
    })

    if (heicFiles.length > 0) {
      const fileList = heicFiles.map((f) => f.name).join("\n")
      alert(
        `These photos are in HEIC format and cannot be uploaded:\n\n${fileList}\n\nTo fix this:\n1. Open each photo in your gallery\n2. Share/Export as JPG or PNG\n3. Upload the converted files\n\nNote: You can usually change your camera settings to save as JPG instead of HEIC.`,
      )
      e.target.value = ""
      return
    }

    const MAX_FILE_SIZE_MB = 15
    const invalidFiles = files.filter((file) => file.size > MAX_FILE_SIZE_MB * 1024 * 1024)

    if (invalidFiles.length > 0) {
      const fileList = invalidFiles.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join("\n")
      alert(
        `These images are too large:\n\n${fileList}\n\nMaximum size is ${MAX_FILE_SIZE_MB}MB per image. Please resize them and try again.`,
      )
      e.target.value = ""
      return
    }

    if (uploadedImages.length + files.length > 20) {
      alert(`You can upload up to 20 images total. You currently have ${uploadedImages.length} uploaded.`)
      e.target.value = ""
      return
    }

    setUploadedImages((prev) => [...prev, ...files])
    e.target.value = ""
  }

  const handleRemoveUploadedImage = (index: number) => {
    console.log(`[v0] Removing image at index ${index}`)
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Helper function to yield to UI thread
  const yieldToUI = (): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(() => resolve(), { timeout: 100 })
      } else {
        setTimeout(() => resolve(), 100)
      }
    })
  }

  const startTraining = async () => {
    if (uploadedImages.length < 10) {
      alert("Please upload at least 10 images to train your AI model.")
      return
    }

    if (!selectedGender) {
      alert("Please select your gender so we can train your model accurately.")
      return
    }

    if (!selectedEthnicity) {
      alert("Please select your ethnicity for accurate representation in generated images.")
      return
    }

    try {
      setIsUploading(true)
      setCompressionProgress({ current: 0, total: uploadedImages.length, stage: "Preparing images..." })

      console.log(
        `[v0] Starting adaptive compression - ${uploadedImages.length} images, gender: ${selectedGender}, ethnicity: ${selectedEthnicity}`,
      )
      console.log("[v0] Browser:", navigator.userAgent)
      
      const totalSizeMB = uploadedImages.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024
      console.log("[v0] Total size before compression:", totalSizeMB, "MB")

      // Smart compression level selection based on total file size
      const compressionLevels = [
        { maxSize: 1600, quality: 0.85, name: "High quality" },
        { maxSize: 1400, quality: 0.75, name: "Medium-high quality" },
        { maxSize: 1200, quality: 0.7, name: "Medium quality" },
        { maxSize: 1000, quality: 0.65, name: "Standard quality" },
        { maxSize: 800, quality: 0.6, name: "Lower quality" },
        { maxSize: 600, quality: 0.55, name: "Minimum quality" },
      ]

      let compressedFiles: File[] = []
      let zipBlob: Blob | null = null
      let successfulLevel: (typeof compressionLevels)[0] | null = null

      // Always start from highest quality and work down - don't skip optimal quality levels
      // The compression loop will naturally try higher quality first, then degrade if needed
      for (let levelIndex = 0; levelIndex < compressionLevels.length; levelIndex++) {
        const level = compressionLevels[levelIndex]
        console.log(`[v0] Trying compression: ${level.name} (${level.maxSize}px, ${(level.quality * 100).toFixed(0)}%)`)
        setCompressionProgress({ current: 0, total: uploadedImages.length, stage: `Compressing at ${level.name}...` })
        compressedFiles = []

        // Yield to UI before starting compression
        await yieldToUI()

        for (let i = 0; i < uploadedImages.length; i++) {
          const file = uploadedImages[i]
          setCompressionProgress({ 
            current: i + 1, 
            total: uploadedImages.length, 
            stage: `Compressing image ${i + 1} of ${uploadedImages.length}...` 
          })

          try {
            const compressedFile = await compressImage(file, level.maxSize, level.quality)
            compressedFiles.push(compressedFile)
            
            // Yield to UI thread after every image to prevent freezing
            if (i % 3 === 0 || i === uploadedImages.length - 1) {
              await yieldToUI()
            } else {
              await new Promise((resolve) => setTimeout(resolve, 50))
            }
          } catch (error: any) {
            console.error(`[v0] Error processing image ${i + 1}:`, error)
            if (error.message?.includes("HEIC") || error.message?.includes("HEIF")) {
              throw new Error(`One or more photos are in HEIC format.\n\n${error.message}`)
            }
            throw error
          }
        }

        setCompressionProgress({ 
          current: uploadedImages.length, 
          total: uploadedImages.length, 
          stage: "Creating ZIP file..." 
        })
        
        // Yield before creating ZIP
        await yieldToUI()

        zipBlob = await createZipFromFiles(compressedFiles)
        const zipSizeMB = zipBlob.size / (1024 * 1024)
        console.log(`[v0] ZIP size with ${level.name}: ${zipSizeMB.toFixed(2)}MB`)

        if (zipSizeMB < 4.0) {
          successfulLevel = level
          console.log(`[v0] Success! ZIP fits under 4MB with ${level.name}`)
          break
        } else {
          console.log(`[v0] ZIP too large (${zipSizeMB.toFixed(2)}MB), trying next compression level...`)
          // Yield before trying next level
          await yieldToUI()
        }
      }

      if (!zipBlob || !successfulLevel) {
        throw new Error(
          "Unable to compress images small enough. Please try with fewer images (10-12) or use smaller original files.",
        )
      }

      const zipSizeMB = (zipBlob.size / (1024 * 1024)).toFixed(2)
      console.log(`[v0] Final ZIP created with ${successfulLevel.name}, size: ${zipSizeMB}MB`)

      // Reset compression progress to hide compression progress bar during upload
      setCompressionProgress({ current: 0, total: 0, stage: "" })
      setUploadProgress({ current: 0, total: 1 })

      console.log("[v0] Uploading ZIP to server...")
      const formData = new FormData()
      formData.append("zipFile", zipBlob, "training_images.zip")
      formData.append("gender", selectedGender)
      formData.append("ethnicity", selectedEthnicity)
      formData.append("modelName", `${user.display_name || "User"}'s Model`)
      formData.append("imageCount", String(compressedFiles.length)) // For validation

      const uploadResponse = await fetch("/api/training/upload-zip", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] Upload error:", errorData)
        throw new Error(errorData.error || "Failed to upload and start training")
      }

      const result = await uploadResponse.json()
      console.log("[v0] Training started successfully:", result)

      // Update upload progress to 100% before resetting to show completion
      setUploadProgress({ current: 1, total: 1 })
      
      // Brief delay to show 100% completion before transitioning
      await new Promise((resolve) => setTimeout(resolve, 300))

      setUploadedImages([])
      setIsUploading(false)
      setUploadProgress({ current: 0, total: 0 })
      setCompressionProgress({ current: 0, total: 0, stage: "" })

      await new Promise((resolve) => setTimeout(resolve, 500))

      setTrainingStage("training")
      mutate()
    } catch (error: any) {
      console.error("[v0] Error starting training:", error)
      console.error("[v0] Full error object:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })

      let errorMessage = "Something went wrong. Please try again."

      if (error.message?.includes("HEIC") || error.message?.includes("HEIF")) {
        errorMessage = error.message
      } else if (
        error.name === "TimeoutError" ||
        error.message?.includes("Timeout") ||
        error.message?.includes("timed out")
      ) {
        errorMessage =
          "Upload is taking too long. Please check your internet connection and try again with fewer or smaller images (10-12 photos)."
      } else if (error.message?.includes("canvas") || error.message?.includes("memory")) {
        errorMessage =
          "Your device ran out of memory processing the images. Please try with fewer photos (10-12) or restart your browser."
      } else if (error.message) {
        errorMessage = error.message
      }

      alert(`Failed to start training\n\n${errorMessage}`)

      setIsUploading(false)
      setUploadProgress({ current: 0, total: 0 })
      setCompressionProgress({ current: 0, total: 0, stage: "" })
    }
  }

  const handleRetrain = () => {
    setTrainingStage("upload")
    setUploadedImages([])
    setSelectedGender("")
    setSelectedEthnicity("")
    setIsUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    setCompressionProgress({ current: 0, total: 0, stage: "" })
  }

  const handleCancelTraining = async () => {
    if (!confirm("Are you sure you want to stop training? You'll need to start over.")) {
      return
    }

    try {
      setIsCanceling(true)
      console.log("[v0] Canceling training for model:", modelId)

      const response = await fetch("/api/training/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ modelId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to cancel training")
      }

      console.log("[v0] Training canceled successfully")

      await mutate()

      setTrainingStage("upload")
      setUploadProgress({ current: 0, total: 0 })
      setCompressionProgress({ current: 0, total: 0, stage: "" })
    } catch (error) {
      console.error("[v0] Error canceling training:", error)
      alert(`Failed to cancel training: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsCanceling(false)
    }
  }

  const handleDeleteImage = async (imageId: number, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return
    }

    try {
      setDeletingImageId(imageId)

      const response = await fetch(`/api/training/delete?imageId=${imageId}&imageUrl=${encodeURIComponent(imageUrl)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete image")
      }

      mutate()
    } catch (error) {
      console.error("Error deleting image:", error)
      alert("Failed to delete image. Please try again.")
    } finally {
      setDeletingImageId(null)
    }
  }

  if (!trainingStatus && !error) {
    return (
      <UnifiedLoading variant="screen" message="Loading training status..." />
    )
  }

  const model = progressData?.model || trainingStatus?.model
  const trainingProgress = progressData?.progress || model?.training_progress || 0
  const imageCount = trainingStatus?.trainingImages?.length || 0

  return (
    <div className="space-y-6 sm:space-y-8 pb-28 sm:pb-32 md:pb-36 pt-safe">
      <div className="pt-8 sm:pt-4 md:pt-6 px-4 sm:px-6 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase leading-none mb-2 sm:mb-3">
          AI Training
        </h1>
        <p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase font-light text-stone-500">
          Train Your Personal Model
        </p>
      </div>

      {trainingStage === "completed" && model && (
        <div className="mx-4 sm:mx-6 bg-white/50 backdrop-blur-2xl border border-white/60 rounded-xl sm:rounded-[1.75rem] p-5 sm:p-6 md:p-8 text-center shadow-xl shadow-stone-900/10">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6">
            <div className="absolute inset-0 bg-stone-200/30 rounded-full animate-ping"></div>
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-stone-950 rounded-full flex items-center justify-center shadow-2xl shadow-stone-900/40">
              <Aperture size={32} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-stone-950 mb-3 sm:mb-4">Model Trained</h3>
          <p className="text-xs sm:text-sm font-medium text-stone-600 mb-6 sm:mb-8">
            Your AI model is ready! You can now create professional photos.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className={`${DesignClasses.spacing.padding.md} ${DesignClasses.background.secondary} ${DesignClasses.blur.sm} ${DesignClasses.radius.lg} ${DesignClasses.border.medium} ${DesignClasses.shadows.card}`}>
              <div className="text-2xl sm:text-3xl font-bold text-stone-950 mb-1 sm:mb-2">{imageCount}</div>
              <div className="text-[10px] sm:text-xs tracking-wider uppercase font-semibold text-stone-600">
                Photos Trained
              </div>
            </div>
            <div className={`${DesignClasses.spacing.padding.md} ${DesignClasses.background.secondary} ${DesignClasses.blur.sm} ${DesignClasses.radius.lg} ${DesignClasses.border.medium} ${DesignClasses.shadows.card}`}>
              <div className="text-2xl sm:text-3xl font-bold text-stone-950 mb-1 sm:mb-2">100%</div>
              <div className="text-[10px] sm:text-xs tracking-wider uppercase font-semibold text-stone-600">
                Model Ready
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setHasTrainedModel(true)
              setActiveTab("studio")
            }}
            className={`group relative w-full ${DesignClasses.buttonPrimary} mb-3 sm:mb-4 min-h-[52px] sm:min-h-[60px] overflow-hidden`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              Go to Studio
              <ChevronRight size={14} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>

          <button
            onClick={handleRetrain}
            className={`w-full ${DesignClasses.background.secondary} ${DesignClasses.blur.sm} ${DesignClasses.text.primary} ${DesignClasses.border.medium} py-4 sm:py-5 ${DesignClasses.radius.lg} font-semibold text-xs sm:text-sm transition-all duration-300 hover:bg-white/80 hover:border-white/90 min-h-[52px] sm:min-h-[60px] ${DesignClasses.shadows.button} hover:scale-[1.02] active:scale-[0.98]`}
          >
            Retrain Model
          </button>
        </div>
      )}

      {trainingStage === "training" && (
        <div className={`mx-4 sm:mx-6 ${DesignClasses.card}`}>
          <div className="text-center mb-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-stone-200/30 animate-ping"></div>
              <div className="relative w-24 h-24 rounded-full bg-stone-950 flex items-center justify-center shadow-2xl shadow-stone-900/40 animate-pulse">
                <div className="text-white text-2xl font-bold">{trainingProgress}%</div>
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-stone-950 mb-4">Training Your Model</h3>
            <p className="text-sm font-medium text-stone-600 mb-8">
              Your AI is learning from your photos. This usually takes a couple of minutes. We'll let you know when it's
              ready.
            </p>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-sm font-semibold text-stone-700 mb-3">
              <span>Progress</span>
              <span>{trainingProgress}%</span>
            </div>
            <div className="relative w-full h-3 bg-stone-200/40 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-stone-950 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${trainingProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { stage: "Preprocessing", done: trainingProgress > 20 },
              { stage: "Training Model", done: trainingProgress > 70 },
              { stage: "Finalizing", done: trainingProgress > 95 },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-xl rounded-[1.25rem] border border-white/60 shadow-lg"
              >
                <span className="text-sm font-semibold text-stone-950">{item.stage}</span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                    item.done ? "bg-stone-950 shadow-lg shadow-stone-900/30" : "bg-stone-300/60"
                  }`}
                >
                  {item.done && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 backdrop-blur-xl rounded-full border border-stone-200">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-bounce"></div>
                <div
                  className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <span className="text-xs tracking-wider uppercase font-semibold text-stone-700">
                {progressData?.estimated_remaining_minutes !== undefined
                  ? `${progressData.estimated_remaining_minutes} minutes remaining`
                  : `${Math.max(1, Math.round((100 - trainingProgress) / 4))} minutes remaining`}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleCancelTraining}
              disabled={isCanceling}
              className="w-full bg-white/60 backdrop-blur-xl text-stone-950 border border-white/70 py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-semibold text-xs sm:text-sm transition-all duration-300 hover:bg-stone-50/70 hover:border-stone-300/80 hover:text-stone-950 min-h-[52px] sm:min-h-[60px] shadow-lg shadow-stone-900/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isCanceling ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Stopping Training...
                </span>
              ) : (
                "Stop Training"
              )}
            </button>
          </div>
        </div>
      )}

      {trainingStage === "upload" && (
        <>
          <div className="mx-4 sm:mx-6 bg-stone-100/50 border border-stone-200/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg md:text-xl font-serif font-extralight tracking-[0.15em] text-stone-950 uppercase mb-2 sm:mb-3">
                Select Your Gender
              </h3>
              <p className="text-xs sm:text-sm font-light text-stone-600">
                This helps us train your AI model more accurately
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto mb-4 sm:mb-6">
              {[
                { value: "woman", label: "Woman" },
                { value: "man", label: "Man" },
                { value: "non-binary", label: "Non Binary" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedGender(option.value)}
                  className={`group p-6 rounded-[1.5rem] font-semibold tracking-wide text-sm transition-all duration-300 min-h-[90px] relative overflow-hidden ${
                    selectedGender === option.value
                      ? "bg-stone-950 text-white shadow-2xl shadow-stone-900/40 scale-[1.02]"
                      : "bg-white/50 backdrop-blur-xl text-stone-950 border border-white/60 hover:bg-white/70 hover:border-white/80 hover:scale-[1.02]"
                  } border shadow-lg shadow-stone-900/10 active:scale-[0.98]`}
                >
                  {selectedGender === option.value && <div className="absolute inset-0 bg-white/10"></div>}
                  <span className="relative z-10">{option.label}</span>
                </button>
              ))}
            </div>

            {selectedGender && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 backdrop-blur-xl rounded-full border border-stone-200 shadow-lg">
                  <div className="w-2 h-2 bg-stone-950 rounded-full shadow-lg shadow-stone-900/50"></div>
                  <span className="text-xs tracking-wider uppercase font-semibold text-stone-950">
                    Selected: {selectedGender === "woman" ? "Woman" : selectedGender === "man" ? "Man" : "Non Binary"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mx-4 sm:mx-6 bg-stone-100/50 border border-stone-200/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="text-xs tracking-[0.15em] uppercase font-light mb-4 text-stone-500">Step 1 of 2</div>
              <h3 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.1em] text-stone-950 uppercase mb-4">
                Upload Your Selfies
              </h3>
              <p className="text-sm font-light text-stone-600 mb-6">
                Upload 10-20 selfies to train your AI model. Good lighting and variety work best.
              </p>
            </div>

            <div className="mb-8">
              <div className="text-center mb-6">
                <h4 className="text-sm font-semibold text-stone-950 mb-2 tracking-wide">Example Training Photos</h4>
                <p className="text-xs text-stone-600 font-light">
                  Upload photos like these: different angles, lighting, and settings
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-6">
                {[
                  {
                    url: "/images/img-7713-jpg.jpeg",
                    alt: "Full body professional shot",
                  },
                  {
                    url: "/images/img-4785.jpg",
                    alt: "Close-up portrait",
                  },
                  {
                    url: "/images/img-4128.jpeg",
                    alt: "Outdoor full body",
                  },
                  {
                    url: "/images/img-9591-jpg.jpeg",
                    alt: "Casual half body",
                  },
                  {
                    url: "/images/img-4801.jpg",
                    alt: "Portrait close-up",
                  },
                  {
                    url: "/images/img-6384-jpg.jpg",
                    alt: "Upper body shot",
                  },
                ].map((example, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-stone-200/30 rounded-lg sm:rounded-xl border border-stone-300/30 overflow-hidden shadow-lg"
                  >
                    <img
                      src={example.url || "/placeholder.svg"}
                      alt={example.alt}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>

            <label className="block border-2 border-dashed border-stone-300/60 rounded-[1.5rem] p-8 sm:p-12 text-center mb-6 bg-white/30 backdrop-blur-xl hover:bg-white/50 hover:border-stone-400/60 transition-all duration-300 cursor-pointer group">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
              <div className="w-16 h-16 bg-stone-950 rounded-[1.25rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-stone-900/30 group-hover:scale-110 transition-transform duration-300">
                <Camera size={28} className="text-white" strokeWidth={2.5} />
              </div>
              <h4 className="text-base font-semibold text-stone-950 mb-3">Click to Upload Photos</h4>
              <p className="text-sm font-medium text-stone-600 mb-4">or drag and drop</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100/60 backdrop-blur-xl rounded-full">
                <div className="w-2 h-2 bg-stone-950 rounded-full"></div>
                <span className="text-xs tracking-wider uppercase font-semibold text-stone-700">
                  {uploadedImages.length} / 10 minimum
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-4">
                Note: HEIC photos are not supported. Please convert to JPG/PNG first.
              </p>
            </label>

            {(isUploading || compressionProgress.total > 0) && (
              <div className="mb-6 p-6 bg-white/50 backdrop-blur-xl rounded-xl border border-white/60">
                {compressionProgress.total > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-stone-950">
                        {compressionProgress.stage || "Processing images..."}
                      </span>
                      <span className="text-sm font-semibold text-stone-950">
                        {compressionProgress.current} / {compressionProgress.total}
                      </span>
                    </div>
                    <div className="relative w-full h-2 bg-stone-200/40 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-stone-950 rounded-full transition-all duration-300"
                        style={{ width: `${(compressionProgress.current / compressionProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </>
                )}
                {uploadProgress.total > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-stone-950">Uploading to server...</span>
                      <span className="text-sm font-semibold text-stone-950">
                        {uploadProgress.current} / {uploadProgress.total}
                      </span>
                    </div>
                    <div className="relative w-full h-2 bg-stone-200/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-stone-950 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </>
                )}
              </div>
            )}

            {uploadedImages.length > 0 && !isUploading && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
                {uploadedImages.map((file, i) => (
                  <div
                    key={i}
                    className="relative aspect-square bg-stone-200/30 rounded-xl border border-stone-300/30 overflow-hidden group"
                  >
                    <img
                      src={URL.createObjectURL(file) || "/placeholder.svg"}
                      alt={`Upload ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemoveUploadedImage(i)}
                      className="absolute top-2 right-2 w-8 h-8 bg-stone-950/80 hover:bg-stone-950 active:bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Remove image"
                    >
                      <X size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {imageCount > 0 && !isUploading && uploadedImages.length === 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-stone-950 mb-3">Uploaded Training Images ({imageCount})</h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {trainingStatus?.trainingImages?.map((image: any, i: number) => (
                    <div
                      key={i}
                      className="relative aspect-square bg-stone-200/30 rounded-xl border border-stone-300/30 overflow-hidden group"
                    >
                      <img
                        src={image.original_url || "/placeholder.svg"}
                        alt={`Training image ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleDeleteImage(image.id, image.original_url)}
                        disabled={deletingImageId === image.id}
                        className="absolute top-1 right-1 w-6 h-6 bg-stone-950/80 hover:bg-stone-950 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-50"
                        aria-label="Delete image"
                      >
                        {deletingImageId === image.id ? (
                          <LoadingSpinner size="sm" className="text-white" />
                        ) : (
                          <span className="text-xs font-bold">×</span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Clear Photos", desc: "Well-lit selfies" },
                { label: "Variety", desc: "Different angles" },
                { label: "10-20 Images", desc: "Best results" },
              ].map((item, i) => (
                <div key={i} className="text-center p-4 bg-stone-50/50 rounded-xl border border-stone-200/30">
                  <div className="w-8 h-8 bg-stone-950 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="text-sm font-light text-stone-950 mb-1">{item.label}</div>
                  <div className="text-xs font-light text-stone-600">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">Select your ethnicity</label>
              <p className="text-xs text-muted-foreground">
                This ensures your AI-generated images accurately reflect your skin tone and features
              </p>
              <select
                value={selectedEthnicity}
                onChange={(e) => setSelectedEthnicity(e.target.value)}
                className={`w-full py-3 px-4 rounded-lg border transition-all bg-background text-foreground ${
                  selectedEthnicity ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <option value="">Select your ethnicity</option>
                <option value="Black">Black</option>
                <option value="White">White</option>
                <option value="Asian">Asian</option>
                <option value="Latina">Latina / Hispanic</option>
                <option value="Middle Eastern">Middle Eastern</option>
                <option value="Indigenous">Indigenous</option>
                <option value="Mixed">Mixed / Multiracial</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {(!selectedGender || !selectedEthnicity || uploadedImages.length < 10) && (
              <div className="mb-4 p-4 bg-stone-100/80 border border-stone-300/60 rounded-xl text-sm">
                <p className="text-stone-950 font-medium mb-1">Complete these steps to start training:</p>
                <ul className="text-stone-700 space-y-1 text-xs list-disc list-inside">
                  {!selectedGender && <li>Select your gender above</li>}
                  {!selectedEthnicity && <li>Select your ethnicity above</li>}
                  {uploadedImages.length < 10 && <li>Upload at least 10 photos ({uploadedImages.length}/10)</li>}
                </ul>
              </div>
            )}
            
            <button
              onClick={startTraining}
              disabled={uploadedImages.length < 10 || !selectedGender || !selectedEthnicity || isUploading || compressionProgress.total > 0}
              className="w-full bg-stone-950 text-stone-50 py-4 sm:py-5 rounded-2xl font-light tracking-[0.15em] uppercase text-sm transition-all duration-200 hover:bg-stone-800 min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95 relative"
            >
              {isUploading || compressionProgress.total > 0 ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  {isUploading && compressionProgress.total === 0 ? "Uploading..." : compressionProgress.stage || "Processing..."}
                </span>
              ) : (
                "Start Training"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
