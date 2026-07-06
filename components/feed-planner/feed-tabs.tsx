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
  // For free users: Grid - Captions - Strategy - Ideas (all unchanged, out of scope here).
  // For paid/membership (Feed Planner Phase 2b): Grid only - Posts, Plan, and Ideas fold into
  // the "About this month" strip above the grid (themeSummary/pillars Maya already wrote when
  // she auto-drafted the month) plus per-tile pillar tags and the post editor overlay. Nothing
  // about the free-user tab set changes.
  const isFreeUser = access?.isFree ?? false
  const showStrategyTab = isFreeUser && (access?.canGenerateStrategy ?? true)

  // Phase 4.3: If strategy tab is hidden and activeTab is strategy, switch to grid
  useEffect(() => {
    if (!showStrategyTab && activeTab === "strategy") {
      onTabChange("grid")
    }
  }, [showStrategyTab, activeTab, onTabChange])

  // For free users, redirect "posts" tab to "captions"; for paid/membership, "posts"/"pillars"
  // no longer exist as tabs at all - redirect straight back to grid.
  useEffect(() => {
    if (isFreeUser && activeTab === "posts") {
      onTabChange("captions")
    } else if (!isFreeUser && (activeTab === "posts" || activeTab === "pillars")) {
      onTabChange("grid")
    }
  }, [isFreeUser, activeTab, onTabChange])

  const tabClass = (tab: FeedTab) =>
    `min-h-9 shrink-0 rounded-full border px-3 text-[10px] uppercase tracking-[0.14em] transition-colors ${
      activeTab === tab
        ? "border-[#0D0E10] bg-[#0D0E10] text-white"
        : "border-[#C5C6C8] bg-white text-[#4F5052] hover:border-[#0D0E10]/40"
    }`

  // Paid/membership collapsed to Grid-only above - a switcher with one pill is dead chrome,
  // so render nothing at all for them. (Placed after the hooks; Rules of Hooks stay intact.)
  if (!isFreeUser) return null

  return (
    <div className="mb-3 overflow-x-auto px-3 [scrollbar-width:none]">
      <div className="flex min-w-max gap-2">
        <button
          onClick={() => onTabChange("grid")}
          className={tabClass("grid")}
        >
          Grid
        </button>

        {/* Free users only: Captions tab. Paid/membership: Posts folded into the grid + the
            month strip, so no second tab for it. */}
        {isFreeUser && (
          <button
            onClick={() => onTabChange("captions")}
            className={tabClass("captions")}
          >
            Captions
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

        {/* Brand Pillars tab - free users only. Paid/membership: pillars fold into the month
            strip + per-tile pillar tags Maya already writes when she auto-drafts the month. */}
        {isFreeUser && (
          <button
            onClick={() => onTabChange("pillars")}
            className={tabClass("pillars")}
          >
            Ideas
          </button>
        )}
      </div>
    </div>
  )
}
