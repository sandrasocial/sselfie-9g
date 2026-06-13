"use client"

import { useState } from "react"
import type { CarouselDeck } from "@/lib/content-kit/types"

type ShootOption = {
  id: number
  title: string
  status: string
  createdAt: string
  shots: Array<{ id: string; title: string; url: string }>
}

type UploadedAsset = { url: string; label: string }

function CopyChip({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        })
      }}
      className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs uppercase tracking-wide text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
    >
      {copied ? "Copied" : label}
    </button>
  )
}

const STATUS_LABELS: Record<CarouselDeck["status"], string> = {
  draft: "Draft",
  approved: "Approved",
  posted: "Posted",
}

function DeckCard({
  deck,
  onStatus,
}: {
  deck: CarouselDeck
  onStatus: (id: number, status: CarouselDeck["status"]) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${
              deck.status === "posted"
                ? "bg-stone-950 text-white"
                : deck.status === "approved"
                  ? "bg-stone-200 text-stone-900"
                  : "bg-stone-100 text-stone-600"
            }`}
          >
            {STATUS_LABELS[deck.status]}
          </span>
          <h3 className="font-medium text-stone-950">{deck.title}</h3>
          <span className="text-xs text-stone-400">{deck.slides.length} slides</span>
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
            {deck.slides.map((_, index) => (
              <a
                key={index}
                href={`/api/admin/content-kit/render/${deck.id}/${index}`}
                download={`${deck.slug}-${String(index + 1).padStart(2, "0")}.png`}
                title="Click to download this slide"
                className="block shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/content-kit/render/${deck.id}/${index}`}
                  alt={`Slide ${index + 1}`}
                  className="h-64 w-auto rounded-lg border border-stone-200 transition hover:border-stone-950"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-stone-400">Click a slide to download it as PNG (1080x1350).</p>
            <a
              href={`/api/admin/content-kit/render/${deck.id}/0?format=cover`}
              download={`${deck.slug}-cover.png`}
              className="text-xs uppercase tracking-wide text-stone-950 underline underline-offset-4"
            >
              Reel cover (1080x1920)
            </a>
          </div>

          <div className="mt-4 rounded-xl bg-stone-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-stone-500">Caption</p>
              <CopyChip label="Copy caption" text={deck.caption} />
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{deck.caption}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {deck.status === "draft" && (
              <button
                type="button"
                onClick={() => onStatus(deck.id, "approved")}
                className="rounded-full bg-stone-950 px-4 py-1.5 text-xs uppercase tracking-wide text-white"
              >
                Approve
              </button>
            )}
            {deck.status !== "posted" && (
              <button
                type="button"
                onClick={() => onStatus(deck.id, "posted")}
                className="rounded-full border border-stone-300 px-4 py-1.5 text-xs uppercase tracking-wide text-stone-700 hover:border-stone-950"
              >
                Mark posted
              </button>
            )}
            {deck.status !== "draft" && (
              <button
                type="button"
                onClick={() => onStatus(deck.id, "draft")}
                className="rounded-full border border-stone-200 px-4 py-1.5 text-xs uppercase tracking-wide text-stone-400 hover:border-stone-400"
              >
                Back to draft
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ContentKitClient({
  initialCarousels,
  shoots = [],
}: {
  initialCarousels: CarouselDeck[]
  shoots?: ShootOption[]
}) {
  const [decks, setDecks] = useState<CarouselDeck[]>(initialCarousels)
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
      const response = await fetch("/api/admin/content-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          sourceShootId: selectedShootId,
          imageUrls: backgrounds.map((asset) => asset.url),
          overlayUrls: overlays.map((asset) => asset.url),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Generation failed")
      setDecks([...data.carousels, ...decks])
      setTopic("")
    } catch (err: any) {
      setError(err?.message || "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  async function updateStatus(id: number, status: CarouselDeck["status"]) {
    setDecks((current) => current.map((deck) => (deck.id === id ? { ...deck, status } : deck)))
    await fetch("/api/admin/content-kit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-2xl font-light tracking-tight text-stone-950">Carousel kit</h2>
          <p className="mt-1 text-sm text-stone-600">
            Pick an approved shoot first. The carousel uses those photos as backgrounds, then layers
            short teaching copy and any screenshots you upload on top.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
        <label className="text-xs uppercase tracking-wide text-stone-500" htmlFor="carousel-shoot">
          Source shoot
        </label>
        <select
          id="carousel-shoot"
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
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {selectedShoot.shots.map((shot) => (
              <div key={shot.id} className="shrink-0 overflow-hidden rounded-lg border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.url} alt={shot.title} className="h-24 w-[4.5rem] object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-amber-700">
            Approve at least 2 rendered shots in Shoot Studio before generating a shoot-based carousel.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Optional teaching angle, e.g. the prompt behind this Paris shoot"
          className="w-full max-w-md rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-950 focus:outline-none"
        />
        <button
          type="button"
          onClick={generate}
          disabled={generating || (!selectedShootId && backgrounds.length < 2)}
          className="rounded-full bg-stone-950 px-5 py-2 text-xs uppercase tracking-wide text-white disabled:opacity-50"
        >
          {generating ? "Writing the shoot carousel" : "Generate shoot carousel"}
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          <span className="block text-xs uppercase tracking-wide text-stone-500">Extra backgrounds</span>
          <span className="mt-1 block">Only use these when the shoot needs one more scene.</span>
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
          <span className="mt-1 block">Use for ChatGPT screenshots, product proof, or examples.</span>
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
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 space-y-3">
        {decks.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            No carousels yet. Hit generate after this week&apos;s brief exists.
          </p>
        ) : (
          decks.map((deck) => <DeckCard key={deck.id} deck={deck} onStatus={updateStatus} />)
        )}
      </div>
    </section>
  )
}
