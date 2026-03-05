"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import UnifiedLoading from "./unified-loading"

interface HubFeedItem {
  id: string
  title: string
  status: string
  layoutType: string
  imageCount: number
  postCount: number
  updatedAt: string
  openUrl: string
  manageUrl: string
}

interface HubPageItem {
  id: string
  title: string
  pageType: string
  status: string
  liveUrl: string
  version: number
  updatedAt: string
  openInMayaUrl: string
  canRegenerate?: boolean
  regenerateUrl?: string
}

interface HubStats {
  feedCount: number
  pageCount: number
  photoCount: number
  videoCount: number
}

interface StudioHubResponse {
  success: boolean
  stats: HubStats
  feeds: HubFeedItem[]
  pages: HubPageItem[]
}

const fetcher = async (url: string): Promise<StudioHubResponse> => {
  const response = await fetch(url, { credentials: "include" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || "Failed to load Studio Hub")
  }
  return payload as StudioHubResponse
}

function formatRelativeDate(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "Just now"

  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return "Just now"
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function normalizePageType(value: string): string {
  if (value === "calendar") return "Calendar"
  if (value === "workbook") return "Workbook"
  return "Landing"
}

export default function StudioHubScreen() {
  const [regeneratingPageId, setRegeneratingPageId] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR("/api/studio/hub", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="h-full">
        <UnifiedLoading message="Loading your Studio Hub..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/80">
          Could not load your Studio Hub right now.
        </div>
      </div>
    )
  }

  const stats = data.stats || { feedCount: 0, pageCount: 0, photoCount: 0, videoCount: 0 }
  const feeds = Array.isArray(data.feeds) ? data.feeds : []
  const pages = Array.isArray(data.pages) ? data.pages : []

  const handleRegenerate = async (page: HubPageItem) => {
    if (!page.canRegenerate || !page.regenerateUrl || regeneratingPageId) return

    setRegeneratingPageId(page.id)
    try {
      const response = await fetch(page.regenerateUrl, {
        method: "POST",
        credentials: "include",
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to regenerate page")
      }
      await mutate()
      if (payload?.liveUrl) {
        window.open(payload.liveUrl, "_blank", "noopener,noreferrer")
      }
    } catch (error) {
      console.error("[Studio Hub] Regenerate failed:", error)
    } finally {
      setRegeneratingPageId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
      <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-[#080808]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.08),rgba(255,255,255,0)_44%),radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.05),rgba(255,255,255,0)_38%)]" />

        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/55">Studio Hub</p>
              <h2
                className="mt-3 text-3xl font-extralight uppercase tracking-[0.08em] text-white sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Maya Workspace
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/65">
                Your content operations center. Open active feed systems, continue drafts, and publish from one place.
              </p>
            </div>
            <Link
              href="/studio?tab=maya#maya"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/25 px-5 text-[10px] uppercase tracking-[0.28em] text-white/85 transition-colors hover:bg-white hover:text-black"
            >
              Open Maya
            </Link>
          </div>

          <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            <div className="bg-[rgba(10,10,10,0.9)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Feeds</p>
              <p className="mt-1 text-2xl text-white">{stats.feedCount}</p>
            </div>
            <div className="bg-[rgba(10,10,10,0.9)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Pages</p>
              <p className="mt-1 text-2xl text-white">{stats.pageCount}</p>
            </div>
            <div className="bg-[rgba(10,10,10,0.9)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Photos</p>
              <p className="mt-1 text-2xl text-white">{stats.photoCount}</p>
            </div>
            <div className="bg-[rgba(10,10,10,0.9)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Videos</p>
              <p className="mt-1 text-2xl text-white">{stats.videoCount}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/12 bg-[rgba(12,12,12,0.85)] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/60">Feed Planner</p>
                <Link
                  href="/studio?tab=feed-planner#feed-planner"
                  className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80 hover:bg-white hover:text-black"
                >
                  Open Planner
                </Link>
              </div>

              {feeds.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/65">
                  No feed systems yet. Ask Maya to create your first post, reel, and carousel run.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  {feeds.slice(0, 8).map((feed, index) => (
                    <div
                      key={feed.id}
                      className={`px-3 py-3 sm:px-4 ${index < Math.min(feeds.length, 8) - 1 ? "border-b border-white/10" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-white">{feed.title}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/50">
                            {feed.layoutType} · {feed.imageCount}/{feed.postCount} images · {formatRelativeDate(feed.updatedAt)}
                          </p>
                        </div>
                        <Link
                          href={feed.openUrl}
                          className="text-[10px] uppercase tracking-[0.16em] text-white/70 hover:text-white"
                        >
                          Open
                        </Link>
                      </div>
                      <div className="mt-2">
                        <Link
                          href={feed.manageUrl}
                          className="inline-flex rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75 hover:bg-white hover:text-black"
                        >
                          Edit Layout
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/12 bg-[rgba(12,12,12,0.85)] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/60">Pages & Workbooks</p>
                <Link
                  href="/studio?tab=maya#maya"
                  className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80 hover:bg-white hover:text-black"
                >
                  Open Maya
                </Link>
              </div>

              {pages.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/65">
                  No page assets yet. Landing pages are now managed from Studio to keep chat clean and focused.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  {pages.slice(0, 10).map((page, index) => (
                    <div
                      key={page.id}
                      className={`px-3 py-3 sm:px-4 ${index < Math.min(pages.length, 10) - 1 ? "border-b border-white/10" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-white">{page.title}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/50">
                            {normalizePageType(page.pageType)} · v{page.version} · {formatRelativeDate(page.updatedAt)}
                          </p>
                        </div>
                        {page.liveUrl ? (
                          <a
                            href={page.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] uppercase tracking-[0.16em] text-white/70 hover:text-white"
                          >
                            Open
                          </a>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          href={page.openInMayaUrl}
                          className="inline-flex rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75 hover:bg-white hover:text-black"
                        >
                          Continue
                        </Link>
                        {page.canRegenerate && page.regenerateUrl ? (
                          <button
                            type="button"
                            onClick={() => handleRegenerate(page)}
                            disabled={regeneratingPageId === page.id}
                            className="inline-flex rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/75 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {regeneratingPageId === page.id ? "Regenerating..." : "Regenerate"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
