"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, MoreHorizontal, ChevronDown } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface FeedHeaderProps {
  feedData: any
  currentFeedId: number
  onBack?: () => void
  onProfileImageClick: () => void
  onWriteBio: () => void
  onFeedChange?: (feedId: number) => void
}

export default function FeedHeader({
  feedData,
  currentFeedId,
  onBack,
  onProfileImageClick,
  onWriteBio,
  onFeedChange,
}: FeedHeaderProps) {
  // Fetch feed list for selector
  const { data: feedListData } = useSWR(
    currentFeedId ? '/api/feed/list' : null,
    fetcher,
    {
      revalidateOnFocus: true, // Revalidate when tab becomes visible
      revalidateOnReconnect: true, // Revalidate on reconnect
      refreshInterval: 0, // Don't auto-poll, but allow manual refresh
    }
  )

  const feeds = feedListData?.feeds || []
  const hasMultipleFeeds = feeds.length > 1

  const hasProfileImage = !!feedData?.feed?.profile_image_url
  const hasBio = !!feedData?.bio?.bio_text

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
              {hasProfileImage ? (
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
              <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium text-center px-2">
                {hasProfileImage ? "Change" : "Add photo"}
              </span>
            </div>
            {!hasProfileImage && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Click to add profile picture
              </div>
            )}
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
              <div className="text-sm text-stone-900 whitespace-pre-wrap">
                {hasBio ? feedData.bio.bio_text : "Your Instagram feed strategy created by Maya"}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={onWriteBio}
                className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
              >
                Write Bio
              </button>
              {/* TODO: Implement highlights creation feature */}
              <button
                disabled
                className="flex-1 md:flex-none md:px-8 bg-stone-100 text-stone-400 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-not-allowed opacity-60"
                title="Coming soon - Create Highlights feature"
              >
                Create Highlights
              </button>
              {/* Feed Selector - show if multiple feeds */}
              {hasMultipleFeeds && onFeedChange && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="text-xs text-stone-500 uppercase tracking-wider hidden sm:inline whitespace-nowrap">
                    My Feeds:
                  </span>
                  <div className="relative flex-1 md:flex-none">
                    <select
                      value={currentFeedId || ''}
                      onChange={(e) => onFeedChange(Number(e.target.value))}
                      className="appearance-none bg-white border border-stone-300 rounded-lg px-4 py-1.5 pr-8 text-sm font-light text-stone-900 hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-colors cursor-pointer w-full md:w-auto"
                    >
                      {feeds.map((feed: any) => (
                        <option key={feed.id} value={feed.id}>
                          {feed.title} {feed.image_count > 0 ? `(${feed.image_count}/9)` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown 
                      size={16} 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

