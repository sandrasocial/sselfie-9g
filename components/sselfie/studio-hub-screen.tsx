"use client"

import Link from "next/link"
import type React from "react"
import { useState } from "react"
import useSWR from "swr"
import UnifiedLoading from "./unified-loading"

interface HubFeedItem {
  id: string
  title: string
  status: string
  layoutType: string
  imageCount: number
  postCount: number
  previewImageUrls?: string[]
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

interface HubPageItem {
  id: string
  title: string
  pageType: string
  status: string
  liveUrl: string
  version: number
  updatedAt: string
  openInMayaUrl: string
  canRegenerate: boolean
  regenerateUrl: string
}

interface HubStats {
  feedCount: number
  photoCount: number
  videoCount: number
}

interface StudioHubResponse {
  success: boolean
  stats: HubStats
  feeds: HubFeedItem[]
  pages: HubPageItem[]
  recentPhotos?: HubPhotoItem[]
  recentVideos?: HubVideoItem[]
}

interface HubDestination {
  href: string
  label: string
}

const fallbackHubImages = [
  "/assets/brand-strategy/hero.png",
  "/assets/brand-strategy/woman.png",
  "/assets/brand-strategy/pillar1.png",
  "/assets/brand-strategy/pillar2.png",
]

const sectionClass =
  "group stone-panel rounded-[24px] overflow-hidden"

const shellActionClass =
  "inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--glass-border)] px-4 text-[11px] uppercase tracking-[0.2em] transition-all duration-300 sm:h-10 sm:text-[10px] sm:tracking-[0.24em]"

const secondaryActionClass = `${shellActionClass} stone-chip text-[color:var(--color-porcelain)] hover:bg-[rgba(175,170,162,0.16)]`

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
  if (!Number.isFinite(date.getTime())) return "Recent"
  if (date.getFullYear() <= 2000) return "Recent"

  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return "Recent"
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return "Recent"
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function cleanFeedTitle(title: string): string {
  return title
    .replace(/\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4}$/u, "")
    .replace(/\s{2,}/gu, " ")
    .trim()
}

function formatFeedLayoutLabel(layoutType: string): string {
  const normalized = (layoutType || "").toLowerCase()
  if (normalized === "grid_3x3") return "9-post plan"
  if (normalized === "grid_3x4") return "12-post plan"
  if (normalized === "preview") return "Preview plan"
  return "Feed plan"
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
      <summary className="relative z-[1] flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:min-h-0 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-porcelain)] sm:text-[10px] sm:tracking-[0.24em]">{title}</p>
          <p className="mt-1 text-sm text-[color:var(--color-porcelain)]">{subtitle}</p>
        </div>
        <span className="stone-chip inline-flex items-center rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-porcelain)]">
          View
        </span>
      </summary>
      <div className="relative z-[1] border-t border-[color:var(--glass-divider)] px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        {children}
      </div>
    </details>
  )
}

function resolvePhotoDestination(photo: HubPhotoItem): HubDestination {
  const source = (photo.source || "").toLowerCase()
  const params = new URLSearchParams()
  params.set("tab", "gallery")

  if (source === "ai_images") params.set("hubImageId", `ai_${photo.id}`)
  if (source === "generated_images") params.set("hubImageId", `gen_${photo.id}`)
  if (photo.imageUrl) params.set("hubImageUrl", photo.imageUrl)

  return {
    href: `/studio?${params.toString()}#gallery`,
    label: "Open it",
  }
}

function resolveVideoDestination(video: HubVideoItem): HubDestination {
  const params = new URLSearchParams()
  params.set("tab", "gallery")
  params.set("hubVideoId", video.id)

  return {
    href: `/studio?${params.toString()}#gallery`,
    label: "Open it",
  }
}

function sourceTagLabel(source: string): string {
  const normalized = (source || "").toLowerCase()
  if (normalized === "ai_images") return "Maya"
  if (normalized === "generated_images") return "Saved"
  if (normalized === "brand_assets") return "Brand"
  return "Library"
}

export default function StudioHubScreen() {
  const [visibleFeedCount, setVisibleFeedCount] = useState(3)
  const [curationView, setCurationView] = useState<"latest" | "campaign" | "archive">("latest")
  const { data, error, isLoading } = useSWR("/api/studio/hub", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="h-full">
        <UnifiedLoading message="Maya is pulling your content..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="stone-panel rounded-[24px] p-5 text-sm text-[color:var(--text-accent)]">
          I couldn&apos;t load your content right now. Try again in a second.
        </div>
      </div>
    )
  }

  const stats = data.stats || { feedCount: 0, photoCount: 0, videoCount: 0 }
  const feeds = Array.isArray(data.feeds) ? data.feeds : []
  const recentPhotos = Array.isArray(data.recentPhotos) ? data.recentPhotos : []
  const recentVideos = Array.isArray(data.recentVideos) ? data.recentVideos : []

  const displayPhotos =
    recentPhotos.length > 0
      ? recentPhotos
      : fallbackHubImages.map((imageUrl, index) => ({
          id: `fallback-${index + 1}`,
          imageUrl,
          prompt: "Brand idea",
          source: "fallback",
          updatedAt: new Date().toISOString(),
          openUrl: "/studio?tab=gallery#gallery",
        }))
  const featuredPhoto = displayPhotos[0]
  const featuredVideo = recentVideos[0]
  const featuredFeed = feeds[0]
  const featuredPhotoDestination = featuredPhoto ? resolvePhotoDestination(featuredPhoto) : null
  const featuredVideoDestination = featuredVideo ? resolveVideoDestination(featuredVideo) : null
  const photoBoardItems = curationView === "archive" ? displayPhotos.slice(0, 9) : displayPhotos.slice(0, 6)
  const videoBoardItems = curationView === "archive" ? recentVideos.slice(0, 2) : recentVideos.slice(0, 4)
  const showPhotoSection = curationView !== "campaign"
  const showVideoSection = curationView !== "archive"
  const curationLabels: Record<"latest" | "campaign" | "archive", string> = {
    latest: "For you",
    campaign: "Campaign",
    archive: "Archive",
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-7">
      <div className="stone-shell-panel relative overflow-hidden rounded-[32px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(240,237,232,0.18),transparent_24%),radial-gradient(circle_at_74%_16%,rgba(168,164,156,0.16),transparent_22%),linear-gradient(118deg,rgba(240,237,232,0.08)_0%,rgba(201,184,160,0.16)_18%,rgba(89,72,54,0.14)_42%,rgba(18,15,13,0.46)_100%)] opacity-90" />
        <div className="pointer-events-none absolute inset-y-0 left-[16%] hidden w-[38%] bg-[linear-gradient(90deg,transparent,rgba(240,237,232,0.22),transparent)] opacity-60 blur-3xl sm:block" />

        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-[color:var(--glass-divider)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-[color:var(--color-porcelain)]">Maya</p>
              <h2
                className="mt-3 text-[2rem] font-extralight uppercase tracking-[0.06em] text-[color:var(--color-porcelain)] sm:text-4xl sm:tracking-[0.08em]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Your content home
              </h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[color:var(--color-porcelain)] sm:text-sm">
                Everything for your personal brand, in one calm place.
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Link
                href="/studio?tab=maya#maya"
                className={`${shellActionClass} w-full bg-[color:var(--color-whisper)] text-[color:var(--color-obsidian)] shadow-[0_12px_32px_rgba(0,0,0,0.18)] hover:bg-[color:var(--color-porcelain)] sm:w-auto`}
              >
                Chat with Maya
              </Link>
              <Link
                href="/studio?tab=feed-planner#feed-planner"
                className={`${secondaryActionClass} w-full sm:w-auto`}
              >
                See your feed
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-12">
            <Link
              href={featuredPhotoDestination?.href || "/studio?tab=gallery#gallery"}
              className="group stone-panel relative overflow-hidden rounded-[24px] lg:col-span-7"
            >
              <div className="relative aspect-[5/4] overflow-hidden bg-[rgba(17,15,13,0.44)] sm:aspect-[8/5]">
                {featuredPhoto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredPhoto.imageUrl}
                      alt={featuredPhoto.prompt || "Featured studio visual"}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,12,11,0.72)] via-[rgba(13,12,11,0.2)] to-transparent" />
                    <div className="absolute left-3 top-3">
                      <span className="stone-chip inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">
                        Picked for you
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="line-clamp-1 text-base text-[color:var(--color-porcelain)] sm:text-lg">
                        {featuredPhoto.prompt || "Your latest brand photo"}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">
                        {sourceTagLabel(featuredPhoto.source)} · {formatRelativeDate(featuredPhoto.updatedAt)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[color:var(--color-porcelain)]">
                    Start your first brand image with Maya
                  </div>
                )}
              </div>
            </Link>

            <div className="grid gap-3 lg:col-span-5">
              <Link
                href={featuredVideoDestination?.href || "/studio?tab=gallery#gallery"}
                className="group stone-panel relative overflow-hidden rounded-[22px]"
              >
                <div className="relative aspect-[5/3] overflow-hidden bg-[rgba(17,15,13,0.44)]">
                  {featuredVideo?.thumbnailUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={featuredVideo.thumbnailUrl}
                        alt="Recent motion preview"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,12,11,0.72)] to-transparent" />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-porcelain)]">
                      Video
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="line-clamp-1 text-sm text-[color:var(--color-porcelain)]">
                      {featuredVideo?.motionPrompt || "Your latest brand video"}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">
                      Recent video
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href={featuredFeed?.openUrl || "/studio?tab=feed-planner#feed-planner"}
                className="group stone-panel relative overflow-hidden rounded-[22px] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-porcelain)]">Feed</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">
                    {featuredFeed ? formatRelativeDate(featuredFeed.updatedAt) : "new"}
                  </p>
                </div>
                <p className="mt-2 line-clamp-1 text-sm text-[color:var(--color-porcelain)]">
                  {featuredFeed ? cleanFeedTitle(featuredFeed.title) : "Build your first feed plan"}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">
                  {featuredFeed
                    ? `${formatFeedLayoutLabel(featuredFeed.layoutType)} · ${featuredFeed.imageCount}/${featuredFeed.postCount} assets`
                    : "Go to feed planner"}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-1">
                  {(featuredFeed?.previewImageUrls || []).slice(0, 3).map((url, index) => (
                    <div key={`${featuredFeed?.id || "feed"}-${index}`} className="aspect-square overflow-hidden rounded-[10px] bg-[rgba(17,15,13,0.44)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Feed snapshot" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ))}
                  {!featuredFeed?.previewImageUrls?.length ? (
                    <>
                      <div className="aspect-square rounded-[10px] bg-[rgba(240,237,232,0.08)]" />
                      <div className="aspect-square rounded-[10px] bg-[rgba(240,237,232,0.1)]" />
                      <div className="aspect-square rounded-[10px] bg-[rgba(240,237,232,0.12)]" />
                    </>
                  ) : null}
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/studio?tab=maya#maya"
              className="stone-chip inline-flex h-9 items-center rounded-full px-4 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)] transition-colors hover:bg-[rgba(175,170,162,0.16)]"
            >
              Create
            </Link>
            <Link
              href="/studio?tab=gallery#gallery"
              className="stone-chip inline-flex h-9 items-center rounded-full px-4 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)] transition-colors hover:bg-[rgba(175,170,162,0.16)]"
            >
              Photos
            </Link>
            <Link
              href="/studio?tab=feed-planner#feed-planner"
              className="stone-chip inline-flex h-9 items-center rounded-full px-4 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)] transition-colors hover:bg-[rgba(175,170,162,0.16)]"
            >
              Feed
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="stone-chip inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">
              {stats.photoCount} photos made
            </span>
            <span className="stone-chip inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">
              {stats.videoCount} videos made
            </span>
            <span className="stone-chip inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">
              {stats.feedCount} feed plans
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["latest", "campaign", "archive"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setCurationView(view)}
                className={`stone-chip inline-flex h-9 items-center rounded-full px-4 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  curationView === view
                    ? "bg-[rgba(240,237,232,0.22)] text-[color:var(--color-porcelain)]"
                    : "text-[color:var(--color-porcelain)] hover:bg-[rgba(175,170,162,0.16)]"
                }`}
              >
                {curationLabels[view]}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {showPhotoSection ? (
            <Section
              title={curationView === "archive" ? "Photo archive" : "Recent photos"}
              subtitle="Tap any photo to open it."
            >
              <div className="grid auto-rows-[112px] grid-cols-2 gap-2 sm:auto-rows-[132px] sm:grid-cols-3">
                {photoBoardItems.map((photo, index) => {
                  const destination = resolvePhotoDestination(photo)

                  return (
                    <Link
                      key={photo.id}
                      href={destination.href}
                      className={`group relative overflow-hidden rounded-[18px] border border-[color:var(--glass-border-subtle)] bg-[rgba(17,15,13,0.44)] ${
                        index === 0 ? "col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : ""
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.imageUrl}
                        alt={photo.prompt || "Studio photo"}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,12,11,0.62)] via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                        <span className="stone-chip inline-flex rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[color:var(--color-porcelain)]">
                          {sourceTagLabel(photo.source)}
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">View</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </Section>
            ) : null}

            {showVideoSection ? (
            <Section title="Recent videos" subtitle="Tap any clip to open it.">
              {recentVideos.length === 0 ? (
                <div className="stone-panel rounded-[20px] p-4 text-sm text-[color:var(--color-porcelain)]">
                  No videos yet. Ask Maya to turn one of your photos into a video.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {videoBoardItems.map((video, index) => {
                    const destination = resolveVideoDestination(video)

                    return (
                      <Link
                        key={video.id}
                        href={destination.href}
                        className={`group relative overflow-hidden rounded-[18px] border border-[color:var(--glass-border-subtle)] bg-[rgba(17,15,13,0.44)] ${
                          index === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[1/1]"
                        }`}
                      >
                        {video.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={video.thumbnailUrl}
                            alt="Video thumbnail"
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-porcelain)]">
                            Video
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,12,11,0.62)] via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                          <span className="stone-chip inline-flex rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[color:var(--color-porcelain)]">
                            Reel
                          </span>
                          <span className="text-[9px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">View</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </Section>
            ) : null}

            <Section title="Feed plans" subtitle="Your feed plans, ready when you are.">
              {feeds.length === 0 ? (
                <div className="stone-panel rounded-[20px] p-4 text-sm text-[color:var(--color-porcelain)]">
                  No feed plan yet. Ask Maya to build your next 9-post plan.
                </div>
              ) : (
                <div className="space-y-3">
                  {feeds.slice(0, visibleFeedCount).map((feed) => {
                    const snapshots =
                      Array.isArray(feed.previewImageUrls) && feed.previewImageUrls.length > 0
                        ? feed.previewImageUrls.slice(0, 3)
                        : []

                    return (
                      <div key={feed.id} className="stone-panel overflow-hidden rounded-[20px]">
                        <Link href={feed.openUrl} className="block">
                          <div className="grid h-[152px] grid-cols-2 gap-1 bg-[rgba(17,15,13,0.44)] p-1">
                            {snapshots.length === 0 ? (
                              <div className="col-span-2 flex items-center justify-center rounded-[14px] border border-[color:var(--glass-border-subtle)] text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-porcelain)]">
                                No images yet
                              </div>
                            ) : (
                              <>
                                <div className={`${snapshots.length === 1 ? "col-span-2" : "row-span-2"} overflow-hidden rounded-[14px]`}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={snapshots[0]}
                                    alt={`${feed.title} preview`}
                                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                                    loading="lazy"
                                  />
                                </div>
                                {snapshots[1] ? (
                                  <div className="overflow-hidden rounded-[14px]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={snapshots[1]}
                                      alt={`${feed.title} preview 2`}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : null}
                                {snapshots[2] ? (
                                  <div className="overflow-hidden rounded-[14px]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={snapshots[2]}
                                      alt={`${feed.title} preview 3`}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        </Link>
                        <div className="px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm text-[color:var(--color-porcelain)]">{cleanFeedTitle(feed.title)}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)]">
                                {formatFeedLayoutLabel(feed.layoutType)} · {feed.imageCount}/{feed.postCount} assets ·{" "}
                                {formatRelativeDate(feed.updatedAt)}
                              </p>
                            </div>
                            <Link
                              href={feed.openUrl}
                              className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)] hover:text-[color:var(--color-porcelain)]"
                            >
                              Open
                            </Link>
                          </div>
                          <div className="mt-2">
                            <Link
                              href={feed.manageUrl}
                              className="stone-chip inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-porcelain)] transition-colors hover:bg-[rgba(175,170,162,0.16)]"
                            >
                              Tweak
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {feeds.length > visibleFeedCount ? (
                    <button
                      type="button"
                      onClick={() => setVisibleFeedCount((count) => Math.min(count + 3, feeds.length))}
                      className="stone-chip inline-flex h-10 items-center rounded-full px-4 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-porcelain)] transition-colors hover:bg-[rgba(175,170,162,0.16)]"
                    >
                      Show more
                    </button>
                  ) : null}
                </div>
              )}
            </Section>

          </div>
        </div>
      </div>
    </div>
  )
}
