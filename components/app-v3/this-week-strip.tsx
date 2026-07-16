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

// Closing the strip hides it for THIS week only - a new week brings new ideas, so it
// reappears on Monday. Stored per week, not forever: dismissing July 6 must not silence
// July 13.
const DISMISS_KEY = "this-week:dismissed"

export function ThisWeekStrip({
  onCreateIdea,
}: {
  onCreateIdea: (format: OutputFormat, title: string) => void
}) {
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [ideas, setIdeas] = useState<WeeklyIdea[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/app-v3/this-week", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data?.ideas) && data.ideas.length > 0) {
          const week = typeof data.weekStart === "string" ? data.weekStart : null
          setIdeas(data.ideas)
          setWeekStart(week)
          try {
            if (week && window.localStorage.getItem(DISMISS_KEY) === week) setDismissed(true)
          } catch {
            // storage unavailable - just show the strip
          }
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

  const dismiss = () => {
    setDismissed(true)
    try {
      if (weekStart) window.localStorage.setItem(DISMISS_KEY, weekStart)
    } catch {
      // best effort
    }
  }

  const reopen = () => {
    setDismissed(false)
    try {
      window.localStorage.removeItem(DISMISS_KEY)
    } catch {
      // best effort
    }
  }

  // Never block the calendar: nothing to show -> render nothing.
  if (failed) return null

  // Closed for this week: keep a small reopen chip in place (2026-07-07, Sandra's report -
  // closing the strip left NO way back into it until Monday).
  if (dismissed) {
    return (
      <div className="mx-auto mb-2 flex max-w-3xl justify-end px-3 pt-3">
        <button
          type="button"
          onClick={reopen}
          className="min-h-11 rounded-full border border-[#C5C6C8]/60 bg-white px-4 text-[10px] uppercase tracking-[0.16em] text-[#4F5052] transition-colors hover:border-[#0D0E10]/40 hover:text-[#0D0E10]"
        >
          This week on Instagram
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto mb-3 max-w-3xl px-3 pt-3">
      <div className="rounded-[14px] border border-[#C5C6C8]/50 bg-white p-4 shadow-[0_1px_2px_rgba(13,14,16,0.04),0_10px_28px_rgba(13,14,16,0.06)] sm:p-5">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">
            This week on Instagram
          </p>
          <div className="flex items-start gap-2 sm:items-center sm:gap-3">
            {weekStart && (
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#A2A3A5]">
                Week of {fmtWeek(weekStart)}
              </p>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close for this week"
              className="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#4F5052] transition-colors hover:bg-[#F1F2F2] hover:text-[#0D0E10]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {!ideas ? (
          <div className="mt-3 flex gap-2 overflow-hidden sm:grid sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 w-[82vw] max-w-[300px] shrink-0 animate-pulse rounded-[10px] bg-[#F1F2F2] sm:w-auto" />
            ))}
          </div>
        ) : (
          <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {ideas.map((idea, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onCreateIdea(idea.format, `${idea.title}. Open with this hook: "${idea.hook}"`)}
                className="group flex min-h-11 w-[82vw] max-w-[300px] shrink-0 snap-start flex-col rounded-[10px] border border-[#C5C6C8]/60 bg-white p-3 text-left transition-colors hover:border-[#0D0E10]/40 sm:w-auto sm:max-w-none"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <p className="min-w-0 text-[13px] font-medium leading-snug text-[#0D0E10]">{idea.title}</p>
                  <span className="shrink-0 rounded-full border border-[#C5C6C8] px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-[#4F5052] transition-colors group-hover:border-[#0D0E10]/40">
                    {FORMAT_LABEL[idea.format]}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-[#4F5052]">
                  &ldquo;{idea.hook}&rdquo;
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#818283]">{idea.whyNow}</p>
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
