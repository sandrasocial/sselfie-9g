"use client"

// SSELFIE Studio 3.0 - Calendar tab (Feed Planner Phase 2, 2026-07-06).
// Thin wrapper: reuses FeedPlannerClient's data/wizard-routing logic completely unchanged
// (free/paid-blueprint/membership branching, onboarding wizard, welcome wizard, activation
// checklist - all untouched). This mounts the SAME client that powers the standalone
// /feed-planner route inside the Suite shell's Calendar tab. Its presentational children
// (FeedHeader, FeedTabs, the grid, the post editor) are what carry the visual rebuild -
// changing them here also upgrades the standalone route for any Blueprint-only buyer who
// isn't a Suite member, since both paths render the same components.
//
// 2026-07-07: provides FeedNavContext so feed switching (New feed, the plan switcher,
// preview redirects) swaps feeds IN PLACE instead of escaping to the standalone route,
// and shows a one-time "what is this calendar" explainer on first open.

import { useEffect, useMemo, useState } from "react"
import FeedPlannerClient from "@/app/feed-planner/feed-planner-client"
import { FeedNavContext } from "@/components/feed-planner/feed-nav-context"
import { ThisWeekStrip } from "./this-week-strip"
import { CalendarTodayStrip } from "./calendar-today-strip"
import type { OutputFormat } from "./types"

const ONBOARDING_KEY = "calendar:onboarding:v1"
const SELECTED_FEED_KEY = "calendar:selected-feed:v1"

export function CalendarExplainer({ onDismiss }: { onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="mx-auto mb-3 max-w-3xl px-3 pt-3" aria-label="Calendar introduction">
      <div className="rounded-[14px] border border-[#C5C6C8]/50 bg-white p-4 shadow-[0_1px_2px_rgba(13,14,16,0.04),0_10px_28px_rgba(13,14,16,0.06)] sm:p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">Your content calendar</p>
        <h2 className="mt-1.5 font-serif text-[20px] font-light leading-tight text-[#0D0E10] sm:text-[22px]">
          {/* DRAFT UX copy for Sandra approval before release. */}
          Your month, ready to create
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">
          Maya plans the posts. You create the photos when you&apos;re ready.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="min-h-11 rounded-[8px] border border-[#C5C6C8] bg-white px-4 text-[10px] uppercase tracking-[0.14em] text-[#4F5052] transition-colors hover:border-[#0D0E10]/40 hover:text-[#0D0E10]"
          >
            How Calendar works
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 rounded-[8px] bg-[#0D0E10] px-4 text-[10px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#282728]"
          >
            Got it
          </button>
        </div>

        {expanded && (
          <ol className="mt-4 space-y-3 border-t border-[#C5C6C8]/50 pt-4">
            <li className="flex gap-3">
              <span className="mt-0.5 shrink-0 font-serif text-[15px] leading-none text-[#818283]">1</span>
              <p className="text-[13px] leading-relaxed text-[#4F5052]">
                Maya drafts your month. Every day has a theme and a caption, ready to use.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 shrink-0 font-serif text-[15px] leading-none text-[#818283]">2</span>
              <p className="text-[13px] leading-relaxed text-[#4F5052]">
                Create photos with Maya. She keeps your grid in one visual world.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 shrink-0 font-serif text-[15px] leading-none text-[#818283]">3</span>
              <p className="text-[13px] leading-relaxed text-[#4F5052]">
                Tap Add to calendar under a photo and it lands on your next open day.
              </p>
            </li>
          </ol>
        )}
      </div>
    </section>
  )
}

export function FeedPlannerView({
  onCreateIdea,
}: {
  /** Starts Maya seeded with a THIS WEEK idea (the shell's creationIdea channel). */
  onCreateIdea?: (format: OutputFormat, title: string) => void
} = {}) {
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null
    const stored = Number(window.localStorage.getItem(SELECTED_FEED_KEY))
    return Number.isInteger(stored) && stored > 0 ? stored : null
  })
  const [showExplainer, setShowExplainer] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(ONBOARDING_KEY)) setShowExplainer(true)
    } catch {
      // storage unavailable - skip the explainer rather than break the calendar
    }
  }, [])

  useEffect(() => {
    try {
      if (selectedFeedId) window.localStorage.setItem(SELECTED_FEED_KEY, String(selectedFeedId))
      else window.localStorage.removeItem(SELECTED_FEED_KEY)
    } catch {
      // best effort; the calendar still works when storage is unavailable
    }
  }, [selectedFeedId])

  const nav = useMemo(
    () => ({
      feedId: selectedFeedId,
      navigateToFeed: setSelectedFeedId,
      navigateToMaya: onCreateIdea
        ? () => onCreateIdea("photo", "Create a photo for my content calendar")
        : undefined,
    }),
    [onCreateIdea, selectedFeedId],
  )

  const dismissExplainer = () => {
    setShowExplainer(false)
    try {
      window.localStorage.setItem(ONBOARDING_KEY, "1")
    } catch {
      // best effort
    }
  }

  return (
    <FeedNavContext.Provider value={nav}>
      <div className="min-h-[calc(100dvh-3.5rem)] bg-[#F8FAFA] pb-24">
        {showExplainer && <CalendarExplainer onDismiss={dismissExplainer} />}
        <CalendarTodayStrip />
        {onCreateIdea && <ThisWeekStrip onCreateIdea={onCreateIdea} />}
        <FeedPlannerClient />
      </div>
    </FeedNavContext.Provider>
  )
}
