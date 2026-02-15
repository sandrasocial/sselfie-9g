"use client"
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react"

type PostStatus = "draft" | "ready" | "scheduled" | "posted"
type DraftType = "caption" | "story" | "carousel" | "reel"

interface PlannerPost {
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
  assignedAssetUrl?: string
}

interface BrainEntry {
  id: string
  topic: string
  brainDump: string
  happenedWeek: string
  painPoint: string
  desiredOutcome: string
  createdAt: string
}

interface GalleryImage {
  id: number
  image_url: string
  content_category?: string
  prompt?: string
}

interface DraftResult {
  title: string
  body: string
  cta: string
  hashtags: string[]
  storyFrames: string[]
  carouselSlides: Array<{ slide: number; title: string; body: string }>
  reelBeats: Array<{ beat: string; script: string }>
  claudePrompt: string
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3)
}

function suggestAssets(text: string, images: GalleryImage[], limit = 6) {
  if (!images.length) return [] as GalleryImage[]
  const tokens = tokenize(text)

  const scored = images.map((image) => {
    const haystack = `${image.prompt || ""} ${image.content_category || ""}`.toLowerCase()
    const score = tokens.reduce((total, token) => (haystack.includes(token) ? total + 1 : total), 0)
    return { image, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, limit)

  if (top.every((item) => item.score === 0)) {
    return images.slice(0, limit)
  }

  return top.map((item) => item.image)
}

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function buildDraftDisplay(draftType: DraftType, draft: DraftResult) {
  if (draftType === "caption") {
    return `${draft.title}\n\n${draft.body}\n\n${draft.hashtags.join(" ")}\n\nCTA: ${draft.cta}`
  }

  if (draftType === "story") {
    return draft.storyFrames.map((line, index) => `Frame ${index + 1}: ${line}`).join("\n")
  }

  if (draftType === "carousel") {
    return draft.carouselSlides.map((slide) => `${slide.slide}. ${slide.title}\n${slide.body}`).join("\n\n")
  }

  return draft.reelBeats.map((beat) => `${beat.beat}: ${beat.script}`).join("\n")
}

function draftToPost(draftType: DraftType, draft: DraftResult, date: string, assetUrl?: string): PlannerPost {
  const nowId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `post-${Date.now()}`

  const hook =
    draftType === "carousel"
      ? draft.carouselSlides[0]?.title || draft.title
      : draftType === "reel"
        ? draft.reelBeats[0]?.script || draft.title
        : draftType === "story"
          ? draft.storyFrames[0] || draft.title
          : draft.title

  const body = buildDraftDisplay(draftType, draft)

  return {
    id: nowId,
    dayLabel: date,
    format: draftType.toUpperCase(),
    pillar: "Story",
    hook,
    cta: draft.cta,
    productionNotes: body,
    postingTime: "09:00",
    captionTheme: draft.body,
    status: "draft",
    assignedAssetUrl: assetUrl,
  }
}

export function ContentEnginePlanner() {
  const [posts, setPosts] = useState<PlannerPost[]>([])
  const [brainEntries, setBrainEntries] = useState<BrainEntry[]>([])
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])

  const [topic, setTopic] = useState("")
  const [brainDump, setBrainDump] = useState("")
  const [happenedWeek, setHappenedWeek] = useState("")
  const [painPoint, setPainPoint] = useState("")
  const [desiredOutcome, setDesiredOutcome] = useState("")
  const [draftType, setDraftType] = useState<DraftType>("caption")
  const [calendarDate, setCalendarDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string | undefined>(undefined)
  const [selectedCalendarPostId, setSelectedCalendarPostId] = useState("")
  const [draft, setDraft] = useState<DraftResult | null>(null)

  const [workspaceState, setWorkspaceState] = useState<"idle" | "loading" | "saving" | "saved" | "error">("loading")
  const [generateState, setGenerateState] = useState<"idle" | "running" | "done" | "error">("idle")
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")

  const draftText = useMemo(() => (draft ? buildDraftDisplay(draftType, draft) : ""), [draft, draftType])
  const suggestedAssets = useMemo(() => suggestAssets(draftText, galleryImages, 6), [draftText, galleryImages])
  const selectedCalendarPost = useMemo(
    () => posts.find((post) => post.id === selectedCalendarPostId) || posts[0],
    [posts, selectedCalendarPostId],
  )

  const loadWorkspace = async () => {
    setWorkspaceState("loading")
    try {
      const [workspaceRes, galleryRes] = await Promise.all([
        fetch("/api/admin/content-engine/workspace", { cache: "no-store" }),
        fetch("/api/admin/agent/gallery-images?limit=80", { cache: "no-store" }),
      ])

      if (!workspaceRes.ok) throw new Error("workspace load failed")
      const workspaceData = await workspaceRes.json()
      const workspace = workspaceData?.workspace

      const loadedPosts = Array.isArray(workspace?.posts) ? workspace.posts : []
      setPosts(loadedPosts)
      setSelectedCalendarPostId(loadedPosts[0]?.id || "")
      setBrainEntries(Array.isArray(workspace?.brainEntries) ? workspace.brainEntries : [])

      if (galleryRes.ok) {
        const galleryData = await galleryRes.json()
        setGalleryImages(Array.isArray(galleryData?.images) ? galleryData.images : [])
      }

      setWorkspaceState("idle")
    } catch {
      setWorkspaceState("error")
    }
  }

  useEffect(() => {
    void loadWorkspace()
  }, [])

  const saveWorkspace = async (nextPosts: PlannerPost[], nextBrainEntries: BrainEntry[]) => {
    setWorkspaceState("saving")
    try {
      const response = await fetch("/api/admin/content-engine/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ posts: nextPosts, brainEntries: nextBrainEntries }),
      })
      if (!response.ok) throw new Error("save failed")
      setWorkspaceState("saved")
      window.setTimeout(() => setWorkspaceState("idle"), 1200)
    } catch {
      setWorkspaceState("error")
    }
  }

  const handleSaveMemory = async () => {
    const trimmedTopic = topic.trim()
    if (!trimmedTopic) return

    const entry: BrainEntry = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `memory-${Date.now()}`,
      topic: trimmedTopic,
      brainDump: brainDump.trim(),
      happenedWeek: happenedWeek.trim(),
      painPoint: painPoint.trim(),
      desiredOutcome: desiredOutcome.trim(),
      createdAt: new Date().toISOString(),
    }

    const nextBrain = [entry, ...brainEntries].slice(0, 100)
    setBrainEntries(nextBrain)
    await saveWorkspace(posts, nextBrain)
  }

  const handleGenerateDraft = async () => {
    const trimmedTopic = topic.trim()
    if (!trimmedTopic) return

    setGenerateState("running")
    try {
      const response = await fetch("/api/admin/content-engine/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftType,
          topic: trimmedTopic,
          brainDump,
          happenedWeek,
          painPoint,
          desiredOutcome,
          memories: brainEntries,
        }),
      })

      if (!response.ok) throw new Error("draft failed")

      const data = await response.json()
      setDraft(data?.draft || null)
      setSelectedAssetUrl(undefined)
      setGenerateState("done")
      window.setTimeout(() => setGenerateState("idle"), 1200)
    } catch {
      setGenerateState("error")
    }
  }

  const handleCopyDraft = async () => {
    if (!draftText) return
    const ok = await copyToClipboard(draftText)
    setCopyState(ok ? "copied" : "failed")
    window.setTimeout(() => setCopyState("idle"), 1000)
  }

  const handleAddToCalendar = async () => {
    if (!draft) return

    const newPost = draftToPost(draftType, draft, calendarDate, selectedAssetUrl)
    const nextPosts = [newPost, ...posts]
    setPosts(nextPosts)
    setSelectedCalendarPostId(newPost.id)
    await saveWorkspace(nextPosts, brainEntries)
  }

  const handleClearAll = async () => {
    const proceed = window.confirm("Clear all memory and calendar entries in Content Engine?")
    if (!proceed) return

    setWorkspaceState("saving")
    try {
      const response = await fetch("/api/admin/content-engine/workspace", { method: "DELETE" })
      if (!response.ok) throw new Error("clear failed")
      setPosts([])
      setSelectedCalendarPostId("")
      setBrainEntries([])
      setDraft(null)
      setWorkspaceState("saved")
      window.setTimeout(() => setWorkspaceState("idle"), 1200)
    } catch {
      setWorkspaceState("error")
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <section className="mb-6 rounded-2xl border border-stone-800 bg-gradient-to-br from-stone-950 via-[#121212] to-[#191919] p-6">
        <h1 className="font-['Times_New_Roman'] text-3xl uppercase tracking-[0.16em] text-white">Content Engine</h1>
        <p className="mt-3 max-w-3xl text-sm text-stone-300">
          One place to capture your story, generate one strong draft, and add it to your calendar.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-stone-900 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-300">Second Brain</span>
          <span className="rounded-full bg-stone-900 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-300">One-click draft</span>
          <span className="rounded-full bg-stone-900 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-300">Add to calendar</span>
          <button
            onClick={handleClearAll}
            className="rounded-full border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-amber-100"
          >
            Clear all
          </button>
        </div>
        <p className="mt-3 text-xs text-stone-400">
          {workspaceState === "loading" && "Loading workspace..."}
          {workspaceState === "saving" && "Saving..."}
          {workspaceState === "saved" && "Saved"}
          {workspaceState === "error" && "Save/load failed"}
          {workspaceState === "idle" && "Ready"}
        </p>
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <article className="rounded-2xl border border-stone-800 bg-[#0c0c0c] p-5">
          <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.14em] text-stone-100">Topic + Brain Dump</h2>
          <div className="mt-4 space-y-3">
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Topic"
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            />
            <textarea
              value={brainDump}
              onChange={(event) => setBrainDump(event.target.value)}
              placeholder="Your raw thoughts"
              className="h-24 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            />
            <textarea
              value={happenedWeek}
              onChange={(event) => setHappenedWeek(event.target.value)}
              placeholder="What happened this week"
              className="h-20 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            />
            <input
              value={painPoint}
              onChange={(event) => setPainPoint(event.target.value)}
              placeholder="Audience pain point"
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            />
            <input
              value={desiredOutcome}
              onChange={(event) => setDesiredOutcome(event.target.value)}
              placeholder="Desired audience outcome"
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleSaveMemory}
              disabled={!topic.trim()}
              className="rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-900 disabled:opacity-50"
            >
              Save to second brain
            </button>

            {(["caption", "story", "carousel", "reel"] as DraftType[]).map((type) => (
              <button
                key={type}
                onClick={() => setDraftType(type)}
                className={`rounded-lg px-3 py-2 text-[10px] uppercase tracking-[0.2em] ${
                  draftType === type ? "bg-stone-100 text-stone-900" : "bg-stone-800 text-stone-300"
                }`}
              >
                {type}
              </button>
            ))}

            <button
              onClick={handleGenerateDraft}
              disabled={!topic.trim() || generateState === "running"}
              className="rounded-lg border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-emerald-100 disabled:opacity-50"
            >
              {generateState === "running" ? "Generating..." : "Generate draft"}
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-stone-800 bg-[#0c0c0c] p-5">
          <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.14em] text-stone-100">Second Brain Memory</h2>
          <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
            {brainEntries.length === 0 ? (
              <p className="text-sm text-stone-400">No memory entries yet.</p>
            ) : (
              brainEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{entry.topic}</p>
                  <p className="mt-2 text-xs text-stone-300">Pain: {entry.painPoint || "-"}</p>
                  <p className="text-xs text-stone-300">Outcome: {entry.desiredOutcome || "-"}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-stone-400">{entry.brainDump}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="mb-6 rounded-2xl border border-stone-800 bg-[#0c0c0c] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.14em] text-stone-100">Generated Draft</h2>
          <div className="flex gap-2">
            <button
              onClick={handleCopyDraft}
              disabled={!draftText}
              className="rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-900 disabled:opacity-50"
            >
              {copyState === "copied" ? "Copied" : "Copy"}
            </button>
            <input
              type="date"
              value={calendarDate}
              onChange={(event) => setCalendarDate(event.target.value)}
              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-stone-100"
            />
            <button
              onClick={handleAddToCalendar}
              disabled={!draft}
              className="rounded-lg border border-sky-400/60 bg-sky-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-sky-100 disabled:opacity-50"
            >
              Add to calendar
            </button>
          </div>
        </div>

        <textarea
          readOnly
          value={draftText || "Generate a draft to view output here."}
          className="mt-4 h-56 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm leading-relaxed text-stone-100"
        />

        {draft?.claudePrompt ? (
          <div className="mt-4 rounded-lg border border-stone-800 bg-stone-950 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Claude handoff prompt</p>
            <textarea readOnly value={draft.claudePrompt} className="mt-2 h-28 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-stone-100" />
          </div>
        ) : null}
      </section>

      <section className="mb-6 rounded-2xl border border-stone-800 bg-[#0c0c0c] p-5">
        <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.14em] text-stone-100">Asset Suggestions</h2>
        <p className="mt-1 text-xs text-stone-400">Pick one suggested image before adding draft to calendar.</p>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {suggestedAssets.map((image) => (
            <button
              key={image.id}
              onClick={() => setSelectedAssetUrl(image.image_url)}
              className={`overflow-hidden rounded-lg border ${
                selectedAssetUrl === image.image_url ? "border-stone-200" : "border-stone-800"
              }`}
            >
              <img src={image.image_url} alt={image.prompt || `Asset ${image.id}`} className="h-20 w-full object-cover" />
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-800 bg-[#0c0c0c] p-5">
        <h2 className="font-['Times_New_Roman'] text-xl uppercase tracking-[0.14em] text-stone-100">Calendar Queue</h2>
        {selectedCalendarPost ? (
          <div className="mt-4 rounded-2xl border border-stone-700 bg-stone-950 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
              Instagram preview · {selectedCalendarPost.dayLabel} · {selectedCalendarPost.format}
            </p>
            <div className="mx-auto mt-3 max-w-sm rounded-3xl border border-stone-700 bg-black p-3">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-stone-700" />
                <div>
                  <p className="text-xs font-medium text-stone-100">selfiequeensandra</p>
                  <p className="text-[10px] text-stone-500">Draft preview</p>
                </div>
              </div>
              {selectedCalendarPost.assignedAssetUrl ? (
                <img src={selectedCalendarPost.assignedAssetUrl} alt="Post preview" className="h-72 w-full rounded-xl object-cover" />
              ) : (
                <div className="flex h-72 items-center justify-center rounded-xl bg-stone-900 text-xs text-stone-500">
                  No image selected
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed text-stone-200">{selectedCalendarPost.captionTheme || selectedCalendarPost.productionNotes}</p>
              <p className="mt-2 text-xs text-stone-400">{selectedCalendarPost.cta}</p>
            </div>
          </div>
        ) : null}
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {posts.length === 0 ? (
            <p className="text-sm text-stone-400">No calendar entries yet.</p>
          ) : (
            posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedCalendarPostId(post.id)}
                className={`rounded-lg bg-stone-950 p-3 text-left ${
                  selectedCalendarPost?.id === post.id ? "border border-stone-200" : "border border-stone-800"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">{post.dayLabel} · {post.format}</p>
                <p className="mt-2 text-sm text-stone-100">{post.hook}</p>
                {post.assignedAssetUrl ? <img src={post.assignedAssetUrl} alt="Assigned" className="mt-3 h-24 w-full rounded-md object-cover" /> : null}
                <p className="mt-2 text-xs text-stone-400">{post.cta}</p>
              </button>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
