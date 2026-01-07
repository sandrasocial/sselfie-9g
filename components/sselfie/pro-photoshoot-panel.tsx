"use client"

import { useState } from "react"
import Image from "next/image"
import { Loader2, Grid3x3, Sparkles, Check, X } from "lucide-react"

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
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase">
            Pro Photoshoot
          </h2>
          <div className="flex items-center gap-3 text-xs sm:text-sm font-light text-stone-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-stone-900 rounded-full"></div>
              <span>{completedCount} Complete</span>
            </div>
            {generatingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Loader2 size={12} className="text-stone-400 animate-spin" />
                <span>{generatingCount} Generating</span>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-stone-300 rounded-full"></div>
                <span>{pendingCount} Pending</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-light text-stone-500 leading-relaxed">
            Progress: {completedCount}/{maxGrids} grids • {creditCost} credits per grid
          </p>
          {canGenerateMore && gridsToGenerate > 0 && (
            <button
              onClick={handleGenerateMore}
              disabled={isGenerating}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 via-purple-700 to-purple-600 hover:from-purple-700 hover:via-purple-800 hover:to-purple-700 text-white rounded-lg font-medium text-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate {gridsToGenerate} More Grid{gridsToGenerate > 1 ? "s" : ""}</span>
                </>
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
            className="aspect-square bg-stone-100 rounded-xl overflow-hidden relative group"
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
                    <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2">
                      <Check size={16} className="text-stone-900" strokeWidth={2} />
                    </div>
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
                            <Loader2 size={12} className="animate-spin" />
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
              <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50">
                <Loader2 size={24} className="text-stone-400 animate-spin mb-2" strokeWidth={1.5} />
                <p className="text-xs text-stone-500 font-light tracking-wider">Creating...</p>
                <div className="absolute top-2 left-2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-light text-stone-900">{grid.gridNumber}</span>
                </div>
              </div>
            ) : grid.status === "failed" ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                <X size={24} className="text-red-400 mb-2" strokeWidth={1.5} />
                <p className="text-xs text-red-500 font-light tracking-wider">Failed</p>
                <div className="absolute top-2 left-2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-light text-stone-900">{grid.gridNumber}</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 relative">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: "radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)",
                      backgroundSize: "16px 16px",
                    }}
                  ></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center">
                  {/* Grid Icon */}
                  <div className="mb-2 w-12 h-12 rounded-full bg-white/60 backdrop-blur-sm border border-stone-200 flex items-center justify-center shadow-sm">
                    <Grid3x3 size={20} className="text-stone-400" strokeWidth={1.5} />
                  </div>

                  {/* Grid Number */}
                  <span className="text-xs font-medium text-stone-700 tracking-wider">Grid {grid.gridNumber}</span>
                  <span className="text-[9px] text-stone-500 font-light mt-1">Pending</span>
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

