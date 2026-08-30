"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { FeedGallerySelector } from "@/components/feed-planner/feed-gallery-selector"
import { useFeedNav } from "@/components/feed-planner/feed-nav-context"
import { toast } from "@/hooks/use-toast"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { useAccessibleModal } from "./use-accessible-modal"
import type { CalendarPostTarget, OutputFormat } from "./types"

type CalendarFeed = {
  id: number
  title?: string | null
  brand_name?: string | null
  layout_type?: string | null
  period_month?: string | null
}

type CalendarPost = {
  id: number
  position: number
  image_url?: string | null
  preview_image_url?: string | null
  media_urls?: unknown
  caption?: string | null
  content_pillar?: string | null
  scheduled_at?: string | null
  is_posted?: boolean | null
  post_type?: string | null
  pro_mode_type?: string | null
  ai_image_id?: number | null
}

type CalendarFeedResponse = {
  exists?: boolean
  feed?: CalendarFeed
  posts?: CalendarPost[]
}

type CalendarPlan = {
  id: number
  title: string
  layout_type: string
  image_count: number
  post_count: number
}

function imageUrlForPost(post: CalendarPost): string | null {
  return post.image_url || post.preview_image_url || null
}

function mediaUrlsForPost(post: CalendarPost): string[] {
  const urls = Array.isArray(post.media_urls) ? post.media_urls : []
  const safe = urls.filter(
    (url: unknown): url is string => typeof url === "string" && url.startsWith("https://")
  )
  const imageUrl = imageUrlForPost(post)
  return safe.length > 0 ? safe : imageUrl ? [imageUrl] : []
}

function plannedFormatForPost(post: CalendarPost): OutputFormat {
  if (post.pro_mode_type === "carousel-slides") return "carousel"
  if (post.pro_mode_type === "reel-cover") return "reel-cover"
  return "photo"
}

function postState(post: CalendarPost): "draft" | "ready" | "posted" {
  if (post.is_posted) return "posted"
  if (imageUrlForPost(post) && post.caption?.trim()) return "ready"
  return "draft"
}

function dateValue(value?: string | null): string {
  if (!value) return ""
  return value.slice(0, 10)
}

function feedTitle(feed?: CalendarFeed | null): string {
  return feed?.title || feed?.brand_name || "My grid"
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => ({}))
  return new Error(typeof body?.error === "string" ? body.error : fallback)
}

function GridTile({
  post,
  onOpen,
  isApplying,
}: {
  post: CalendarPost
  onOpen: () => void
  isApplying: boolean
}) {
  const imageUrl = imageUrlForPost(post)
  const state = postState(post)
  const stateLabel = state === "posted" ? "Posted" : state === "ready" ? "Ready" : "Draft"

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={isApplying}
      aria-label={`${imageUrl ? "Edit" : "Add photo to"} post ${post.position}, ${stateLabel}`}
      className="group relative aspect-square min-w-0 overflow-hidden bg-[color:var(--suite-smoke)] text-left outline-none transition-opacity hover:opacity-90 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--suite-night)] disabled:cursor-wait"
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 640px) 33vw, 260px"
        />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[color:var(--suite-slate)]">
          {isApplying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          <span className="hidden text-[9px] uppercase tracking-[0.18em] sm:block">Add photo</span>
        </span>
      )}
      <span
        className={`absolute bottom-2 left-2 h-2 w-2 rounded-full border border-white/70 shadow-sm ${
          state === "posted"
            ? "bg-white"
            : state === "ready"
              ? "bg-[color:var(--suite-night)]"
              : "bg-white/45"
        }`}
      >
        <span className="sr-only">{stateLabel}</span>
      </span>
      <span className="absolute right-2 top-2 text-[9px] font-semibold tabular-nums text-white opacity-0 drop-shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {post.position}
      </span>
    </button>
  )
}

function PostEditor({
  feed,
  post,
  posts,
  onClose,
  onPostChanged,
  onMove,
  onAskMaya,
}: {
  feed: CalendarFeed
  post: CalendarPost
  posts: CalendarPost[]
  onClose: () => void
  onPostChanged: (post: CalendarPost) => void
  onMove: (postId: number, direction: -1 | 1) => Promise<void>
  onAskMaya: (post: CalendarPost) => void
}) {
  const [caption, setCaption] = useState(post.caption || "")
  const [scheduledAt, setScheduledAt] = useState(dateValue(post.scheduled_at))
  const [isPosted, setIsPosted] = useState(Boolean(post.is_posted))
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isRemoveArmed, setIsRemoveArmed] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const draftPostIdRef = useRef(post.id)
  const captionDirtyRef = useRef(false)
  const scheduledAtDirtyRef = useRef(false)
  const postedDirtyRef = useRef(false)
  const { dialogRef, initialFocusRef } = useAccessibleModal(!showGallery, onClose)
  const imageUrl = imageUrlForPost(post)
  const currentIndex = posts.findIndex(item => Number(item.id) === Number(post.id))
  const canMoveEarlier = currentIndex > 0
  const canMoveLater = currentIndex >= 0 && currentIndex < posts.length - 1
  const derivedState = isPosted ? "Posted" : imageUrl && caption.trim() ? "Ready" : "Draft"

  useEffect(() => {
    if (draftPostIdRef.current !== post.id) {
      draftPostIdRef.current = post.id
      captionDirtyRef.current = false
      scheduledAtDirtyRef.current = false
      postedDirtyRef.current = false
      setCaption(post.caption || "")
      setScheduledAt(dateValue(post.scheduled_at))
      setIsPosted(Boolean(post.is_posted))
      setIsRemoveArmed(false)
      return
    }

    if (!captionDirtyRef.current) setCaption(post.caption || "")
    if (!scheduledAtDirtyRef.current) setScheduledAt(dateValue(post.scheduled_at))
    if (!postedDirtyRef.current) setIsPosted(Boolean(post.is_posted))
  }, [post.caption, post.id, post.is_posted, post.scheduled_at])

  useEffect(() => {
    if (!isRemoveArmed) return
    const timeout = window.setTimeout(() => setIsRemoveArmed(false), 4_000)
    return () => window.clearTimeout(timeout)
  }, [isRemoveArmed])

  const save = async () => {
    if (caption.length > 2200) {
      toast({
        title: "Caption is too long",
        description: "Instagram captions can be at most 2,200 characters.",
        variant: "destructive",
      })
      return
    }
    setIsSaving(true)
    try {
      const detailsResponse = await fetch(`/api/feed/${feed.id}/update-post`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          postId: post.id,
          caption: caption.trim(),
          scheduledAt: scheduledAt || null,
        }),
      })
      if (!detailsResponse.ok)
        throw await responseError(detailsResponse, "This post could not be saved.")
      const details = await detailsResponse.json()
      let updatedPost = { ...post, ...(details.post || {}) } as CalendarPost

      if (Boolean(post.is_posted) !== isPosted) {
        const postedResponse = await fetch(`/api/feed/${feed.id}/mark-posted`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ postId: post.id, isPosted }),
        })
        if (!postedResponse.ok)
          throw await responseError(postedResponse, "The post status could not be saved.")
        const posted = await postedResponse.json()
        updatedPost = { ...updatedPost, ...(posted.post || {}), is_posted: isPosted }
      }

      onPostChanged(updatedPost)
      if (imageUrlForPost(updatedPost) && updatedPost.caption?.trim() && !updatedPost.is_posted) {
        void trackAnalyticsEvent({
          event: "calendar_post_ready",
          properties: { feedId: feed.id, postId: post.id, source: "post_editor" },
        })
      }
      toast({ title: "Post saved", description: "Your grid is up to date." })
      onClose()
    } catch (error) {
      toast({
        title: "Could not save this post",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const removePhoto = async () => {
    if (!imageUrl || isRemoving) return
    setIsRemoveArmed(false)
    setIsRemoving(true)
    try {
      const response = await fetch(`/api/feed/${feed.id}/remove-post-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id }),
      })
      if (!response.ok) throw await responseError(response, "The photo could not be removed.")
      const result = await response.json()
      onPostChanged(result.post || { ...post, image_url: null, media_urls: [] })
      toast({ title: "Photo removed", description: "It is still available in your Gallery." })
    } catch (error) {
      toast({
        title: "Could not remove the photo",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRemoving(false)
    }
  }

  const requestRemovePhoto = () => {
    if (!imageUrl || isRemoving) return
    if (!isRemoveArmed) {
      setIsRemoveArmed(true)
      return
    }
    void removePhoto()
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-[3px]" onMouseDown={onClose}>
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-post-editor-title"
          onMouseDown={event => event.stopPropagation()}
          className="absolute inset-x-0 bottom-0 flex max-h-[94dvh] flex-col overflow-hidden rounded-t-[8px] bg-[color:var(--suite-paper)] text-[color:var(--suite-night)] shadow-[0_-24px_80px_rgba(0,0,0,0.25)] sm:inset-y-5 sm:left-auto sm:right-5 sm:w-[min(92vw,720px)] sm:max-h-none sm:rounded-[8px]"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--suite-steel)] px-4 py-3 sm:px-6">
            <div>
              <p className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--suite-slate)]">
                Post {post.position} · {derivedState}
              </p>
              <h2
                id="calendar-post-editor-title"
                className="font-serif text-[26px] font-light leading-tight"
              >
                Finish this post
              </h2>
            </div>
            <button
              ref={initialFocusRef}
              type="button"
              onClick={onClose}
              aria-label="Close post editor"
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[color:var(--suite-smoke)]"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid min-h-full lg:grid-cols-[minmax(280px,0.92fr)_minmax(300px,1.08fr)]">
              <div className="flex min-h-[300px] flex-col border-b border-[color:var(--suite-steel)] bg-[color:var(--suite-smoke)] lg:border-b-0 lg:border-r">
                <div className="relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`Post ${post.position} preview`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 380px"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 px-8 text-center text-[color:var(--suite-slate)]">
                      <ImagePlus className="h-7 w-7" />
                      <p className="max-w-[18rem] text-sm leading-relaxed">
                        Choose a photo from your Gallery or upload one from your device.
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid shrink-0 grid-cols-2 border-t border-[color:var(--suite-steel)] bg-[color:var(--suite-paper)]">
                  <button
                    type="button"
                    onClick={() => setShowGallery(true)}
                    className="min-h-12 border-r border-[color:var(--suite-steel)] px-3 text-[10px] uppercase tracking-[0.15em] hover:bg-white"
                  >
                    {imageUrl ? "Change photo" : "Choose photo"}
                  </button>
                  <button
                    type="button"
                    onClick={requestRemovePhoto}
                    disabled={!imageUrl || isRemoving}
                    className="flex min-h-12 items-center justify-center gap-2 px-3 text-[10px] uppercase tracking-[0.15em] hover:bg-white disabled:opacity-35"
                  >
                    {isRemoving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {isRemoveArmed ? "Confirm remove" : "Remove"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-5 p-4 sm:p-6">
                <label className="block">
                  <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-[color:var(--suite-slate)]">
                    Caption
                  </span>
                  <textarea
                    value={caption}
                    onChange={event => {
                      captionDirtyRef.current = true
                      setCaption(event.target.value)
                    }}
                    rows={7}
                    maxLength={2200}
                    placeholder="Write what you want to say…"
                    className="w-full resize-y rounded-[3px] border border-[color:var(--suite-steel)] bg-white px-3 py-3 text-[14px] leading-relaxed outline-none focus:border-[color:var(--suite-night)] focus:ring-1 focus:ring-[color:var(--suite-night)]"
                  />
                  <span className="mt-1 block text-right text-[10px] tabular-nums text-[color:var(--suite-slate)]">
                    {caption.length}/2,200
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-[color:var(--suite-slate)]">
                    Planned date · optional
                  </span>
                  <input
                    type="date"
                    value={scheduledAt}
                    onChange={event => {
                      scheduledAtDirtyRef.current = true
                      setScheduledAt(event.target.value)
                    }}
                    className="min-h-11 w-full rounded-[3px] border border-[color:var(--suite-steel)] bg-white px-3 text-[14px] outline-none focus:border-[color:var(--suite-night)] focus:ring-1 focus:ring-[color:var(--suite-night)]"
                  />
                </label>

                <div>
                  <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-[color:var(--suite-slate)]">
                    Status
                  </span>
                  <div className="grid grid-cols-3 overflow-hidden rounded-[3px] border border-[color:var(--suite-steel)] bg-white text-center text-[10px] uppercase tracking-[0.12em]">
                    {(["Draft", "Ready", "Posted"] as const).map(status => {
                      const selected = derivedState === status
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            if (status !== "Posted") return
                            postedDirtyRef.current = true
                            setIsPosted(value => !value)
                          }}
                          disabled={status !== "Posted"}
                          aria-pressed={selected}
                          className={`min-h-11 border-r border-[color:var(--suite-steel)] last:border-r-0 ${
                            selected
                              ? "bg-[color:var(--suite-night)] text-white"
                              : "text-[color:var(--suite-slate)]"
                          } disabled:cursor-default`}
                        >
                          {status}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--suite-slate)]">
                    Ready appears when the post has both a photo and caption. Tap Posted when it is
                    live.
                  </p>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void onMove(post.id, -1)}
                    disabled={!canMoveEarlier}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-[color:var(--suite-steel)] bg-white text-[10px] uppercase tracking-[0.13em] hover:border-[color:var(--suite-night)] disabled:opacity-35"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Earlier
                  </button>
                  <button
                    type="button"
                    onClick={() => void onMove(post.id, 1)}
                    disabled={!canMoveLater}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-[color:var(--suite-steel)] bg-white text-[10px] uppercase tracking-[0.13em] hover:border-[color:var(--suite-night)] disabled:opacity-35"
                  >
                    Later <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onAskMaya(post)}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-[color:var(--suite-night)] px-4 text-[10px] uppercase tracking-[0.15em] hover:bg-white"
                >
                  <MessageCircle className="h-4 w-4" /> Ask Maya about this post
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={isSaving}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-[3px] bg-[color:var(--suite-night)] px-5 text-[10px] uppercase tracking-[0.17em] text-white hover:bg-[color:var(--suite-graphite)] disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save post
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showGallery ? (
        <FeedGallerySelector
          type="post"
          postId={post.id}
          feedId={feed.id}
          onClose={() => setShowGallery(false)}
          onImageSelected={updatedPost => {
            if (updatedPost) onPostChanged(updatedPost as CalendarPost)
          }}
        />
      ) : null}
    </>
  )
}

export function SuiteCalendar() {
  const feedNav = useFeedNav()
  const selectedFeedId = feedNav?.feedId ?? null
  const [feed, setFeed] = useState<CalendarFeed | null>(null)
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [plans, setPlans] = useState<CalendarPlan[]>([])
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasTrackedWorkspace = useRef(false)
  const feedRequestRef = useRef(0)

  const loadPlans = useCallback(async () => {
    const response = await fetch("/api/feed/list", { credentials: "include", cache: "no-store" })
    if (!response.ok) return
    const result = await response.json()
    setPlans(
      (Array.isArray(result.feeds) ? result.feeds : []).filter(
        (plan: CalendarPlan) => plan.layout_type !== "preview"
      )
    )
  }, [])

  const loadFeed = useCallback(async () => {
    const requestId = ++feedRequestRef.current
    setIsLoading(true)
    setError(null)
    try {
      const endpoint = selectedFeedId ? `/api/feed/${selectedFeedId}` : "/api/feed/latest"
      const response = await fetch(endpoint, { credentials: "include", cache: "no-store" })
      if (requestId !== feedRequestRef.current) return
      if (!response.ok) {
        if (selectedFeedId && response.status === 404) {
          feedNav?.navigateToFeed(null)
          return
        }
        throw await responseError(response, "Your calendar could not be loaded.")
      }
      const result = (await response.json()) as CalendarFeedResponse
      if (requestId !== feedRequestRef.current) return
      if (result.exists === false || !result.feed) {
        setFeed(null)
        setPosts([])
      } else {
        setFeed(result.feed)
        setPosts(
          (result.posts || [])
            .map(post => ({ ...post, id: Number(post.id), position: Number(post.position) }))
            .sort((a, b) => a.position - b.position)
        )
      }
      if (!hasTrackedWorkspace.current) {
        hasTrackedWorkspace.current = true
        void trackAnalyticsEvent({ event: "calendar_workspace_opened" })
      }
    } catch (loadError) {
      if (requestId === feedRequestRef.current) {
        setError(
          loadError instanceof Error ? loadError.message : "Your calendar could not be loaded."
        )
      }
    } finally {
      if (requestId === feedRequestRef.current) setIsLoading(false)
    }
  }, [feedNav, selectedFeedId])

  useEffect(() => {
    void Promise.all([loadFeed(), loadPlans()])
  }, [loadFeed, loadPlans])

  useEffect(() => {
    if (!feed || posts.length === 0 || !feedNav?.pendingSlotPosition) return
    const pendingPost = posts.find(post => post.position === feedNav.pendingSlotPosition)
    if (pendingPost) setSelectedPostId(pendingPost.id)
    feedNav.consumePendingSlot?.()
  }, [feed, feedNav, posts])

  const selectedPost = posts.find(post => post.id === selectedPostId) || null
  const readyCount = posts.filter(post => postState(post) === "ready").length
  const postedCount = posts.filter(post => postState(post) === "posted").length
  const filledCount = posts.filter(post => imageUrlForPost(post)).length

  const updatePost = useCallback((updatedPost: CalendarPost) => {
    setPosts(current =>
      current.map(post =>
        Number(post.id) === Number(updatedPost.id) ? { ...post, ...updatedPost } : post
      )
    )
  }, [])

  const createGrid = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const response = await fetch("/api/feed/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "My grid", directionMode: "maya" }),
      })
      if (!response.ok) throw await responseError(response, "A new grid could not be created.")
      const result = await response.json()
      const newFeedId = Number(result.feedId)
      if (!Number.isInteger(newFeedId)) throw new Error("A new grid could not be created.")
      await loadPlans()
      feedNav?.navigateToFeed(newFeedId, { openPosition: 1 })
    } catch (createError) {
      toast({
        title: "Could not create a new grid",
        description: createError instanceof Error ? createError.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const openPost = async (post: CalendarPost) => {
    const pendingImageUrl = feedNav?.pendingApplyImageUrl
    if (!pendingImageUrl || !feed) {
      setSelectedPostId(post.id)
      return
    }
    if (isApplying) return
    setIsApplying(true)
    try {
      const response = await fetch(`/api/feed/${feed.id}/replace-post-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id, imageUrl: pendingImageUrl }),
      })
      if (!response.ok) throw await responseError(response, "The photo could not be added.")
      const result = await response.json()
      if (result.post) updatePost(result.post as CalendarPost)
      feedNav.consumePendingApplyImage?.()
      void trackAnalyticsEvent({
        event: "calendar_photo_added",
        properties: { feedId: feed.id, postId: post.id, source: "gallery_handoff" },
      })
      toast({ title: "Photo added", description: `Added to post ${post.position}.` })
      setSelectedPostId(post.id)
    } catch (applyError) {
      toast({
        title: "Could not add the photo",
        description: applyError instanceof Error ? applyError.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsApplying(false)
    }
  }

  const movePost = async (postId: number, direction: -1 | 1) => {
    if (!feed) return
    const currentIndex = posts.findIndex(post => post.id === postId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= posts.length) return
    const reordered = [...posts]
    const current = reordered[currentIndex]
    const target = reordered[targetIndex]
    reordered[currentIndex] = { ...target, position: current.position }
    reordered[targetIndex] = { ...current, position: target.position }
    reordered.sort((a, b) => a.position - b.position)
    setPosts(reordered)
    try {
      const response = await fetch(`/api/feed/${feed.id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          postOrders: reordered.map(post => ({ postId: post.id, newPosition: post.position })),
        }),
      })
      if (!response.ok) throw await responseError(response, "The grid order could not be saved.")
    } catch (moveError) {
      await loadFeed()
      toast({
        title: "Could not move this post",
        description: moveError instanceof Error ? moveError.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const askMaya = (post: CalendarPost) => {
    if (!feed) return
    const target: CalendarPostTarget = {
      requestId: `calendar:${feed.id}:${post.id}`,
      feedId: feed.id,
      postId: post.id,
      position: post.position,
      caption: post.caption || null,
      contentPillar: post.content_pillar || null,
      scheduledAt: post.scheduled_at || null,
      plannedFormat: plannedFormatForPost(post),
      hasImage: Boolean(imageUrlForPost(post)),
      imageUrl: imageUrlForPost(post),
      mediaUrls: mediaUrlsForPost(post),
      aiImageId: Number.isInteger(post.ai_image_id) ? Number(post.ai_image_id) : null,
      feedTitle: feedTitle(feed),
      requestedAction: imageUrlForPost(post) ? "improve_caption" : "create",
    }
    setSelectedPostId(null)
    feedNav?.navigateToMaya?.(target)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[62dvh] items-center justify-center bg-[color:var(--suite-canvas)]">
        <Loader2 className="h-6 w-6 animate-spin text-[color:var(--suite-slate)]" />
        <span className="sr-only">Loading calendar</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[62dvh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <CalendarDays className="mb-5 h-7 w-7 text-[color:var(--suite-slate)]" />
        <h1 className="font-serif text-[34px] font-light">Your calendar needs a refresh.</h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--suite-slate)]">{error}</p>
        <button
          type="button"
          onClick={() => void loadFeed()}
          className="mt-6 min-h-11 rounded-[3px] bg-[color:var(--suite-night)] px-6 text-[10px] uppercase tracking-[0.17em] text-white"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!feed) {
    return (
      <main className="mx-auto w-full max-w-[860px] px-4 pb-28 pt-8 sm:px-8 sm:pt-14">
        <header className="border-t-[3px] border-[color:var(--suite-night)] pt-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--suite-slate)]">
            Calendar
          </p>
          <h1 className="mt-2 max-w-2xl font-serif text-[42px] font-light leading-[0.96] sm:text-[58px]">
            Build the grid you want to post.
          </h1>
          <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-[color:var(--suite-slate)]">
            Start with nine clear spaces. Add your own photos, write captions, and bring Maya in
            only when you want her help.
          </p>
        </header>
        <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden border border-[color:var(--suite-steel)] bg-[color:var(--suite-steel)]">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="aspect-square bg-[color:var(--suite-smoke)]" />
          ))}
        </div>
        <button
          type="button"
          onClick={() => void createGrid()}
          disabled={isCreating}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[3px] bg-[color:var(--suite-night)] px-6 text-[10px] uppercase tracking-[0.17em] text-white disabled:opacity-60 sm:w-auto"
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Start my grid
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[1080px] px-3 pb-28 pt-5 sm:px-8 sm:pt-9">
      <header className="border-t-[3px] border-[color:var(--suite-night)] pt-4 sm:pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.28em] text-[color:var(--suite-slate)]">
              Calendar · Plan to post
            </p>
            <h1 className="mt-1 truncate font-serif text-[34px] font-light leading-none sm:text-[46px]">
              {feedTitle(feed)}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void createGrid()}
            disabled={isCreating}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-[3px] bg-[color:var(--suite-night)] px-4 text-[9px] uppercase tracking-[0.15em] text-white disabled:opacity-60"
          >
            {isCreating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            New grid
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-[color:var(--suite-steel)] py-3">
          <label className="relative min-w-0 max-w-full">
            <span className="sr-only">Choose grid</span>
            <select
              value={feed.id}
              onChange={event => feedNav?.navigateToFeed(Number(event.target.value))}
              className="min-h-11 max-w-[66vw] appearance-none truncate rounded-[3px] border border-[color:var(--suite-steel)] bg-white py-2 pl-3 pr-9 text-[11px] font-medium text-[color:var(--suite-night)] outline-none focus:border-[color:var(--suite-night)] sm:max-w-xs"
            >
              {!plans.some(plan => Number(plan.id) === Number(feed.id)) ? (
                <option value={feed.id}>{feedTitle(feed)}</option>
              ) : null}
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--suite-slate)]" />
          </label>
          <p className="text-[10px] tabular-nums tracking-[0.04em] text-[color:var(--suite-slate)]">
            {filledCount}/{posts.length} photos · {readyCount} ready · {postedCount} posted
          </p>
        </div>
      </header>

      {feedNav?.pendingApplyImageUrl ? (
        <div className="mt-4 flex items-center gap-3 border-l-[3px] border-[color:var(--suite-night)] bg-white px-4 py-3 text-[12px] leading-relaxed">
          <ImagePlus className="h-4 w-4 shrink-0" />
          Tap the place in your grid where you want this Gallery photo.
        </div>
      ) : null}

      <section aria-label="Instagram grid" className="mt-5">
        <div className="grid grid-cols-3 gap-px overflow-hidden border border-[color:var(--suite-steel)] bg-[color:var(--suite-steel)] shadow-[0_18px_55px_rgba(24,24,27,0.08)]">
          {posts.map(post => (
            <GridTile
              key={post.id}
              post={post}
              isApplying={isApplying}
              onOpen={() => void openPost(post)}
            />
          ))}
        </div>
        <div className="mt-4 flex items-start justify-between gap-4">
          <p className="max-w-xl text-[12px] leading-relaxed text-[color:var(--suite-slate)]">
            Tap any space to add or finish a post. The editor shows the whole photo; the grid shows
            the Instagram crop.
          </p>
          <div className="hidden shrink-0 items-center gap-3 text-[9px] uppercase tracking-[0.13em] text-[color:var(--suite-slate)] sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white ring-1 ring-[color:var(--suite-steel)]" />{" "}
              Draft
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[color:var(--suite-night)]" /> Ready
            </span>
          </div>
        </div>
      </section>

      {selectedPost ? (
        <PostEditor
          feed={feed}
          post={selectedPost}
          posts={posts}
          onClose={() => setSelectedPostId(null)}
          onPostChanged={updatePost}
          onMove={movePost}
          onAskMaya={askMaya}
        />
      ) : null}
    </main>
  )
}
