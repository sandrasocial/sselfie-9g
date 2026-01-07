"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Loader2, XCircle, Grid3x3 } from "lucide-react"

interface ProPhotoshootPanelProps {
  originalImageId: number | null
  userId: string
}

interface Grid {
  id: number
  grid_number: number
  generation_status: "pending" | "generating" | "completed" | "failed"
  grid_url?: string
  prediction_id?: string
}

interface Session {
  sessionId: number
  totalGrids: number
  status: string
  grids: Grid[]
}

export default function ProPhotoshootPanel({ originalImageId, userId }: ProPhotoshootPanelProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState<Set<number>>(new Set())

  // Load session on mount or when originalImageId changes
  useEffect(() => {
    if (originalImageId) {
      loadSession()
    }
  }, [originalImageId])

  const loadSession = async () => {
    if (!originalImageId) return

    try {
      const response = await fetch("/api/maya/pro/photoshoot/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalImageId, totalGrids: 8 }),
      })

      if (response.ok) {
        const data = await response.json()
        setSession(data)
      }
    } catch (error) {
      console.error("[ProPhotoshoot] Error loading session:", error)
    }
  }

  const startSession = async () => {
    if (!originalImageId) return

    setLoading(true)
    try {
      const response = await fetch("/api/maya/pro/photoshoot/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalImageId, totalGrids: 8 }),
      })

      if (response.ok) {
        const data = await response.json()
        setSession(data)
      }
    } catch (error) {
      console.error("[ProPhotoshoot] Error starting session:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateGrid = async (gridNumber: number) => {
    if (!session || !originalImageId) return

    setLoading(true)
    try {
      const response = await fetch("/api/maya/pro/photoshoot/generate-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalImageId,
          gridNumber,
          sessionId: session.sessionId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Start polling for this grid
        if (data.predictionId && data.gridId) {
          setPolling((prev) => new Set(prev).add(data.gridId))
          pollGridStatus(data.gridId, data.predictionId)
        }
        // Reload session to get updated grid list
        await loadSession()
      }
    } catch (error) {
      console.error("[ProPhotoshoot] Error generating grid:", error)
    } finally {
      setLoading(false)
    }
  }

  const pollGridStatus = async (gridId: number, predictionId: string) => {
    const maxAttempts = 60 // 5 minutes max (5s intervals)
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPolling((prev) => {
          const next = new Set(prev)
          next.delete(gridId)
          return next
        })
        return
      }

      try {
        const response = await fetch(
          `/api/maya/pro/photoshoot/check-grid?predictionId=${predictionId}&gridId=${gridId}`
        )

        if (response.ok) {
          const data = await response.json()

          if (data.status === "completed") {
            // Grid completed, stop polling
            setPolling((prev) => {
              const next = new Set(prev)
              next.delete(gridId)
              return next
            })
            await loadSession() // Reload to get updated status
          } else if (data.status === "failed") {
            // Grid failed, stop polling
            setPolling((prev) => {
              const next = new Set(prev)
              next.delete(gridId)
              return next
            })
            await loadSession()
          } else {
            // Still processing, poll again
            attempts++
            setTimeout(poll, 5000) // Poll every 5 seconds
          }
        }
      } catch (error) {
        console.error("[ProPhotoshoot] Error polling grid:", error)
        setPolling((prev) => {
          const next = new Set(prev)
          next.delete(gridId)
          return next
        })
      }
    }

    poll()
  }

  if (!originalImageId) {
    return null
  }

  const completedGrids = session?.grids.filter((g) => g.generation_status === "completed").length || 0
  const totalGrids = session?.totalGrids || 8

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Pro Photoshoot</h3>
          <p className="text-sm text-stone-600">
            {completedGrids} / {totalGrids} grids completed
          </p>
        </div>
        {!session && (
          <Button onClick={startSession} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Pro Photoshoot"}
          </Button>
        )}
      </div>

      {session && (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: totalGrids }, (_, i) => {
            const gridNumber = i + 1
            const grid = session.grids.find((g) => g.grid_number === gridNumber)
            const isGenerating = polling.has(grid?.id || 0)
            const status = grid?.generation_status || "pending"

            return (
              <div
                key={gridNumber}
                className="border rounded-lg p-3 flex flex-col items-center gap-2"
              >
                <div className="text-sm font-medium">Grid {gridNumber}</div>
                <div className="flex items-center gap-2">
                  {status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                  {status === "generating" && (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  )}
                  {status === "failed" && <XCircle className="w-5 h-5 text-red-600" />}
                  {status === "pending" && <Grid3x3 className="w-5 h-5 text-stone-400" />}
                </div>
                {status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateGrid(gridNumber)}
                    disabled={loading || isGenerating}
                    className="w-full"
                  >
                    Generate
                  </Button>
                )}
                {status === "generating" && (
                  <div className="text-xs text-stone-500">Generating...</div>
                )}
                {status === "completed" && grid?.grid_url && (
                  <a
                    href={grid.grid_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View Grid
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

