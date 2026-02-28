"use client"

import { useEffect } from "react"
import { Grid3x3, LayoutGrid, List, FileText, Columns } from "lucide-react"
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

  return (
    <div className="mx-3 mb-3 flex rounded-full border border-white/15 bg-white/[0.04] p-1 backdrop-blur-xl">
      <button
        onClick={() => onTabChange("grid")}
        className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 transition-colors ${
          activeTab === "grid" ? "bg-white/14 text-white" : "text-white/50 hover:text-white/70"
        }`}
      >
        <Grid3x3 size={20} strokeWidth={activeTab === "grid" ? 2.5 : 2} />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Grid</span>
      </button>
      
      {/* For free users: Show Captions tab, for paid/membership: Show Posts tab */}
      {isFreeUser ? (
        <button
          onClick={() => onTabChange("captions")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 transition-colors ${
            activeTab === "captions" ? "bg-white/14 text-white" : "text-white/50 hover:text-white/70"
          }`}
        >
          <FileText size={20} strokeWidth={activeTab === "captions" ? 2.5 : 2} />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Captions</span>
        </button>
      ) : (
        <button
          onClick={() => onTabChange("posts")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 transition-colors ${
            activeTab === "posts" ? "bg-white/14 text-white" : "text-white/50 hover:text-white/70"
          }`}
        >
          <LayoutGrid size={20} strokeWidth={activeTab === "posts" ? 2.5 : 2} />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Posts</span>
        </button>
      )}
      
      {showStrategyTab && (
        <button
          onClick={() => onTabChange("strategy")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 transition-colors ${
            activeTab === "strategy" ? "bg-white/14 text-white" : "text-white/50 hover:text-white/70"
          }`}
        >
          <List size={20} strokeWidth={activeTab === "strategy" ? 2.5 : 2} />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Strategy</span>
        </button>
      )}
      
      {/* Brand Pillars tab - show for all users who have completed onboarding */}
      <button
        onClick={() => onTabChange("pillars")}
        className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 transition-colors ${
          activeTab === "pillars" ? "bg-white/14 text-white" : "text-white/50 hover:text-white/70"
        }`}
      >
        <Columns size={20} strokeWidth={activeTab === "pillars" ? 2.5 : 2} />
        <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Pillars</span>
      </button>
    </div>
  )
}
