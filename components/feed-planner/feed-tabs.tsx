"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { useFeedNav } from "./feed-nav-context"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

export type FeedTab = "plan" | "grid" | "profile" | "posts" | "captions" | "strategy" | "pillars"

interface FeedTabsProps {
  activeTab: FeedTab
  onTabChange: (tab: FeedTab) => void
  access?: FeedPlannerAccess // Phase 4.3: Access control object (replaces mode prop)
  currentFeedId?: number | null // 2026-07-07: highlights the selected plan in the switcher
}

interface FeedListEntry {
  id: number
  title: string
  created_at: string
  layout_type: string
  period_month: string | null
  image_count: number
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/** "2026-07" -> "July 2026"; classic grids -> short creation-date label. */
function planLabel(feed: FeedListEntry): string {
  if (feed.period_month) {
    const [year, month] = feed.period_month.split("-").map(Number)
    const name = MONTH_NAMES[(month || 1) - 1]
    if (name && year) return `${name} ${year}`
  }
  const created = new Date(feed.created_at)
  if (!Number.isNaN(created.getTime())) {
    return `Grid · ${created.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  }
  return feed.title || `Grid ${feed.id}`
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json())

export default function FeedTabs({ activeTab, onTabChange, access, currentFeedId }: FeedTabsProps) {
  // For free users: Grid - Captions - Strategy - Ideas (all unchanged, out of scope here).
  // Paid/membership uses two distinct navigation levels: Plan / Grid / Profile switches the
  // current workspace, while the smaller grid switcher changes which saved month is open.
  const isFreeUser = access?.isFree ?? false
  const showStrategyTab = isFreeUser && (access?.canGenerateStrategy ?? true)

  const router = useRouter()
  const feedNav = useFeedNav()
  const [showAllPlans, setShowAllPlans] = useState(false)

  // Plan list for the switcher (paid/membership only; previews are style tests, not plans).
  const { data: feedListData } = useSWR(!isFreeUser ? "/api/feed/list" : null, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
  })
  // Cap the row at the 8 most recent plans: accounts with a long test history (dozens of
  // abandoned grids) would otherwise get an endless pill row. Older feeds stay in the DB and
  // on the standalone route; the switcher is for the plans she's actually working with.
  const allPlans: FeedListEntry[] = Array.isArray(feedListData?.feeds)
    ? feedListData.feeds.filter((f: FeedListEntry) => f.layout_type !== "preview")
    : []
  const plans = showAllPlans ? allPlans : allPlans.slice(0, 8)

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
    } else if (!isFreeUser && !(["plan", "grid", "profile"] as FeedTab[]).includes(activeTab)) {
      onTabChange("plan")
    }
  }, [isFreeUser, activeTab, onTabChange])

  const pillClass = (selected: boolean) =>
    `min-h-11 shrink-0 rounded-full border px-4 text-[10px] uppercase tracking-[0.14em] transition-colors ${
      selected
        ? "border-[#0D0E10] bg-[#0D0E10] text-white"
        : "border-[#C5C6C8] bg-white text-[#4F5052] hover:border-[#0D0E10]/40"
    }`

  if (!isFreeUser) {
    return (
      <div className="space-y-3 border-b border-[color:var(--app-glass-border)] px-3 py-3 sm:px-4">
        <div
          role="group"
          aria-label="Calendar workspace"
          className="grid grid-cols-3 rounded-[10px] bg-[color:var(--app-btn-secondary-bg)] p-1"
        >
          {(["plan", "grid", "profile"] as const).map(tab => (
            <button
              type="button"
              key={tab}
              aria-pressed={activeTab === tab}
              onClick={() => {
                onTabChange(tab)
                void trackAnalyticsEvent({
                  event: "calendar_workspace_opened",
                  properties: { workspace: tab, feedId: currentFeedId ?? null },
                })
              }}
              className={`min-h-11 rounded-[8px] px-3 text-[11px] font-medium transition-all active:scale-[0.98] ${
                activeTab === tab
                  ? "bg-white text-[color:var(--app-text-primary)] shadow-[var(--app-shadow-soft)]"
                  : "text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)]"
              }`}
            >
              {tab === "plan" ? "Plan" : tab === "grid" ? "Grid" : "Profile"}
            </button>
          ))}
        </div>

        {plans.length >= 2 && (
          <div>
            <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--app-text-secondary)]">
              Your grids
            </p>
            <div
              role="group"
              aria-label="Choose a grid"
              className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
            >
              {plans.map(plan => (
                <button
                  type="button"
                  key={plan.id}
                  aria-pressed={plan.id === currentFeedId}
                  onClick={() => {
                    if (plan.id === currentFeedId) return
                    if (feedNav) feedNav.navigateToFeed(plan.id)
                    else router.push(`/feed-planner?feedId=${plan.id}`)
                  }}
                  className={pillClass(plan.id === currentFeedId)}
                >
                  {planLabel(plan)}
                </button>
              ))}
              {allPlans.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllPlans(value => !value)}
                  aria-expanded={showAllPlans}
                  className={pillClass(false)}
                >
                  {showAllPlans ? "Recent only" : `View all (${allPlans.length})`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mb-3 overflow-x-auto px-3 [scrollbar-width:none]">
      <div className="flex min-w-max gap-2">
        <button
          type="button"
          aria-pressed={activeTab === "grid"}
          onClick={() => onTabChange("grid")}
          className={pillClass(activeTab === "grid")}
        >
          Grid
        </button>

        {/* Free users only: Captions tab. Paid/membership: Posts folded into the grid + the
            month strip, so no second tab for it. */}
        <button
          type="button"
          aria-pressed={activeTab === "captions"}
          onClick={() => onTabChange("captions")}
          className={pillClass(activeTab === "captions")}
        >
          Captions
        </button>

        {showStrategyTab && (
          <button
            type="button"
            aria-pressed={activeTab === "strategy"}
            onClick={() => onTabChange("strategy")}
            className={pillClass(activeTab === "strategy")}
          >
            Plan
          </button>
        )}

        {/* Brand Pillars tab - free users only. Paid/membership: pillars fold into the month
            strip + per-tile pillar tags Maya already writes when she auto-drafts the month. */}
        <button
          type="button"
          aria-pressed={activeTab === "pillars"}
          onClick={() => onTabChange("pillars")}
          className={pillClass(activeTab === "pillars")}
        >
          Ideas
        </button>
      </div>
    </div>
  )
}
