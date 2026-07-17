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
// Provides FeedNavContext so feed switching (New feed, the plan switcher, preview
// redirects) swaps feeds in place instead of escaping to the standalone route.

import { useCallback, useEffect, useMemo, useState } from "react"
import FeedPlannerClient from "@/app/feed-planner/feed-planner-client"
import { FeedNavContext } from "@/components/feed-planner/feed-nav-context"
import type { OutputFormat } from "./types"

const SELECTED_FEED_KEY = "calendar:selected-feed:v1"

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
  const [pendingSlotPosition, setPendingSlotPosition] = useState<number | null>(null)

  useEffect(() => {
    try {
      if (selectedFeedId) window.localStorage.setItem(SELECTED_FEED_KEY, String(selectedFeedId))
      else window.localStorage.removeItem(SELECTED_FEED_KEY)
    } catch {
      // best effort; the calendar still works when storage is unavailable
    }
  }, [selectedFeedId])

  const navigateToFeed = useCallback(
    (feedId: number | null, options?: { openPosition?: number }) => {
      setSelectedFeedId(feedId)
      setPendingSlotPosition(options?.openPosition ?? null)
    },
    []
  )

  const nav = useMemo(
    () => ({
      feedId: selectedFeedId,
      navigateToFeed,
      pendingSlotPosition,
      consumePendingSlot: () => setPendingSlotPosition(null),
      navigateToMaya: onCreateIdea
        ? () => onCreateIdea("photo", "Create a photo for my content calendar")
        : undefined,
    }),
    [navigateToFeed, onCreateIdea, pendingSlotPosition, selectedFeedId]
  )

  return (
    <FeedNavContext.Provider value={nav}>
      <div className="min-h-[calc(100dvh-3.5rem)] bg-[#F8FAFA] pb-24">
        {/* The Instagram canvas is the Calendar front door. Guidance stays contextual inside Maya. */}
        <FeedPlannerClient />
      </div>
    </FeedNavContext.Provider>
  )
}
