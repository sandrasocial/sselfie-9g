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
  pillars: string[]
}

export default function FeedMonthSummary({ themeSummary, schedulingRationale, pillars }: FeedMonthSummaryProps) {
  const [expanded, setExpanded] = useState(false)

  if (!themeSummary && !schedulingRationale && pillars.length === 0) return null

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
        <div className="space-y-3 border-t border-[#C5C6C8]/50 px-4 py-3">
          {themeSummary && (
            <p className="text-sm leading-relaxed text-[#0D0E10]">{themeSummary}</p>
          )}
          {schedulingRationale && (
            <p className="text-xs leading-relaxed text-[#4F5052]">{schedulingRationale}</p>
          )}
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
