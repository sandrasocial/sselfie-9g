"use client"

// Feed Planner embedded navigation (2026-07-07). When the planner is mounted inside the
// Suite shell (/app Calendar tab), switching feeds must swap state IN PLACE - the old
// behavior of router.push("/feed-planner?feedId=...") threw members out of /app into the
// standalone route (the retired Studio-era shell). The standalone route provides no
// context, so consumers fall back to router navigation there and nothing changes for
// Blueprint-only buyers.

import { createContext, useContext } from "react"

export interface FeedNav {
  /** The feed currently selected inside the embedded planner (null = latest). */
  feedId: number | null
  /** Switch the embedded planner to another feed without leaving /app. */
  navigateToFeed: (feedId: number) => void
}

export const FeedNavContext = createContext<FeedNav | null>(null)

export function useFeedNav(): FeedNav | null {
  return useContext(FeedNavContext)
}
