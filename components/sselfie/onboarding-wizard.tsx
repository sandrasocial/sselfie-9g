"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Camera, Aperture, ChevronRight, X } from "lucide-react"
import Image from "next/image"
import UnifiedLoading from "./unified-loading"
import LoadingSpinner from "./loading-spinner"
import useSWR from "swr"
import JSZip from "jszip"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"
import { motion, AnimatePresence } from "framer-motion"

interface OnboardingWizardProps {
  isOpen: boolean
  onComplete: () => void
  onDismiss?: () => void
  hasTrainedModel: boolean
  userId: string
  userName: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Reuse compression and zip functions from TrainingScreen
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
      const img = document.createElement("img")
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
    compressionOptions: { level: 9 },
  })
}

type WizardStep = "welcome" | "upload" | "training" | "success"

export default function OnboardingWizard({
  isOpen,
  onComplete,
  onDismiss,
  hasTrainedModel,
  userId,
  userName,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome")
  const [selectedGender, setSelectedGender] = useState("")
  const [selectedEthnicity, setSelectedEthnicity] = useState("")
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0, stage: "" })
  const [isCanceling, setIsCanceling] = useState(false)

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

  // Auto-advance to training step if training is in progress
  useEffect(() => {
    if (isTraining && currentStep === "upload") {
      setCurrentStep("training")
    }
  }, [isTraining, currentStep])

  // Check if training completed
  useEffect(() => {
    const currentModel = progressData?.model || trainingStatus?.model
    if (currentModel?.training_status === "completed" && currentStep === "training") {
      setCurrentStep("success")
    }
  }, [trainingStatus, progressData, currentStep])

  // Close wizard if model is trained
  useEffect(() => {
    if (hasTrainedModel && isOpen) {
      onComplete()
    }
  }, [hasTrainedModel, isOpen, onComplete])

  if (!isOpen || hasTrainedModel) {
    return null
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

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
        `These photos are in HEIC format and cannot be uploaded:\n\n${fileList}\n\nTo fix this:\n1. Open each photo in your gallery\n2. Share/Export as JPG or PNG\n3. Upload the converted files`,
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

      const totalSizeMB = uploadedImages.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024

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

        if (zipSizeMB < 4.0) {
          successfulLevel = level
          break
        } else {
          // Yield before trying next level
          await yieldToUI()
        }
      }

      if (!zipBlob || !successfulLevel) {
        throw new Error(
          "Unable to compress images small enough. Please try with fewer images (10-12) or use smaller original files.",
        )
      }

      // Reset compression progress to hide compression progress bar during upload
      setCompressionProgress({ current: 0, total: 0, stage: "" })
      setUploadProgress({ current: 0, total: 1 })

      const formData = new FormData()
      formData.append("zipFile", zipBlob, "training_images.zip")
      formData.append("gender", selectedGender)
      formData.append("ethnicity", selectedEthnicity)
      formData.append("modelName", `${userName || "User"}'s Model`)
      formData.append("imageCount", String(compressedFiles.length))

      const uploadResponse = await fetch("/api/training/upload-zip", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to upload and start training")
      }

      const result = await uploadResponse.json()

      // Update upload progress to 100% before resetting to show completion
      setUploadProgress({ current: 1, total: 1 })
      
      // Brief delay to show 100% completion before transitioning
      await new Promise((resolve) => setTimeout(resolve, 300))

      setUploadedImages([])
      setIsUploading(false)
      setUploadProgress({ current: 0, total: 0 })
      setCompressionProgress({ current: 0, total: 0, stage: "" })

      await new Promise((resolve) => setTimeout(resolve, 500))

      setCurrentStep("training")
      mutate()
    } catch (error: any) {
      console.error("[Onboarding] Error starting training:", error)

      let errorMessage = "Something went wrong. Please try again."

      if (error.message?.includes("HEIC") || error.message?.includes("HEIF")) {
        errorMessage = error.message
      } else if (error.message?.includes("Timeout") || error.message?.includes("timed out")) {
        errorMessage =
          "Upload is taking too long. Please check your internet connection and try again with fewer or smaller images (10-12 photos)."
      } else if (error.message) {
        errorMessage = error.message
      }

      alert(`Failed to start training\n\n${errorMessage}`)

      setIsUploading(false)
      setUploadProgress({ current: 0, total: 0 })
      setCompressionProgress({ current: 0, total: 0, stage: "" })
    }
  }

  const handleCancelTraining = async () => {
    if (!confirm("Are you sure you want to stop training? You'll need to start over.")) {
      return
    }

    try {
      setIsCanceling(true)

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

      await mutate()
      setCurrentStep("upload")
      setUploadProgress({ current: 0, total: 0 })
      setCompressionProgress({ current: 0, total: 0, stage: "" })
    } catch (error) {
      console.error("[Onboarding] Error canceling training:", error)
      alert(`Failed to cancel training: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsCanceling(false)
    }
  }

  const model = progressData?.model || trainingStatus?.model
  const trainingProgress = progressData?.progress || model?.training_progress || 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[100]"
            onClick={onDismiss}
          />

          {/* Wizard Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24 sm:pb-28 md:pb-32"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${currentStep === "welcome" ? "bg-stone-950/95 backdrop-blur-xl" : ComponentClasses.card} ${DesignClasses.spacing.padding.lg} relative ${currentStep === "welcome" ? "border border-stone-800" : ""}`}>
              {/* Close Button */}
              {onDismiss && currentStep !== "training" && (
                <button
                  onClick={onDismiss}
                  className={`absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors z-10 ${
                    currentStep === "welcome" 
                      ? "hover:bg-stone-800 text-white/80 hover:text-white" 
                      : "hover:bg-stone-100 text-stone-600"
                  }`}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}

              <AnimatePresence mode="wait">
                {/* Step 1: Welcome */}
                {currentStep === "welcome" && (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="text-center space-y-6"
                  >
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                      <div className="w-12 h-12 relative">
                        <Image
                          src="/icon.svg"
                          alt="SSELFIE Logo"
                          fill
                          className="object-contain brightness-0 invert"
                          style={{ opacity: 0.95 }}
                        />
                      </div>
                    </div>
                    <h2 className={`${DesignClasses.typography.heading.h2} text-white`}>
                      Welcome to SSELFIE!
                    </h2>
                    <p className={`${DesignClasses.typography.body.medium} text-white/90 max-w-md mx-auto`}>
                      Let&apos;s train your personal AI model with your selfies. This takes about 5 minutes and you only need to do it once.
                    </p>
                    <button
                      onClick={() => setCurrentStep("upload")}
                      className="group relative bg-white text-stone-950 px-6 py-3 rounded-lg font-medium min-h-[52px] overflow-hidden hover:bg-stone-100 transition-all"
                    >
                      <div className="absolute inset-0 bg-stone-950/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        Get Started
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                  </motion.div>
                )}

                {/* Step 2: Upload */}
                {currentStep === "upload" && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h2 className={`${DesignClasses.typography.heading.h3} ${DesignClasses.text.primary} mb-2`}>
                        Train Your AI Model
                      </h2>
                      <p className={`${DesignClasses.typography.body.small} ${DesignClasses.text.tertiary}`}>
                        Upload 10-20 selfies to get started
                      </p>
                    </div>

                    {/* Gender Selection */}
                    <div className={`${DesignClasses.spacing.padding.md} ${DesignClasses.background.secondary} ${DesignClasses.radius.md} ${DesignClasses.border.medium}`}>
                      <label className="block text-sm font-medium text-stone-950 mb-3">Select Your Gender</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["woman", "man", "non-binary"].map((option) => (
                          <button
                            key={option}
                            onClick={() => setSelectedGender(option)}
                            className={`px-4 py-3 text-sm rounded-xl border transition-all ${
                              selectedGender === option
                                ? "bg-stone-950 text-white border-stone-950"
                                : "bg-white text-stone-600 border-stone-300/40 hover:border-stone-400"
                            }`}
                          >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ethnicity Selection */}
                    {selectedGender && (
                      <div className={`${DesignClasses.spacing.padding.md} ${DesignClasses.background.secondary} ${DesignClasses.radius.md} ${DesignClasses.border.medium}`}>
                        <label className="block text-sm font-medium text-stone-950 mb-3">Select Your Ethnicity</label>
                        <select
                          value={selectedEthnicity}
                          onChange={(e) => setSelectedEthnicity(e.target.value)}
                          className="w-full px-4 py-3 text-sm rounded-xl border border-stone-300/40 bg-white text-stone-950 focus:outline-none focus:border-stone-400"
                        >
                          <option value="">Select ethnicity</option>
                          <option value="Black">Black</option>
                          <option value="White">White</option>
                          <option value="Asian">Asian</option>
                          <option value="Latina/Latino">Latina/Latino</option>
                          <option value="Middle Eastern">Middle Eastern</option>
                          <option value="South Asian">South Asian</option>
                          <option value="Mixed">Mixed</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>
                    )}

                    {/* Upload Area */}
                    <label className="block border-2 border-dashed border-stone-300/60 rounded-xl p-8 text-center bg-white/30 backdrop-blur-xl hover:bg-white/50 hover:border-stone-400/60 transition-all duration-300 cursor-pointer group">
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <div className="w-16 h-16 bg-stone-950 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl group-hover:scale-110 transition-transform">
                        <Camera size={28} className="text-white" strokeWidth={2.5} />
                      </div>
                      <h4 className="text-base font-semibold text-stone-950 mb-2">Click to Upload Photos</h4>
                      <p className="text-sm text-stone-600 mb-4">or drag and drop</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100/60 rounded-full">
                        <div className="w-2 h-2 bg-stone-950 rounded-full"></div>
                        <span className="text-xs tracking-wider uppercase font-semibold text-stone-700">
                          {uploadedImages.length} / 10 minimum
                        </span>
                      </div>
                    </label>

                    {/* Uploaded Images Preview */}
                    {uploadedImages.length > 0 && !isUploading && (
                      <div className="grid grid-cols-4 gap-2">
                        {uploadedImages.map((file, i) => (
                          <div key={i} className="relative aspect-square bg-stone-200/30 rounded-lg border border-stone-300/30 overflow-hidden group">
                            <img
                              src={URL.createObjectURL(file) || "/placeholder.svg"}
                              alt={`Upload ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => handleRemoveUploadedImage(i)}
                              className="absolute top-1 right-1 w-6 h-6 bg-stone-950/80 hover:bg-stone-950 active:bg-stone-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Progress */}
                    {(isUploading || compressionProgress.total > 0) && (
                      <div className="p-4 bg-white/50 rounded-xl border border-white/60">
                        {compressionProgress.total > 0 && (
                          <>
                            <div className="flex items-center justify-between mb-2">
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
                            <div className="flex items-center justify-between mb-2">
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

                    {/* Start Training Button */}
                    {uploadedImages.length >= 10 && selectedGender && selectedEthnicity && (
                      <button
                        onClick={startTraining}
                        disabled={isUploading || compressionProgress.total > 0}
                        className={`w-full ${ComponentClasses.buttonPrimary} min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed`}
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
                    )}
                  </motion.div>
                )}

                {/* Step 3: Training */}
                {currentStep === "training" && (
                  <motion.div
                    key="training"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="text-center space-y-6"
                  >
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 rounded-full bg-stone-200/30 animate-ping"></div>
                      <div className="relative w-24 h-24 rounded-full bg-stone-950 flex items-center justify-center shadow-2xl">
                        <div className="text-white text-2xl font-bold">{trainingProgress}%</div>
                      </div>
                    </div>
                    <h2 className={`${DesignClasses.typography.heading.h3} ${DesignClasses.text.primary}`}>
                      Training Your Model
                    </h2>
                    <p className={`${DesignClasses.typography.body.medium} ${DesignClasses.text.secondary}`}>
                      Your AI is learning from your photos. This usually takes a couple of minutes.
                    </p>
                    <div className="w-full bg-stone-200/40 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-stone-950 rounded-full transition-all duration-500"
                        style={{ width: `${trainingProgress}%` }}
                      ></div>
                    </div>
                    <button
                      onClick={handleCancelTraining}
                      disabled={isCanceling}
                      className="text-sm text-stone-600 hover:text-stone-950 transition-colors disabled:opacity-50"
                    >
                      {isCanceling ? "Stopping..." : "Stop Training"}
                    </button>
                  </motion.div>
                )}

                {/* Step 4: Success */}
                {currentStep === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center space-y-6"
                  >
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 bg-stone-200/30 rounded-full animate-ping"></div>
                      <div className="relative w-20 h-20 bg-stone-950 rounded-full flex items-center justify-center shadow-2xl">
                        <Aperture size={32} className="text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                    <h2 className={`${DesignClasses.typography.heading.h2} ${DesignClasses.text.primary}`}>
                      Success! 🎉
                    </h2>
                    <p className={`${DesignClasses.typography.body.medium} ${DesignClasses.text.secondary} max-w-md mx-auto`}>
                      Your AI model is ready! You can now create stunning professional photos.
                    </p>
                    <button
                      onClick={onComplete}
                      className={`group relative ${ComponentClasses.buttonPrimary} min-h-[52px] overflow-hidden w-full`}
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        Start Creating
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

