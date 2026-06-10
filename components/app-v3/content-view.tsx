"use client"

// SSELFIE Studio 3.0 — Content / Daily Relevance (MAYA-REBUILD-05 Phase 5, visual in 5.1).
// Maya recommends what to post today, and she SHOWS it. Each recommendation is a visual card
// (her own Library photo when she has one, the editorial Vault imagery as the aspirational
// fallback), because the audience responds to seeing, not reading. Tapping starts Maya on that
// idea. Plain format starters + reuse-from-library remain below.

import { useEffect, useState } from "react"
import Image from "next/image"
import { AESTHETICS } from "./aesthetics"
import type { OutputFormat } from "./types"

interface Recommendation {
  title: string
  rationale: string
  format: OutputFormat
  /** Best-matching Library image chosen server-side (null = use the Vault fallback). */
  imageUrl?: string | null
  /** Short "why this image" from Maya. */
  imageReason?: string | null
}

const FORMAT_LABEL: Record<OutputFormat, string> = {
  photo: "Photo",
  "reel-cover": "Reel cover",
  carousel: "Carousel",
  "story-slide": "Story slide",
}

const CONTENT_TYPES: { format: OutputFormat; label: string; line: string }[] = [
  { format: "photo", label: "A photo", line: "An editorial brand shot." },
  { format: "reel-cover", label: "A Reel cover", line: "A scroll-stopping cover with your words." },
  { format: "carousel", label: "A carousel", line: "A few cohesive slides that teach or tell." },
  { format: "story-slide", label: "A Story slide", line: "A vertical slide for polls, sales, or moments." },
]

// Aspirational editorial fallback visuals (her own Library is preferred when present).
const MOOD_IMAGES = AESTHETICS.map((a) => a.coverImage).filter(Boolean)

interface ContentViewProps {
  onCreateIdea: (format: OutputFormat, title: string) => void
  onCreate: (format: OutputFormat) => void
  onBrowse: () => void
  firstName?: string | null
}

export function ContentView({ onCreateIdea, onCreate, onBrowse, firstName }: ContentViewProps) {
  const [greeting, setGreeting] = useState<string | null>(null)
  const [recs, setRecs] = useState<Recommendation[] | null>(null)

  useEffect(() => {
    fetch("/api/app-v3/maya/recommendations")
      .then((r) => r.json())
      .then((d) => {
        setGreeting(typeof d?.greeting === "string" ? d.greeting : "")
        setRecs(Array.isArray(d?.recommendations) ? d.recommendations : [])
      })
      .catch(() => {
        setGreeting("")
        setRecs([])
      })
  }, [])

  // Maya's contextually matched Library image; the editorial Vault image as the fallback.
  function heroFor(rec: Recommendation, index: number): string | null {
    if (rec.imageUrl) return rec.imageUrl
    if (MOOD_IMAGES.length > 0) return MOOD_IMAGES[index % MOOD_IMAGES.length]
    return null
  }

  const greetingLines = (greeting ?? "").split(/(?<=[.!?])\s+/).map((l) => l.trim()).filter(Boolean)
  const showGreeting = greetingLines.length > 0

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-8">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Content</p>
        {showGreeting ? (
          <div className="mt-2 space-y-1">
            {greetingLines.map((line, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "font-serif text-[28px] font-light leading-tight text-[#0D0E10]"
                    : "text-[15px] leading-relaxed text-[#4F5052]"
                }
              >
                {line}
              </p>
            ))}
          </div>
        ) : (
          <h1 className="mt-2 font-serif text-[30px] font-light leading-tight text-[#0D0E10]">
            {firstName ? `Good to see you, ${firstName}` : "What should you post?"}
          </h1>
        )}
        {recs === null && <p className="mt-2 text-[14px] text-[#818283]">Maya is thinking about your week…</p>}
      </header>

      {recs && recs.length > 0 && (
        <section>
          <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#818283]">Maya recommends today</p>
          <div className="space-y-3">
            {recs.map((r, i) => {
              const hero = heroFor(r, i)
              return (
                <button
                  key={`${i}-${r.title}`}
                  type="button"
                  onClick={() => onCreateIdea(r.format, r.title)}
                  className="group flex w-full gap-4 overflow-hidden rounded-[8px] border border-[#C5C6C8]/60 bg-white p-3 text-left transition-colors hover:border-[#0D0E10]/40"
                >
                  <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-[6px] bg-[#F1F2F2] sm:w-28">
                    {hero && (
                      <Image
                        src={hero}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        sizes="112px"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="self-start rounded-full border border-[#C5C6C8]/70 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-[#818283]">
                      {FORMAT_LABEL[r.format]}
                    </span>
                    <h3 className="mt-2 font-serif text-[20px] font-light leading-tight text-[#0D0E10]">{r.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">{r.rationale}</p>
                    {r.imageReason && (
                      <span className="mt-1.5 block text-[11px] italic text-[#818283]">{r.imageReason}</span>
                    )}
                    <span className="mt-auto pt-2 text-[11px] uppercase tracking-[0.18em] text-[#0D0E10]">
                      Create this
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[#818283]">
          {recs && recs.length > 0 ? "Or start from a format" : "Start something"}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONTENT_TYPES.map((c) => (
            <button
              key={c.format}
              type="button"
              onClick={() => onCreate(c.format)}
              className="rounded-[8px] border border-[#C5C6C8]/60 bg-white px-4 py-4 text-left transition-colors hover:border-[#0D0E10]/40"
            >
              <span className="block font-serif text-[19px] font-light text-[#0D0E10]">{c.label}</span>
              <span className="mt-0.5 block text-[13px] text-[#818283]">{c.line}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onBrowse}
          className="mt-4 text-[12px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
        >
          Or reuse a photo from your library
        </button>
      </section>
    </div>
  )
}
