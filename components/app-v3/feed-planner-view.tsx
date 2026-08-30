"use client"

// Suite Calendar 2.0 is deliberately a thin, grid-first member surface. The standalone
// /feed-planner route keeps its existing Blueprint purchase and onboarding paths; the Suite
// no longer mounts that entire product inside a tab.

import { useCallback, useEffect, useMemo, useState } from "react"
import { FeedNavContext } from "@/components/feed-planner/feed-nav-context"
import type { Aesthetic, CalendarPostTarget } from "./types"
import { useConcierge } from "./concierge-context"
import { recordMayaJobHandoff, startMayaJob } from "@/lib/app-v3/maya/job-analytics"
import { SuiteCalendar } from "./suite-calendar"

const SELECTED_FEED_KEY = "calendar:selected-feed:v1"

export function FeedPlannerView({
  operatingLayerEnabled = false,
  pendingApplyImageUrl = null,
  onConsumePendingApplyImage,
}: {
  operatingLayerEnabled?: boolean
  /** Gallery "Add to a post" carries the chosen image into the planner's apply mode. */
  pendingApplyImageUrl?: string | null
  onConsumePendingApplyImage?: () => void
}) {
  const { open, openForCalendarPost, openWithAesthetic } = useConcierge()
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null)
  const [hasRestoredFeed, setHasRestoredFeed] = useState(false)
  const [pendingSlotPosition, setPendingSlotPosition] = useState<number | null>(null)

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(SELECTED_FEED_KEY))
      if (Number.isInteger(stored) && stored > 0) setSelectedFeedId(stored)
    } catch {
      // best effort; the calendar still works when storage is unavailable
    } finally {
      setHasRestoredFeed(true)
    }
  }, [])

  useEffect(() => {
    if (!hasRestoredFeed) return
    try {
      if (selectedFeedId) window.localStorage.setItem(SELECTED_FEED_KEY, String(selectedFeedId))
      else window.localStorage.removeItem(SELECTED_FEED_KEY)
    } catch {
      // best effort; the calendar still works when storage is unavailable
    }
  }, [hasRestoredFeed, selectedFeedId])

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
      operatingLayerEnabled,
      pendingSlotPosition,
      consumePendingSlot: () => setPendingSlotPosition(null),
      pendingApplyImageUrl,
      consumePendingApplyImage: onConsumePendingApplyImage,
      navigateToMaya: (target?: CalendarPostTarget) => {
        if (target) {
          startMayaJob({
            job: "finish_calendar_post",
            surface: "calendar",
            entry: "calendar_post_maya",
          })
          recordMayaJobHandoff("finish_calendar_post")
          openForCalendarPost(target)
        } else open()
      },
      navigateToMayaForStory: (title: string, coverOnly = false) => {
        const storyAesthetic: Aesthetic = {
          id: "maya-general",
          name: "SSELFIE",
          blurb: "Let's make something that's truly you.",
          coverImage: "",
          thumbnails: [],
          shotCount: 0,
          intent: "A general SSELFIE editorial brand session.",
        }
        openWithAesthetic(storyAesthetic, {
          format: coverOnly ? "story-slide" : "story-sequence",
          creationIdea: coverOnly
            ? `Create a Highlight cover for ${title}.`
            : `Create a complete Instagram Story sequence for my ${title} Highlight.`,
          seed: coverOnly
            ? `Let's create a Highlight cover for ${title}.`
            : `Let's create a complete Story sequence for my ${title} Highlight.`,
          creationIntent: {
            format: coverOnly ? "story-slide" : "story-sequence",
            source: "content_card",
            confidence: "high",
          },
        })
      },
    }),
    [
      navigateToFeed,
      onConsumePendingApplyImage,
      open,
      openForCalendarPost,
      openWithAesthetic,
      operatingLayerEnabled,
      pendingApplyImageUrl,
      pendingSlotPosition,
      selectedFeedId,
    ]
  )

  return (
    <FeedNavContext.Provider value={nav}>
      <div className="suite-page suite-editorial-calendar min-h-[calc(100dvh-3.5rem)] bg-[color:var(--suite-canvas)]">
        {/* The Instagram canvas is the Calendar front door. Guidance stays contextual inside Maya. */}
        <SuiteCalendar />
      </div>
    </FeedNavContext.Provider>
  )
}
