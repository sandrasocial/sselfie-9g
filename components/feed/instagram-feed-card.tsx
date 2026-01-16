/**
 * Instagram Feed Card - Editorial Luxury Design
 * 
 * Matches SSELFIE's stone palette aesthetic with real Instagram grid feel
 * NO cartoon placeholders, NO generic SaaS styling
 * 
 * Design Principles:
 * - Times New Roman serif headers (brand standard)
 * - Stone color palette (50, 100, 200, 500, 700, 950)
 * - Real Instagram 3x3 grid with 1px gaps (not generic placeholders)
 * - Elegant pending states (no cartoon icons)
 * - Hover interactions (like real Instagram)
 * - Editorial typography (uppercase tracking, font-light)
 * - Minimal borders and shadows (luxurious, not SaaS-y)
 */

'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ImageIcon, Loader2, X, AlertCircle } from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type PostStatus = 'pending' | 'generating' | 'complete' | 'failed' | 'ready'

interface FeedPost {
  id?: number
  position: number
  postType?: 'user' | 'lifestyle' | string
  shotType?: string
  imageUrl?: string | null
  image_url?: string | null
  caption?: string
  status?: PostStatus
  generationStatus?: PostStatus | 'ready'
  prompt?: string
  error?: string
  predictionId?: string | null
  prediction_id?: string | null
}

interface Feed {
  id?: string | number
  feedId?: string | number
  title?: string
  feedTitle?: string
  overallVibe?: string
  aesthetic?: string
  colorPalette?: string
  posts: FeedPost[]
  totalCredits?: number
  status?: 'pending' | 'generating' | 'complete' | 'partial' | 'failed'
  createdAt?: Date | string
  created_at?: Date | string
}

interface InstagramFeedCardProps {
  feed?: Feed
  posts?: FeedPost[]
  feedTitle?: string
  feedDescription?: string
  feedId?: number
  onPostClick?: (post: FeedPost) => void
  onViewPost?: (post: FeedPost) => void
  onGeneratePost?: (postId: number) => void
  onDelete?: () => void
  generatingPostId?: number | null
  isGenerating?: boolean
  className?: string
}

// ============================================================================
// POST CELL COMPONENT
// ============================================================================

interface PostCellProps {
  post: FeedPost
  onClick?: () => void
  generatingPostId?: number | null
  isGenerating?: boolean
  onGeneratePost?: (postId: number) => void
  onViewPost?: (post: FeedPost) => void
}

function PostCell({ post, onClick, generatingPostId, isGenerating, onGeneratePost, onViewPost }: PostCellProps) {
  // Normalize image URL (handle both imageUrl and image_url)
  const imageUrl = post.imageUrl || post.image_url
  const hasImage = !!imageUrl
  
  // Normalize status (handle both status and generationStatus)
  const status = post.status || post.generationStatus || 'pending'
  const isGeneratingPost = status === 'generating' || 
    generatingPostId === post.id || 
    (post.predictionId || post.prediction_id) && !imageUrl ||
    (isGenerating && !imageUrl && status !== 'failed')

  // Mobile-friendly tap state (replaces hover on mobile)
  const [isTapped, setIsTapped] = useState(false)

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (hasImage && onViewPost) {
      onViewPost(post)
    } else if (!hasImage && status === 'pending' && onGeneratePost && post.id) {
      onGeneratePost(post.id)
    }
  }

  const handleTouchStart = () => {
    setIsTapped(true)
  }

  const handleTouchEnd = () => {
    setTimeout(() => setIsTapped(false), 150)
    handleClick()
  }

  return (
    <div
      className="relative aspect-square group cursor-pointer overflow-hidden bg-stone-100 touch-manipulation active:scale-[0.98] transition-transform duration-150 min-h-[100px] sm:min-h-[120px]"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* COMPLETE STATE - Show image (handles both 'complete' and 'ready' status) */}
      {(status === 'complete' || status === 'ready') && hasImage && (
        <>
          <Image
            src={imageUrl!}
            alt={`Post ${post.position}`}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 200px, 200px"
            className="object-cover"
            loading="lazy"
            quality={85}
          />
          {/* Hover/tap overlay with caption preview - show on hover (desktop) or tap (mobile) */}
          <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${
            isTapped ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            <div className="text-center px-4">
              <span className="text-white text-xs font-medium block mb-1">
                View Post
              </span>
              {post.caption && (
                <span className="text-white/90 text-[10px] font-light line-clamp-2">
                  {post.caption.substring(0, 60)}...
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* GENERATING STATE - Elegant progress */}
      {isGeneratingPost && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
          <div className="flex flex-col items-center gap-2">
            {/* Subtle pulsing circle */}
            <div className="relative">
              <Loader2 className="w-5 h-5 text-stone-400 animate-spin" strokeWidth={1.5} />
            </div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider">
              Creating
            </span>
          </div>
        </div>
      )}

      {/* PENDING STATE - Minimal elegant placeholder */}
      {status === 'pending' && !isGeneratingPost && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br transition-all ${
          isTapped 
            ? 'from-stone-100 to-stone-200' 
            : 'from-stone-50 to-stone-100 group-hover:from-stone-100 group-hover:to-stone-200'
        }`}>
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            {/* Simple post number */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
              <span className="text-stone-400 text-xs sm:text-sm font-light">{post.position}</span>
            </div>
            <span className={`text-[9px] sm:text-[10px] text-stone-500 uppercase tracking-wider transition-opacity ${
              isTapped ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              {post.postType === 'user' ? 'Portrait' : 'Lifestyle'}
            </span>
          </div>
        </div>
      )}

      {/* FAILED STATE - Graceful error */}
      {status === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="w-5 h-5 text-stone-400" strokeWidth={1.5} />
            <span className="text-[10px] text-stone-500 uppercase tracking-wider">
              Failed
            </span>
          </div>
        </div>
      )}

      {/* Position indicator (bottom-right corner) */}
      <div className="absolute top-1 right-1 w-5 h-5 sm:w-5 sm:h-5 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center z-10">
        <span className="text-[8px] sm:text-[10px] font-medium text-stone-700">
          {post.position}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN FEED CARD COMPONENT
// ============================================================================

export default function InstagramFeedCard({ 
  feed,
  posts,
  feedTitle,
  feedDescription,
  feedId,
  onPostClick,
  onViewPost,
  onGeneratePost,
  onDelete,
  generatingPostId,
  isGenerating = false,
  className = '',
}: InstagramFeedCardProps) {
  // Support both feed object and individual props (backward compatibility)
  const effectiveFeed = feed || {
    id: feedId,
    title: feedTitle,
    posts: posts || [],
    status: isGenerating ? 'generating' : 'pending',
  }
  
  // Sort posts by position
  const sortedPosts = [...effectiveFeed.posts].sort((a, b) => a.position - b.position).slice(0, 9)
  
  // Calculate progress
  const completeCount = effectiveFeed.posts.filter(p => {
    const status = p.status || p.generationStatus || 'pending'
    return status === 'complete' || status === 'ready'
  }).length
  const progressPercent = (completeCount / 9) * 100

  // Get feed title
  const displayTitle = effectiveFeed.title || effectiveFeed.feedTitle || feedTitle || 'Instagram Feed'
  
  // Get overall vibe
  const overallVibe = effectiveFeed.overallVibe || feedDescription || ''
  
  // Get creation date
  const createdAt = effectiveFeed.createdAt || effectiveFeed.created_at || new Date()

  return (
    <div className={`bg-white rounded-none border border-stone-200 overflow-hidden ${className}`}>
      {/* HEADER - Editorial style */}
      <div className="border-b border-stone-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Feed title - Serif font */}
            <h3 
              className="text-base sm:text-lg md:text-xl font-light tracking-wide text-stone-950 break-words"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              {displayTitle}
            </h3>
            
            {/* Metadata - Stack on mobile, row on larger screens */}
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2 text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider">
              {effectiveFeed.aesthetic && (
                <>
                  <span className="truncate max-w-[120px] sm:max-w-none">{effectiveFeed.aesthetic}</span>
                  <span className="hidden sm:inline">•</span>
                </>
              )}
              <span>{completeCount}/9 posts</span>
              {effectiveFeed.totalCredits && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span>{effectiveFeed.totalCredits} credits</span>
                </>
              )}
            </div>
          </div>

          {/* Actions - Touch-friendly delete button */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="ml-2 sm:ml-4 p-2 sm:p-1 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-stone-100 active:bg-stone-200 active:scale-90 rounded transition-all touch-manipulation"
              aria-label="Delete feed"
            >
              <X className="w-4 h-4 sm:w-4 sm:h-4 text-stone-400" />
            </button>
          )}
        </div>

        {/* Progress bar - Only show if generating */}
        {(effectiveFeed.status === 'generating' || isGenerating) && (
          <div className="mt-3 sm:mt-4">
            <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-stone-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-stone-500 mt-2 uppercase tracking-wider">
              Generating {9 - completeCount} remaining posts...
            </p>
          </div>
        )}
      </div>

      {/* INSTAGRAM GRID - 3x3 with responsive gaps - Full width on mobile */}
      <div className="p-2 sm:p-3 md:p-4 bg-stone-50">
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1 bg-white w-full sm:max-w-[600px] sm:mx-auto">
          {sortedPosts.map((post) => (
            <PostCell
              key={post.id || post.position}
              post={post}
              onClick={() => onPostClick?.(post)}
              generatingPostId={generatingPostId}
              isGenerating={isGenerating}
              onGeneratePost={onGeneratePost}
              onViewPost={onViewPost}
            />
          ))}
        </div>
      </div>

      {/* FOOTER - Overall vibe */}
      {overallVibe && (
        <div className="border-t border-stone-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-white">
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-light italic break-words">
            &quot;{overallVibe}&quot;
          </p>
          <p className="text-[10px] sm:text-xs text-stone-400 mt-2 uppercase tracking-wider">
            Created {new Date(createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

export function InstagramFeedCardSkeleton() {
  return (
    <div className="bg-white rounded-none border border-stone-200 overflow-hidden animate-pulse">
      {/* Header skeleton */}
      <div className="border-b border-stone-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="h-5 sm:h-6 bg-stone-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 sm:h-4 bg-stone-100 rounded w-1/2"></div>
      </div>

      {/* Grid skeleton */}
      <div className="p-2 sm:p-3 md:p-4 bg-stone-50">
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1 bg-white w-full sm:max-w-[600px] sm:mx-auto">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="aspect-square bg-stone-100 min-h-[100px] sm:min-h-[120px]"></div>
          ))}
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="border-t border-stone-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-white">
        <div className="h-3 sm:h-4 bg-stone-100 rounded w-2/3"></div>
      </div>
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

export function InstagramFeedEmptyState() {
  return (
    <div className="bg-white rounded-none border border-stone-200 overflow-hidden">
      <div className="p-6 sm:p-8 md:p-12 text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-stone-100 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-stone-400" />
        </div>
        <h3 
          className="text-base sm:text-lg font-light text-stone-900 mb-2"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          No feeds yet
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 font-light px-4">
          Start a conversation with Maya to create your first strategic Instagram feed.
        </p>
      </div>
    </div>
  )
}

