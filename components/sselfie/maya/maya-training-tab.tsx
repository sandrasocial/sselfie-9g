"use client"

import { useState, useEffect } from "react"
import { Loader2, Aperture } from "lucide-react"
import useSWR from "swr"
import Image from "next/image"
import RetrainModelModal from "../retrain-model-modal"

interface MayaTrainingTabProps {
  userId?: string
  setActiveTab?: (tab: string) => void
  userName?: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MayaTrainingTab({ userId, setActiveTab, userName }: MayaTrainingTabProps) {
  const [showRetrainModal, setShowRetrainModal] = useState(false)
  const { data: trainingStatus, error, mutate } = useSWR("/api/training/status", fetcher, {
    refreshInterval: (data) => {
      // Poll every 15 seconds if training is in progress
      if (data?.model?.training_status === "training" || data?.model?.training_status === "processing") {
        return 15000
      }
      return 0
    },
  })

  const { data: progressData } = useSWR(
    trainingStatus?.model?.id && 
    (trainingStatus?.model?.training_status === "training" || trainingStatus?.model?.training_status === "processing")
      ? `/api/training/progress?modelId=${trainingStatus.model.id}`
      : null,
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  const hasTrainedModel = trainingStatus?.hasTrainedModel || false
  const model = trainingStatus?.model
  const trainingImages = trainingStatus?.trainingImages || []
  const isTraining = model?.training_status === "training" || model?.training_status === "processing"
  const isCompleted = model?.training_status === "completed"
  const isFailed = model?.training_status === "failed"
  const progress = progressData?.progress || model?.progress || 0

  const handleStartTraining = () => {
    window.dispatchEvent(new CustomEvent('open-onboarding'))
  }

  const handleManageTraining = () => {
    // Navigate to account tab where training is managed
    if (setActiveTab) {
      setActiveTab("account")
    } else {
      // Fallback: try to navigate via custom event if setActiveTab not provided
      window.dispatchEvent(new CustomEvent('navigate-to-settings'))
    }
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-3">
              Error Loading Training Status
            </h2>
            <p className="text-sm text-stone-600 max-w-md mx-auto mb-6">
              Unable to load your training status. Please try again later.
            </p>
            <button
              onClick={() => mutate()}
              className="px-6 py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium tracking-wide uppercase"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-3">
            AI Model Training
          </h2>
          <p className="text-sm sm:text-base text-stone-600 max-w-2xl">
            Train your personal AI model with your selfies. This takes about 5 minutes and you only need to do it once.
          </p>
        </div>

        {/* Training Status Card */}
        <div className="bg-white border border-stone-200/40 rounded-[24px] p-6 sm:p-8 mb-6 sm:mb-8 shadow-[0_8px_32px_rgba(28,25,23,0.04)]">
          {isTraining ? (
            // Training in Progress
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <Loader2 className="w-full h-full text-stone-950 animate-spin" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-light tracking-[0.02em] text-stone-950 mb-2">
                Training in Progress
              </h3>
              <p className="text-sm text-stone-600 mb-6">
                Your AI model is being trained. This usually takes about 5 minutes.
              </p>
              
              {/* Progress Bar */}
              <div className="w-full max-w-md mx-auto mb-4">
                <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-950 transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-stone-500 mt-2 text-center">
                  {Math.round(progress)}% complete
                </p>
              </div>

              {progressData?.estimatedMinutesRemaining && (
                <p className="text-xs text-stone-500">
                  Approximately {Math.ceil(progressData.estimatedMinutesRemaining)} minute{Math.ceil(progressData.estimatedMinutesRemaining) !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>
          ) : isCompleted && hasTrainedModel ? (
            // Training Completed
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-serif font-light tracking-[0.02em] text-stone-950 mb-2">
                Training Complete
              </h3>
              <p className="text-sm text-stone-600 mb-6">
                Your AI model is ready to use! You can now generate personalized images.
              </p>
              {model?.created_at && (
                <p className="text-xs text-stone-500 mb-6">
                  Trained on {new Date(model.created_at).toLocaleDateString()}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    if (!userId) {
                      console.error("[MayaTrainingTab] Cannot retrain: userId is missing")
                      alert("Unable to retrain model. Please refresh the page and try again.")
                      return
                    }
                    console.log("[MayaTrainingTab] Opening retrain modal, userId:", userId)
                    setShowRetrainModal(true)
                  }}
                  className="px-6 py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium tracking-wide uppercase"
                >
                  Retrain Model
                </button>
                <button
                  onClick={handleManageTraining}
                  className="px-6 py-3 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium tracking-wide uppercase"
                >
                  Manage Images
                </button>
              </div>
            </div>
          ) : isFailed ? (
            // Training Failed
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-serif font-light tracking-[0.02em] text-stone-950 mb-2">
                Training Failed
              </h3>
              <p className="text-sm text-stone-600 mb-6">
                There was an error during training. Please try again.
              </p>
              <button
                onClick={handleStartTraining}
                className="px-6 py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium tracking-wide uppercase"
              >
                Retry Training
              </button>
            </div>
          ) : (
            // No Training / Start Training
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-serif font-light tracking-[0.02em] text-stone-950 mb-2">
                Get Started
              </h3>
              <p className="text-sm text-stone-600 mb-6">
                Upload 5+ selfies to train your personal AI model. Once trained, you can generate personalized images.
              </p>
              <button
                onClick={handleStartTraining}
                className="px-6 py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium tracking-wide uppercase mx-auto"
              >
                Start Training
              </button>
            </div>
          )}
        </div>

        {/* Training Images Preview */}
        {trainingImages.length > 0 && (
          <div className="bg-white border border-stone-200/40 rounded-[24px] p-6 sm:p-8 shadow-[0_8px_32px_rgba(28,25,23,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-serif font-light tracking-[0.02em] text-stone-950">
                Training Images
              </h3>
              <span className="text-xs text-stone-500">
                {trainingImages.length} image{trainingImages.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {trainingImages.slice(0, 10).map((image: any, index: number) => (
                <div
                  key={image.id || index}
                  className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200/40"
                >
                  {image.image_url ? (
                    <Image
                      src={image.image_url}
                      alt={`Training image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-100">
                      <span className="text-xs text-stone-400">No image</span>
                    </div>
                  )}
                </div>
              ))}
              {trainingImages.length > 10 && (
                <div className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200/40 flex items-center justify-center">
                  <span className="text-xs font-medium text-stone-600">
                    +{trainingImages.length - 10}
                  </span>
                </div>
              )}
            </div>
            {trainingImages.length > 0 && (
              <button
                onClick={handleManageTraining}
                className="mt-4 text-xs text-stone-600 hover:text-stone-950 transition-colors uppercase tracking-[0.1em]"
              >
                Manage Images →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Retrain Model Modal */}
      {userId && (
        <RetrainModelModal
          isOpen={showRetrainModal}
          onClose={() => {
            console.log("[MayaTrainingTab] Closing retrain modal")
            setShowRetrainModal(false)
          }}
          onComplete={() => {
            // Refresh training status after retraining
            console.log("[MayaTrainingTab] Retrain complete, refreshing status")
            mutate()
            setShowRetrainModal(false)
          }}
          userId={userId}
          userName={userName || null}
        />
      )}
    </div>
  )
}

