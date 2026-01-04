"use client"

import { Grid3x3, LayoutGrid, List } from "lucide-react"

interface FeedTabsProps {
  activeTab: "grid" | "posts" | "strategy"
  onTabChange: (tab: "grid" | "posts" | "strategy") => void
}

export default function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="flex border-t border-stone-200">
      <button
        onClick={() => onTabChange("grid")}
        className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
          activeTab === "grid" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
        }`}
      >
        <Grid3x3 size={20} strokeWidth={activeTab === "grid" ? 2.5 : 2} />
        <span className="text-xs font-medium uppercase tracking-wider">Grid</span>
      </button>
      <button
        onClick={() => onTabChange("posts")}
        className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
          activeTab === "posts" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
        }`}
      >
        <LayoutGrid size={20} strokeWidth={activeTab === "posts" ? 2.5 : 2} />
        <span className="text-xs font-medium uppercase tracking-wider">Posts</span>
      </button>
      <button
        onClick={() => onTabChange("strategy")}
        className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
          activeTab === "strategy" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
        }`}
      >
        <List size={20} strokeWidth={activeTab === "strategy" ? 2.5 : 2} />
        <span className="text-xs font-medium uppercase tracking-wider">Strategy</span>
      </button>
    </div>
  )
}

