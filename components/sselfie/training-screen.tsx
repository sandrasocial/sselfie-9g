"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Camera, Aperture, ChevronRight, Loader2 } from "lucide-react"
import useSWR from "swr"
import JSZip from "jszip"

interface TrainingScreenProps {
  user: any
  userId: string
  setHasTrainedModel: (value: boolean) => void
  setActiveTab: (tab: string) => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
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

        // Calculate new dimensions (max 1920px on longest side)
        const maxSize = 1920
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

        // Draw and compress
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
              `[v0] Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
            )
            resolve(compressedFile)
          },
          "image/jpeg",
          0.85,
        )
      }
      img.onerror = () => reject(new Error("Failed to load image"))
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
  })
}

export default function TrainingScreen({ user, userId, setHasTrainedModel, setActiveTab }: TrainingScreenProps) {
  const [trainingStage, setTrainingStage] = useState<"upload" | "training" | "completed">("upload")
  const [selectedGender, setSelectedGender] = useState("")
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null)

  const {
    data: trainingStatus,
    error,
    mutate,
  } = useSWR("/api/training/status", fetcher, {
    refreshInterval: 0, // Don't poll status endpoint
  })

  const modelId = trainingStatus?.model?.id
  const isTraining =
    trainingStatus?.model?.training_status === "training" || trainingStatus?.model?.training_status === "processing"

  const { data: progressData } = useSWR(
    isTraining && modelId ? `/api/training/progress?modelId=${modelId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Poll every 30 seconds when training
      revalidateOnFocus: false,
    },
  )

  console.log("[v0] Training status data:", trainingStatus)
  console.log("[v0] Training progress data:", progressData)

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
    setUploadedImages((prev) => [...prev, ...files])
  }

  const handleRemoveUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const startTraining = async () => {
    if (uploadedImages.length < 10) {
      alert("Please upload at least 10 images")
      return
    }

    if (!selectedGender) {
      alert("Please select your gender")
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress({ current: 0, total: uploadedImages.length })

      console.log(`[v0] Compressing and creating ZIP file with ${uploadedImages.length} images`)
      const zip = new JSZip()

      for (let i = 0; i < uploadedImages.length; i++) {
        const file = uploadedImages[i]
        console.log(`[v0] Compressing image ${i + 1}/${uploadedImages.length}: ${file.name}`)

        // Compress the image
        const compressedFile = await compressImage(file)

        // Add compressed file to ZIP
        zip.file(compressedFile.name, compressedFile)

        // Update progress
        setUploadProgress({ current: i + 1, total: uploadedImages.length })
      }

      console.log("[v0] Generating ZIP blob...")
      const zipBlob = await zip.generateAsync({ type: "blob" })
      console.log(`[v0] ZIP created: ${(zipBlob.size / 1024 / 1024).toFixed(2)}MB`)

      const formData = new FormData()
      formData.append("zipFile", zipBlob, `training-images-${Date.now()}.zip`)
      formData.append("gender", selectedGender)
      formData.append("modelName", `${user.display_name || "User"}'s Model`)

      console.log("[v0] Uploading ZIP file...")
      const uploadResponse = await fetch("/api/training/upload-zip", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        throw new Error(`Failed to upload ZIP: ${errorText}`)
      }

      const result = await uploadResponse.json()
      console.log("[v0] ZIP uploaded successfully:", result)

      setUploadedImages([])
      setIsUploading(false)
      setUploadProgress({ current: 0, total: 0 })
      setTrainingStage("training")

      mutate()
    } catch (error) {
      console.error("[v0] Error starting training:", error)
      alert(`Failed to start training: ${error instanceof Error ? error.message : "Unknown error"}`)
      setTrainingStage("upload")
      setIsUploading(false)
      setUploadProgress({ current: 0, total: 0 })
    }
  }

  const handleRetrain = () => {
    setTrainingStage("upload")
    setUploadedImages([])
    setSelectedGender("")
    setIsUploading(false)
    setUploadProgress({ current: 0, total: 0 })
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

      // Refresh training status to update the UI
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-950" />
      </div>
    )
  }

  const model = progressData?.model || trainingStatus?.model
  const trainingProgress = progressData?.progress || model?.training_progress || 0
  const imageCount = trainingStatus?.trainingImages?.length || 0

  return (
    <div className="space-y-8 pb-24">
      <div className="pt-3 sm:pt-4 md:pt-6 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase leading-none mb-2 sm:mb-3">
          AI Training
        </h1>
        <p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase font-light text-stone-500">
          Train Your Personal Model
        </p>
      </div>

      {trainingStage === "completed" && model && (
        <div className="bg-white/50 backdrop-blur-2xl border border-white/60 rounded-xl sm:rounded-[1.75rem] p-5 sm:p-6 md:p-8 text-center shadow-xl shadow-stone-900/10">
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
            <div className="p-4 sm:p-6 bg-white/60 backdrop-blur-xl rounded-xl sm:rounded-[1.5rem] border border-white/70 shadow-lg shadow-stone-900/10">
              <div className="text-2xl sm:text-3xl font-bold text-stone-950 mb-1 sm:mb-2">{imageCount}</div>
              <div className="text-[10px] sm:text-xs tracking-wider uppercase font-semibold text-stone-600">
                Photos Trained
              </div>
            </div>
            <div className="p-4 sm:p-6 bg-white/60 backdrop-blur-xl rounded-xl sm:rounded-[1.5rem] border border-white/70 shadow-lg shadow-stone-900/10">
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
            className="group relative w-full bg-stone-950 text-white py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-semibold tracking-wide text-xs sm:text-sm transition-all duration-300 hover:shadow-2xl hover:shadow-stone-900/40 mb-3 sm:mb-4 min-h-[52px] sm:min-h-[60px] overflow-hidden hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              Go to Studio
              <ChevronRight size={14} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>

          <button
            onClick={handleRetrain}
            className="w-full bg-white/60 backdrop-blur-xl text-stone-950 border border-white/70 py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-semibold text-xs sm:text-sm transition-all duration-300 hover:bg-white/80 hover:border-white/90 min-h-[52px] sm:min-h-[60px] shadow-lg shadow-stone-900/10 hover:scale-[1.02] active:scale-[0.98]"
          >
            Retrain Model
          </button>
        </div>
      )}

      {trainingStage === "training" && (
        <div className="bg-white/50 backdrop-blur-2xl border border-white/60 rounded-[1.75rem] p-6 sm:p-8 shadow-xl shadow-stone-900/10">
          <div className="text-center mb-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-stone-200/30 animate-ping"></div>
              <div className="relative w-24 h-24 rounded-full bg-stone-950 flex items-center justify-center shadow-2xl shadow-stone-900/40 animate-pulse">
                <div className="text-white text-2xl font-bold">{trainingProgress}%</div>
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-stone-950 mb-4">Training Your Model</h3>
            <p className="text-sm font-medium text-stone-600 mb-8">
              This takes about 20 minutes. You'll get a notification when it's ready.
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
                {Math.max(0, Math.round((100 - trainingProgress) / 5))} minutes remaining
              </span>
            </div>
          </div>
        </div>
      )}

      {trainingStage === "upload" && (
        <>
          <div className="bg-stone-100/50 border border-stone-200/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
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

          <div className="bg-stone-100/50 border border-stone-200/40 rounded-3xl p-6 sm:p-8">
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
                    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_7713_jpg.JPG-h80bYhHcqQFMynxbYSxG31kftwJEmK.jpeg",
                    alt: "Full body professional shot",
                  },
                  {
                    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_4785-5n2v1TKD1KMF7Pp3J1GUY3Clazvvzb.jpg",
                    alt: "Close-up portrait",
                  },
                  {
                    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_4128.JPG-67aA2l5A05bUIFkBBVS9tsDQU0JNOM.jpeg",
                    alt: "Outdoor full body",
                  },
                  {
                    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_9591_jpg.JPG-cJXa8L93rd28wZ2py1JRFUrU3kYgqW.jpeg",
                    alt: "Casual half body",
                  },
                  {
                    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_4801-psQSpPDdDMOpAJuxMsEMc2PCWMT5bl.jpg",
                    alt: "Portrait close-up",
                  },
                  {
                    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6384_jpg-e6aZJTI3H31RvafSav3vAhZSqgzIRS.jpg",
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
                accept="image/*"
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
            </label>

            {isUploading && (
              <div className="mb-6 p-6 bg-white/50 backdrop-blur-xl rounded-xl border border-white/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-stone-950">Uploading images...</span>
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
                      className="absolute top-1 right-1 w-6 h-6 bg-stone-950/80 hover:bg-stone-950 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      aria-label="Remove image"
                    >
                      <span className="text-xs font-bold">×</span>
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
                          <Loader2 className="w-3 h-3 animate-spin" />
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

            <button
              onClick={startTraining}
              disabled={uploadedImages.length < 10 || !selectedGender || isUploading}
              className="w-full bg-stone-950 text-stone-50 py-4 sm:py-5 rounded-2xl font-light tracking-[0.15em] uppercase text-sm transition-all duration-200 hover:bg-stone-800 min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Start Training"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
