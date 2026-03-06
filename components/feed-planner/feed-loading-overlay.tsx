"use client"

interface FeedLoadingOverlayProps {
  feedId: number | null
  readyPosts: number
  totalPosts: number
  overallProgress: number
  processingStage?: string
  isValidating: boolean
  getProgressMessage: () => string
  isTakingLonger?: boolean
}

export default function FeedLoadingOverlay({
  feedId,
  readyPosts,
  totalPosts,
  overallProgress,
  isValidating,
  getProgressMessage,
  isTakingLonger,
}: FeedLoadingOverlayProps) {
  return (
    <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-[#0d0c0b] min-h-screen relative overflow-hidden">
      {/* Blurred Instagram Feed Preview */}
      <div className="filter blur-lg pointer-events-none opacity-50">
        <div className="bg-[rgba(175,170,162,0.10)] border-b border-[rgba(195,190,182,0.20)]">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-24 h-6 bg-[rgba(175,170,162,0.25)] rounded"></div>
            <div className="flex items-center gap-1">
              <div className="w-16 h-5 bg-[rgba(175,170,162,0.25)] rounded"></div>
            </div>
            <div className="w-6 h-6 bg-[rgba(175,170,162,0.25)] rounded-full"></div>
          </div>

          <div className="px-8 pb-4">
            <div className="flex items-start gap-12">
              <div className="w-32 h-32 rounded-full bg-[rgba(175,170,162,0.25)]"></div>
              <div className="flex-1 space-y-4">
                <div className="flex gap-8">
                  <div className="w-16 h-12 bg-[rgba(175,170,162,0.25)] rounded"></div>
                  <div className="w-16 h-12 bg-[rgba(175,170,162,0.25)] rounded"></div>
                  <div className="w-16 h-12 bg-[rgba(175,170,162,0.25)] rounded"></div>
                </div>
                <div className="w-full h-16 bg-[rgba(175,170,162,0.25)] rounded"></div>
              </div>
            </div>
          </div>

          <div className="flex border-t border-[rgba(195,190,182,0.20)]">
            <div className="flex-1 h-12 bg-[rgba(175,170,162,0.18)]"></div>
            <div className="flex-1 h-12 bg-[rgba(175,170,162,0.12)]"></div>
            <div className="flex-1 h-12 bg-[rgba(175,170,162,0.12)]"></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 p-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-[rgba(175,170,162,0.24)] rounded"></div>
          ))}
        </div>
      </div>

      {/* Loading Overlay */}
      <div className="absolute inset-0 bg-[rgba(13,12,11,0.82)] backdrop-blur-[50px] flex items-center justify-center">
        <div className="text-center px-8 max-w-md">
          <div className="mb-12 relative w-40 h-40 mx-auto">
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-40 h-40 rounded-full border-2 border-transparent border-t-[#f0ede8] animate-spin"
                style={{ animationDuration: "2s" }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-32 h-32 rounded-full border-2 border-transparent border-b-[#a8a49c] animate-spin"
                style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 flex items-center justify-center">
                <img src="/brand/sselfie-logo-white-transparent.png" alt="SSELFIE Logo" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-[#f0ede8] text-2xl font-serif font-extralight tracking-[0.3em] uppercase">
              {feedId ? "Maya is creating your photos" : "Loading your feed"}
            </h2>

            {feedId && (
              <>
                <div className="space-y-4 w-full max-w-sm mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-light text-[#8a8780]">Progress</span>
                    <span className="text-sm font-medium text-[#f0ede8]">
                      {readyPosts} of {totalPosts} complete
                    </span>
                  </div>

                  <div className="w-full bg-[rgba(175,170,162,0.18)] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#c8c4bb] h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-center">
                    <span className="inline-flex w-3 h-3 rounded-full border border-[#a8a49c]/70 border-t-[#f0ede8] animate-spin" />
                    <p className="text-xs font-light text-[#8a8780]">
                      {getProgressMessage()}
                    </p>
                    {isValidating && (
                      <span className="text-xs text-[#a8a49c] ml-2">(checking...)</span>
                    )}
                  </div>
                  
                  {isTakingLonger && (
                    <div className="mt-6 pt-6 border-t border-[rgba(195,190,182,0.20)]">
                      <p className="text-sm font-light text-[#8a8780] leading-relaxed">
                        This is taking a bit longer than expected. Your photos are being crafted with high-quality details.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
