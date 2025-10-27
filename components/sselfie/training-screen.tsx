"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Camera, Aperture, ChevronRight, Loader2 } from "lucide-react"
import useSWR from "swr"

interface TrainingScreenProps {
  user: any
  userId: string
  setHasTrainedModel: (value: boolean) => void
  setActiveTab: (tab: string) => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TrainingScreen({ user, userId, setHasTrainedModel, setActiveTab }: TrainingScreenProps) {
  const [trainingStage, setTrainingStage] = useState<"upload" | "training" | "completed">("upload")
  const [selectedGender, setSelectedGender] = useState("")
  const [uploadedImages, setUploadedImages] = useState<File[]>([])

  // Fetch training status
  const {
    data: trainingStatus,
    error,
    mutate,
  } = useSWR("/api/training/status", fetcher, {
    refreshInterval: trainingStage === "training" ? 5000 : 0, // Poll every 5s during training
  })

  console.log("[v0] Training status data:", trainingStatus)

  // Determine initial state based on training status
  useEffect(() => {
    if (trainingStatus) {
      if (trainingStatus.model?.training_status === "completed") {
        setTrainingStage("completed")
        setHasTrainedModel(true)
      } else if (
        trainingStatus.model?.training_status === "training" ||
        trainingStatus.model?.training_status === "processing"
      ) {
        setTrainingStage("training")
      } else {
        setTrainingStage("upload")
      }
    }
  }, [trainingStatus, setHasTrainedModel])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedImages((prev) => [...prev, ...files])
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
      setTrainingStage("training")

      // Upload images to storage first
      const formData = new FormData()
      uploadedImages.forEach((file) => {
        formData.append("images", file)
      })

      console.log("[v0] Uploading training images...")
      const uploadResponse = await fetch("/api/training/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload images")
      }

      const { imageUrls } = await uploadResponse.json()
      console.log("[v0] Images uploaded:", imageUrls.length)

      // Start training with uploaded image URLs
      console.log("[v0] Starting training...")
      const response = await fetch("/api/training/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName: `${user.display_name || "User"}'s Model`,
          modelType: "flux-dev-lora",
          gender: selectedGender,
          imageUrls: imageUrls,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start training")
      }

      const result = await response.json()
      console.log("[v0] Training started:", result)

      // Refresh training status
      mutate()
    } catch (error) {
      console.error("[v0] Error starting training:", error)
      alert("Failed to start training. Please try again.")
      setTrainingStage("upload")
    }
  }

  const handleRetrain = () => {
    setTrainingStage("upload")
    setUploadedImages([])
    setSelectedGender("")
  }

  // Loading state
  if (!trainingStatus && !error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-950" />
      </div>
    )
  }

  const model = trainingStatus?.model
  const trainingProgress = model?.training_progress || 0
  const imageCount = trainingStatus?.imageCount || uploadedImages.length

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

      {/* Show trained model status if exists */}
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

      {/* Training in progress */}
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

      {/* Upload flow for new users or retrain */}
      {trainingStage === "upload" && (
        <>
          {/* Gender Selection */}
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

          {/* Upload Section */}
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
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
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

            {/* Show uploaded images preview */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
                {uploadedImages.map((file, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-stone-200/30 rounded-xl border border-stone-300/30 overflow-hidden"
                  >
                    <img
                      src={URL.createObjectURL(file) || "/placeholder.svg"}
                      alt={`Upload ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
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
              disabled={uploadedImages.length < 10 || !selectedGender}
              className="w-full bg-stone-950 text-stone-50 py-4 sm:py-5 rounded-2xl font-light tracking-[0.15em] uppercase text-sm transition-all duration-200 hover:bg-stone-800 min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Training
            </button>
          </div>
        </>
      )}
    </div>
  )
}
