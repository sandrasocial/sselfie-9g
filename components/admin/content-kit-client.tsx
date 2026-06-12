"use client"

import { useState } from "react"
import type { CarouselDeck } from "@/lib/content-kit/types"

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
          <p className="mt-1 text-xs text-stone-400">Click a slide to download it as PNG (1080x1350).</p>

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

export function ContentKitClient({ initialCarousels }: { initialCarousels: CarouselDeck[] }) {
  const [decks, setDecks] = useState<CarouselDeck[]>(initialCarousels)
  const [topic, setTopic] = useState("")
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/content-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 2, topic: topic.trim() || undefined }),
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
            Ready-to-post carousels written in your voice from this week's brief and your real winners.
            Review, download, post. Nothing goes out without you.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Optional topic, e.g. ChatGPT color grading prompts"
          className="w-full max-w-md rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-950 focus:outline-none"
        />
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="rounded-full bg-stone-950 px-5 py-2 text-xs uppercase tracking-wide text-white disabled:opacity-50"
        >
          {generating ? "Writing your carousels (about a minute)" : "Generate 2 carousels"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 space-y-3">
        {decks.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            No carousels yet. Hit generate after this week's brief exists.
          </p>
        ) : (
          decks.map((deck) => <DeckCard key={deck.id} deck={deck} onStatus={updateStatus} />)
        )}
      </div>
    </section>
  )
}
