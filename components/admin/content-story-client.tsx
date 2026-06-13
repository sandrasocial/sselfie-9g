"use client"

import { useState } from "react"
import type { StorySequence } from "@/lib/content-kit/types"

type ShootOption = {
  id: number
  title: string
  status: string
  createdAt: string
  shots: Array<{ id: string; title: string; url: string }>
}

type UploadedAsset = { url: string; label: string }

const STATUS_LABELS: Record<StorySequence["status"], string> = {
  draft: "Draft",
  approved: "Approved",
  posted: "Posted",
}

function SequenceCard({
  sequence,
  onStatus,
  onDelete,
}: {
  sequence: StorySequence
  onStatus: (id: number, status: StorySequence["status"]) => void
  onDelete: (id: number) => void
}) {
  const [open, setOpen] = useState(false)

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
              <a
                key={index}
                href={`/api/admin/content-kit/story/${sequence.id}/${index}`}
                download={`story-${sequence.id}-${String(index + 1).padStart(2, "0")}.png`}
                title={`${slide.role} slide: click to download`}
                className="block shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/content-kit/story/${sequence.id}/${index}`}
                  alt={`Story slide ${index + 1} (${slide.role})`}
                  className="h-72 w-auto rounded-lg border border-stone-200 transition hover:border-stone-950"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Click a slide to download it as PNG (1080x1920). Post in order.
          </p>

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
  const [selectedShootId, setSelectedShootId] = useState<number | null>(shoots.find((shoot) => shoot.shots.length >= 2)?.id ?? null)
  const [backgrounds, setBackgrounds] = useState<UploadedAsset[]>([])
  const [overlays, setOverlays] = useState<UploadedAsset[]>([])
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState<"background" | "overlay" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedShoot = shoots.find((shoot) => shoot.id === selectedShootId) ?? null

  async function upload(kind: "background" | "overlay", files: FileList | null) {
    if (!files?.length) return
    setUploading(kind)
    setError(null)
    try {
      const form = new FormData()
      form.append("kind", kind)
      Array.from(files).forEach((file) => form.append("files", file))
      const response = await fetch("/api/admin/content-kit/assets/upload", { method: "POST", body: form })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Upload failed")
      if (kind === "background") setBackgrounds((current) => [...current, ...data.assets])
      else setOverlays((current) => [...current, ...data.assets])
    } catch (err: any) {
      setError(err?.message || "Upload failed")
    } finally {
      setUploading(null)
    }
  }

  async function generate() {
    if (!selectedShootId && backgrounds.length < 2) {
      setError("Pick an approved shoot, or upload at least 2 background images.")
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
          imageUrls: backgrounds.map((asset) => asset.url),
          overlayUrls: overlays.map((asset) => asset.url),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Generation failed")
      setSequences([data.sequence, ...sequences])
      setTopic("")
    } catch (err: any) {
      setError(err?.message || "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  async function updateStatus(id: number, status: StorySequence["status"]) {
    setSequences((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
    await fetch("/api/admin/content-kit/stories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
  }

  async function remove(id: number) {
    setSequences((current) => current.filter((item) => item.id !== id))
    await fetch("/api/admin/content-kit/stories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
  }

  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl font-light tracking-tight text-stone-950">Story sequence</h2>
      <p className="mt-1 text-sm text-stone-600">
        Pick an approved shoot first. Stories reuse those photos as untouched backgrounds, then add
        short doctrine-led copy and optional screenshot/proof overlays.
      </p>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
        <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="story-shoot">
          Source shoot
        </label>
        <select
          id="story-shoot"
          value={selectedShootId ?? ""}
          onChange={(event) => setSelectedShootId(event.target.value ? Number(event.target.value) : null)}
          className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-950 focus:outline-none"
        >
          <option value="">No approved shoot selected</option>
          {shoots.map((shoot) => (
            <option key={shoot.id} value={shoot.id} disabled={shoot.shots.length < 2}>
              {shoot.title} · {shoot.shots.length} approved image{shoot.shots.length === 1 ? "" : "s"}
            </option>
          ))}
        </select>
        {selectedShoot ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-3">
            {selectedShoot.shots.map((shot) => (
              <div key={shot.id} className="shrink-0 overflow-hidden rounded-lg border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.url} alt={shot.title} className="h-24 w-[4.5rem] object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 pb-3 text-sm text-amber-700">
            Approve at least 2 rendered shots in Shoot Studio before generating a shoot-based story.
          </p>
        )}
        <textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          rows={2}
          placeholder="Today's story idea, e.g. the fear behind posting AI photos, CTA: PROMPT"
          className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-950 focus:outline-none"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            <span className="block text-xs uppercase tracking-wide text-stone-500">Extra backgrounds</span>
            <span className="mt-1 block">Only use if the story needs a non-shoot scene.</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="mt-3 block w-full text-xs"
              onChange={(event) => void upload("background", event.target.files)}
            />
            <span className="mt-2 block text-xs text-stone-400">
              {uploading === "background" ? "Uploading..." : `${backgrounds.length} uploaded`}
            </span>
          </label>
          <label className="block rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            <span className="block text-xs uppercase tracking-wide text-stone-500">Screenshot overlays</span>
            <span className="mt-1 block">Use for proof, ChatGPT screenshots, or DM examples.</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="mt-3 block w-full text-xs"
              onChange={(event) => void upload("overlay", event.target.files)}
            />
            <span className="mt-2 block text-xs text-stone-400">
              {uploading === "overlay" ? "Uploading..." : `${overlays.length} uploaded`}
            </span>
          </label>
        </div>
        {overlays.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {overlays.map((asset) => (
              <div key={asset.url} className="shrink-0 overflow-hidden rounded-lg border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.label} className="h-20 w-20 object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={generating || !topic.trim() || (!selectedShootId && backgrounds.length < 2)}
          className="mt-3 rounded-full bg-stone-950 px-5 py-2 text-xs uppercase tracking-wide text-white disabled:opacity-50"
        >
          {generating ? "Writing the shoot story" : "Generate shoot story"}
        </button>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>

      <div className="mt-4 space-y-3">
        {sequences.map((sequence) => (
          <SequenceCard key={sequence.id} sequence={sequence} onStatus={updateStatus} onDelete={remove} />
        ))}
      </div>
    </section>
  )
}
