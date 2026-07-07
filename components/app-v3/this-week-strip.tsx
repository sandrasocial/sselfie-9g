"use client"

// THIS WEEK strip (2026-07-07, Sandra-approved). Lives at the top of the Calendar tab:
// 3 personalized ideas riding what's working on Instagram right now, each one tap from
// starting Maya on it. The API is week-keyed, so what renders here is always THIS week's
// brief - a new week regenerates on first open, stale ideas structurally cannot appear.

import { useEffect, useState } from "react"
import type { OutputFormat } from "./types"

interface WeeklyIdea {
  title: string
  hook: string
  whyNow: string
  format: "photo" | "carousel" | "reel-cover" | "story-slide"
  trendName: string
}

const FORMAT_LABEL: Record<WeeklyIdea["format"], string> = {
  photo: "Photo",
  carousel: "Carousel",
  "reel-cover": "Reel cover",
  "story-slide": "Story slide",
}

function fmtWeek(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })
}

export function ThisWeekStrip({
  onCreateIdea,
}: {
  onCreateIdea: (format: OutputFormat, title: string) => void
}) {
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [ideas, setIdeas] = useState<WeeklyIdea[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/app-v3/this-week", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data?.ideas) && data.ideas.length > 0) {
          setIdeas(data.ideas)
          setWeekStart(typeof data.weekStart === "string" ? data.weekStart : null)
        } else {
          setFailed(true)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Never block the calendar: nothing to show -> render nothing.
  if (failed) return null

  return (
    <div className="mx-auto mb-4 max-w-3xl px-3 pt-4">
      <div className="rounded-[14px] border border-[#C5C6C8]/50 bg-white p-4 shadow-[0_1px_2px_rgba(13,14,16,0.04),0_10px_28px_rgba(13,14,16,0.06)] sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">
            This week on Instagram
          </p>
          {weekStart && (
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#A2A3A5]">
              Week of {fmtWeek(weekStart)}
            </p>
          )}
        </div>

        {!ideas ? (
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-[10px] bg-[#F1F2F2]" />
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {ideas.map((idea, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onCreateIdea(idea.format, `${idea.title}. Open with this hook: "${idea.hook}"`)}
                className="group flex w-full items-start justify-between gap-3 rounded-[10px] border border-[#C5C6C8]/60 bg-white p-3 text-left transition-colors hover:border-[#0D0E10]/40"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-snug text-[#0D0E10]">{idea.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#4F5052]">"{idea.hook}"</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#818283]">{idea.whyNow}</p>
                </div>
                <span className="mt-0.5 shrink-0 rounded-full border border-[#C5C6C8] px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-[#4F5052] transition-colors group-hover:border-[#0D0E10]/40">
                  {FORMAT_LABEL[idea.format]}
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-[#A2A3A5]">
          Tap one and Maya starts it with you. Fresh every Monday.
        </p>
      </div>
    </div>
  )
}
