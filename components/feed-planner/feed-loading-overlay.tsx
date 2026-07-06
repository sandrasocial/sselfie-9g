"use client"

import { Spinner } from "@/components/app-v3/loading"

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
    <div className="flex min-h-screen w-full max-w-none items-center justify-center bg-[#F8FAFA] px-6 md:max-w-[935px] mx-auto animate-in fade-in duration-200 motion-reduce:animate-none">
      <div className="w-full max-w-sm rounded-[14px] border border-[#C5C6C8]/35 bg-white px-8 py-12 text-center shadow-[0_1px_2px_rgba(13,14,16,0.04),0_10px_28px_rgba(13,14,16,0.06)] animate-in fade-in zoom-in-[0.98] duration-300 motion-reduce:animate-none">
        <Spinner className="mx-auto h-10 w-10" />

        <div className="mt-8 space-y-6">
          <h2 className="font-serif text-[24px] font-light leading-tight text-[#0D0E10]">
            {feedId ? "Maya is creating your photos" : "Loading your feed"}
          </h2>

          {feedId && (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-light text-[#818283]">Progress</span>
                <span className="text-sm font-medium text-[#0D0E10]">
                  {readyPosts} of {totalPosts} complete
                </span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F1F2F2]">
                <div
                  className="h-2.5 rounded-full bg-[#0D0E10] transition-all duration-500 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-2">
                <Spinner className="h-3 w-3 border" />
                <p className="text-xs font-light text-[#818283]">{getProgressMessage()}</p>
                {isValidating && (
                  <span className="ml-2 text-xs text-[#818283]">(checking...)</span>
                )}
              </div>

              {isTakingLonger && (
                <div className="mt-6 border-t border-[#C5C6C8]/40 pt-6">
                  <p className="text-sm font-light leading-relaxed text-[#818283]">
                    This is taking a bit longer than expected. Your photos are being crafted with high-quality details.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
