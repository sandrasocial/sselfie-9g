"use client"

import { useState } from "react"
import Image from "next/image"

interface ProPhotoshootGrid {
  id?: number
  gridNumber: number
  status: "pending" | "generating" | "completed" | "failed"
  gridUrl?: string
  predictionId?: string
}

interface ProPhotoshootPanelProps {
  sessionId: number
  grids: ProPhotoshootGrid[]
  onGenerateMore: (count: number) => Promise<void>
  onCreateCarousel?: (gridId: number, gridNumber: number) => Promise<void>
  maxGrids: number
  isGenerating: boolean
  creditCost?: number
  creatingCarouselForGridId?: number | null
}

export default function ProPhotoshootPanel({
  sessionId,
  grids,
  onGenerateMore,
  onCreateCarousel,
  maxGrids,
  isGenerating,
  creditCost = 3,
  creatingCarouselForGridId,
}: ProPhotoshootPanelProps) {
  const completedCount = grids.filter((g) => g.status === "completed").length
  const generatingCount = grids.filter((g) => g.status === "generating").length
  const pendingCount = grids.filter((g) => g.status === "pending").length
  const failedCount = grids.filter((g) => g.status === "failed").length

  // Calculate how many grids can be generated (max 3 at once, up to maxGrids total)
  const canGenerateMore = completedCount + generatingCount < maxGrids
  const remainingSlots = maxGrids - (completedCount + generatingCount)
  const gridsToGenerate = Math.min(remainingSlots, 3) // Max 3 at once

  const handleGenerateMore = async () => {
    if (!canGenerateMore || isGenerating || gridsToGenerate === 0) return
    await onGenerateMore(gridsToGenerate)
  }

  // Create array of all 8 grid slots (fill missing with pending)
  const allGrids: ProPhotoshootGrid[] = Array.from({ length: maxGrids }, (_, i) => {
    const gridNumber = i + 1
    const existing = grids.find((g) => g.gridNumber === gridNumber)
    return existing || { gridNumber, status: "pending" as const }
  })

  return (
    <div className="bg-white/[0.04] backdrop-blur-[20px] border border-white/15 rounded-[20px] p-6 sm:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-white uppercase">
            Pro Photoshoot
          </h2>
          <div className="flex items-center gap-3 text-xs sm:text-sm font-light text-white/65">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>{completedCount} Complete</span>
            </div>
            {generatingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border border-white/40 border-t-white animate-spin" />
                <span>{generatingCount} Generating</span>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-white/35 rounded-full"></div>
                <span>{pendingCount} Pending</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-light text-white/55 leading-relaxed">
            Progress: {completedCount}/{maxGrids} grids • {creditCost} credits per grid
          </p>
          {canGenerateMore && gridsToGenerate > 0 && (
            <button
              onClick={handleGenerateMore}
              disabled={isGenerating}
              className="px-4 py-2 border border-white/20 bg-white/10 hover:bg-white/15 text-white rounded-lg font-medium text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span>Generating...</span>
              ) : (
                <span>Generate {gridsToGenerate} More Grid{gridsToGenerate > 1 ? "s" : ""}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Grid Preview - 2x4 or 4x2 layout for 8 grids */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {allGrids.map((grid) => (
          <div
            key={grid.gridNumber}
            className="aspect-square bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden relative group"
          >
            {grid.status === "completed" && grid.gridUrl ? (
              <div className="w-full h-full">
                <Image
                  src={grid.gridUrl}
                  alt={`Grid ${grid.gridNumber}`}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/50 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="text-center space-y-2">
                    <p className="text-xs text-white font-light tracking-wider">Grid {grid.gridNumber}</p>
                    {onCreateCarousel && grid.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onCreateCarousel(grid.id!, grid.gridNumber)
                        }}
                        disabled={creatingCarouselForGridId === grid.id || creatingCarouselForGridId !== null}
                        className="mt-2 px-3 py-1.5 bg-white/90 hover:bg-white text-stone-900 rounded-lg text-[10px] font-medium tracking-wider uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingCarouselForGridId === grid.id ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full border border-stone-300 border-t-stone-600 animate-spin" />
                            Creating...
                          </span>
                        ) : (
                          "Create Carousel"
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {/* Grid number badge */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-light text-stone-900">{grid.gridNumber}</span>
                </div>
              </div>
            ) : grid.status === "generating" ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black/20">
                <span className="mb-2 h-6 w-6 rounded-full border border-white/35 border-t-white animate-spin" />
                <p className="text-xs text-white/65 font-light tracking-wider">Creating...</p>
                <div className="absolute top-2 left-2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-light text-stone-900">{grid.gridNumber}</span>
                </div>
              </div>
            ) : grid.status === "failed" ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black/20">
                <p className="text-xs text-white/65 font-light tracking-wider">Failed</p>
                <div className="absolute top-2 left-2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-light text-stone-900">{grid.gridNumber}</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-black/30 to-black/10 relative">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: "radial-gradient(circle at 2px 2px, rgb(255 255 255) 1px, transparent 0)",
                      backgroundSize: "16px 16px",
                    }}
                  ></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center">
                  {/* Grid Number */}
                  <span className="text-xs font-medium text-white/80 tracking-wider">Grid {grid.gridNumber}</span>
                  <span className="text-[9px] text-white/55 font-light mt-1">Pending</span>
                </div>

                {/* Grid number badge */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-light text-stone-900">{grid.gridNumber}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
