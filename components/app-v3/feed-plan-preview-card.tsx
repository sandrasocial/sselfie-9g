"use client"

// Feed Planner Phase 2c - inline "week planned" preview, rendered directly in the Maya chat
// stream from the show_feed_plan tool. A compact read-only strip: real photo if a day is
// filled, a quiet placeholder (the planned theme) if not. Tapping any day opens the full
// Calendar tab - editing, swapping, and rewriting captions all stay on that one surface
// (FeedPostCard) rather than being rebuilt a second time inline here.

export interface FeedPlanPreviewDay {
  position: number
  scheduledAt: string
  contentPillar: string | null
  imageUrl: string | null
  filled: boolean
}

interface FeedPlanPreviewCardProps {
  days: FeedPlanPreviewDay[]
  onOpenCalendar: () => void
}

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
}

export function FeedPlanPreviewCard({ days, onOpenCalendar }: FeedPlanPreviewCardProps) {
  if (days.length === 0) {
    return (
      <div className="min-w-0 max-w-full rounded-[10px] border border-[#C5C6C8]/50 bg-white p-4 [overflow-x:clip]">
        <p className="text-[13px] leading-relaxed text-[#4F5052]">
          Nothing planned yet - open Calendar and Maya will draft your month.
        </p>
        <button
          type="button"
          onClick={onOpenCalendar}
          className="mt-2 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#0D0E10] underline underline-offset-2 hover:opacity-70"
        >
          Open calendar
        </button>
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-3 rounded-[10px] border border-[#C5C6C8]/50 bg-white p-4 [overflow-x:clip]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#818283]">Your week planned</p>
      <button
        type="button"
        onClick={onOpenCalendar}
        className="grid w-full grid-cols-4 gap-2 sm:grid-cols-7"
      >
        {days.map(day => (
          <div key={day.position} className="space-y-1 text-left">
            <div className="relative aspect-square w-full overflow-hidden rounded-[6px] border border-[#C5C6C8]/40 bg-[#F8FAFA]">
              {day.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={day.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-1.5 text-center">
                  <span className="line-clamp-3 text-[9px] leading-snug text-[#818283]">
                    {day.contentPillar || "Open"}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[9px] uppercase tracking-[0.1em] text-[#818283]">
              {formatDayLabel(day.scheduledAt)}
            </p>
          </div>
        ))}
      </button>
    </div>
  )
}
