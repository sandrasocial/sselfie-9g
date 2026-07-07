"use client"

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
    .filter((p) => p.scheduled_at && !Number.isNaN(new Date(p.scheduled_at).getTime()))
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
  const undated = posts.filter((p) => !p.scheduled_at)

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

  const renderCard = (post: WeekViewPost, dateLabel: string | null) => {
    const isPast =
      post.scheduled_at != null && new Date(post.scheduled_at).getTime() < todayStart.getTime()
    return (
      <button
        key={post.id}
        onClick={() => onPostClick(post)}
        className={`flex w-full items-center gap-3 rounded-[10px] border bg-white p-2.5 text-left transition-colors hover:border-[#0D0E10]/40 ${
          isPast ? "border-[#C5C6C8]/40 opacity-60" : "border-[#C5C6C8]/60"
        }`}
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[6px] bg-[#EDEEEF]">
          {post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image_url} alt="" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] uppercase tracking-[0.14em] text-[#A2A3A5]">
              Photo
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {dateLabel && (
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#818283]">{dateLabel}</p>
          )}
          {post.content_pillar && (
            <p className="mt-0.5 truncate text-[13px] font-medium text-[#0D0E10]">
              {post.content_pillar}
            </p>
          )}
          <p className="mt-0.5 truncate text-[12px] text-[#818283]">
            {post.caption ? post.caption : "Caption coming with the photo"}
          </p>
        </div>
        {!post.image_url && !isPast && (
          <span className="shrink-0 rounded-full border border-[#C5C6C8] px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-[#4F5052]">
            Open
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-3">
      {Array.from(weeks.entries()).map(([key, weekPosts]) => (
        <section key={key}>
          <div className="mb-2 flex items-baseline gap-2 px-1">
            <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#4F5052]">{fmtWeek(key)}</h3>
            {key === currentWeekKey && (
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#818283]">This week</span>
            )}
          </div>
          <div className="space-y-2">
            {weekPosts.map((post) => renderCard(post, fmtDay(new Date(post.scheduled_at!))))}
          </div>
        </section>
      ))}
      {undated.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-[11px] uppercase tracking-[0.2em] text-[#4F5052]">Anytime</h3>
          <div className="space-y-2">{undated.map((post) => renderCard(post, null))}</div>
        </section>
      )}
    </div>
  )
}
