"use client"

import Link from "next/link"
import type React from "react"
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

interface HubPhotoItem {
  id: string
  imageUrl: string
  prompt: string
  source: string
  updatedAt: string
  openUrl: string
}

interface HubVideoItem {
  id: string
  videoUrl: string
  thumbnailUrl: string
  motionPrompt: string
  updatedAt: string
  openUrl: string
}

interface HubStats {
  feedCount: number
  pageCount: number
  photoCount: number
  videoCount: number
}

interface StudioHubResponse {
  success: boolean
  landingPagesPaused?: boolean
  stats: HubStats
  feeds: HubFeedItem[]
  pages: Array<Record<string, unknown>>
  recentPhotos?: HubPhotoItem[]
  recentVideos?: HubVideoItem[]
}

const fallbackHubImages = [
  "/assets/brand-strategy/hero.png",
  "/assets/brand-strategy/woman.png",
  "/assets/brand-strategy/pillar1.png",
  "/assets/brand-strategy/pillar2.png",
]

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

function Section({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string
  subtitle: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-white/12 bg-[rgba(10,12,18,0.62)] backdrop-blur-xl"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/55">{title}</p>
          <p className="mt-1 text-sm text-white/75">{subtitle}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/55 transition-transform group-open:rotate-180">
          Open
        </span>
      </summary>
      <div className="border-t border-white/10 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div>
    </details>
  )
}

export default function StudioHubScreen() {
  const { data, error, isLoading } = useSWR("/api/studio/hub", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="h-full">
        <UnifiedLoading message="Loading your content hub..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/80">
          Could not load your Content Hub right now.
        </div>
      </div>
    )
  }

  const stats = data.stats || { feedCount: 0, pageCount: 0, photoCount: 0, videoCount: 0 }
  const feeds = Array.isArray(data.feeds) ? data.feeds : []
  const recentPhotos = Array.isArray(data.recentPhotos) ? data.recentPhotos : []
  const recentVideos = Array.isArray(data.recentVideos) ? data.recentVideos : []
  const landingPagesPaused = data.landingPagesPaused !== false

  const displayPhotos =
    recentPhotos.length > 0
      ? recentPhotos
      : fallbackHubImages.map((imageUrl, index) => ({
          id: `fallback-${index + 1}`,
          imageUrl,
          prompt: "Brand board inspiration",
          source: "fallback",
          updatedAt: new Date().toISOString(),
          openUrl: "/studio?tab=gallery#gallery",
        }))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
      <div className="relative overflow-hidden rounded-[28px] border border-white/14 bg-[rgba(7,9,14,0.78)] shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(196,177,150,0.22),transparent_45%),radial-gradient(circle_at_84%_15%,rgba(238,229,215,0.14),transparent_42%),linear-gradient(170deg,rgba(24,19,15,0.95),rgba(14,11,9,0.84))]" />

        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-white/55">Studio</p>
              <h2
                className="mt-3 text-3xl font-extralight uppercase tracking-[0.08em] text-white sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Content Hub
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                Your photos, videos, and feed systems in one curated workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/studio?tab=maya#maya"
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/25 px-4 text-[10px] uppercase tracking-[0.24em] text-white/90 transition-colors hover:bg-white hover:text-black"
              >
                Open Maya
              </Link>
              <Link
                href="/studio?tab=feed-planner#feed-planner"
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/20 px-4 text-[10px] uppercase tracking-[0.24em] text-white/80 transition-colors hover:bg-white/15"
              >
                Open Feed
              </Link>
            </div>
          </div>

          {landingPagesPaused ? (
            <div className="mt-4 rounded-2xl border border-white/12 bg-[rgba(255,255,255,0.04)] px-4 py-3 text-xs text-white/70">
              Landing pages are intentionally paused in Maya and Studio while the V2 quality relaunch is in progress.
            </div>
          ) : null}

          <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
            <div className="bg-[rgba(10,12,18,0.82)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Photos</p>
              <p className="mt-1 text-2xl text-white">{stats.photoCount}</p>
            </div>
            <div className="bg-[rgba(10,12,18,0.82)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Videos</p>
              <p className="mt-1 text-2xl text-white">{stats.videoCount}</p>
            </div>
            <div className="bg-[rgba(10,12,18,0.82)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Feed Systems</p>
              <p className="mt-1 text-2xl text-white">{stats.feedCount}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Section title="Recent Photos" subtitle="Latest visuals from your gallery and brand assets.">
              <div className="grid gap-3 sm:grid-cols-2">
                {displayPhotos.slice(0, 6).map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.openUrl || "/studio?tab=gallery#gallery"}
                    className="group overflow-hidden rounded-2xl border border-white/12 bg-[rgba(0,0,0,0.2)]"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-black/35">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.imageUrl}
                        alt={photo.prompt || "Studio photo"}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </div>
                    <div className="space-y-1 border-t border-white/10 px-3 py-2">
                      <p className="line-clamp-1 text-xs text-white">{photo.prompt || "Studio image"}</p>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">
                        {photo.source} · {formatRelativeDate(photo.updatedAt)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </Section>

            <Section title="Recent Videos" subtitle="Completed reels and motion drafts generated with Maya.">
              {recentVideos.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/65">
                  No completed videos yet. Ask Maya to animate one of your gallery images.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentVideos.slice(0, 6).map((video) => (
                    <a
                      key={video.id}
                      href={video.openUrl || "/studio?tab=maya#maya/videos"}
                      className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3 transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {video.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={video.thumbnailUrl} alt="Video thumbnail" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-white/45">
                            Video
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm text-white">
                          {video.motionPrompt || "Motion prompt generated by Maya"}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/55">
                          {formatRelativeDate(video.updatedAt)}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-white/70">Open</span>
                    </a>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Feed Systems" subtitle="Open active feed layouts and keep publishing momentum.">
              {feeds.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/65">
                  No feed systems yet. Ask Maya to build a 9-post system for your next launch.
                </div>
              ) : (
                <div className="space-y-3">
                  {feeds.slice(0, 8).map((feed) => (
                    <div key={feed.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-white">{feed.title}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/55">
                            {feed.layoutType} · {feed.imageCount}/{feed.postCount} assets ·{" "}
                            {formatRelativeDate(feed.updatedAt)}
                          </p>
                        </div>
                        <Link
                          href={feed.openUrl}
                          className="text-[10px] uppercase tracking-[0.16em] text-white/75 hover:text-white"
                        >
                          Open
                        </Link>
                      </div>
                      <div className="mt-2">
                        <Link
                          href={feed.manageUrl}
                          className="inline-flex rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80 transition-colors hover:bg-white hover:text-black"
                        >
                          Edit Layout
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Quick Actions" subtitle="Jump into creation without hunting through menus.">
              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href="/studio?tab=maya#maya"
                  className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.08]"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Maya Chat</p>
                  <p className="mt-1 text-sm text-white">Create photos, videos, and concept cards</p>
                </Link>
                <Link
                  href="/studio?tab=gallery#gallery"
                  className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.08]"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Gallery</p>
                  <p className="mt-1 text-sm text-white">Review and organize your saved visuals</p>
                </Link>
                <Link
                  href="/studio?tab=feed-planner#feed-planner"
                  className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.08]"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Feed Planner</p>
                  <p className="mt-1 text-sm text-white">Edit post, reel, and carousel layout systems</p>
                </Link>
                <Link
                  href="/studio?tab=academy#academy"
                  className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.08]"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">Academy</p>
                  <p className="mt-1 text-sm text-white">Open guides and execution playbooks</p>
                </Link>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  )
}
