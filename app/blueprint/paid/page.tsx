"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, Clock, Download, AlertTriangle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface GridState {
  gridNumber: number
  status: "not_started" | "generating" | "completed" | "failed"
  gridUrl?: string
  predictionId?: string
  error?: string
}

interface LocalPrediction {
  predictionId: string
  status: "starting" | "processing" | "failed"
}

export default function PaidBlueprintPage() {
  const searchParams = useSearchParams()
  const accessToken = searchParams.get("access")

  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [hasPaid, setHasPaid] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<(string | null)[]>([])
  const [grids, setGrids] = useState<GridState[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentGeneratingGrid, setCurrentGeneratingGrid] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // LocalStorage key for predictions
  const getLocalStorageKey = () => `paid_blueprint_predictions_v1:${accessToken}`

  // Load predictions from localStorage
  const loadLocalPredictions = useCallback((): Record<string, LocalPrediction> => {
    if (!accessToken) return {}
    try {
      const stored = localStorage.getItem(getLocalStorageKey())
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }, [accessToken])

  // Save predictions to localStorage
  const saveLocalPredictions = useCallback((predictions: Record<string, LocalPrediction>) => {
    if (!accessToken) return
    try {
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(predictions))
    } catch (err) {
      console.error("[Paid Blueprint] Failed to save to localStorage:", err)
    }
  }, [accessToken])

  // Clear localStorage (debug)
  const clearLocalProgress = () => {
    if (!accessToken) return
    localStorage.removeItem(getLocalStorageKey())
    console.log("[Paid Blueprint] Cleared local progress")
    // Reload status
    fetchStatus()
  }

  // Fetch paid status from server
  const fetchStatus = useCallback(async () => {
    // Admin can access without token (auto-finds their paid blueprint by email)
    if (!accessToken) {
      // Try to check if user is logged in as admin
      try {
        const response = await fetch(`/api/blueprint/get-paid-status`)
        const data = await response.json()
        
        if (data.admin) {
          // Admin found their own paid blueprint
          if (data.accessToken && data.purchased) {
            // Update URL with token for consistency
            window.history.replaceState({}, '', `/blueprint/paid?access=${data.accessToken}`)
            // Use the returned data
            setHasPaid(data.purchased || false)
            setHasGenerated(data.generated || false)
            setPhotoUrls(data.photoUrls || [])
            
            // Build grid states
            const newGrids: GridState[] = []
            for (let i = 1; i <= 30; i++) {
              const gridUrl = data.photoUrls?.[i - 1]
              newGrids.push({
                gridNumber: i,
                status: gridUrl ? "completed" : "not_started",
                gridUrl: gridUrl || undefined,
              })
            }
            setGrids(newGrids)
            setIsLoadingStatus(false)
            return
          }
          
          // Admin access granted but no paid blueprint found
          setError(data.message || "Admin access: No paid blueprint found for your email. Provide ?access=TOKEN to view a specific subscriber.")
          setIsLoadingStatus(false)
          return
        }
      } catch {
        // Not admin, continue to error
      }

      setError("No access token provided")
      setIsLoadingStatus(false)
      return
    }

    try {
      const response = await fetch(`/api/blueprint/get-paid-status?access=${accessToken}`)
      const data = await response.json()

      if (!response.ok) {
        // Check if admin override
        if (data.admin && data.error) {
          setError(`Admin: ${data.message || data.error}`)
          setIsLoadingStatus(false)
          return
        }
        throw new Error(data.error || "Failed to load status")
      }

      setHasPaid(data.purchased || false)
      setHasGenerated(data.generated || false)
      setPhotoUrls(data.photoUrls || [])

      // Build grid states
      const newGrids: GridState[] = []
      for (let i = 1; i <= 30; i++) {
        const gridUrl = data.photoUrls?.[i - 1]
        newGrids.push({
          gridNumber: i,
          status: gridUrl ? "completed" : "not_started",
          gridUrl: gridUrl || undefined,
        })
      }

      setGrids(newGrids)
      setIsLoadingStatus(false)

      // Check if we have local predictions for grids that aren't completed
      const localPredictions = loadLocalPredictions()
      for (const [gridNumberStr, prediction] of Object.entries(localPredictions)) {
        const gridNumber = parseInt(gridNumberStr)
        const gridIndex = gridNumber - 1

        // If grid is not completed but we have a local prediction, resume polling
        if (!data.photoUrls?.[gridIndex] && prediction.predictionId) {
          console.log(`[Paid Blueprint] Resuming Grid ${gridNumber} from localStorage`)
          updateGridState(gridNumber, "generating", prediction.predictionId)
          pollGridStatus(prediction.predictionId, gridNumber)
        }
      }
    } catch (err) {
      console.error("[Paid Blueprint] Error fetching status:", err)
      setError(err instanceof Error ? err.message : "Failed to load paid blueprint status")
      setIsLoadingStatus(false)
    }
  }, [accessToken, loadLocalPredictions])

  // Load status on mount
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Update grid state
  const updateGridState = (
    gridNumber: number,
    status: GridState["status"],
    predictionId?: string,
    gridUrl?: string,
    errorMsg?: string
  ) => {
    setGrids((prev) =>
      prev.map((grid) =>
        grid.gridNumber === gridNumber
          ? { ...grid, status, predictionId, gridUrl, error: errorMsg }
          : grid
      )
    )
  }

  // Generate single grid
  const generateGrid = async (gridNumber: number) => {
    if (!accessToken) {
      setError("No access token")
      return
    }

    setCurrentGeneratingGrid(gridNumber)
    updateGridState(gridNumber, "generating")

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
        throw new Error(data.error || "Failed to start generation")
      }

      // If already completed (idempotency)
      if (data.status === "completed" && data.gridUrl) {
        console.log(`[Paid Blueprint] Grid ${gridNumber} already completed`)
        updateGridState(gridNumber, "completed", undefined, data.gridUrl)
        setCurrentGeneratingGrid(null)
        // Refresh status to get updated photoUrls array
        await fetchStatus()
        return
      }

      // Save prediction to localStorage
      const localPredictions = loadLocalPredictions()
      localPredictions[gridNumber] = {
        predictionId: data.predictionId,
        status: data.status,
      }
      saveLocalPredictions(localPredictions)

      // Start polling
      updateGridState(gridNumber, "generating", data.predictionId)
      await pollGridStatus(data.predictionId, gridNumber)
    } catch (err) {
      console.error(`[Paid Blueprint] Error generating Grid ${gridNumber}:`, err)
      const errorMsg = err instanceof Error ? err.message : "Failed to generate"
      updateGridState(gridNumber, "failed", undefined, undefined, errorMsg)
      setCurrentGeneratingGrid(null)
    }
  }

  // Poll grid status
  const pollGridStatus = async (predictionId: string, gridNumber: number) => {
    if (!accessToken) return

    try {
      const response = await fetch(
        `/api/blueprint/check-paid-grid?predictionId=${predictionId}&gridNumber=${gridNumber}&access=${accessToken}`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to check status")
      }

      if (data.status === "completed" && data.gridUrl) {
        console.log(`[Paid Blueprint] Grid ${gridNumber} completed:`, data.gridUrl)
        updateGridState(gridNumber, "completed", undefined, data.gridUrl)
        setCurrentGeneratingGrid(null)

        // Remove from localStorage
        const localPredictions = loadLocalPredictions()
        delete localPredictions[gridNumber]
        saveLocalPredictions(localPredictions)

        // Refresh status
        await fetchStatus()
      } else if (data.status === "failed") {
        console.error(`[Paid Blueprint] Grid ${gridNumber} failed:`, data.error)
        updateGridState(gridNumber, "failed", undefined, undefined, data.error)
        setCurrentGeneratingGrid(null)

        // Update localStorage with failed status
        const localPredictions = loadLocalPredictions()
        if (localPredictions[gridNumber]) {
          localPredictions[gridNumber].status = "failed"
          saveLocalPredictions(localPredictions)
        }
      } else {
        // Still processing, poll again in 5 seconds
        setTimeout(() => pollGridStatus(predictionId, gridNumber), 5000)
      }
    } catch (err) {
      console.error(`[Paid Blueprint] Error polling Grid ${gridNumber}:`, err)
      updateGridState(gridNumber, "failed", undefined, undefined, "Failed to check status")
      setCurrentGeneratingGrid(null)
    }
  }

  // Generate all missing grids (sequential)
  const generateAllMissing = async () => {
    const missingGrids = grids.filter((g) => g.status === "not_started" || g.status === "failed")

    if (missingGrids.length === 0) {
      alert("All grids are already completed!")
      return
    }

    setIsGenerating(true)
    setError(null)

    for (const grid of missingGrids) {
      await generateGrid(grid.gridNumber)

      // If generation failed, stop the loop
      const updatedGrid = grids.find((g) => g.gridNumber === grid.gridNumber)
      if (updatedGrid?.status === "failed") {
        setError(`Grid ${grid.gridNumber} failed. Fix the issue and click "Continue" to resume.`)
        setIsGenerating(false)
        return
      }
    }

    setIsGenerating(false)
    console.log("[Paid Blueprint] All grids completed!")
  }

  // Calculate progress
  const completedCount = grids.filter((g) => g.status === "completed").length
  const progressPercentage = Math.round((completedCount / 30) * 100)

  // No access token
  if (!accessToken) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-2 border-red-200 rounded-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-stone-950 mb-2">Access Required</h1>
          <p className="text-sm text-stone-600 mb-6">
            You need a valid access token to view this page. Please check your email for the link.
          </p>
          <Link
            href="/blueprint"
            className="inline-block px-6 py-3 bg-stone-950 text-white text-sm uppercase tracking-wider hover:bg-stone-800 transition-colors"
          >
            Go to Blueprint
          </Link>
        </div>
      </div>
    )
  }

  // Loading
  if (isLoadingStatus) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-stone-950 mx-auto mb-4" />
          <p className="text-sm text-stone-600">Loading your blueprint...</p>
        </div>
      </div>
    )
  }

  // Not paid
  if (!hasPaid) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-2 border-stone-200 rounded-lg p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-stone-950 mb-2">Purchase Required</h1>
          <p className="text-sm text-stone-600 mb-6">
            You haven't purchased the Paid Blueprint yet. Complete your purchase to generate 30 brand photo grids.
          </p>
          <Link
            href="/blueprint"
            className="inline-block px-6 py-3 bg-stone-950 text-white text-sm uppercase tracking-wider hover:bg-stone-800 transition-colors"
          >
            Go to Blueprint
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-medium text-stone-950 mb-2">Your Paid Blueprint</h1>
              <p className="text-sm text-stone-600">30 professional brand photo grids</p>
            </div>
            <Link
              href="/blueprint"
              className="text-xs uppercase tracking-wider text-stone-600 hover:text-stone-950 transition-colors"
            >
              ← Back to Blueprint
            </Link>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-600">Progress</span>
              <span className="font-medium text-stone-950">
                {completedCount}/30 Grids ({progressPercentage}%)
              </span>
            </div>
            <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-950 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={generateAllMissing}
              disabled={isGenerating || completedCount === 30}
              className="px-6 py-3 bg-stone-950 text-white text-sm uppercase tracking-wider hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {completedCount === 0 ? "Generate My Photos" : "Continue"}
            </button>

            {process.env.NODE_ENV === "development" && (
              <button
                onClick={clearLocalProgress}
                className="px-6 py-3 border-2 border-stone-300 text-stone-600 text-sm uppercase tracking-wider hover:border-stone-950 hover:text-stone-950 transition-colors"
              >
                Clear Local Progress
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Grid Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {grids.map((grid) => (
            <div
              key={grid.gridNumber}
              className="bg-white border-2 border-stone-200 rounded-lg overflow-hidden hover:border-stone-300 transition-colors"
            >
              {/* Image/Status Area */}
              <div className="aspect-square bg-stone-100 relative">
                {grid.status === "completed" && grid.gridUrl ? (
                  <Image
                    src={grid.gridUrl}
                    alt={`Grid ${grid.gridNumber}`}
                    fill
                    className="object-cover"
                  />
                ) : grid.status === "generating" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
                      <p className="text-xs text-white">Generating...</p>
                    </div>
                  </div>
                ) : grid.status === "failed" ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-4">
                      <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-xs text-red-600">Failed</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Clock className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                      <p className="text-xs text-stone-500">Not Started</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid Info & Actions */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-950">Grid {grid.gridNumber}</span>
                  {grid.status === "completed" && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>

                {/* Actions */}
                {grid.status === "completed" && grid.gridUrl && (
                  <a
                    href={grid.gridUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 border border-stone-300 text-stone-600 text-xs uppercase tracking-wider hover:border-stone-950 hover:text-stone-950 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                )}

                {grid.status === "failed" && (
                  <button
                    onClick={() => generateGrid(grid.gridNumber)}
                    disabled={isGenerating}
                    className="w-full py-2 bg-stone-950 text-white text-xs uppercase tracking-wider hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Retry
                  </button>
                )}

                {grid.error && (
                  <p className="text-[10px] text-red-600 line-clamp-2">{grid.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
