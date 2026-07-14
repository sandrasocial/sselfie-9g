"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import type { FeedPost, FeedPreviewCardProps } from "./feed-preview-types"
import { useFeedPreviewPolling } from "./hooks/feed/use-feed-polling"
import { useFeedPreviewActions } from "./hooks/feed/use-feed-actions"
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
  } = useFeedPreviewPolling({
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
  } = useFeedPreviewActions({
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
    <div className={`rounded-2xl border overflow-hidden transition-colors duration-200 ${isSaved ? "bg-[#1c1b19] border-[rgba(195,190,182,0.25)]" : "bg-[rgba(175,170,162,0.10)] border-[rgba(195,190,182,0.20)] backdrop-blur-[50px]"}`}>
      {isSaved && (
        <div className="bg-[rgba(175,170,162,0.14)] border-b border-[rgba(195,190,182,0.20)] px-3 sm:px-4 md:px-6 py-2">
          <p className="text-[10px] sm:text-xs text-[#f0ede8] uppercase tracking-wider sm:tracking-widest font-light">Saved to Feed</p>
        </div>
      )}

      <div className="border-b border-[rgba(195,190,182,0.20)] px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <h3 className="text-base sm:text-lg md:text-xl font-light tracking-wide break-words text-[#f0ede8]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {displayTitle}
        </h3>
        <p className="text-[10px] sm:text-xs mt-1 uppercase tracking-wider sm:tracking-widest text-[#8a8780]">
          Instagram Feed Preview
        </p>
        {displayDescription && (
          <p className="text-xs sm:text-sm mt-2 font-light leading-relaxed break-words text-[#a8a49c]">{displayDescription}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-[10px] sm:text-xs uppercase tracking-wider text-[#8a8780]">
          <span>{readyCount} Ready</span>
          {pendingCount > 0 && <span>{pendingCount} Pending</span>}
          {generatingCount > 0 && <span>{generatingCount} Generating</span>}
        </div>
      </div>

      <div className={`p-2 sm:p-3 md:p-4 ${isSaved ? "bg-[rgba(13,12,11,0.55)]" : "bg-[rgba(13,12,11,0.42)]"}`}>
        {sortedPosts.length > 0 ? (
          <div className={`grid grid-cols-3 gap-0.5 sm:gap-1 w-full sm:max-w-[600px] sm:mx-auto ${isSaved ? "bg-[rgba(175,170,162,0.08)]" : "bg-[rgba(175,170,162,0.06)]"}`}>
            {sortedPosts.slice(0, 9).map((post, index) => {
              const isGeneratingPost =
                post.generation_status === "generating" ||
                (post.prediction_id && !post.image_url) ||
                (isAnyGenerating && !post.image_url && post.generation_status !== "failed")

              return (
                <div
                  key={post.id || `post-${post.position || index}`}
                  className="relative aspect-square group cursor-pointer overflow-hidden bg-[#2e2c29]"
                  onClick={() => openImageModal(post)}
                >
                  {post.image_url ? (
                    <>
                      <Image src={post.image_url} alt={`Post ${post.position}`} fill sizes="(max-width: 640px) 33vw, 200px" className="object-cover object-top" loading="lazy" quality={85} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[#f0ede8] text-xs font-medium">View Post</span>
                      </div>
                    </>
                  ) : isGeneratingPost ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(13,12,11,0.55)]">
                      <div className="flex flex-col items-center gap-2">
                        <span className="h-5 w-5 rounded-full border border-[rgba(195,190,182,0.30)] border-t-[#a8a49c] animate-spin" />
                        <span className="text-[10px] text-[#8a8780] uppercase tracking-wider">Creating</span>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2e2c29] to-[#1c1b19]">
                      <div className="flex flex-col items-center gap-1 sm:gap-2">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[rgba(175,170,162,0.16)] border border-[rgba(195,190,182,0.25)] shadow-sm flex items-center justify-center">
                          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-[#a8a49c]">Add</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-[#8a8780] uppercase tracking-wider">Pending</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute top-1 right-1 w-5 h-5 bg-[rgba(175,170,162,0.20)] border border-[rgba(195,190,182,0.25)] rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-medium text-[#f0ede8]">{post.position}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={`w-full sm:max-w-[600px] sm:mx-auto aspect-square flex items-center justify-center min-h-[300px] ${isSaved ? "bg-[rgba(175,170,162,0.08)]" : "bg-[rgba(175,170,162,0.06)]"}`}>
            <div className="flex flex-col items-center gap-2">
              <span className="h-6 w-6 rounded-full border border-[rgba(195,190,182,0.30)] border-t-[#a8a49c] animate-spin" />
              <span className="text-xs uppercase tracking-wider text-[#8a8780]">Loading feed posts...</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[rgba(195,190,182,0.20)] px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3 bg-[rgba(13,12,11,0.45)]">
        {hasFailedPosts && feedId && !isAnyGenerating && (
          <button
            onClick={() => handleGenerateFeedWithId(feedId)}
            disabled={isGenerating || isSaving}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm uppercase disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="h-4 w-4 rounded-full border border-[rgba(13,12,11,0.30)] border-t-[#0d0c0b] animate-spin" />
                Retrying Failed Images...
              </>
            ) : (
              `Retry Failed Images (${failedCount})`
            )}
          </button>
        )}

        {strategy && (pendingCount > 0 || (!isSaved || !feedId)) && !isAnyGenerating && !hasFailedPosts && (
          <button
            onClick={handleGenerateImages}
            disabled={isGenerating || isSaving}
            className="w-full py-3 bg-[#c8c4bb] hover:bg-[#f0ede8] text-[#0d0c0b] text-xs sm:text-sm uppercase disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="h-4 w-4 rounded-full border border-[rgba(13,12,11,0.30)] border-t-[#0d0c0b] animate-spin" />
                Saving Feed...
              </>
            ) : isGenerating ? (
              <>
                <span className="h-4 w-4 rounded-full border border-[rgba(13,12,11,0.30)] border-t-[#0d0c0b] animate-spin" />
                Starting Generation...
              </>
            ) : (
              `Generate Feed Images${pendingCount > 0 && feedId ? ` (${pendingCount} remaining)` : ""}`
            )}
          </button>
        )}

        {isAnyGenerating && (
          <div className="w-full py-3 text-xs uppercase text-center border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] text-[#8a8780]">
            Generating {generatingCount > 0 ? `${generatingCount} ` : ""}Images...
          </div>
        )}

        {isSaved && feedId && feedStatus !== "saved" && feedStatus !== "completed" && (
          <button onClick={handleSaveToPlanner} disabled={isSaving} className="w-full py-3 bg-[#c8c4bb] hover:bg-[#f0ede8] text-[#0d0c0b] text-xs sm:text-sm uppercase disabled:opacity-50">
            {isSaving ? "Saving to Planner..." : "Save to Planner"}
          </button>
        )}

        {isSaved && feedId && (feedStatus === "saved" || feedStatus === "completed") && (
          <button onClick={handleViewFullFeed} className="w-full py-3 bg-[rgba(175,170,162,0.12)] border border-[rgba(195,190,182,0.25)] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.20)] text-xs uppercase">
            Open Feed Planner
          </button>
        )}

        {!isSaved && strategy && (
          <button onClick={handleSaveFeed} disabled={isSaving || isGenerating} className="w-full py-3 bg-[#c8c4bb] border border-[rgba(195,190,182,0.25)] text-[#0d0c0b] hover:bg-[#f0ede8] text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-2">
            {isSaving ? (
              <>
                <span className="h-4 w-4 rounded-full border border-[rgba(28,27,25,0.30)] border-t-[#0d0c0b] animate-spin" />
                Saving Feed...
              </>
            ) : (
              "Save Feed"
            )}
          </button>
        )}

        {feedId ? (
          <p className="text-center text-[10px] uppercase tracking-[0.16em] text-[#8a8780]">
            Reopen this from Feed Planner when you are ready to post.
          </p>
        ) : strategy ? (
          <p className="text-center text-[10px] uppercase tracking-[0.16em] text-[#8a8780]">
            Save it to keep the plan and grid outside this chat.
          </p>
        ) : null}

        {postsData.length > 0 && (
          <button onClick={() => setShowPromptModal(true)} className="w-full py-2 bg-[rgba(175,170,162,0.12)] hover:bg-[rgba(175,170,162,0.20)] text-[#a8a49c] text-xs uppercase border border-[rgba(195,190,182,0.20)] flex items-center justify-center gap-1.5">
            <span>View Prompts</span>
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
