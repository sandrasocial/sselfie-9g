"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Eye, ImageIcon, Loader2, Wand2 } from "lucide-react"
import type { FeedPost, FeedPreviewCardProps } from "./feed-preview-types"
import { useFeedPolling } from "./hooks/feed/use-feed-polling"
import { useFeedActions } from "./hooks/feed/use-feed-actions"
import FeedPreviewImageModal from "./feed-preview-image-modal"
import FeedPreviewPromptsModal from "./feed-preview-prompts-modal"

export default function FeedPreviewCard({
  feedId: feedIdProp,
  feedTitle,
  feedDescription,
  posts,
  onViewFullFeed,
  needsRestore = false,
  strategy,
  isSaved: isSavedProp = true,
  onSave,
  proMode = false,
  styleStrength = 0.8,
  promptAccuracy = 0.8,
  aspectRatio = "1:1",
  realismStrength = 0.8,
  messageId,
  onPromptUpdate,
}: FeedPreviewCardProps) {
  const {
    feedId,
    isSaved,
    setSavedFeedId,
    postsData,
    setPostsData,
    displayTitle,
    setDisplayTitle,
    displayDescription,
    setDisplayDescription,
    feedStatus,
    setFeedStatus,
    isGenerating,
    setIsGenerating,
    mutateFeed,
    markJustSaved,
    sortedPosts,
    readyCount,
    pendingCount,
    failedCount,
    generatingCount,
    hasFailedPosts,
    isAnyGenerating,
  } = useFeedPolling({
    feedIdProp,
    feedTitle,
    feedDescription,
    posts,
    needsRestore,
    strategy,
    isSavedProp,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null)

  const {
    handleViewFullFeed,
    handleSaveToPlanner,
    handleSaveFeed,
    handleGenerateFeedWithId,
    handleGenerateImages,
    handleRefreshPosts,
  } = useFeedActions({
    feedId,
    isSaved,
    strategy,
    onViewFullFeed,
    onSave,
    proMode,
    styleStrength,
    promptAccuracy,
    aspectRatio,
    realismStrength,
    isSaving,
    setIsSaving,
    setIsGenerating,
    setSavedFeedId,
    setFeedStatus,
    setPostsData,
    setDisplayTitle,
    setDisplayDescription,
    displayTitle,
    displayDescription,
    mutateFeed,
    markJustSaved,
  })

  useEffect(() => {
    if (!isImageModalOpen) return
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [isImageModalOpen])

  const openImageModal = (post: FeedPost) => {
    if (!post.image_url) return
    setSelectedPost(post)
    setIsImageModalOpen(true)
  }

  return (
    <div className={`rounded-none border overflow-hidden transition-colors duration-200 ${isSaved ? "bg-black border-stone-700" : "bg-white border-stone-200"}`}>
      {isSaved && (
        <div className="bg-black border-b border-stone-700 px-3 sm:px-4 md:px-6 py-2">
          <p className="text-[10px] sm:text-xs text-white uppercase tracking-wider sm:tracking-widest font-light">Saved to Feed</p>
        </div>
      )}

      <div className={`border-b px-3 sm:px-4 md:px-6 py-3 sm:py-4 ${isSaved ? "border-stone-700" : "border-stone-200"}`}>
        <h3 className={`text-base sm:text-lg md:text-xl font-light tracking-wide break-words ${isSaved ? "text-white" : "text-stone-950"}`} style={{ fontFamily: "'Times New Roman', serif" }}>
          {displayTitle}
        </h3>
        <p className={`text-[10px] sm:text-xs mt-1 uppercase tracking-wider sm:tracking-widest ${isSaved ? "text-stone-300" : "text-stone-500"}`}>
          Instagram Feed Preview
        </p>
        {displayDescription && (
          <p className={`text-xs sm:text-sm mt-2 font-light leading-relaxed break-words ${isSaved ? "text-stone-300" : "text-stone-600"}`}>{displayDescription}</p>
        )}
        <div className={`flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-[10px] sm:text-xs uppercase tracking-wider ${isSaved ? "text-stone-300" : "text-stone-500"}`}>
          <span>{readyCount} Ready</span>
          {pendingCount > 0 && <span>{pendingCount} Pending</span>}
          {generatingCount > 0 && <span>{generatingCount} Generating</span>}
        </div>
      </div>

      <div className={`p-2 sm:p-3 md:p-4 ${isSaved ? "bg-stone-900" : "bg-stone-50"}`}>
        {sortedPosts.length > 0 ? (
          <div className={`grid grid-cols-3 gap-0.5 sm:gap-1 w-full sm:max-w-[600px] sm:mx-auto ${isSaved ? "bg-stone-800" : "bg-white"}`}>
            {sortedPosts.slice(0, 9).map((post, index) => {
              const isGeneratingPost =
                post.generation_status === "generating" ||
                (post.prediction_id && !post.image_url) ||
                (isAnyGenerating && !post.image_url && post.generation_status !== "failed")

              return (
                <div
                  key={post.id || `post-${post.position || index}`}
                  className="relative aspect-square group cursor-pointer overflow-hidden bg-stone-100"
                  onClick={() => openImageModal(post)}
                >
                  {post.image_url ? (
                    <>
                      <Image src={post.image_url} alt={`Post ${post.position}`} fill sizes="(max-width: 640px) 33vw, 200px" className="object-cover" loading="lazy" quality={85} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium">View Post</span>
                      </div>
                    </>
                  ) : isGeneratingPost ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider">Creating</span>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100">
                      <div className="flex flex-col items-center gap-1 sm:gap-2">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400" />
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-stone-500 uppercase tracking-wider">Pending</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute top-1 right-1 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-medium text-stone-700">{post.position}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={`w-full sm:max-w-[600px] sm:mx-auto aspect-square flex items-center justify-center min-h-[300px] ${isSaved ? "bg-stone-800" : "bg-white"}`}>
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
              <span className={`text-xs uppercase tracking-wider ${isSaved ? "text-stone-300" : "text-stone-500"}`}>Loading feed posts...</span>
            </div>
          </div>
        )}
      </div>

      <div className={`border-t px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3 ${isSaved ? "border-stone-700 bg-black" : "border-stone-200 bg-white"}`}>
        {hasFailedPosts && feedId && !isAnyGenerating && (
          <button
            onClick={() => handleGenerateFeedWithId(feedId)}
            disabled={isGenerating || isSaving}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm uppercase disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? <><Loader2 size={16} className="animate-spin" />Retrying Failed Images...</> : `Retry Failed Images (${failedCount})`}
          </button>
        )}

        {strategy && (pendingCount > 0 || (!isSaved || !feedId)) && !isAnyGenerating && !hasFailedPosts && (
          <button
            onClick={handleGenerateImages}
            disabled={isGenerating || isSaving}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm uppercase disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <><Loader2 size={16} className="animate-spin" />Saving Feed...</> : isGenerating ? <><Loader2 size={16} className="animate-spin" />Starting Generation...</> : `Generate Feed Images${pendingCount > 0 && feedId ? ` (${pendingCount} remaining)` : ""}`}
          </button>
        )}

        {isAnyGenerating && (
          <div className={`w-full py-3 text-xs uppercase text-center border ${isSaved ? "bg-stone-800 text-stone-200 border-stone-700" : "bg-stone-100 text-stone-600 border-stone-200"}`}>
            Generating {generatingCount > 0 ? `${generatingCount} ` : ""}Images...
          </div>
        )}

        {isSaved && feedId && feedStatus !== "saved" && feedStatus !== "completed" && (
          <button onClick={handleSaveToPlanner} disabled={isSaving} className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm uppercase disabled:opacity-50">
            {isSaving ? "Saving to Planner..." : "Save to Planner"}
          </button>
        )}

        {isSaved && feedId && (feedStatus === "saved" || feedStatus === "completed") && (
          <button onClick={handleViewFullFeed} className="w-full py-3 bg-white border border-stone-200 text-stone-900 hover:bg-stone-50 text-xs uppercase">
            View Feed
          </button>
        )}

        {!isSaved && strategy && (
          <button onClick={handleSaveFeed} disabled={isSaving || isGenerating} className="w-full py-3 bg-white border border-stone-300 text-stone-900 hover:bg-stone-50 text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-2">
            {isSaving ? <><Loader2 size={16} className="animate-spin" />Saving Feed...</> : <><Wand2 size={14} />Save Feed</>}
          </button>
        )}

        {postsData.length > 0 && (
          <button onClick={() => setShowPromptModal(true)} className="w-full py-2 bg-white hover:bg-stone-50 text-stone-600 text-xs uppercase border border-stone-200 flex items-center justify-center gap-1.5">
            <Eye size={14} className="opacity-60" />
            View Prompts
          </button>
        )}
      </div>

      <FeedPreviewImageModal
        open={isImageModalOpen}
        selectedPost={selectedPost}
        feedId={feedId}
        onClose={() => {
          setIsImageModalOpen(false)
          setSelectedPost(null)
        }}
        onRefreshPosts={handleRefreshPosts}
      />

      <FeedPreviewPromptsModal
        open={showPromptModal}
        posts={sortedPosts}
        messageId={messageId}
        onPromptUpdate={onPromptUpdate}
        onClose={() => setShowPromptModal(false)}
      />
    </div>
  )
}
