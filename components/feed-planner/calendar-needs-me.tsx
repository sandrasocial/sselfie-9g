"use client"

import { isPersonalStoryPosition } from "@/lib/feed-planner/caption-truth"

interface CalendarNeedsMeProps {
  posts: any[]
  onSelectPost: (post: any) => void
  hasVisualDirection?: boolean
  hasContentContext?: boolean
  onChooseVisualDirection?: () => void
  onOpenContentContext?: () => void
}

export function CalendarNeedsMe({
  posts,
  onSelectPost,
  hasVisualDirection = false,
  hasContentContext = false,
  onChooseVisualDirection,
  onOpenContentContext,
}: CalendarNeedsMeProps) {
  const untouched = Boolean(
    posts.length && posts.every(post => !post.image_url && !post.caption?.trim())
  )
  const ready = posts.filter(post => Boolean(post.image_url && post.caption?.trim())).length
  const creating = posts.filter(
    post => !post.image_url && (post.prediction_id || post.generation_status === "generating")
  ).length
  const needsPhoto = posts.filter(
    post =>
      !post.image_url &&
      post.caption?.trim() &&
      !post.prediction_id &&
      post.generation_status !== "generating"
  )
  const needsStory = posts.filter(
    post => !post.caption?.trim() && isPersonalStoryPosition(Number(post.position))
  )
  const needsCaption = posts.filter(
    post => !post.caption?.trim() && !isPersonalStoryPosition(Number(post.position))
  )
  const next = untouched
    ? null
    : (needsStory[0] ?? needsPhoto[0] ?? needsCaption.find(post => !post.prediction_id))

  return (
    <section
      aria-label="What needs me"
      className="border-b border-[color:var(--calendar-stone-4)]/50 bg-[color:var(--app-surface)] px-4 py-3 sm:px-6"
    >
      {untouched ? (
        <p className="text-[11px] text-[color:var(--app-text-secondary)]">
          {hasVisualDirection
            ? hasContentContext
              ? "Ready to create"
              : "Visual direction ready"
            : "New grid"}{" "}
          · {posts.length} empty posts
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--app-text-secondary)]">
          <span>
            <strong className="font-medium text-[color:var(--app-text-primary)]">{ready}</strong>{" "}
            {ready === 1 ? "post ready" : "posts ready"}
          </span>
          <span>
            <strong className="font-medium text-[color:var(--app-text-primary)]">
              {needsPhoto.length}
            </strong>{" "}
            {needsPhoto.length === 1 ? "needs a photo" : "need a photo"}
          </span>
          <span>
            <strong className="font-medium text-[color:var(--app-text-primary)]">
              {needsCaption.length}
            </strong>{" "}
            {needsCaption.length === 1 ? "needs a caption" : "need a caption"}
          </span>
          {needsStory.length > 0 ? (
            <span>
              <strong className="font-medium text-[color:var(--app-text-primary)]">
                {needsStory.length}
              </strong>{" "}
              {needsStory.length === 1 ? "needs your story" : "need your stories"}
            </span>
          ) : null}
          {creating > 0 ? (
            <span>
              Maya is creating{" "}
              <strong className="font-medium text-[color:var(--app-text-primary)]">
                {creating}
              </strong>{" "}
              {creating === 1 ? "image" : "images"}
            </span>
          ) : null}
        </div>
      )}
      {untouched ? (
        <div className="mt-2 flex flex-col gap-2 rounded-[10px] bg-white px-3 py-3 shadow-[0_1px_2px_rgba(13,14,16,0.05)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-relaxed text-[color:var(--app-text-primary)]">
            {!hasVisualDirection
              ? "Choose how the grid should feel first. Maya will use that direction for every post."
              : !hasContentContext
                ? "Tell Maya what you do, who you help and what this month needs to do. She won’t make up your story."
                : "Your visual direction and content context are ready. Open post 1 to shape it with Maya, or create images and captions in bulk."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!hasVisualDirection) onChooseVisualDirection?.()
              else if (!hasContentContext) onOpenContentContext?.()
              else if (posts[0]) onSelectPost(posts[0])
            }}
            className="min-h-11 shrink-0 rounded-full bg-[color:var(--app-btn-primary-bg)] px-4 text-[11px] font-medium text-[color:var(--app-btn-primary-text)]"
          >
            {!hasVisualDirection
              ? "Choose visual direction"
              : !hasContentContext
                ? "Add content context"
                : "Open post 1"}
          </button>
        </div>
      ) : next ? (
        <button
          type="button"
          onClick={() => onSelectPost(next)}
          className="mt-2 min-h-11 w-full rounded-[10px] bg-white px-3 py-2 text-left text-[12px] leading-relaxed text-[color:var(--app-text-primary)] shadow-[0_1px_2px_rgba(13,14,16,0.05)]"
        >
          {/* DRAFT UX copy for Sandra approval before release. */}
          I’d finish post {next.position} next.{" "}
          {!next.caption?.trim() && isPersonalStoryPosition(Number(next.position))
            ? "Tell Maya one real moment and she’ll shape it without making anything up."
            : next.caption?.trim()
              ? "The caption is ready and it only needs the image."
              : "It needs a clear caption before the visual."}
        </button>
      ) : null}
    </section>
  )
}
