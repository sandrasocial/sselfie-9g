"use client"

interface CalendarNeedsMeProps {
  posts: any[]
  onSelectPost: (post: any) => void
}

export function CalendarNeedsMe({ posts, onSelectPost }: CalendarNeedsMeProps) {
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
  const next = needsPhoto[0] ?? posts.find(post => !post.caption?.trim() && !post.prediction_id)

  return (
    <section
      aria-label="What needs me"
      className="border-b border-[color:var(--calendar-stone-4)]/50 bg-[color:var(--app-surface)] px-4 py-3 sm:px-6"
    >
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
        {creating > 0 ? (
          <span>
            Maya is creating{" "}
            <strong className="font-medium text-[color:var(--app-text-primary)]">{creating}</strong>{" "}
            {creating === 1 ? "image" : "images"}
          </span>
        ) : null}
      </div>
      {next ? (
        <button
          type="button"
          onClick={() => onSelectPost(next)}
          className="mt-2 min-h-11 w-full rounded-[10px] bg-white px-3 py-2 text-left text-[12px] leading-relaxed text-[color:var(--app-text-primary)] shadow-[0_1px_2px_rgba(13,14,16,0.05)]"
        >
          {/* DRAFT UX copy for Sandra approval before release. */}
          I’d finish post {next.position} next.{" "}
          {next.caption?.trim()
            ? "The caption is ready and it only needs the image."
            : "It needs a clear caption before the visual."}
        </button>
      ) : null}
    </section>
  )
}
