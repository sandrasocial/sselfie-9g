"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"

interface PaidBlueprintStatus {
  purchased: boolean
  generated: boolean
  generatedAt: string | null
  totalPhotos: number
  photoUrls: string[]
  canGenerate: boolean
  progress: {
    completed: number
    total: number
    percentage: number
  }
  missingGridNumbers: number[]
  hasSelfies: boolean
  hasFormData: boolean
  error: string | null
  accessToken?: string
}

function PaidBlueprintPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const accessToken = searchParams.get("access")
  
  const [status, setStatus] = useState<PaidBlueprintStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingGrids, setGeneratingGrids] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [canonicalAction, setCanonicalAction] = useState<"feed_style" | "onboarding" | null>(null)

  // Legacy route safety: always redirect paid blueprint page to feed planner
  useEffect(() => {
    const query = searchParams.toString()
    router.replace(`/feed-planner${query ? `?${query}` : ""}`)
  }, [router, searchParams])

  // Fetch status on mount and when access token changes
  useEffect(() => {
    if (!accessToken) {
      setError("Access token is required")
      setIsLoading(false)
      return
    }

    fetchStatus()
  }, [accessToken])

  const fetchStatus = async () => {
    if (!accessToken) return

    try {
      const response = await fetch(`/api/blueprint/get-paid-status?access=${accessToken}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to load status")
        setIsLoading(false)
        return
      }

      setStatus(data)
      setError(null)
      
      // Track page view
      trackEvent("paid_blueprint_page_view", {
        purchased: data.purchased,
        generated: data.generated,
        totalPhotos: data.totalPhotos,
      })
    } catch (err) {
      setError("Failed to load status. Please try again.")
      console.error("[Paid Blueprint] Error fetching status:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Poll for status updates if generation is in progress
  useEffect(() => {
    if (!status || !accessToken) return

    // Only poll if there are generating grids or if not fully generated
    const hasGeneratingGrids = generatingGrids.size > 0
    const isNotComplete = status.totalPhotos < 30 && !status.generated

    if (!hasGeneratingGrids && !isNotComplete) {
      return // No need to poll
    }

    const interval = setInterval(() => {
      fetchStatus()
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [status, generatingGrids, accessToken])

  const handleGenerateAll = async () => {
    if (!accessToken || !status) return

    setIsGenerating(true)
    setError(null)
    setCanonicalAction(null)

    try {
      trackEvent("paid_blueprint_generate_start", {
        accessToken: accessToken.substring(0, 8) + "...",
      })

      // Generate all missing grids (1-30)
      const missingGrids = status.missingGridNumbers.length > 0 
        ? status.missingGridNumbers 
        : Array.from({ length: 30 }, (_, i) => i + 1)

      const generatePromises = missingGrids.map(async (gridNumber) => {
        setGeneratingGrids((prev) => new Set(prev).add(gridNumber))

        try {
          const response = await fetch("/api/blueprint/generate-paid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken,
              gridNumber,
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            if (response.status === 422) {
              if (data.error === "FEED_STYLE_REQUIRED") {
                setCanonicalAction("feed_style")
                throw new Error("Choose a feed style to generate your blueprint.")
              }
              if (data.error === "CANONICAL_FIELDS_REQUIRED") {
                setCanonicalAction("onboarding")
                throw new Error("Complete your brand profile to generate your blueprint.")
              }
            }
            throw new Error(data.error || "Failed to start generation")
          }

          // Start polling for this grid
          if (data.predictionId) {
            pollGridStatus(gridNumber, data.predictionId)
          }

          return { gridNumber, success: true }
        } catch (err) {
          console.error(`[Paid Blueprint] Error generating grid ${gridNumber}:`, err)
          setGeneratingGrids((prev) => {
            const next = new Set(prev)
            next.delete(gridNumber)
            return next
          })
          return { gridNumber, success: false, error: err instanceof Error ? err.message : "Unknown error" }
        }
      })

      await Promise.all(generatePromises)
      setIsGenerating(false)
    } catch (err) {
      setError("Failed to start generation. Please try again.")
      setIsGenerating(false)
      console.error("[Paid Blueprint] Error:", err)
    }
  }

  const pollGridStatus = async (gridNumber: number, predictionId: string) => {
    if (!accessToken) return

    const maxAttempts = 120 // 10 minutes max (120 * 5s = 600s)
    let attempts = 0

    const pollInterval = setInterval(async () => {
      attempts++

      try {
        const response = await fetch(
          `/api/blueprint/check-paid-grid?predictionId=${predictionId}&gridNumber=${gridNumber}&access=${accessToken}`
        )
        const data = await response.json()

        if (data.status === "completed") {
          clearInterval(pollInterval)
          setGeneratingGrids((prev) => {
            const next = new Set(prev)
            next.delete(gridNumber)
            return next
          })
          
          // Refresh status to get updated photo URLs
          await fetchStatus()

          // If all 30 complete, track completion event
          if (data.allComplete) {
            trackEvent("paid_blueprint_generate_complete", {
              totalPhotos: 30,
            })
          }
        } else if (data.status === "failed") {
          clearInterval(pollInterval)
          setGeneratingGrids((prev) => {
            const next = new Set(prev)
            next.delete(gridNumber)
            return next
          })
          setError(`Grid ${gridNumber} failed: ${data.error || "Unknown error"}`)
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setGeneratingGrids((prev) => {
            const next = new Set(prev)
            next.delete(gridNumber)
            return next
          })
          setError(`Grid ${gridNumber} timed out. Please try again.`)
        }
      } catch (err) {
        console.error(`[Paid Blueprint] Error polling grid ${gridNumber}:`, err)
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setGeneratingGrids((prev) => {
            const next = new Set(prev)
            next.delete(gridNumber)
            return next
          })
        }
      }
    }, 5000) // Poll every 5 seconds
  }

  const handleDownload = (url: string, gridNumber: number) => {
    const link = document.createElement("a")
    link.href = url
    link.download = `sselfie-blueprint-grid-${gridNumber}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    trackEvent("paid_blueprint_download", {
      gridNumber,
    })
  }

  const handleDownloadAll = () => {
    if (!status || status.photoUrls.length === 0) return

    status.photoUrls.forEach((url, index) => {
      setTimeout(() => {
        handleDownload(url, index + 1)
      }, index * 200) // Stagger downloads
    })

    trackEvent("paid_blueprint_download_all", {
      totalPhotos: status.photoUrls.length,
    })
  }

  const handleUpgradeClick = () => {
    trackEvent("paid_blueprint_upgrade_click", {
      source: "paid_blueprint_gallery",
    })
    router.push("/studio?utm_source=blueprint&upgrade=true")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
            LOADING
          </div>
        </div>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-4">
            ERROR
          </h1>
          <p className="text-stone-600 mb-6">{error}</p>
          <Button onClick={() => router.push("/blueprint")}>
            Back to Blueprint
          </Button>
        </div>
      </div>
    )
  }

  if (!status || !status.purchased) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-4">
            ACCESS REQUIRED
          </h1>
          <p className="text-stone-600 mb-6">
            You need to purchase the paid blueprint to access this page.
          </p>
          <Button onClick={() => router.push("/blueprint")}>
            View Free Blueprint
          </Button>
        </div>
      </div>
    )
  }

  const hasAllPhotos = status.totalPhotos === 30
  const canGenerate = !hasAllPhotos && status.hasSelfies && status.hasFormData

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-2">
                YOUR BRAND BLUEPRINT
              </h1>
              <p className="text-sm text-stone-600">
                {status.totalPhotos} of 30 photos {hasAllPhotos ? "complete" : "ready"}
              </p>
            </div>
            {hasAllPhotos && status.photoUrls.length > 0 && (
              <Button
                onClick={handleDownloadAll}
                className="bg-stone-900 text-white hover:bg-stone-800"
              >
                Download All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {!hasAllPhotos && (
        <div className="bg-white border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-stone-200 rounded-full h-2">
                <div
                  className="bg-stone-900 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${status.progress.percentage}%` }}
                />
              </div>
              <div className="text-sm font-medium text-stone-900 min-w-[80px] text-right">
                {status.progress.completed}/{status.progress.total}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Generate Button */}
        {canGenerate && !isGenerating && (
          <div className="mb-8 text-center">
            <Button
              onClick={handleGenerateAll}
              size="lg"
              className="bg-stone-900 text-white hover:bg-stone-800 px-8 py-6 text-lg"
            >
              Generate My 30 Photos
            </Button>
            <p className="text-sm text-stone-600 mt-4">
              This usually takes 2-3 minutes. You&apos;ll receive an email when complete.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
            {canonicalAction === "feed_style" && (
              <div className="mt-3">
                <Button
                  onClick={() => router.push("/feed-planner?openFeedStyle=1")}
                  className="bg-stone-900 text-white hover:bg-stone-800"
                >
                  Choose feed style
                </Button>
              </div>
            )}
            {canonicalAction === "onboarding" && (
              <div className="mt-3">
                <Button
                  onClick={() => router.push("/feed-planner?openWizard=1")}
                  className="bg-stone-900 text-white hover:bg-stone-800"
                >
                  Complete profile
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Generating Status */}
        {isGenerating && generatingGrids.size > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Generating {generatingGrids.size} photo{generatingGrids.size !== 1 ? "s" : ""}...
              This usually takes 1-2 minutes per photo.
            </p>
          </div>
        )}

        {/* Photo Gallery */}
        {status.photoUrls.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {status.photoUrls.map((url, index) => {
              const gridNumber = index + 1
              const isGenerating = generatingGrids.has(gridNumber)

              return (
                <div
                  key={index}
                  className="relative aspect-square bg-stone-100 rounded-lg overflow-hidden group"
                >
                  <Image
                    src={url}
                    alt={`Grid ${gridNumber}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-sm">Generating...</div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      onClick={() => handleDownload(url, gridNumber)}
                      size="sm"
                      className="bg-white/90 text-stone-900 hover:bg-white"
                    >
                      Download
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-stone-600 mb-6">
              {canGenerate
                ? "Click the button above to generate your 30 photos."
                : !status.hasSelfies
                ? "Please complete the free blueprint and upload selfies first."
                : "Your photos will appear here once generation starts."}
            </p>
          </div>
        )}

        {/* Upgrade CTA */}
        {hasAllPhotos && (
          <div className="mt-12 p-6 bg-stone-900 text-white rounded-lg text-center">
            <h2 className="font-serif text-xl font-extralight tracking-[0.2em] uppercase mb-4">
              LOVE YOUR PHOTOS?
            </h2>
            <p className="text-stone-300 mb-6 max-w-2xl mx-auto">
              Get unlimited variations with Creator Studio. $97/month includes 500 credits,
              unlimited regenerations, and pro editing tools.
            </p>
            <Button
              onClick={handleUpgradeClick}
              className="bg-white text-stone-900 hover:bg-stone-100"
            >
              Upgrade to Creator Studio
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PaidBlueprintPageWrapper() {
  return (
    <Suspense fallback={null}>
      <PaidBlueprintPage />
    </Suspense>
  )
}
