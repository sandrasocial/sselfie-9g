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
    `flex min-h-[34px] shrink-0 items-center justify-center rounded-[6px] px-3 py-1.5 transition-colors sm:min-h-[36px] ${
      activeTab === tab
        ? "bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] shadow-[0_8px_18px_rgba(61,56,48,0.12)]"
        : "text-[color:var(--app-text-secondary)] hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)]"
    }`

  return (
    <div className="mx-3 mb-3 flex items-center gap-1 overflow-x-auto rounded-[12px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.72)] p-1.5 shadow-[0_12px_32px_rgba(61,56,48,0.06)] backdrop-blur-[18px]">
      <button
        onClick={() => onTabChange("grid")}
        className={tabClass("grid")}
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.16em]">Grid</span>
      </button>
      
      {/* For free users: Show Captions tab, for paid/membership: Show Posts tab */}
      {isFreeUser ? (
        <button
          onClick={() => onTabChange("captions")}
          className={tabClass("captions")}
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.16em]">Captions</span>
        </button>
      ) : (
        <button
          onClick={() => onTabChange("posts")}
          className={tabClass("posts")}
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.16em]">Posts</span>
        </button>
      )}
      
      {showStrategyTab && (
        <button
          onClick={() => onTabChange("strategy")}
          className={tabClass("strategy")}
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.16em]">Strategy</span>
        </button>
      )}
      
      {/* Brand Pillars tab - show for all users who have completed onboarding */}
      <button
        onClick={() => onTabChange("pillars")}
        className={tabClass("pillars")}
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.16em]">Pillars</span>
      </button>
    </div>
  )
}
