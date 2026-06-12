"use client"

import { useState } from "react"
import type { StorySequence } from "@/lib/content-kit/types"

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
  availableImages = [],
}: {
  initialSequences: StorySequence[]
  availableImages?: Array<{ url: string; label: string }>
}) {
  const [sequences, setSequences] = useState<StorySequence[]>(initialSequences)
  const [topic, setTopic] = useState("")
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleImage(url: string) {
    setSelectedImages((current) =>
      current.includes(url) ? current.filter((item) => item !== url) : [...current, url],
    )
  }

  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/content-kit/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), imageUrls: selectedImages }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Generation failed")
      setSequences([data.sequence, ...sequences])
      setTopic("")
      setSelectedImages([])
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
        Your story doctrine, rendered: hook, tension, shift, desire, CTA. Your photo stays untouched
        as the background (no AI re-render, no face drift), text and doodles go on top.
      </p>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
        <textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          rows={2}
          placeholder="Today's story idea, e.g. why posting yourself online changes you (sell the Starter Kit, CTA: KIT)"
          className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-950 focus:outline-none"
        />
        {availableImages.length > 0 && (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Photoshoot images (rotated across slides; skip for clean text slides)
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {availableImages.map((image) => {
                const order = selectedImages.indexOf(image.url)
                return (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => toggleImage(image.url)}
                    title={image.label}
                    className={`relative shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      order >= 0 ? "border-stone-950" : "border-transparent hover:border-stone-300"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.label} className="h-24 w-[4.5rem] object-cover" loading="lazy" />
                    {order >= 0 && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-950 text-[10px] text-white">
                        {order + 1}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={generating || !topic.trim()}
          className="mt-3 rounded-full bg-stone-950 px-5 py-2 text-xs uppercase tracking-wide text-white disabled:opacity-50"
        >
          {generating ? "Writing your story (about a minute)" : "Generate story sequence"}
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
