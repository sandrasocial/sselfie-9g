"use client"

import { isPersonalStoryPosition } from "@/lib/feed-planner/caption-truth"

// Feed Planner 2026-07-07 - Week view. The 3x3-style grid mirrors how the feed LOOKS on
// Instagram; this view shows the same month plan as a week-by-week schedule: when each
// post goes out, its theme, and whether the photo exists yet. Same data, same tap-to-edit
// behavior as the grid - purely a different lens, no new state or routes.

interface WeekViewPost {
  id: number
  position: number
  image_url?: string | null
  content_pillar?: string | null
  caption?: string | null
  scheduled_at?: string | null
}

interface FeedWeekViewProps {
  posts: WeekViewPost[]
  onPostClick: (post: WeekViewPost) => void
}

/** Monday of the week containing d, as a date-only timestamp (local). */
function weekStart(d: Date): number {
  const day = (d.getDay() + 6) % 7 // Mon=0 ... Sun=6
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
  return monday.getTime()
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function fmtWeek(ts: number): string {
  return `Week of ${new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
}

export default function FeedWeekView({ posts, onPostClick }: FeedWeekViewProps) {
  const dated = posts
    .filter(p => p.scheduled_at && !Number.isNaN(new Date(p.scheduled_at).getTime()))
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
  const undated = posts.filter(p => !p.scheduled_at)

  const weeks = new Map<number, WeekViewPost[]>()
  for (const post of dated) {
    const key = weekStart(new Date(post.scheduled_at!))
    const bucket = weeks.get(key)
    if (bucket) bucket.push(post)
    else weeks.set(key, [post])
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const currentWeekKey = weekStart(todayStart)

  const renderCard = (post: WeekViewPost, dateLabel: string) => {
    const isPast =
      post.scheduled_at != null && new Date(post.scheduled_at).getTime() < todayStart.getTime()
    const readiness =
      post.image_url && post.caption
        ? "Ready"
        : !post.caption && isPersonalStoryPosition(post.position)
          ? "Needs your story"
          : post.image_url
            ? "Needs caption"
            : "Needs photo"
    return (
      <button
        key={post.id}
        onClick={() => onPostClick(post)}
        aria-label={`Open post ${post.position}, ${dateLabel}`}
        className={`w-[82vw] max-w-[21rem] shrink-0 snap-start overflow-hidden rounded-[18px] border bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--app-text-muted)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] ${
          isPast
            ? "border-[color:var(--app-glass-border)] bg-[color:var(--app-surface)]"
            : "border-[color:var(--app-glass-border)]"
        }`}
      >
        <div
          data-post-image="true"
          className="relative aspect-[4/5] w-full overflow-hidden bg-[color:var(--calendar-stone-2)]"
        >
          {post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image_url} alt="" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(145deg,var(--calendar-stone-1),var(--calendar-stone-3))] px-8 text-center">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-muted)]">
                Image direction
              </span>
              <span className="text-[13px] leading-relaxed text-[color:var(--app-text-secondary)]">
                {post.content_pillar || "Maya will shape this with you"}
              </span>
            </div>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-white/88 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--app-text-primary)] backdrop-blur-md">
            #{post.position}
          </span>
        </div>
        <div className="min-h-[10.5rem] p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-serif text-[21px] font-light leading-none text-[color:var(--app-text-primary)]">
              {dateLabel}
            </p>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] uppercase tracking-[0.13em] ${
                readiness === "Ready"
                  ? "border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
                  : "border-[color:var(--app-glass-border)] text-[color:var(--app-text-secondary)]"
              }`}
            >
              {readiness}
            </span>
          </div>
          {post.content_pillar && (
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
              {post.content_pillar}
            </p>
          )}
          <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-[color:var(--app-text-primary)]">
            {post.caption ? post.caption : "Caption coming with the photo"}
          </p>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
            Open post
          </p>
        </div>
      </button>
    )
  }

  return (
    <div className="mx-auto max-w-none space-y-7 px-3 sm:px-5">
      {Array.from(weeks.entries()).map(([key, weekPosts]) => (
        <section key={key}>
          <div className="mb-3 flex items-baseline gap-2 px-1">
            <h3 className="font-serif text-[26px] font-light text-[color:var(--app-text-primary)]">
              {fmtWeek(key)}
            </h3>
            {key === currentWeekKey && (
              <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--app-text-secondary)]">
                This week
              </span>
            )}
          </div>
          <div
            role="list"
            aria-label={`Posts for ${fmtWeek(key)}`}
            className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-4 [scrollbar-width:none] sm:-mx-5 sm:px-5"
          >
            {weekPosts.map(post => renderCard(post, fmtDay(new Date(post.scheduled_at!))))}
          </div>
        </section>
      ))}
      {undated.length > 0 && (
        <section>
          <div className="mb-2 px-1">
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">
              Not scheduled
            </h3>
            <p className="mt-1 text-[12px] text-[color:var(--app-text-secondary)]">
              These posts are still part of your grid.
            </p>
          </div>
          <div
            role="list"
            aria-label="Posts not scheduled"
            className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-4 [scrollbar-width:none] sm:-mx-5 sm:px-5"
          >
            {undated.map(post => renderCard(post, `Post ${post.position}`))}
          </div>
        </section>
      )}
    </div>
  )
}
