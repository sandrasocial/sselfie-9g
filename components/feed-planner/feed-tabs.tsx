"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"
import { useFeedNav } from "./feed-nav-context"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { CalendarDays, Grid3X3 } from "lucide-react"

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
  // Paid/membership opens on the Instagram grid. Calendar is a secondary view and profile
  // details stay in the Instagram header instead of becoming a separate destination.
  const isFreeUser = access?.isFree ?? false
  const showStrategyTab = isFreeUser && (access?.canGenerateStrategy ?? true)

  const router = useRouter()
  const feedNav = useFeedNav()
  const [planMenuOpen, setPlanMenuOpen] = useState(false)

  // Plan list for the switcher (paid/membership only; previews are style tests, not plans).
  const { data: feedListData } = useSWR(!isFreeUser ? "/api/feed/list" : null, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
  })
  const allPlans: FeedListEntry[] = Array.isArray(feedListData?.feeds)
    ? feedListData.feeds.filter((f: FeedListEntry) => f.layout_type !== "preview")
    : []
  const currentPlan = allPlans.find(plan => plan.id === currentFeedId) ?? allPlans[0]

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
    } else if (!isFreeUser && !(["plan", "grid"] as FeedTab[]).includes(activeTab)) {
      onTabChange("grid")
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
      <div className="border-b border-[color:var(--app-glass-border)] px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3" aria-label="Calendar view options">
          {allPlans.length >= 2 ? (
            <div className="relative min-w-0" role="group" aria-label="Choose a grid">
              <span className="sr-only">Your grids</span>
              <button
                type="button"
                aria-label="Choose a grid"
                aria-expanded={planMenuOpen}
                onClick={() => setPlanMenuOpen(open => !open)}
                className="flex min-h-11 max-w-[14rem] items-center gap-2 rounded-[8px] border border-[#C5C6C8] bg-white px-3 text-left text-[11px] text-[#0D0E10]"
              >
                <span className="truncate">
                  {currentPlan ? planLabel(currentPlan) : "Current grid"}
                </span>
                <span aria-hidden className="text-[#6D6E70]">
                  ⌄
                </span>
              </button>
              {planMenuOpen ? (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-[10px] border border-[#C5C6C8] bg-white p-1 shadow-[0_16px_40px_rgba(13,14,16,0.14)]">
                  {allPlans.map(plan => (
                    <button
                      type="button"
                      key={plan.id}
                      aria-pressed={plan.id === currentFeedId}
                      onClick={() => {
                        setPlanMenuOpen(false)
                        if (plan.id === currentFeedId) return
                        if (feedNav) feedNav.navigateToFeed(plan.id)
                        else router.push(`/feed-planner?feedId=${plan.id}`)
                      }}
                      className={`min-h-11 w-full rounded-[7px] px-3 text-left text-[11px] ${
                        plan.id === currentFeedId
                          ? "bg-[#0D0E10] text-white"
                          : "text-[#4F5052] hover:bg-[#F8FAFA]"
                      }`}
                    >
                      {planLabel(plan)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div />
          )}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={activeTab === "grid"}
              onClick={() => {
                onTabChange("grid")
                void trackAnalyticsEvent({
                  event: "calendar_workspace_opened",
                  properties: { workspace: "grid", feedId: currentFeedId ?? null },
                })
              }}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-[8px] border transition-colors active:scale-[0.98] ${
                activeTab === "grid"
                  ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                  : "border-[#C5C6C8] bg-white text-[#4F5052] hover:border-[#818283]"
              }`}
            >
              <Grid3X3 size={18} strokeWidth={1.8} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Calendar view"
              aria-pressed={activeTab === "plan"}
              onClick={() => {
                onTabChange("plan")
                void trackAnalyticsEvent({
                  event: "calendar_workspace_opened",
                  properties: { workspace: "plan", feedId: currentFeedId ?? null },
                })
              }}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-[8px] border transition-colors active:scale-[0.98] ${
                activeTab === "plan"
                  ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                  : "border-[#C5C6C8] bg-white text-[#4F5052] hover:border-[#818283]"
              }`}
            >
              <CalendarDays size={18} strokeWidth={1.8} aria-hidden />
            </button>
          </div>
        </div>
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
