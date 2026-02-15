"use client"
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, useEffect } from "react"

type PostStatus = "draft" | "ready" | "scheduled" | "posted"

type Platform = "instagram" | "tiktok" | "linkedin"

export interface PlannerPost {
  id: string
  dayLabel: string
  format: string
  pillar: string
  hook: string
  cta: string
  productionNotes: string
  postingTime: string
  captionTheme: string
  status: PostStatus
}

export interface SourceDoc {
  title: string
  fileName: string
  absolutePath: string
  found: boolean
  preview: string
}

interface GalleryImage {
  id: number
  image_url: string
  content_category?: string
  prompt?: string
}

interface PlannerPostState extends PlannerPost {
  assignedAssetUrl?: string
}

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: "bg-stone-700/60 text-stone-200",
  ready: "bg-emerald-500/20 text-emerald-200",
  scheduled: "bg-sky-500/20 text-sky-200",
  posted: "bg-violet-500/20 text-violet-200",
}

function buildPlatformCopy(post: PlannerPostState, platform: Platform) {
  const base = `${post.hook}\n\n${post.captionTheme || post.productionNotes}\n\nCTA: ${post.cta}`

  if (platform === "instagram") {
    return `${base}\n\n#personalbrand #femaleentrepreneur #contentstrategy #selfiemarketing`
  }

  if (platform === "tiktok") {
    return `${post.hook}\n\n${post.productionNotes}\n\nOn-screen CTA: ${post.cta}\n\n#tiktokmarketing #womeninbusiness #aitools`
  }

  return `${post.hook}\n\nKey takeaway: ${post.captionTheme || "Consistency compounds."}\n\n${post.cta}`
}

async function copyToClipboard(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return false
  }

  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function ContentEnginePlanner({
  initialPosts,
  sourceDocs,
  sourceDirectory,
}: {
  initialPosts: PlannerPost[]
  sourceDocs: SourceDoc[]
  sourceDirectory: string | null
}) {
  const [posts, setPosts] = useState<PlannerPostState[]>(initialPosts)
  const [selectedPostId, setSelectedPostId] = useState<string>(initialPosts[0]?.id ?? "")
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("instagram")
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) || posts[0],
    [posts, selectedPostId],
  )

  const weeklyBuckets = useMemo(() => {
    const grouped = new Map<string, PlannerPostState[]>()

    posts.forEach((post) => {
      const weekKey = post.dayLabel.split(" ").slice(-1)[0] || "WEEK"
      const existing = grouped.get(weekKey) || []
      grouped.set(weekKey, [...existing, post])
    })

    return Array.from(grouped.entries()).slice(0, 5)
  }, [posts])

  const composerText = selectedPost ? buildPlatformCopy(selectedPost, selectedPlatform) : ""

  const persistPlanner = async (currentPosts: PlannerPostState[]) => {
    setSaveState("saving")
    try {
      const response = await fetch("/api/admin/content-engine/planner", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ posts: currentPosts }),
      })

      if (!response.ok) {
        throw new Error("Failed to save planner")
      }

      const data = await response.json()
      setLastSavedAt(data?.planner?.updatedAt || new Date().toISOString())
      setSaveState("saved")
      window.setTimeout(() => {
        setSaveState((prev) => (prev === "saved" ? "idle" : prev))
      }, 1200)
      return true
    } catch {
      setSaveState("error")
      return false
    }
  }

  useEffect(() => {
    const loadGallery = async () => {
      setGalleryLoading(true)
      try {
        const response = await fetch("/api/admin/agent/gallery-images?limit=40", { cache: "no-store" })
        if (!response.ok) {
          setGalleryImages([])
          return
        }

        const data = await response.json()
        setGalleryImages(Array.isArray(data.images) ? data.images : [])
      } catch {
        setGalleryImages([])
      } finally {
        setGalleryLoading(false)
      }
    }

    loadGallery()
  }, [])

  useEffect(() => {
    const loadPersistedPlanner = async () => {
      try {
        const response = await fetch("/api/admin/content-engine/planner", { cache: "no-store" })
        if (!response.ok) return

        const data = await response.json()
        const persistedPosts = data?.planner?.posts
        if (!Array.isArray(persistedPosts) || persistedPosts.length === 0) return

        setPosts(persistedPosts)
        setSelectedPostId(persistedPosts[0].id)
        if (data?.planner?.updatedAt) {
          setLastSavedAt(data.planner.updatedAt)
        }
      } catch {
        // Keep current in-memory state if persistence load fails.
      }
    }

    loadPersistedPlanner()
  }, [])

  const updatePost = (postId: string, patch: Partial<PlannerPostState>) => {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, ...patch } : post)))
  }

  useEffect(() => {
    if (posts.length === 0) return

    const timeout = window.setTimeout(() => {
      void persistPlanner(posts)
    }, 900)

    return () => window.clearTimeout(timeout)
  }, [posts])

  const handleCopy = async () => {
    if (!composerText) return

    const ok = await copyToClipboard(composerText)
    setCopyState(ok ? "copied" : "failed")
    window.setTimeout(() => setCopyState("idle"), 1800)
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <section className="mb-6 rounded-2xl border border-stone-800 bg-gradient-to-br from-stone-950 via-[#101010] to-[#171717] p-5 shadow-[0_0_60px_rgba(0,0,0,0.45)] sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.34em] text-stone-400">Sselfie Content Engine</p>
        <h1 className="mt-3 font-['Times_New_Roman'] text-3xl font-light uppercase tracking-[0.18em] text-white sm:text-4xl">
          Dark Feed Planner
        </h1>
        <p className="mt-4 max-w-3xl text-sm text-stone-300">
          Visual planning board with strategy import, gallery asset assignment, and one-click copy blocks per social platform.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-stone-700 bg-stone-900/70 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">Source folder</p>
            <p className="mt-2 break-all text-xs text-stone-200">{sourceDirectory || "Not detected"}</p>
          </div>
          <div className="rounded-xl border border-stone-700 bg-stone-900/70 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">Planned posts</p>
            <p className="mt-2 font-mono text-2xl text-stone-100">{posts.length}</p>
          </div>
          <div className="rounded-xl border border-stone-700 bg-stone-900/70 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500">Gallery assets loaded</p>
            <p className="mt-2 font-mono text-2xl text-stone-100">{galleryImages.length}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-stone-800 bg-black/30 px-4 py-3">
          <p className="text-xs text-stone-300">
            {saveState === "saving" && "Saving planner..."}
            {saveState === "saved" && "Planner saved"}
            {saveState === "error" && "Save failed, retrying on next edit"}
            {saveState === "idle" && "Planner autosaves after edits"}
          </p>
          <div className="flex items-center gap-3">
            {lastSavedAt ? (
              <p className="text-[11px] text-stone-500">Last save: {new Date(lastSavedAt).toLocaleTimeString()}</p>
            ) : null}
            <button
              onClick={() => void persistPlanner(posts)}
              className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-100 transition hover:border-stone-400"
            >
              Save now
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-stone-800 bg-[#0b0b0b] p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.16em] text-stone-100">Imported Strategy Docs</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Auto-detected from your content engine</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sourceDocs.map((doc) => (
            <article key={doc.fileName} className="rounded-xl border border-stone-800 bg-stone-950 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-300">{doc.title}</p>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                    doc.found ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"
                  }`}
                >
                  {doc.found ? "loaded" : "missing"}
                </span>
              </div>
              <p className="mt-2 text-xs text-stone-500">{doc.fileName}</p>
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-stone-300">{doc.preview}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <div className="space-y-6">
          <article className="rounded-2xl border border-stone-800 bg-[#090909] p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.16em] text-stone-100">Feed Planner Board</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Tap card to edit and copy</p>
            </div>

            <div className="space-y-5">
              {weeklyBuckets.map(([week, weekPosts], weekIndex) => (
                <div key={`${week}-${weekIndex}`}>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-stone-500">Week {weekIndex + 1}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {weekPosts.slice(0, 5).map((post) => (
                      <button
                        key={post.id}
                        onClick={() => setSelectedPostId(post.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          selectedPost?.id === post.id
                            ? "border-stone-200 bg-stone-800/80"
                            : "border-stone-800 bg-stone-900/60 hover:border-stone-600"
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">{post.dayLabel}</p>
                        <p className="mt-2 line-clamp-3 text-sm text-stone-100">{post.hook}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500">{post.format}</span>
                          <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${STATUS_STYLES[post.status]}`}>
                            {post.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-stone-800 bg-[#090909] p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.16em] text-stone-100">Asset Gallery Picker</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Assign selected image to post</p>
            </div>

            {galleryLoading ? (
              <p className="text-sm text-stone-400">Loading gallery...</p>
            ) : galleryImages.length === 0 ? (
              <p className="text-sm text-stone-400">No gallery assets found. Generate or upload images to populate this tray.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {galleryImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => selectedPost && updatePost(selectedPost.id, { assignedAssetUrl: image.image_url })}
                    className="group relative overflow-hidden rounded-lg border border-stone-800 bg-stone-900"
                  >
                    <img src={image.image_url} alt={image.prompt || `Asset ${image.id}`} className="h-24 w-full object-cover" />
                    <div className="absolute inset-0 hidden bg-black/45 text-[10px] uppercase tracking-[0.2em] text-white group-hover:flex group-hover:items-center group-hover:justify-center">
                      Assign
                    </div>
                  </button>
                ))}
              </div>
            )}
          </article>
        </div>

        <aside className="space-y-6">
          <article className="rounded-2xl border border-stone-800 bg-[#090909] p-4 sm:p-6">
            <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.16em] text-stone-100">Post Composer</h2>

            {selectedPost ? (
              <div className="mt-4 space-y-4">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-500">Selected post</label>
                <p className="text-sm text-stone-100">{selectedPost.dayLabel} · {selectedPost.format}</p>

                <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-500">Status</label>
                <select
                  value={selectedPost.status}
                  onChange={(event) => updatePost(selectedPost.id, { status: event.target.value as PostStatus })}
                  className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                >
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="posted">Posted</option>
                </select>

                <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-500">Hook</label>
                <textarea
                  value={selectedPost.hook}
                  onChange={(event) => updatePost(selectedPost.id, { hook: event.target.value })}
                  className="h-24 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                />

                <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-500">CTA</label>
                <textarea
                  value={selectedPost.cta}
                  onChange={(event) => updatePost(selectedPost.id, { cta: event.target.value })}
                  className="h-20 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                />

                <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-500">Assigned asset</label>
                {selectedPost.assignedAssetUrl ? (
                  <img src={selectedPost.assignedAssetUrl} alt="Assigned post asset" className="h-40 w-full rounded-lg object-cover" />
                ) : (
                  <p className="rounded-lg border border-dashed border-stone-700 p-4 text-xs text-stone-400">No asset selected yet.</p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-400">No post selected.</p>
            )}
          </article>

          <article className="rounded-2xl border border-stone-800 bg-[#090909] p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {(["instagram", "tiktok", "linkedin"] as Platform[]).map((platform) => (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.2em] transition ${
                    selectedPlatform === platform
                      ? "bg-stone-100 text-stone-900"
                      : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>

            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">Copy block for {selectedPlatform}</p>
            <textarea readOnly value={composerText} className="h-56 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100" />

            <button
              onClick={handleCopy}
              className="mt-3 w-full rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-xs uppercase tracking-[0.2em] text-stone-900 transition hover:bg-white"
            >
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy for paste"}
            </button>
          </article>
        </aside>
      </section>
    </main>
  )
}
