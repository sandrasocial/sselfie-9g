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

const ONBOARDING_KEY = "calendar:onboarding:v1"

function CalendarExplainer({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-auto mb-4 max-w-3xl px-3 pt-4">
      <div className="rounded-[14px] border border-[#C5C6C8]/50 bg-white p-5 shadow-[0_1px_2px_rgba(13,14,16,0.04),0_10px_28px_rgba(13,14,16,0.06)] sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">Your content calendar</p>
        <h2 className="mt-2 font-serif text-[22px] font-light leading-tight text-[#0D0E10] sm:text-[24px]">
          A month of posts, planned for you
        </h2>
        <ol className="mt-4 space-y-3">
          <li className="flex gap-3">
            <span className="mt-0.5 shrink-0 font-serif text-[15px] leading-none text-[#818283]">1</span>
            <p className="text-[14px] leading-relaxed text-[#4F5052]">
              Maya drafts your month. Every day has a theme and a caption, ready to use.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 shrink-0 font-serif text-[15px] leading-none text-[#818283]">2</span>
            <p className="text-[14px] leading-relaxed text-[#4F5052]">
              Create photos with Maya in chat. She keeps your whole grid in one visual world, so it
              looks planned, not random.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 shrink-0 font-serif text-[15px] leading-none text-[#818283]">3</span>
            <p className="text-[14px] leading-relaxed text-[#4F5052]">
              Love a photo? Tap Add to calendar under it and it lands on your next open day.
            </p>
          </li>
        </ol>
        <p className="mt-4 text-[13px] leading-relaxed text-[#818283]">
          Want a different vibe? Just tell Maya. She switches your grid's world for you.
        </p>
        <button
          onClick={onDismiss}
          className="mt-4 rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#282728]"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

export function FeedPlannerView() {
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null)
  const [showExplainer, setShowExplainer] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(ONBOARDING_KEY)) setShowExplainer(true)
    } catch {
      // storage unavailable - skip the explainer rather than break the calendar
    }
  }, [])

  const nav = useMemo(
    () => ({ feedId: selectedFeedId, navigateToFeed: setSelectedFeedId }),
    [selectedFeedId],
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
        <FeedPlannerClient userId="" />
      </div>
    </FeedNavContext.Provider>
  )
}
