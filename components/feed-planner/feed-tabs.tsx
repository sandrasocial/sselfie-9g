"use client"

import { useEffect } from "react"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"

export type FeedTab = "grid" | "posts" | "captions" | "strategy" | "pillars"

interface FeedTabsProps {
  activeTab: FeedTab
  onTabChange: (tab: FeedTab) => void
  access?: FeedPlannerAccess // Phase 4.3: Access control object (replaces mode prop)
}

export default function FeedTabs({ activeTab, onTabChange, access }: FeedTabsProps) {
  // For free users: Grid - Captions - Strategy
  // For paid/membership: Grid - Posts - Strategy
  const isFreeUser = access?.isFree ?? false
  const showStrategyTab = access?.canGenerateStrategy ?? true // Default to true if access not provided

  // Phase 4.3: If strategy tab is hidden and activeTab is strategy, switch to grid
  useEffect(() => {
    if (!showStrategyTab && activeTab === "strategy") {
      onTabChange("grid")
    }
  }, [showStrategyTab, activeTab, onTabChange])

  // For free users, redirect "posts" tab to "captions"
  useEffect(() => {
    if (isFreeUser && activeTab === "posts") {
      onTabChange("captions")
    }
  }, [isFreeUser, activeTab, onTabChange])

  const tabClass = (tab: FeedTab) =>
    `min-h-9 shrink-0 rounded-full border px-3 text-[10px] uppercase tracking-[0.14em] transition-colors ${
      activeTab === tab
        ? "border-[#0D0E10] bg-[#0D0E10] text-white"
        : "border-[#C5C6C8] bg-white text-[#4F5052] hover:border-[#0D0E10]/40"
    }`

  return (
    <div className="mb-3 overflow-x-auto px-3 [scrollbar-width:none]">
      <div className="flex min-w-max gap-2">
        <button
          onClick={() => onTabChange("grid")}
          className={tabClass("grid")}
        >
          Grid
        </button>

        {/* For free users: Show Captions tab, for paid/membership: Show Posts tab */}
        {isFreeUser ? (
          <button
            onClick={() => onTabChange("captions")}
            className={tabClass("captions")}
          >
            Captions
          </button>
        ) : (
          <button
            onClick={() => onTabChange("posts")}
            className={tabClass("posts")}
          >
            Posts
          </button>
        )}

        {showStrategyTab && (
          <button
            onClick={() => onTabChange("strategy")}
            className={tabClass("strategy")}
          >
            Plan
          </button>
        )}

        {/* Brand Pillars tab - show for all users who have completed onboarding */}
        <button
          onClick={() => onTabChange("pillars")}
          className={tabClass("pillars")}
        >
          Ideas
        </button>
      </div>
    </div>
  )
}
