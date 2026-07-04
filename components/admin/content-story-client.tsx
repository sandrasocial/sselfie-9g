"use client"

import { type DragEvent, useEffect, useState } from "react"
import type { StorySequence, StorySlide } from "@/lib/content-kit/types"
import { StorySlideEditor } from "@/components/admin/story-slide-editor"

type ShootOption = {
  id: number
  title: string
  status: string
  createdAt: string
  shots: Array<{ id: string; title: string; url: string }>
}

type PickedAsset = {
  url: string
  label: string
  source?: "shoot" | "gallery" | "upload" | "overlay"
}
type GalleryAsset = {
  id: string
  kind: "image" | "video"
  contentType: string
  url: string
  thumbnailUrl?: string | null
  isFavorite?: boolean
}
type GalleryFilter = "favorites" | "photos" | "photoshoots" | "all"

const STATUS_LABELS: Record<StorySequence["status"], string> = {
  draft: "Draft",
  approved: "Approved",
  posted: "Posted",
}

const GALLERY_FILTERS: Array<{ id: GalleryFilter; label: string }> = [
  { id: "favorites", label: "Favorites" },
  { id: "photos", label: "Photos" },
  { id: "photoshoots", label: "Shoots" },
  { id: "all", label: "All" },
]

function uniqueAssets(assets: PickedAsset[]): PickedAsset[] {
  const seen = new Set<string>()
  return assets.filter(asset => {
    if (!asset.url || seen.has(asset.url)) return false
    seen.add(asset.url)
    return true
  })
}

function reorderAssets<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items
  }
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function assetMatchesFilter(asset: GalleryAsset, filter: GalleryFilter) {
  if (asset.kind !== "image") return false
  if (filter === "favorites") return Boolean(asset.isFavorite)
  if (filter === "photos") return asset.contentType === "photo"
  if (filter === "photoshoots") return asset.contentType === "photoshoot"
  return true
}

function SequenceCard({
  sequence,
  onStatus,
  onDelete,
  onSaveSlides,
  galleryUrls,
}: {
  sequence: StorySequence
  onStatus: (id: number, status: StorySequence["status"]) => void
  onDelete: (id: number) => void
  onSaveSlides: (id: number, slides: StorySlide[]) => Promise<boolean>
  galleryUrls: string[]
}) {
  const [open, setOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [version, setVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const swapOptions = uniqueAssets([
    ...sequence.slides
      .map(slide => slide.imageUrl)
      .filter((url): url is string => Boolean(url))
      .map(url => ({ url, label: "slide" })),
    ...galleryUrls.map(url => ({ url, label: "gallery" })),
  ]).map(asset => asset.url)

  async function handleSave(slideIndex: number, updated: StorySlide) {
    setSaving(true)
    const next = sequence.slides.map((slide, i) => (i === slideIndex ? updated : slide))
    const ok = await onSaveSlides(sequence.id, next)
    setSaving(false)
    if (ok) {
      setVersion(v => v + 1)
      setEditingIndex(null)
    }
  }

  async function downloadAll() {
    setDownloading(true)
    try {
      for (let i = 0; i < sequence.slides.length; i++) {
        const res = await fetch(`/api/admin/content-kit/story/${sequence.id}/${i}?v=${version}`)
        if (!res.ok) continue
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `story-${sequence.id}-${String(i + 1).padStart(2, "0")}.png`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
        // Small gap so the browser queues each download instead of dropping them.
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${
              sequence.status === "posted"
                ? "bg-stone-950 text-white"
                : sequence.status === "approved"
                  ? "bg-stone-200 text-stone-900"
                  : "bg-stone-100 text-stone-600"
            }`}
          >
            {STATUS_LABELS[sequence.status]}
          </span>
          <h3 className="font-medium text-stone-950">{sequence.title}</h3>
          <span className="text-xs text-stone-400">{sequence.slides.length} slides</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs uppercase tracking-wide text-stone-950 underline underline-offset-4"
        >
          {open ? "Close" : "Review"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sequence.slides.map((slide, index) => (
              <div key={index} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                  title={`Edit slide ${index + 1}`}
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/content-kit/story/${sequence.id}/${index}?v=${version}`}
                    alt={`Story slide ${index + 1} (${slide.role})`}
                    className={`h-72 w-auto cursor-pointer rounded-lg border transition hover:border-stone-950 ${
                      editingIndex === index
                        ? "border-stone-950 ring-2 ring-stone-950"
                        : "border-stone-200"
                    }`}
                    loading="lazy"
                  />
                </button>
                <div className="mt-1 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className="text-[11px] uppercase tracking-wide text-stone-700 underline underline-offset-4 hover:text-stone-950"
                  >
                    {editingIndex === index ? "Close" : "Edit"}
                  </button>
                  <a
                    href={`/api/admin/content-kit/story/${sequence.id}/${index}?v=${version}`}
                    download={`story-${sequence.id}-${String(index + 1).padStart(2, "0")}.png`}
                    className="text-[11px] uppercase tracking-wide text-stone-400 underline underline-offset-4 hover:text-stone-950"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={downloadAll}
              disabled={downloading}
              className="rounded-full border border-stone-300 px-4 py-1.5 text-xs uppercase tracking-wide text-stone-700 hover:border-stone-950 disabled:opacity-50"
            >
              {downloading ? "Saving slides..." : "Save all to device"}
            </button>
            <p className="text-xs text-stone-400">
              Click a slide to edit it (move, resize, swap photo). Save all downloads the whole
              sequence as PNGs (1080x1920) in order.
            </p>
          </div>

          {editingIndex !== null && sequence.slides[editingIndex] && (
            <StorySlideEditor
              slide={sequence.slides[editingIndex]}
              index={editingIndex}
              total={sequence.slides.length}
              swapOptions={swapOptions}
              saving={saving}
              onSave={updated => {
                if (editingIndex !== null) void handleSave(editingIndex, updated)
              }}
              onCancel={() => setEditingIndex(null)}
            />
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {sequence.status === "draft" && (
              <button
                type="button"
                onClick={() => onStatus(sequence.id, "approved")}
                className="rounded-full bg-stone-950 px-4 py-1.5 text-xs uppercase tracking-wide text-white"
              >
                Approve
              </button>
            )}
            {sequence.status !== "posted" && (
              <button
                type="button"
                onClick={() => onStatus(sequence.id, "posted")}
                className="rounded-full border border-stone-300 px-4 py-1.5 text-xs uppercase tracking-wide text-stone-700 hover:border-stone-950"
              >
                Mark posted
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(sequence.id)}
              className="rounded-full border border-stone-200 px-4 py-1.5 text-xs uppercase tracking-wide text-stone-400 hover:border-stone-400"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ContentStoryClient({
  initialSequences,
  shoots = [],
}: {
  initialSequences: StorySequence[]
  shoots?: ShootOption[]
}) {
  const [sequences, setSequences] = useState<StorySequence[]>(initialSequences)
  const [topic, setTopic] = useState("")
  const [selectedShootId, setSelectedShootId] = useState<number | null>(
    shoots.find(shoot => shoot.shots.length >= 2)?.id ?? null
  )
  const [backgrounds, setBackgrounds] = useState<PickedAsset[]>([])
  const [overlays, setOverlays] = useState<PickedAsset[]>([])
  const [galleryAssets, setGalleryAssets] = useState<GalleryAsset[]>([])
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>("favorites")
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState<"background" | "overlay" | null>(null)
  const [draggingBackgroundIndex, setDraggingBackgroundIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedShoot = shoots.find(shoot => shoot.id === selectedShootId) ?? null
  const visibleGalleryAssets = galleryAssets.filter(asset =>
    assetMatchesFilter(asset, galleryFilter)
  )

  useEffect(() => {
    if (!selectedShoot) return
    setBackgrounds(
      selectedShoot.shots.map(shot => ({
        url: shot.url,
        label: shot.title,
        source: "shoot" as const,
      }))
    )
  }, [selectedShoot])

  useEffect(() => {
    let cancelled = false
    fetch("/api/app-v3/gallery")
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("Gallery unavailable"))
      )
      .then(data => {
        if (cancelled) return
        const assets = Array.isArray(data.assets)
          ? data.assets.filter((asset: GalleryAsset) => asset.kind === "image" && asset.url)
          : []
        setGalleryAssets(assets)
      })
      .catch(() => {
        if (!cancelled) setGalleryError("Could not load gallery photos.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  function addBackgrounds(assets: PickedAsset[]) {
    setBackgrounds(current => uniqueAssets([...current, ...assets]).slice(0, 12))
  }

  function removeBackground(url: string) {
    setBackgrounds(current => current.filter(asset => asset.url !== url))
  }

  function moveBackground(fromIndex: number, toIndex: number) {
    setBackgrounds(current => reorderAssets(current, fromIndex, toIndex))
  }

  function dropBackground(event: DragEvent<HTMLDivElement>, toIndex: number) {
    event.preventDefault()
    const transferredUrl = event.dataTransfer.getData("text/plain")
    setBackgrounds(current => {
      const fromIndex =
        draggingBackgroundIndex ?? current.findIndex(asset => asset.url === transferredUrl)
      return reorderAssets(current, fromIndex, toIndex)
    })
    setDraggingBackgroundIndex(null)
  }

  function removeOverlay(url: string) {
    setOverlays(current => current.filter(asset => asset.url !== url))
  }

  async function upload(kind: "background" | "overlay", files: FileList | null) {
    if (!files?.length) return
    setUploading(kind)
    setError(null)
    try {
      const form = new FormData()
      form.append("kind", kind)
      Array.from(files).forEach(file => form.append("files", file))
      const response = await fetch("/api/admin/content-kit/assets/upload", {
        method: "POST",
        body: form,
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Upload failed")
      const assets = Array.isArray(data.assets) ? data.assets : []
      if (kind === "background") {
        addBackgrounds(
          assets.map((asset: PickedAsset) => ({
            url: asset.url,
            label: asset.label || "Uploaded image",
            source: "upload" as const,
          }))
        )
      } else {
        setOverlays(current =>
          uniqueAssets([
            ...current,
            ...assets.map((asset: PickedAsset) => ({
              url: asset.url,
              label: asset.label || "Overlay reference",
              source: "overlay" as const,
            })),
          ]).slice(0, 8)
        )
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(null)
    }
  }

  async function generate() {
    if (backgrounds.length < 1) {
      setError("Choose at least 1 background image from a shoot, gallery, favorites, or upload.")
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/content-kit/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          sourceShootId: selectedShootId,
          imageUrls: backgrounds.map(asset => asset.url),
          overlayUrls: overlays.map(asset => asset.url),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Generation failed")
      setSequences([data.sequence, ...sequences])
      setTopic("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  async function updateStatus(id: number, status: StorySequence["status"]) {
    setSequences(current => current.map(item => (item.id === id ? { ...item, status } : item)))
    await fetch("/api/admin/content-kit/stories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
  }

  async function remove(id: number) {
    setSequences(current => current.filter(item => item.id !== id))
    await fetch("/api/admin/content-kit/stories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
  }

  async function saveSlides(id: number, slides: StorySlide[]): Promise<boolean> {
    setError(null)
    try {
      const response = await fetch("/api/admin/content-kit/stories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, slides }),
      })
      const data = await response.json()
      if (!response.ok || !data.success || !data.sequence) {
        setError(data.error || "Could not save slide")
        return false
      }
      setSequences(current => current.map(item => (item.id === id ? data.sequence : item)))
      return true
    } catch {
      setError("Could not save slide")
      return false
    }
  }

  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl font-light tracking-tight text-stone-950">
        Story sequence
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Choose the exact background photos first. Stories preserve those images and add clean
        overlay text, proof accents, and editorial typography.
      </p>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
        <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="story-shoot">
          Source shoot
        </label>
        <select
          id="story-shoot"
          value={selectedShootId ?? ""}
          onChange={event =>
            setSelectedShootId(event.target.value ? Number(event.target.value) : null)
          }
          className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-950 focus:outline-none"
        >
          <option value="">No approved shoot selected</option>
          {shoots.map(shoot => (
            <option key={shoot.id} value={shoot.id} disabled={shoot.shots.length < 2}>
              {shoot.title} · {shoot.shots.length} approved image
              {shoot.shots.length === 1 ? "" : "s"}
            </option>
          ))}
        </select>
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Selected story backgrounds · {backgrounds.length}
            </p>
            {selectedShoot && (
              <button
                type="button"
                onClick={() =>
                  addBackgrounds(
                    selectedShoot.shots.map(shot => ({
                      url: shot.url,
                      label: shot.title,
                      source: "shoot",
                    }))
                  )
                }
                className="text-xs uppercase tracking-wide text-stone-600 underline underline-offset-4 hover:text-stone-950"
              >
                Add all shoot photos
              </button>
            )}
          </div>
          {backgrounds.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {backgrounds.map((asset, index) => (
                <div
                  key={asset.url}
                  draggable
                  onDragStart={event => {
                    setDraggingBackgroundIndex(index)
                    event.dataTransfer.effectAllowed = "move"
                    event.dataTransfer.setData("text/plain", asset.url)
                  }}
                  onDragOver={event => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = "move"
                  }}
                  onDrop={event => dropBackground(event, index)}
                  onDragEnd={() => setDraggingBackgroundIndex(null)}
                  className={`group relative shrink-0 cursor-grab overflow-hidden rounded-lg border bg-white active:cursor-grabbing ${
                    draggingBackgroundIndex === index
                      ? "border-stone-950 opacity-60"
                      : "border-stone-200"
                  }`}
                  title="Drag to reorder"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt={asset.label}
                    className="h-24 w-[4.5rem] object-cover"
                    loading="lazy"
                  />
                  <span className="absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1 text-[10px] font-medium text-stone-700 shadow-sm">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${asset.label}`}
                    onClick={() => removeBackground(asset.url)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-xs leading-none text-stone-700 shadow-sm hover:text-red-700"
                  >
                    x
                  </button>
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      aria-label={`Move ${asset.label} left`}
                      disabled={index === 0}
                      onClick={() => moveBackground(index, index - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-stone-700 shadow-sm hover:text-stone-950 disabled:opacity-30"
                    >
                      {"<"}
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${asset.label} right`}
                      disabled={index === backgrounds.length - 1}
                      onClick={() => moveBackground(index, index + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-stone-700 shadow-sm hover:text-stone-950 disabled:opacity-30"
                    >
                      {">"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-amber-700">
              Add at least one background from a shoot, gallery, favorites, or upload.
            </p>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-stone-500">Add from gallery</p>
            <div className="flex flex-wrap gap-1">
              {GALLERY_FILTERS.map(filter => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setGalleryFilter(filter.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide ${
                    galleryFilter === filter.id
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-200 text-stone-500 hover:border-stone-400"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          {galleryError ? (
            <p className="mt-2 text-sm text-amber-700">{galleryError}</p>
          ) : visibleGalleryAssets.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {visibleGalleryAssets.slice(0, 36).map(asset => {
                const selected = backgrounds.some(item => item.url === asset.url)
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() =>
                      addBackgrounds([
                        {
                          url: asset.url,
                          label: `${asset.contentType || "Gallery"} photo`,
                          source: "gallery",
                        },
                      ])
                    }
                    className={`relative shrink-0 overflow-hidden rounded-lg border-2 ${
                      selected ? "border-stone-950" : "border-transparent hover:border-stone-300"
                    }`}
                    title={selected ? "Already selected" : "Add to story backgrounds"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.contentType || "Gallery image"}
                      className="h-20 w-16 object-cover"
                      loading="lazy"
                    />
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-400">No images in this gallery filter yet.</p>
          )}
        </div>

        <textarea
          value={topic}
          onChange={event => setTopic(event.target.value)}
          rows={2}
          placeholder="Today's story idea, e.g. a real moment or belief (no CTA needed) or an announcement for a new drop (ends in VAULT/PRESETS/SUITE)"
          className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-950 focus:outline-none"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            <span className="block text-xs uppercase tracking-wide text-stone-500">
              Upload background images
            </span>
            <span className="mt-1 block">
              Add photos from your device to the selected background pool.
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="mt-3 block w-full text-xs"
              onChange={event => void upload("background", event.target.files)}
            />
            <span className="mt-2 block text-xs text-stone-400">
              {uploading === "background"
                ? "Uploading..."
                : `${backgrounds.length} selected backgrounds`}
            </span>
          </label>
          <label className="block rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            <span className="block text-xs uppercase tracking-wide text-stone-500">
              Screenshot references
            </span>
            <span className="mt-1 block">
              Use for proof, ChatGPT screenshots, DM examples, or before/after proof.
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="mt-3 block w-full text-xs"
              onChange={event => void upload("overlay", event.target.files)}
            />
            <span className="mt-2 block text-xs text-stone-400">
              {uploading === "overlay" ? "Uploading..." : `${overlays.length} uploaded`}
            </span>
          </label>
        </div>
        {overlays.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {overlays.map(asset => (
              <div
                key={asset.url}
                className="relative shrink-0 overflow-hidden rounded-lg border border-stone-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url}
                  alt={asset.label}
                  className="h-20 w-20 object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  aria-label={`Remove ${asset.label}`}
                  onClick={() => removeOverlay(asset.url)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-xs leading-none text-stone-700 shadow-sm hover:text-red-700"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={generating || !topic.trim() || backgrounds.length < 1}
          className="mt-3 rounded-full bg-stone-950 px-5 py-2 text-xs uppercase tracking-wide text-white disabled:opacity-50"
        >
          {generating ? "Writing the shoot story" : "Generate shoot story"}
        </button>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>

      <div className="mt-4 space-y-3">
        {sequences.map(sequence => (
          <SequenceCard
            key={sequence.id}
            sequence={sequence}
            onStatus={updateStatus}
            onDelete={remove}
            onSaveSlides={saveSlides}
            galleryUrls={galleryAssets.slice(0, 60).map(asset => asset.url)}
          />
        ))}
      </div>
    </section>
  )
}
