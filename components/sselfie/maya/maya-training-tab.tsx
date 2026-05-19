"use client"

import { useState } from "react"
import useSWR from "swr"
import Image from "next/image"
import RetrainModelModal from "../retrain-model-modal"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

interface MayaTrainingTabProps {
  userId?: string
  setActiveTab?: (tab: string) => void
  userName?: string | null
  creditBalance?: number
  isMembership?: boolean
  onBuyCredits?: () => void
  onJoinStudio?: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MayaTrainingTab({
  userId,
  setActiveTab,
  userName,
  creditBalance = 0,
  isMembership = false,
  onBuyCredits,
  onJoinStudio,
}: MayaTrainingTabProps) {
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
  const trainingCost = 20
  const needsTrainingCredits = !isTraining && !isCompleted && !isFailed && creditBalance < trainingCost

  const handleStartTraining = () => {
    if (needsTrainingCredits) {
      trackAnalyticsEvent({
        event: "training_cta_clicked",
        properties: {
          outcome: "low_credits_redirect",
          isMembership,
          creditBalance: Math.round(creditBalance),
          requiredCredits: trainingCost,
          source: "maya_training_tab",
        },
      }).catch(() => {})
      onBuyCredits?.()
      return
    }
    if (!userId) {
      trackAnalyticsEvent({
        event: "training_cta_clicked",
        properties: {
          outcome: "missing_userid",
          isMembership,
          creditBalance: Math.round(creditBalance),
          requiredCredits: trainingCost,
          source: "maya_training_tab",
        },
      }).catch(() => {})
      alert("Please refresh the page and try again.")
      return
    }
    trackAnalyticsEvent({
      event: "training_cta_clicked",
      properties: {
        outcome: "opened_modal",
        isMembership,
        creditBalance: Math.round(creditBalance),
        requiredCredits: trainingCost,
        source: "maya_training_tab",
      },
    }).catch(() => {})
    setShowRetrainModal(true)
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
      <div className="app-light-panel-text flex-1 p-4 sm:p-6 relative min-h-0">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.2em] uppercase text-[color:var(--color-porcelain)] mb-3">
              Error Loading Training Status
            </h2>
            <p className="text-sm text-[color:var(--color-whisper)] max-w-md mx-auto mb-6">
              Unable to load your training status. Please try again later.
            </p>
            <button
              onClick={() => mutate()}
              className="px-6 py-3 bg-[color:var(--glass-bg-mid)] text-[color:var(--color-porcelain)] rounded-lg hover:bg-[color:var(--glass-bg-heavy)] transition-colors text-sm font-medium tracking-wide uppercase border border-[color:var(--glass-border-subtle)]"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-light-panel-text flex-1 p-4 sm:p-6 relative min-h-0">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.2em] uppercase text-[color:var(--color-porcelain)] mb-3">
            Set Up My Look
          </h2>
          <p className="text-sm sm:text-base text-[color:var(--color-whisper)] max-w-2xl">
            This helps Maya keep your look consistent in future photos. It costs 20 credits and is optional.
          </p>
        </div>

        {needsTrainingCredits && (
          <div className="bg-[color:var(--app-overlay-soft)] border border-[color:var(--glass-border-subtle)] rounded-[20px] p-5 mb-6 sm:mb-8">
            <p className="text-sm font-medium tracking-wide uppercase text-[color:var(--color-porcelain)] mb-2">Setup costs 20 credits</p>
            <p className="text-sm text-[color:var(--color-whisper)] mb-4">
              You currently have {Math.round(creditBalance)} credits.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onBuyCredits}
                className="px-4 py-2 rounded-lg bg-[color:var(--glass-bg-mid)] text-[color:var(--color-porcelain)] text-xs font-medium tracking-[0.08em] uppercase hover:bg-[color:var(--glass-bg-heavy)] transition-colors border border-[color:var(--glass-border-subtle)]"
              >
                Buy Credits →
              </button>
              {!isMembership && (
                <button
                  type="button"
                  onClick={onJoinStudio}
                  className="px-4 py-2 rounded-lg border border-[color:var(--glass-border)] text-[color:var(--color-porcelain)] text-xs font-medium tracking-[0.08em] uppercase hover:bg-[color:var(--glass-bg-mid)] transition-colors"
                >
                  Join Studio for Monthly Credits →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Training Status Card */}
        <div className="bg-[color:var(--glass-bg)] border border-[color:var(--glass-border-subtle)] rounded-[24px] p-6 sm:p-8 mb-6 sm:mb-8 backdrop-blur-[20px]">
          {isTraining ? (
            // Training in Progress
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="w-full h-full rounded-full border-2 border-[color:var(--glass-border)] border-t-[color:var(--color-porcelain)] animate-spin" />
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-light tracking-[0.02em] text-[color:var(--color-porcelain)] mb-2">
                Training in Progress
              </h3>
              <p className="text-sm text-[color:var(--color-whisper)] mb-6">
                Maya is setting up your look. This usually takes about 5 minutes.
              </p>
              
              {/* Progress Bar */}
              <div className="w-full max-w-md mx-auto mb-4">
                <div className="w-full h-2 bg-[color:var(--glass-bg-mid)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[color:var(--color-porcelain)] transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[color:var(--color-smoke)] mt-2 text-center">
                  {Math.round(progress)}% complete
                </p>
              </div>

              {progressData?.estimatedMinutesRemaining && (
                <p className="text-xs text-[color:var(--color-smoke)]">
                  Approximately {Math.ceil(progressData.estimatedMinutesRemaining)} minute{Math.ceil(progressData.estimatedMinutesRemaining) !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>
          ) : isCompleted && hasTrainedModel ? (
            // Training Completed
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-serif font-light tracking-[0.02em] text-[color:var(--color-porcelain)] mb-2">
                Training Complete
              </h3>
              <p className="text-sm text-[color:var(--color-whisper)] mb-6">
                Your look is ready. Maya can now keep your photos more consistent.
              </p>
              {model?.created_at && (
                <p className="text-xs text-[color:var(--color-smoke)] mb-6">
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
                  className="px-6 py-3 bg-[color:var(--glass-bg-mid)] text-[color:var(--color-porcelain)] rounded-lg hover:bg-[color:var(--glass-bg-heavy)] transition-colors text-sm font-medium tracking-wide uppercase border border-[color:var(--glass-border-subtle)]"
                >
                  Refresh My Look
                </button>
                <button
                  onClick={handleManageTraining}
                  className="px-6 py-3 bg-[color:var(--glass-bg-mid)] text-[color:var(--color-porcelain)] rounded-lg hover:bg-[color:var(--glass-bg-heavy)] transition-colors text-sm font-medium tracking-wide uppercase border border-[color:var(--glass-border-subtle)]"
                >
                  Manage Images
                </button>
              </div>
            </div>
          ) : isFailed ? (
            // Training Failed
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-serif font-light tracking-[0.02em] text-[color:var(--color-porcelain)] mb-2">
                Training Failed
              </h3>
              <p className="text-sm text-[color:var(--color-whisper)] mb-6">
                There was an error during training. Please try again.
              </p>
              <button
                onClick={handleStartTraining}
                className="px-6 py-3 bg-[color:var(--glass-bg-mid)] text-[color:var(--color-porcelain)] rounded-lg hover:bg-[color:var(--glass-bg-heavy)] transition-colors text-sm font-medium tracking-wide uppercase border border-[color:var(--glass-border-subtle)]"
              >
                Retry Training
              </button>
            </div>
          ) : (
            // No Training / Start Training
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-serif font-light tracking-[0.02em] text-[color:var(--color-porcelain)] mb-2">
                Get Started
              </h3>
              <p className="text-sm text-[color:var(--color-whisper)] mb-6">
                Upload 5+ selfies so Maya can learn your look. Setup costs 20 credits.
              </p>
              <button
                onClick={handleStartTraining}
                type="button"
                className="px-6 py-3 bg-[color:var(--glass-bg-mid)] text-[color:var(--color-porcelain)] rounded-lg hover:bg-[color:var(--glass-bg-heavy)] transition-colors text-sm font-medium tracking-wide uppercase mx-auto border border-[color:var(--glass-border-subtle)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {needsTrainingCredits ? "Get credits for setup" : "Start Setup"}
              </button>
            </div>
          )}
        </div>

        {/* Training Images Preview */}
        {trainingImages.length > 0 && (
          <div className="bg-[color:var(--glass-bg)] border border-[color:var(--glass-border-subtle)] rounded-[24px] p-6 sm:p-8 backdrop-blur-[20px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-serif font-light tracking-[0.02em] text-[color:var(--color-porcelain)]">
                Setup Photos
              </h3>
              <span className="text-xs text-[color:var(--color-smoke)]">
                {trainingImages.length} image{trainingImages.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {trainingImages.slice(0, 10).map((image: any, index: number) => (
                <div
                  key={image.id || index}
                  className="relative aspect-square rounded-lg overflow-hidden bg-[color:var(--glass-input-bg)] border border-[color:var(--glass-border-subtle)]"
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
                    <div className="w-full h-full flex items-center justify-center bg-[color:var(--glass-input-bg)]">
                      <span className="text-xs text-[color:var(--color-smoke)]">No image</span>
                    </div>
                  )}
                </div>
              ))}
              {trainingImages.length > 10 && (
                <div className="relative aspect-square rounded-lg overflow-hidden bg-[color:var(--glass-input-bg)] border border-[color:var(--glass-border-subtle)] flex items-center justify-center">
                  <span className="text-xs font-medium text-[color:var(--color-whisper)]">
                    +{trainingImages.length - 10}
                  </span>
                </div>
              )}
            </div>
            {trainingImages.length > 0 && (
              <button
                onClick={handleManageTraining}
                className="mt-4 text-xs text-[color:var(--color-whisper)] hover:text-[color:var(--color-porcelain)] transition-colors uppercase tracking-[0.1em]"
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
