"use client"

import { createPortal } from "react-dom"
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "@/hooks/use-toast"
import FeedPostCard from "./feed-post-card"
import { FeedGallerySelector } from "./feed-gallery-selector"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { useAccessibleModal } from "@/components/app-v3/use-accessible-modal"
import { resolveCalendarProfile } from "@/lib/feed-planner/calendar-profile"
import type { CalendarPostTarget } from "@/components/app-v3/types"

interface FeedModalsProps {
  selectedPost: any | null
  showGallery: number | null
  showProfileGallery: boolean
  feedId: number
  feedData: any
  access?: FeedPlannerAccess // Phase 8.1: Access control for gallery access
  onClosePost: () => void
  onCloseGallery: () => void
  onCloseProfileGallery: () => void
  onShowGallery: (postId: number) => void
  onNavigateToMaya?: (requestedAction?: CalendarPostTarget["requestedAction"]) => void
  onUpdate: (updatedPost?: any) => void | Promise<void>
  mayaWorkspace?: ReactNode
  operatingLayerEnabled?: boolean
}

export default function FeedModals({
  selectedPost,
  showGallery,
  showProfileGallery,
  feedId,
  feedData,
  access, // Phase 8.1: Access control for gallery access
  onClosePost,
  onCloseGallery,
  onCloseProfileGallery,
  onShowGallery,
  onNavigateToMaya,
  onUpdate,
  mayaWorkspace,
  operatingLayerEnabled = false,
}: FeedModalsProps) {
  const [studioView, setStudioView] = useState<"post" | "maya">("post")
  const { dialogRef, initialFocusRef } = useAccessibleModal(Boolean(selectedPost), onClosePost)
  const calendarProfile = resolveCalendarProfile(feedData)

  useEffect(() => {
    if (selectedPost?.id) setStudioView("post")
  }, [selectedPost?.id])

  return (
    <>
      {selectedPost &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-end justify-center bg-[#0D0E10]/92 p-0 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none sm:items-center sm:p-4"
            onClick={onClosePost}
            style={{
              paddingTop: "calc(1rem + env(safe-area-inset-top))",
              paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Edit calendar post"
              tabIndex={-1}
              className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top))] min-w-0 w-full max-w-[1180px] flex-col overflow-hidden rounded-t-[22px] bg-[color:var(--app-bg)] animate-in fade-in zoom-in-[0.98] duration-300 motion-reduce:animate-none sm:max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] sm:rounded-[22px]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-[color:var(--app-glass-border)] px-3 sm:px-4">
                <div className="flex items-center gap-1" role="group" aria-label="Post studio view">
                  <button
                    type="button"
                    onClick={() => setStudioView("post")}
                    aria-pressed={studioView === "post"}
                    className={`min-h-11 rounded-full px-4 text-[11px] font-medium transition-colors ${
                      studioView === "post"
                        ? "bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
                        : "text-[color:var(--app-text-secondary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
                    }`}
                  >
                    {/* "Post" read as a publish button (UX audit 2026-07-28); this is a view toggle. */}
                    Preview
                  </button>
                  {mayaWorkspace ? (
                    <button
                      type="button"
                      onClick={() => setStudioView("maya")}
                      aria-pressed={studioView === "maya"}
                      className={`min-h-11 rounded-full px-4 text-[11px] font-medium transition-colors ${
                        studioView === "maya"
                          ? "bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
                          : "text-[color:var(--app-text-secondary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
                      }`}
                    >
                      Ask Maya
                    </button>
                  ) : null}
                </div>
                {/* Action buttons - shown when image exists */}
                {selectedPost.image_url && access?.hasGalleryAccess ? (
                  <div className="ml-auto flex flex-wrap items-center gap-1">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        onShowGallery(selectedPost.id)
                        onClosePost()
                      }}
                      className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)]"
                    >
                      Gallery
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                <button
                  ref={initialFocusRef}
                  onClick={onClosePost}
                  className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)]"
                >
                  Close
                </button>
              </div>

              <div className="grid min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[color:var(--calendar-stone-1)] p-3 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-4 lg:overflow-hidden lg:p-4">
                <div
                  className={`${studioView === "post" ? "block" : "hidden"} min-h-0 overflow-y-auto overscroll-contain lg:block`}
                >
                  <FeedPostCard
                    post={selectedPost}
                    feedId={feedId}
                    accountName={calendarProfile.username}
                    profileImageUrl={calendarProfile.profileImageUrl}
                    onUpdate={onUpdate}
                    onNavigateToMaya={
                      mayaWorkspace ? () => setStudioView("maya") : onNavigateToMaya
                    }
                    operatingLayerEnabled={operatingLayerEnabled}
                  />
                </div>
                {mayaWorkspace ? (
                  <div
                    className={`${studioView === "maya" ? "block" : "hidden"} min-h-0 min-w-0 max-w-full overflow-hidden lg:block`}
                  >
                    {mayaWorkspace}
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Phase 8.1: Show gallery only if user has gallery access */}
      {showGallery !== null && feedData?.feed?.id && access?.hasGalleryAccess && (
        <FeedGallerySelector
          type="post"
          postId={showGallery}
          feedId={feedData.feed.id}
          onClose={() => {
            onCloseGallery()
          }}
          onImageSelected={async (updatedPost?: any) => {
            // Force immediate revalidation of feed data
            await onUpdate(updatedPost)
            toast({
              title: "Image updated",
              description: "The post image has been updated from your gallery.",
            })
          }}
        />
      )}

      {/* Phase 8.1: Show profile gallery only if user has gallery access */}
      {showProfileGallery && feedData?.feed?.id && access?.hasGalleryAccess && (
        <FeedGallerySelector
          type="profile"
          feedId={feedData.feed.id}
          onClose={onCloseProfileGallery}
          onImageSelected={async () => {
            await onUpdate()
            toast({
              title: "Profile image updated",
              description: "Your profile image has been updated successfully.",
            })
          }}
        />
      )}
    </>
  )
}
