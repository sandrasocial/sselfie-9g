"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { CalendarDays, ImageIcon, RefreshCw, Upload } from "lucide-react"

import type {
  ContentBoardData,
  ContentPlannerSlot,
  ContentPlannerStatus,
  RecentInstagramPost,
} from "@/lib/admin/content-planner"

type Props = {
  initialPosts: RecentInstagramPost[]
  initialSlots: ContentPlannerSlot[]
  instagramSource: ContentBoardData["instagramSource"]
  plannerSource: ContentBoardData["plannerSource"]
}

const STATUS_OPTIONS: ContentPlannerStatus[] = ["idea", "drafted", "ready", "posted"]

function formatPostDate(value: string) {
  if (!value) return "No date stored"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function captionPreview(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim()
  return cleaned || "No caption preview stored yet."
}

function slotHasContent(slot: ContentPlannerSlot) {
  return Boolean(slot.coverUrl || slot.title || slot.hook || slot.captionDraft)
}

function makeRepurposedSlot(
  post: RecentInstagramPost,
  existingSlot: ContentPlannerSlot
): ContentPlannerSlot {
  return {
    ...existingSlot,
    coverUrl: existingSlot.coverUrl || post.thumbnailUrl || post.mediaUrl,
    title: existingSlot.title || post.signalLabel,
    hook: existingSlot.hook || captionPreview(post.caption).slice(0, 140),
    captionDraft: existingSlot.captionDraft || post.caption,
    cta: existingSlot.cta || "Open the free preview",
    offerBridge: existingSlot.offerBridge || "Free preview to Vault",
    status: existingSlot.status === "posted" ? "drafted" : existingSlot.status,
  }
}

function VisualFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[180px] items-end bg-[linear-gradient(145deg,var(--ss-white)_0%,var(--ss-seasalt)_54%,rgba(197,198,200,.62)_100%)] p-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
          {label}
        </p>
        <p className="mt-2 max-w-[12rem] text-sm leading-6 text-[color:var(--ss-davy)]">
          Add a cover image to make this slot visual.
        </p>
      </div>
    </div>
  )
}

export function MorningBoardVisualPlanner({
  initialPosts,
  initialSlots,
  instagramSource,
  plannerSource,
}: Props) {
  const [posts, setPosts] = useState(initialPosts)
  const [slots, setSlots] = useState(initialSlots)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [source, setSource] = useState(instagramSource)
  const [statusMessage, setStatusMessage] = useState("")
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedSlot = slots[selectedIndex] || slots[0]
  const filledSlots = useMemo(() => slots.filter(slotHasContent).length, [slots])

  function updateSlot(index: number, patch: Partial<ContentPlannerSlot>) {
    setSlots(current =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot))
    )
  }

  function markImageFailed(src: string) {
    setFailedImages(current => ({ ...current, [src]: true }))
  }

  function repurposePost(post: RecentInstagramPost) {
    const targetIndex = slots.findIndex(slot => !slotHasContent(slot))
    const index = targetIndex >= 0 ? targetIndex : selectedIndex
    setSlots(current =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? makeRepurposedSlot(post, slot) : slot
      )
    )
    setSelectedIndex(index)
    setStatusMessage("Repurpose note added to the planner. Save when it feels right.")
  }

  function savePlanner() {
    startTransition(async () => {
      setStatusMessage("Saving planner...")
      const response = await fetch("/api/admin/content-planner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      })
      const data = (await response.json()) as { slots?: ContentPlannerSlot[]; error?: string }

      if (!response.ok || !data.slots) {
        setStatusMessage(data.error || "Planner save failed.")
        return
      }

      setSlots(data.slots)
      setStatusMessage("Planner saved.")
    })
  }

  function refreshInstagram() {
    startTransition(async () => {
      setStatusMessage("Refreshing Instagram posts...")
      const refreshResponse = await fetch("/api/admin/content-planner/refresh-instagram", {
        method: "POST",
      })
      const refreshData = (await refreshResponse.json()) as { synced?: number; error?: string }

      if (!refreshResponse.ok) {
        setStatusMessage(refreshData.error || "Instagram refresh failed.")
        return
      }

      const boardResponse = await fetch("/api/admin/content-planner", { method: "GET" })
      const boardData = (await boardResponse.json()) as ContentBoardData
      setPosts(boardData.recentPosts)
      setSource(boardData.instagramSource)
      setStatusMessage(`Instagram refreshed. ${refreshData.synced || 0} posts synced.`)
    })
  }

  async function uploadCover(file: File) {
    setStatusMessage("Uploading cover...")
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/api/admin/content-planner/upload", {
      method: "POST",
      body: formData,
    })
    const data = (await response.json()) as { url?: string; error?: string }

    if (!response.ok || !data.url) {
      setStatusMessage(data.error || "Cover upload failed.")
      return
    }

    updateSlot(selectedIndex, { coverUrl: data.url })
    setStatusMessage("Cover uploaded. Save the planner when ready.")
  }

  return (
    <section className="mb-10 grid gap-4 lg:grid-cols-[1fr_.86fr]">
      <div className="border border-[rgba(197,198,200,.38)] bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ss-gray)]">
              Creator direction
            </p>
            <h2 className="mt-2 font-['Times_New_Roman'] text-2xl font-light uppercase tracking-[0.18em] text-[color:var(--ss-night)] sm:text-3xl">
              Today&apos;s Content Board
            </h2>
          </div>
          <button
            type="button"
            onClick={refreshInstagram}
            disabled={isPending}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-[rgba(197,198,200,.65)] bg-[color:var(--ss-seasalt)] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ss-raisin)] transition-colors hover:border-[color:var(--ss-night)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh IG
          </button>
        </div>

        {posts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {posts.slice(0, 6).map(post => (
              <article
                key={post.instagramPostId || post.id}
                className="border border-[rgba(197,198,200,.35)] bg-[color:var(--ss-seasalt)]"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-white">
                  {(post.thumbnailUrl || post.mediaUrl) &&
                  !failedImages[post.thumbnailUrl || post.mediaUrl] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnailUrl || post.mediaUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={() => markImageFailed(post.thumbnailUrl || post.mediaUrl)}
                    />
                  ) : (
                    <VisualFallback label="Instagram post" />
                  )}
                  <div className="absolute left-3 top-3 bg-white/90 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[color:var(--ss-night)]">
                    {post.signalLabel}
                  </div>
                </div>
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-[color:var(--ss-gray)]">
                    <span>{formatPostDate(post.postedAt)}</span>
                    <span>{post.postType || "post"}</span>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-[color:var(--ss-davy)]">
                    {captionPreview(post.caption)}
                  </p>
                  <p className="mt-3 text-xs text-[color:var(--ss-gray)]">
                    {post.likes} likes · {post.comments} comments · {post.saves} saves
                  </p>
                  <button
                    type="button"
                    onClick={() => repurposePost(post)}
                    className="mt-4 min-h-[40px] border border-[rgba(197,198,200,.65)] bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--ss-night)] hover:border-[color:var(--ss-night)]"
                  >
                    Repurpose this
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[rgba(197,198,200,.7)] bg-[color:var(--ss-seasalt)] p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {["Recent post", "Visual signal", "Repurpose idea"].map(label => (
                <div
                  key={label}
                  className="aspect-[4/5] border border-[rgba(197,198,200,.35)] bg-white"
                >
                  <VisualFallback label={label} />
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-[color:var(--ss-davy)]">
              No Instagram thumbnails are stored yet. Use Refresh IG after the Graph connection is
              healthy, or keep planning with manual covers below.
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[color:var(--ss-gray)]">
          <span>
            Instagram source: {source === "instagram_posts" ? "live database thumbnails" : source}
          </span>
          {statusMessage && <span>{statusMessage}</span>}
        </div>
      </div>

      <div className="border border-[rgba(197,198,200,.38)] bg-white p-5 sm:p-6">
        <div className="mb-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ss-gray)]">
            Feed preview
          </p>
          <h2 className="mt-2 font-['Times_New_Roman'] text-2xl font-light uppercase tracking-[0.18em] text-[color:var(--ss-night)] sm:text-3xl">
            3x3 Planner
          </h2>
          <p className="mt-3 text-xs leading-6 text-[color:var(--ss-gray)]">
            {filledSlots}/9 planned ·{" "}
            {plannerSource === "content_calendars" ? "saved in content calendars" : "draft board"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot, index) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`aspect-square overflow-hidden border bg-white text-left transition-colors ${
                selectedIndex === index
                  ? "border-[color:var(--ss-night)]"
                  : "border-[rgba(197,198,200,.4)] hover:border-[color:var(--ss-gray)]"
              }`}
            >
              {slot.coverUrl && !failedImages[slot.coverUrl] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slot.coverUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => markImageFailed(slot.coverUrl)}
                />
              ) : (
                <div className="flex h-full flex-col justify-between bg-[color:var(--ss-seasalt)] p-2">
                  <ImageIcon className="h-4 w-4 text-[color:var(--ss-gray)]" />
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.12em] text-[color:var(--ss-gray)]">
                      Slot {index + 1}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[color:var(--ss-davy)]">
                      {slot.title || "Add idea"}
                    </p>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-5 border-t border-[rgba(197,198,200,.35)] pt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
              Edit slot {selectedIndex + 1}
            </p>
            <button
              type="button"
              onClick={savePlanner}
              disabled={isPending}
              className="min-h-[40px] border border-[color:var(--ss-night)] bg-[color:var(--ss-night)] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--ss-seasalt)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Plan
            </button>
          </div>

          <div className="space-y-3">
            <input
              value={selectedSlot.coverUrl}
              onChange={event => updateSlot(selectedIndex, { coverUrl: event.target.value })}
              placeholder="Cover image URL"
              className="min-h-[42px] w-full border border-[rgba(197,198,200,.55)] bg-[color:var(--ss-seasalt)] px-3 text-sm text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) void uploadCover(file)
                event.target.value = ""
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-[42px] items-center gap-2 border border-[rgba(197,198,200,.65)] bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--ss-night)] hover:border-[color:var(--ss-night)]"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Cover
            </button>
            <input
              value={selectedSlot.title}
              onChange={event => updateSlot(selectedIndex, { title: event.target.value })}
              placeholder="Title / post idea"
              className="min-h-[42px] w-full border border-[rgba(197,198,200,.55)] bg-white px-3 text-sm text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]"
            />
            <input
              value={selectedSlot.hook}
              onChange={event => updateSlot(selectedIndex, { hook: event.target.value })}
              placeholder="Hook"
              className="min-h-[42px] w-full border border-[rgba(197,198,200,.55)] bg-white px-3 text-sm text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]"
            />
            <textarea
              value={selectedSlot.captionDraft}
              onChange={event => updateSlot(selectedIndex, { captionDraft: event.target.value })}
              placeholder="Caption draft"
              rows={3}
              className="w-full border border-[rgba(197,198,200,.55)] bg-white px-3 py-3 text-sm text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={selectedSlot.cta}
                onChange={event => updateSlot(selectedIndex, { cta: event.target.value })}
                placeholder="CTA"
                className="min-h-[42px] border border-[rgba(197,198,200,.55)] bg-white px-3 text-sm text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]"
              />
              <input
                value={selectedSlot.offerBridge}
                onChange={event => updateSlot(selectedIndex, { offerBridge: event.target.value })}
                placeholder="Offer bridge"
                className="min-h-[42px] border border-[rgba(197,198,200,.55)] bg-white px-3 text-sm text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="relative block">
                <select
                  value={selectedSlot.status}
                  onChange={event =>
                    updateSlot(selectedIndex, {
                      status: event.target.value as ContentPlannerStatus,
                    })
                  }
                  className="min-h-[42px] w-full appearance-none border border-[rgba(197,198,200,.55)] bg-white px-3 text-sm capitalize text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="relative block">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ss-gray)]" />
                <input
                  type="date"
                  value={selectedSlot.scheduledDate}
                  onChange={event =>
                    updateSlot(selectedIndex, { scheduledDate: event.target.value })
                  }
                  className="min-h-[42px] w-full border border-[rgba(197,198,200,.55)] bg-white pl-10 pr-3 text-sm text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
