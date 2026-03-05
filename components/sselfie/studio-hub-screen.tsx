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
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Studio Hub</p>
        <h2 className="mt-2 text-xl text-white sm:text-2xl">Everything Maya created, in one place.</h2>
        <p className="mt-2 text-sm text-white/65">
          Open assets, continue editing in chat, or jump into Feed Planner to rearrange your layout.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Feeds</p>
            <p className="mt-1 text-lg text-white">{stats.feedCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Pages</p>
            <p className="mt-1 text-lg text-white">{stats.pageCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Photos</p>
            <p className="mt-1 text-lg text-white">{stats.photoCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Videos</p>
            <p className="mt-1 text-lg text-white">{stats.videoCount}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Feed Planner</p>
            <Link href="/studio?tab=feed-planner#feed-planner" className="text-[11px] uppercase tracking-[0.18em] text-white/70 hover:text-white">
              Open Planner
            </Link>
          </div>

          {feeds.length === 0 ? (
            <p className="text-sm text-white/60">No feeds yet. Ask Maya to build your first feed plan.</p>
          ) : (
            <div className="space-y-2">
              {feeds.slice(0, 8).map((feed) => (
                <div key={feed.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white">{feed.title}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/55">
                        {feed.layoutType} · {feed.imageCount}/{feed.postCount} images · {formatRelativeDate(feed.updatedAt)}
                      </p>
                    </div>
                    <Link href={feed.openUrl} className="text-[10px] uppercase tracking-[0.16em] text-white/70 hover:text-white">
                      Open
                    </Link>
                  </div>
                  <div className="mt-2">
                    <Link
                      href={feed.manageUrl}
                      className="inline-flex rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/80 hover:bg-white/[0.12]"
                    >
                      Edit / Rearrange
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Maya Assets</p>
            <Link href="/studio?tab=maya#maya" className="text-[11px] uppercase tracking-[0.18em] text-white/70 hover:text-white">
              Open Maya
            </Link>
          </div>

          {pages.length === 0 ? (
            <p className="text-sm text-white/60">
              No landing pages or workbooks yet. Ask Maya to create one and it will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {pages.slice(0, 10).map((page) => (
                <div key={page.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white">{page.title}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/55">
                        {normalizePageType(page.pageType)} · v{page.version} · {formatRelativeDate(page.updatedAt)}
                      </p>
                    </div>
                    {page.liveUrl ? (
                      <a href={page.liveUrl} target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-[0.16em] text-white/70 hover:text-white">
                        Open
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={page.openInMayaUrl}
                        className="inline-flex rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/80 hover:bg-white/[0.12]"
                      >
                        Continue in Maya
                      </Link>
                      {page.canRegenerate && page.regenerateUrl ? (
                        <button
                          type="button"
                          onClick={() => handleRegenerate(page)}
                          disabled={regeneratingPageId === page.id}
                          className="inline-flex rounded-lg border border-white/15 bg-black/35 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/80 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {regeneratingPageId === page.id ? "Regenerating..." : "Regenerate"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
