"use client"

import Image from "next/image"
import { ChevronLeft, MoreHorizontal, Loader2, Sparkles } from "lucide-react"

interface FeedHeaderProps {
  feedData: any
  onBack?: () => void
  onProfileImageClick: () => void
  onGenerateBio: () => void
  isGeneratingBio: boolean
}

export default function FeedHeader({
  feedData,
  onBack,
  onProfileImageClick,
  onGenerateBio,
  isGeneratingBio,
}: FeedHeaderProps) {
  return (
    <div className="bg-white border-b border-stone-200">
      <div className="flex items-center justify-between px-4 py-3">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-stone-50 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-stone-900" strokeWidth={2} />
          </button>
        )}
        <div className="flex items-center gap-1">
          <span className="text-base font-semibold text-stone-900">sselfie</span>
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <button className="p-2 -mr-2 hover:bg-stone-50 rounded-full transition-colors">
          <MoreHorizontal size={24} className="text-stone-900" strokeWidth={2} />
        </button>
      </div>

      <div className="px-4 md:px-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-start md:gap-12 mb-4">
          <button
            onClick={onProfileImageClick}
            className="relative group w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[3px] mb-4 md:mb-0 flex-shrink-0 transition-opacity hover:opacity-90"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden relative">
              {feedData?.feed?.profile_image_url ? (
                <Image
                  src={feedData.feed.profile_image_url}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 80px, 128px"
                  style={{ borderRadius: '50%' }}
                />
              ) : (
                <span className="text-2xl md:text-4xl font-bold text-stone-900 relative z-10">S</span>
              )}
            </div>
            <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/40 rounded-full transition-all flex items-center justify-center pointer-events-none">
              <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                Change
              </span>
            </div>
          </button>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-stone-900">9</div>
                <div className="text-xs md:text-sm text-stone-500">posts</div>
              </div>
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-stone-900">1.2K</div>
                <div className="text-xs md:text-sm text-stone-500">followers</div>
              </div>
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-stone-900">342</div>
                <div className="text-xs md:text-sm text-stone-500">following</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-stone-900">SSELFIE Studio</div>
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-stone-900 whitespace-pre-wrap flex-1">
                  {feedData.bio?.bio_text || "Your Instagram feed strategy created by Maya"}
                </div>
                <button
                  onClick={onGenerateBio}
                  disabled={isGeneratingBio || !feedData?.feed?.id}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title={feedData.bio?.bio_text ? "Regenerate bio" : "Generate bio"}
                >
                  {isGeneratingBio ? (
                    <Loader2 size={18} className="text-stone-600 animate-spin" />
                  ) : (
                    <Sparkles size={18} className="text-stone-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
                Following
              </button>
              <button className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
                Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

