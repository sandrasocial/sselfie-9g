"use client"

import Image from "next/image"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2, Copy, Check, Sparkles } from "lucide-react"

interface FeedPostsListProps {
  posts: any[]
  expandedCaptions: Set<number>
  copiedCaptions: Set<number>
  enhancingCaptions: Set<number>
  onToggleCaption: (postId: number) => void
  onCopyCaption: (caption: string, postId: number) => void
  onEnhanceCaption: (postId: number, caption: string) => void
  onGeneratePost: (postId: number) => void
}

export default function FeedPostsList({
  posts,
  expandedCaptions,
  copiedCaptions,
  enhancingCaptions,
  onToggleCaption,
  onCopyCaption,
  onEnhanceCaption,
  onGeneratePost,
}: FeedPostsListProps) {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Create Captions Button - Show if no captions exist */}
      {posts.length > 0 && posts.every((p: any) => !p.caption || p.caption.trim() === "") && (
        <div className="flex justify-center pb-4">
          <button
            onClick={() => {
              // Navigate to Maya Feed tab with "Create captions" prompt
              window.location.href = "/studio#maya/feed"
              // Small delay to ensure tab is loaded, then trigger prompt
              setTimeout(() => {
                // The prompt will be sent via quick prompt click or user can type it
              }, 500)
            }}
            className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
          >
            <span>Create Captions</span>
          </button>
        </div>
      )}
      {posts.map((post: any) => {
        const isExpanded = expandedCaptions.has(post.id)
        const caption = post.caption || ""
        const shouldTruncate = caption.length > 150
        const displayCaption = isExpanded || !shouldTruncate ? caption : caption.substring(0, 150) + "..."

        return (
          <div key={post.id} className="border-b border-stone-100 pb-6">
            <div className="flex items-center justify-between px-4 md:px-0 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <span className="text-xs font-bold text-stone-900">S</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">sselfie</p>
                  <p className="text-xs text-stone-500">{post.content_pillar || `Post ${post.position}`}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                <MoreHorizontal size={20} className="text-stone-900" />
              </button>
            </div>

            <div className="aspect-square bg-stone-100 relative">
              {post.image_url ? (
                <Image
                  src={post.image_url || "/placeholder.svg"}
                  alt={`Post ${post.position}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 935px"
                />
              ) : post.generation_status === "generating" ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-stone-400" strokeWidth={1.5} />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <button
                    onClick={() => onGeneratePost(post.id)}
                    className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
                  >
                    Generate Photo
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 md:px-0 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="hover:opacity-60 transition-opacity">
                    <Heart size={24} className="text-stone-900" strokeWidth={2} />
                  </button>
                  <button className="hover:opacity-60 transition-opacity">
                    <MessageCircle size={24} className="text-stone-900" strokeWidth={2} />
                  </button>
                  <button className="hover:opacity-60 transition-opacity">
                    <Send size={24} className="text-stone-900" strokeWidth={2} />
                  </button>
                </div>
                <button className="hover:opacity-60 transition-opacity">
                  <Bookmark size={24} className="text-stone-900" strokeWidth={2} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm flex-1 min-w-0">
                    <span className="font-semibold text-stone-900">sselfie</span>{" "}
                    <span className="text-stone-900 whitespace-pre-wrap break-words">{displayCaption}</span>
                    {shouldTruncate && (
                      <button
                        onClick={() => onToggleCaption(post.id)}
                        className="text-stone-500 ml-1 hover:text-stone-700 transition-colors"
                      >
                        {isExpanded ? "less" : "more"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <button
                      onClick={() => onCopyCaption(post.caption, post.id)}
                      className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300"
                      title="Copy caption"
                    >
                      {copiedCaptions.has(post.id) ? (
                        <Check size={18} className="text-green-600" />
                      ) : (
                        <Copy size={18} className="text-stone-600" />
                      )}
                    </button>
                    <button
                      onClick={() => onEnhanceCaption(post.id, post.caption)}
                      disabled={enhancingCaptions.has(post.id)}
                      className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Enhance with Maya"
                    >
                      {enhancingCaptions.has(post.id) ? (
                        <Loader2 size={18} className="text-stone-600 animate-spin" />
                      ) : (
                        <Sparkles size={18} className="text-stone-600" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-stone-400 uppercase tracking-wide">Just now</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

