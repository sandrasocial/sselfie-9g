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

import React from 'react'
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

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (hasImage && onViewPost) {
      onViewPost(post)
    } else if (!hasImage && status === 'pending' && onGeneratePost && post.id) {
      onGeneratePost(post.id)
    }
  }

  return (
    <div
      className="relative aspect-square group cursor-pointer overflow-hidden bg-stone-100"
      onClick={handleClick}
    >
      {/* COMPLETE STATE - Show image (handles both 'complete' and 'ready' status) */}
      {(status === 'complete' || status === 'ready') && hasImage && (
        <>
          <Image
            src={imageUrl!}
            alt={`Post ${post.position}`}
            fill
            className="object-cover"
          />
          {/* Hover overlay with caption preview */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 group-hover:from-stone-100 group-hover:to-stone-200 transition-all">
          <div className="flex flex-col items-center gap-2">
            {/* Simple post number */}
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
              <span className="text-stone-400 text-sm font-light">{post.position}</span>
            </div>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
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
      <div className="absolute top-1 right-1 w-5 h-5 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center z-10">
        <span className="text-[10px] font-medium text-stone-700">
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
      <div className="border-b border-stone-200 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Feed title - Serif font */}
            <h3 
              className="text-xl font-light tracking-wide text-stone-950"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              {displayTitle}
            </h3>
            
            {/* Metadata */}
            <div className="flex items-center gap-2 mt-2 text-xs text-stone-500 uppercase tracking-wider">
              {effectiveFeed.aesthetic && (
                <>
                  <span>{effectiveFeed.aesthetic}</span>
                  <span>•</span>
                </>
              )}
              <span>{completeCount}/9 posts</span>
              {effectiveFeed.totalCredits && (
                <>
                  <span>•</span>
                  <span>{effectiveFeed.totalCredits} credits</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="ml-4 p-1 hover:bg-stone-100 rounded transition-colors"
              aria-label="Delete feed"
            >
              <X className="w-4 h-4 text-stone-400" />
            </button>
          )}
        </div>

        {/* Progress bar - Only show if generating */}
        {(effectiveFeed.status === 'generating' || isGenerating) && (
          <div className="mt-4">
            <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-stone-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-stone-500 mt-2 uppercase tracking-wider">
              Generating {9 - completeCount} remaining posts...
            </p>
          </div>
        )}
      </div>

      {/* INSTAGRAM GRID - 3x3 with 1px gaps */}
      <div className="p-4 bg-stone-50">
        <div className="grid grid-cols-3 gap-1 bg-white max-w-[600px] mx-auto">
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
        <div className="border-t border-stone-200 px-6 py-4 bg-white">
          <p className="text-sm text-stone-700 leading-relaxed font-light italic">
            "{overallVibe}"
          </p>
          <p className="text-xs text-stone-400 mt-2 uppercase tracking-wider">
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
      <div className="border-b border-stone-200 px-6 py-4">
        <div className="h-6 bg-stone-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-stone-100 rounded w-1/2"></div>
      </div>

      {/* Grid skeleton */}
      <div className="p-4 bg-stone-50">
        <div className="grid grid-cols-3 gap-1 bg-white max-w-[600px] mx-auto">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="aspect-square bg-stone-100"></div>
          ))}
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="border-t border-stone-200 px-6 py-4 bg-white">
        <div className="h-4 bg-stone-100 rounded w-2/3"></div>
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
      <div className="p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-stone-400" />
        </div>
        <h3 
          className="text-lg font-light text-stone-900 mb-2"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          No feeds yet
        </h3>
        <p className="text-sm text-stone-500 font-light">
          Start a conversation with Maya to create your first strategic Instagram feed.
        </p>
      </div>
    </div>
  )
}

