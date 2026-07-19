"use client"

// Feed Planner Phase 2b - "About this month" strip. Replaces the old Strategy tab (a separate
// screen with its own "generate a written strategy" button) and the old Pillars tab (a
// separate screen just displaying user_personal_brand.content_pillars) for paid/membership
// users. When Maya auto-drafts the month, themeSummary/schedulingRationale already exist on
// the feed_layouts row and content_pillar already exists per feed_posts row - this just
// surfaces what's already there, no separate generation step.

import { useState } from "react"

interface FeedMonthSummaryProps {
  themeSummary?: string | null
  schedulingRationale?: string | null
  feedStory?: string | null
  visualRhythm?: string | null
  pillars: string[]
  posts?: Array<{
    id?: number | string
    position: number
    purpose?: string | null
    shot_type?: string | null
    pro_mode_type?: string | null
    visual_direction?: string | null
  }>
}

function formatLabel(type?: string | null) {
  if (type === "carousel-slides") return "Carousel"
  if (type === "reel-cover") return "Reel cover"
  return "Photo"
}

function readable(value?: string | null) {
  if (!value) return "Planned post"
  return value.replace(/[-_]/g, " ").replace(/^./, letter => letter.toUpperCase())
}

export default function FeedMonthSummary({
  themeSummary,
  schedulingRationale,
  feedStory,
  visualRhythm,
  pillars,
  posts = [],
}: FeedMonthSummaryProps) {
  const [expanded, setExpanded] = useState(false)

  if (!themeSummary && !schedulingRationale && !feedStory && !visualRhythm && pillars.length === 0)
    return null

  return (
    <div className="mx-3 mb-3 rounded-[10px] border border-[#C5C6C8]/60 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#4F5052]">
          About this month
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#818283]">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-[#C5C6C8]/50 px-4 py-4">
          {themeSummary && <p className="text-sm leading-relaxed text-[#0D0E10]">{themeSummary}</p>}
          {schedulingRationale && (
            <p className="text-xs leading-relaxed text-[#4F5052]">{schedulingRationale}</p>
          )}
          {(feedStory || visualRhythm) && (
            <div className="space-y-2 rounded-[10px] bg-[#F8FAFA] p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#4F5052]">
                How this feed works
              </p>
              {feedStory ? (
                <p className="text-sm leading-relaxed text-[#0D0E10]">{feedStory}</p>
              ) : null}
              {visualRhythm ? (
                <p className="text-xs leading-relaxed text-[#4F5052]">{visualRhythm}</p>
              ) : null}
              <p className="text-xs font-medium text-[#0D0E10]">Use what you already have first.</p>
            </div>
          )}
          {posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5" aria-label="Your connected feed plan">
              {posts.slice(0, 9).map(post => (
                <div
                  key={post.id ?? post.position}
                  className="min-w-0 rounded-[8px] border border-[#C5C6C8]/60 bg-white p-2.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-medium uppercase tracking-[0.13em] text-[#0D0E10]">
                      Post {post.position}
                    </span>
                    <span className="text-[8px] uppercase tracking-[0.1em] text-[#818283]">
                      {formatLabel(post.pro_mode_type)}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[11px] font-medium text-[#0D0E10]">
                    {readable(post.purpose)}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-[#818283]">
                    {readable(post.shot_type)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {pillars.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pillars.map(pillar => (
                <span
                  key={pillar}
                  className="rounded-full border border-[#C5C6C8] bg-[#F8FAFA] px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-[#4F5052]"
                >
                  {pillar}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
