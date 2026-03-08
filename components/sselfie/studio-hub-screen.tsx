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

const sectionClass =
  "group stone-panel rounded-[24px] overflow-hidden"

const sectionInsetClass =
  "stone-panel rounded-[20px]"

const shellActionClass =
  "inline-flex h-10 items-center justify-center rounded-full border border-[color:var(--glass-border)] px-4 text-[10px] uppercase tracking-[0.24em] transition-all duration-300"

const secondaryActionClass = `${shellActionClass} stone-chip text-[color:var(--color-porcelain)] hover:bg-[rgba(175,170,162,0.16)]`

const quickActionClass =
  "stone-panel rounded-[20px] px-4 py-3 text-left transition-all duration-300 hover:bg-[rgba(175,170,162,0.16)]"

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
    <details open={defaultOpen} className={sectionClass}>
      <summary className="relative z-[1] flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-smoke)]">{title}</p>
          <p className="mt-1 text-sm text-[color:var(--text-accent)]">{subtitle}</p>
        </div>
        <span className="stone-chip inline-flex items-center rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)] transition-transform group-open:rotate-180">
          Open
        </span>
      </summary>
      <div className="relative z-[1] border-t border-[color:var(--glass-divider)] px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        {children}
      </div>
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
        <div className="stone-panel rounded-[24px] p-5 text-sm text-[color:var(--text-accent)]">
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
      <div className="stone-shell-panel relative overflow-hidden rounded-[32px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(240,237,232,0.18),transparent_24%),radial-gradient(circle_at_74%_16%,rgba(168,164,156,0.16),transparent_22%),linear-gradient(118deg,rgba(240,237,232,0.08)_0%,rgba(201,184,160,0.16)_18%,rgba(89,72,54,0.14)_42%,rgba(18,15,13,0.46)_100%)] opacity-90" />
        <div className="pointer-events-none absolute inset-y-0 left-[16%] hidden w-[38%] bg-[linear-gradient(90deg,transparent,rgba(240,237,232,0.22),transparent)] opacity-60 blur-3xl sm:block" />

        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-[color:var(--glass-divider)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-[color:var(--color-smoke)]">Studio</p>
              <h2
                className="mt-3 text-3xl font-extralight uppercase tracking-[0.08em] text-[color:var(--color-porcelain)] sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Content Hub
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-accent)]">
                Your photos, videos, and feed systems in one curated workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/studio?tab=maya#maya"
                className={`${shellActionClass} bg-[color:var(--color-whisper)] text-[color:var(--color-obsidian)] shadow-[0_12px_32px_rgba(0,0,0,0.18)] hover:bg-[color:var(--color-porcelain)]`}
              >
                Open Maya
              </Link>
              <Link
                href="/studio?tab=feed-planner#feed-planner"
                className={secondaryActionClass}
              >
                Open Feed
              </Link>
            </div>
          </div>

          {landingPagesPaused ? (
            <div className="stone-chip mt-4 rounded-[22px] px-4 py-3 text-xs text-[color:var(--text-accent)]">
              Landing pages are intentionally paused in Maya and Studio while the V2 quality relaunch is in progress.
            </div>
          ) : null}

          <div className="mt-5 grid gap-px overflow-hidden rounded-[24px] border border-[color:var(--glass-border-subtle)] bg-[color:var(--glass-divider)] sm:grid-cols-3">
            <div className={`${sectionInsetClass} px-4 py-3`}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)]">Photos</p>
              <p className="mt-1 text-2xl text-[color:var(--color-porcelain)]">{stats.photoCount}</p>
            </div>
            <div className={`${sectionInsetClass} px-4 py-3`}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)]">Videos</p>
              <p className="mt-1 text-2xl text-[color:var(--color-porcelain)]">{stats.videoCount}</p>
            </div>
            <div className={`${sectionInsetClass} px-4 py-3`}>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)]">Feed Systems</p>
              <p className="mt-1 text-2xl text-[color:var(--color-porcelain)]">{stats.feedCount}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Section title="Recent Photos" subtitle="Latest visuals from your gallery and brand assets.">
              <div className="grid gap-3 sm:grid-cols-2">
                {displayPhotos.slice(0, 6).map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.openUrl || "/studio?tab=gallery#gallery"}
                    className="group stone-panel overflow-hidden rounded-[22px]"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-[rgba(17,15,13,0.44)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.imageUrl}
                        alt={photo.prompt || "Studio photo"}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </div>
                    <div className="relative z-[1] space-y-1 border-t border-[color:var(--glass-divider)] px-3 py-2">
                      <p className="line-clamp-1 text-xs text-[color:var(--color-porcelain)]">{photo.prompt || "Studio image"}</p>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)]">
                        {photo.source} · {formatRelativeDate(photo.updatedAt)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </Section>

            <Section title="Recent Videos" subtitle="Completed reels and motion drafts generated with Maya.">
              {recentVideos.length === 0 ? (
                <div className="stone-panel rounded-[20px] p-4 text-sm text-[color:var(--text-accent)]">
                  No completed videos yet. Ask Maya to animate one of your gallery images.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentVideos.slice(0, 6).map((video) => (
                    <a
                      key={video.id}
                      href={video.openUrl || "/studio?tab=maya#maya/videos"}
                      className="stone-panel flex items-start gap-3 rounded-[20px] p-3 transition-colors hover:bg-[rgba(175,170,162,0.12)]"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[color:var(--glass-border-subtle)] bg-[rgba(17,15,13,0.42)]">
                        {video.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={video.thumbnailUrl} alt="Video thumbnail" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)]">
                            Video
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm text-[color:var(--color-porcelain)]">
                          {video.motionPrompt || "Motion prompt generated by Maya"}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)]">
                          {formatRelativeDate(video.updatedAt)}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-accent)]">Open</span>
                    </a>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Feed Systems" subtitle="Open active feed layouts and keep publishing momentum.">
              {feeds.length === 0 ? (
                <div className="stone-panel rounded-[20px] p-4 text-sm text-[color:var(--text-accent)]">
                  No feed systems yet. Ask Maya to build a 9-post system for your next launch.
                </div>
              ) : (
                <div className="space-y-3">
                  {feeds.slice(0, 8).map((feed) => (
                    <div key={feed.id} className="stone-panel rounded-[20px] px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-[color:var(--color-porcelain)]">{feed.title}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)]">
                            {feed.layoutType} · {feed.imageCount}/{feed.postCount} assets ·{" "}
                            {formatRelativeDate(feed.updatedAt)}
                          </p>
                        </div>
                        <Link
                          href={feed.openUrl}
                          className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-accent)] hover:text-[color:var(--color-porcelain)]"
                        >
                          Open
                        </Link>
                      </div>
                      <div className="mt-2">
                        <Link
                          href={feed.manageUrl}
                          className="stone-chip inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)] transition-colors hover:bg-[rgba(175,170,162,0.16)]"
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
                  className={quickActionClass}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">Maya Chat</p>
                  <p className="mt-1 text-sm text-[color:var(--color-porcelain)]">Create photos, videos, and concept cards</p>
                </Link>
                <Link
                  href="/studio?tab=gallery#gallery"
                  className={quickActionClass}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">Gallery</p>
                  <p className="mt-1 text-sm text-[color:var(--color-porcelain)]">Review and organize your saved visuals</p>
                </Link>
                <Link
                  href="/studio?tab=feed-planner#feed-planner"
                  className={quickActionClass}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">Feed Planner</p>
                  <p className="mt-1 text-sm text-[color:var(--color-porcelain)]">Edit post, reel, and carousel layout systems</p>
                </Link>
                <Link
                  href="/studio?tab=academy#academy"
                  className={quickActionClass}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">Academy</p>
                  <p className="mt-1 text-sm text-[color:var(--color-porcelain)]">Open guides and execution playbooks</p>
                </Link>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  )
}
