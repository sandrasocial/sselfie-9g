"use client"

import { useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Loader2, X } from "lucide-react"
import { isPersonalStoryPosition } from "@/lib/feed-planner/caption-truth"

type CalendarPost = {
  id: number | string
  position?: number | null
  image_url?: string | null
  caption?: string | null
  prediction_id?: string | null
  generation_status?: string | null
}

interface CalendarBulkCreateProps {
  feedId: number
  posts: CalendarPost[]
  onRefresh?: () => void | Promise<void>
  onComplete: () => void | Promise<void>
}

type BulkError = { postId?: number; message: string }
type ImageProgress = "queued" | "generating" | "ready" | "failed"

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}))
  return String(data.details || data.message || data.error || fallback)
}

export function CalendarBulkCreate({
  feedId,
  posts,
  onRefresh,
  onComplete,
}: CalendarBulkCreateProps) {
  const [open, setOpen] = useState(false)
  const [includeImages, setIncludeImages] = useState(true)
  const [includeCaptions, setIncludeCaptions] = useState(true)
  const [running, setRunning] = useState(false)
  const [completedImages, setCompletedImages] = useState(0)
  const [imageProgress, setImageProgress] = useState<Record<number, ImageProgress>>({})
  const [errors, setErrors] = useState<BulkError[]>([])
  const runningRef = useRef(false)

  const missingImages = useMemo(
    () =>
      posts.filter(
        post => !post.image_url && !post.prediction_id && post.generation_status !== "generating"
      ),
    [posts]
  )
  const missingCaptions = useMemo(
    () => posts.filter(post => !String(post.caption || "").trim()),
    [posts]
  )
  const storyPosts = useMemo(
    () => missingCaptions.filter(post => isPersonalStoryPosition(Number(post.position))),
    [missingCaptions]
  )
  const autoDraftableCaptions = useMemo(
    () => missingCaptions.filter(post => !isPersonalStoryPosition(Number(post.position))),
    [missingCaptions]
  )

  const canCreate =
    (includeImages && missingImages.length > 0) ||
    (includeCaptions && autoDraftableCaptions.length > 0)

  const actionLabel = (() => {
    const parts: string[] = []
    if (includeImages && missingImages.length > 0) {
      parts.push(`${missingImages.length} ${missingImages.length === 1 ? "image" : "images"}`)
    }
    if (includeCaptions && autoDraftableCaptions.length > 0) {
      parts.push(
        `${autoDraftableCaptions.length} ${autoDraftableCaptions.length === 1 ? "caption" : "captions"}`
      )
    }
    if (parts.length === 0) return "Everything is ready"
    return `Create ${parts.join(" and ")}`
  })()

  const runBulkCreation = async () => {
    if (!canCreate || runningRef.current) return

    runningRef.current = true
    setRunning(true)
    setCompletedImages(0)
    setImageProgress(
      includeImages
        ? Object.fromEntries(missingImages.map(post => [Number(post.id), "queued" as const]))
        : {}
    )
    setErrors([])
    const nextErrors: BulkError[] = []

    try {
      if (includeCaptions && autoDraftableCaptions.length > 0) {
        try {
          const response = await fetch(`/api/feed/${feedId}/generate-captions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ mode: "missing_or_weak" }),
          })
          if (!response.ok) {
            nextErrors.push({
              message: await readError(response, "Captions could not be created."),
            })
          } else {
            await onRefresh?.()
          }
        } catch (error) {
          nextErrors.push({
            message: error instanceof Error ? error.message : "Captions could not be created.",
          })
        }
      }

      if (includeImages && missingImages.length > 0) {
        let nextIndex = 0
        let stopStarting = false

        const worker = async () => {
          while (!stopStarting) {
            const index = nextIndex++
            const post = missingImages[index]
            if (!post) return
            const postId = Number(post.id)
            setImageProgress(current => ({ ...current, [postId]: "generating" }))

            try {
              const response = await fetch(`/api/feed/${feedId}/generate-single`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ postId }),
              })
              if (!response.ok) {
                nextErrors.push({
                  postId,
                  message: await readError(response, `Post ${post.position || index + 1} failed.`),
                })
                setImageProgress(current => ({ ...current, [postId]: "failed" }))
                if (response.status === 402 || response.status === 429) stopStarting = true
              } else {
                setImageProgress(current => ({ ...current, [postId]: "ready" }))
                setCompletedImages(value => value + 1)
                await onRefresh?.()
              }
            } catch (error) {
              nextErrors.push({
                postId,
                message:
                  error instanceof Error ? error.message : "This image could not be created.",
              })
              setImageProgress(current => ({ ...current, [postId]: "failed" }))
            }
          }
        }

        await Promise.all(Array.from({ length: Math.min(2, missingImages.length) }, () => worker()))
        const unstarted = Math.max(0, missingImages.length - nextIndex)
        if (stopStarting && unstarted > 0) {
          setImageProgress(current =>
            Object.fromEntries(
              Object.entries(current).map(([postId, state]) => [
                postId,
                state === "queued" ? "failed" : state,
              ])
            ) as Record<number, ImageProgress>
          )
          nextErrors.unshift({
            message: `${unstarted} ${unstarted === 1 ? "image was" : "images were"} not started. Fix the issue below, then try again.`,
          })
        }
      }

      try {
        await onComplete()
      } catch (error) {
        nextErrors.push({
          message: error instanceof Error ? error.message : "The Calendar could not refresh.",
        })
      }
    } finally {
      setErrors(nextErrors)
      runningRef.current = false
      setRunning(false)
    }
  }

  return (
    <section
      aria-label="Create Calendar posts"
      className="border-b border-[color:var(--calendar-stone-4)]/50 bg-[color:var(--app-surface)] px-4 pb-4 sm:px-6"
    >
      <div className="flex items-center justify-between gap-3 border-t border-[color:var(--calendar-stone-4)]/40 pt-3">
        <p className="text-[12px] leading-relaxed text-[color:var(--app-text-secondary)]">
          Tap any post to create just that one.
        </p>
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--calendar-stone-4)] bg-white px-4 text-[12px] font-medium text-[color:var(--app-text-primary)] shadow-[0_1px_2px_rgba(13,14,16,0.04)] transition-colors hover:bg-[color:var(--calendar-stone-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-text-primary)]"
        >
          Create in bulk
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open ? (
        <div className="mt-3 rounded-[16px] border border-[color:var(--calendar-stone-4)] bg-white p-3 shadow-[0_10px_30px_rgba(13,14,16,0.06)] sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-[color:var(--app-text-primary)]">
                Create several posts at once
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[color:var(--app-text-secondary)]">
                You stay in control. Choose what Maya should finish before any credits are used.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={running}
              aria-label="Close bulk creation"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[color:var(--app-text-secondary)] hover:bg-[color:var(--calendar-stone-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-text-primary)] disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[12px] border border-[color:var(--calendar-stone-4)] px-3 py-2.5">
              <input
                type="checkbox"
                aria-label="Images"
                checked={includeImages}
                onChange={event => setIncludeImages(event.target.checked)}
                disabled={running || missingImages.length === 0}
                className="h-4 w-4 accent-[color:var(--app-text-primary)]"
              />
              <span>
                <span className="block text-[12px] font-medium text-[color:var(--app-text-primary)]">
                  Images
                </span>
                <span className="block text-[10px] text-[color:var(--app-text-secondary)]">
                  {missingImages.length} remaining · credits apply per image
                </span>
              </span>
            </label>
            <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[12px] border border-[color:var(--calendar-stone-4)] px-3 py-2.5">
              <input
                type="checkbox"
                aria-label="Captions"
                checked={includeCaptions}
                onChange={event => setIncludeCaptions(event.target.checked)}
                disabled={running || autoDraftableCaptions.length === 0}
                className="h-4 w-4 accent-[color:var(--app-text-primary)]"
              />
              <span>
                <span className="block text-[12px] font-medium text-[color:var(--app-text-primary)]">
                  Captions
                </span>
                <span className="block text-[10px] text-[color:var(--app-text-secondary)]">
                  {autoDraftableCaptions.length} can be drafted
                </span>
              </span>
            </label>
          </div>

          {storyPosts.length > 0 ? (
            <p className="mt-3 rounded-[12px] bg-[color:var(--calendar-stone-1)] px-3 py-2.5 text-[11px] leading-relaxed text-[color:var(--app-text-secondary)]">
              {storyPosts.length} personal{" "}
              {storyPosts.length === 1 ? "caption needs" : "captions need"} your real story. Open{" "}
              {storyPosts.length === 1 ? "that post" : "each post"} and tell Maya what happened.
            </p>
          ) : null}

          {running && includeImages ? (
            <div
              className="mt-3"
              role="status"
              aria-label="Bulk creation progress"
              aria-live="polite"
            >
              <div className="mb-1.5 flex items-center justify-between text-[10px] text-[color:var(--app-text-secondary)]">
                <span>Maya is creating your Calendar</span>
                <span>
                  {completedImages} of {missingImages.length} images
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--calendar-stone-2)]">
                <div
                  className="h-full rounded-full bg-[color:var(--app-text-primary)] transition-[width] duration-500"
                  style={{
                    width: `${missingImages.length ? (completedImages / missingImages.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {Object.keys(imageProgress).length > 0 ? (
            <ul
              aria-label="Bulk image progress"
              className="mt-3 grid gap-1.5 sm:grid-cols-2"
            >
              {missingImages.map(post => {
                const postId = Number(post.id)
                const state = imageProgress[postId]
                if (!state) return null
                const label =
                  state === "generating"
                    ? "Creating"
                    : state === "ready"
                      ? "Ready"
                      : state === "failed"
                        ? "Failed"
                        : "Queued"
                return (
                  <li
                    key={postId}
                    role="status"
                    aria-label={`Post ${post.position ?? postId} image status: ${label}`}
                    className="flex min-h-11 items-center justify-between rounded-[10px] bg-[color:var(--calendar-stone-1)] px-3 text-[11px] text-[color:var(--app-text-primary)]"
                  >
                    <span>Post {post.position ?? postId}</span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] text-[color:var(--app-text-secondary)]">
                      {state === "generating" ? (
                        <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
                      ) : state === "queued" ? (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
                      ) : null}
                      {label}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {errors.length > 0 ? (
            <div
              className="mt-3 rounded-[10px] border border-[color:var(--calendar-stone-4)] bg-[color:var(--calendar-stone-1)] px-3 py-2 text-[11px] leading-relaxed text-[color:var(--app-text-primary)]"
              role="alert"
            >
              {errors.length === 1
                ? errors[0].message
                : `Some items need another try. ${errors[0].message}`}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void runBulkCreation()}
            disabled={!canCreate || running}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--app-btn-primary-bg)] px-4 text-[12px] font-medium text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-text-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : canCreate ? (
              actionLabel
            ) : storyPosts.length > 0 ? (
              "Stories need you"
            ) : (
              <>
                <Check className="h-4 w-4" />
                Everything is ready
              </>
            )}
          </button>
        </div>
      ) : null}
    </section>
  )
}
