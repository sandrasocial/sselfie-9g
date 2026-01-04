"use client"

import { Loader2 } from "lucide-react"

interface FeedLoadingOverlayProps {
  feedId: number | null
  readyPosts: number
  totalPosts: number
  overallProgress: number
  processingStage?: string
  isValidating: boolean
  getProgressMessage: () => string
}

export default function FeedLoadingOverlay({
  feedId,
  readyPosts,
  totalPosts,
  overallProgress,
  isValidating,
  getProgressMessage,
}: FeedLoadingOverlayProps) {
  return (
    <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen relative overflow-hidden">
      {/* Blurred Instagram Feed Preview */}
      <div className="filter blur-lg pointer-events-none opacity-50">
        <div className="bg-white border-b border-stone-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-24 h-6 bg-stone-200 rounded"></div>
            <div className="flex items-center gap-1">
              <div className="w-16 h-5 bg-stone-200 rounded"></div>
            </div>
            <div className="w-6 h-6 bg-stone-200 rounded-full"></div>
          </div>

          <div className="px-8 pb-4">
            <div className="flex items-start gap-12">
              <div className="w-32 h-32 rounded-full bg-stone-200"></div>
              <div className="flex-1 space-y-4">
                <div className="flex gap-8">
                  <div className="w-16 h-12 bg-stone-200 rounded"></div>
                  <div className="w-16 h-12 bg-stone-200 rounded"></div>
                  <div className="w-16 h-12 bg-stone-200 rounded"></div>
                </div>
                <div className="w-full h-16 bg-stone-200 rounded"></div>
              </div>
            </div>
          </div>

          <div className="flex border-t border-stone-200">
            <div className="flex-1 h-12 bg-stone-100"></div>
            <div className="flex-1 h-12 bg-stone-50"></div>
            <div className="flex-1 h-12 bg-stone-50"></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 p-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-stone-200 rounded"></div>
          ))}
        </div>
      </div>

      {/* Loading Overlay */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center px-8 max-w-md">
          <div className="mb-12 relative w-40 h-40 mx-auto">
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-40 h-40 rounded-full border-2 border-transparent border-t-stone-950 animate-spin"
                style={{ animationDuration: "2s" }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-32 h-32 rounded-full border-2 border-transparent border-b-stone-400 animate-spin"
                style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 flex items-center justify-center">
                <img src="/icon-192.png" alt="SSELFIE Logo" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-stone-950 text-2xl font-serif font-extralight tracking-[0.3em] uppercase">
              {feedId ? "Maya is creating your photos" : "Loading your feed"}
            </h2>

            {feedId && (
              <>
                <div className="space-y-4 w-full max-w-sm mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-light text-stone-600">Progress</span>
                    <span className="text-sm font-medium text-stone-900">
                      {readyPosts} of {totalPosts} complete
                    </span>
                  </div>

                  <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-stone-900 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-center">
                    <Loader2 size={14} className="animate-spin text-stone-600" />
                    <p className="text-xs font-light text-stone-500">
                      {getProgressMessage()}
                    </p>
                    {isValidating && (
                      <span className="text-xs text-stone-400 ml-2">(checking...)</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

