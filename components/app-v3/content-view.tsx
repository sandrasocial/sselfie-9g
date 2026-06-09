"use client"

// SSELFIE Studio 3.0 — Content / Daily Relevance (MAYA-REBUILD-05 Phase 5).
// Not a planner and not a menu: Maya recommends what to post today, grounded in the creator's
// brand + recent activity (/api/app-v3/maya/recommendations). Tapping a recommendation starts
// Maya on that exact idea. The plain format starters remain as a fallback for "something else".

import { useEffect, useState } from "react"
import type { OutputFormat } from "./types"

interface Recommendation {
  title: string
  rationale: string
  format: OutputFormat
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

  const heading = greeting?.trim() || (firstName ? `Good to see you, ${firstName}` : "What should you post?")

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-8">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Content</p>
        <h1 className="mt-2 font-serif text-[30px] font-light leading-tight text-[#0D0E10]">{heading}</h1>
        {recs === null && <p className="mt-2 text-[14px] text-[#818283]">Maya is thinking about your week…</p>}
      </header>

      {recs && recs.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[#818283]">Maya recommends today</p>
          <div className="space-y-2">
            {recs.map((r, i) => (
              <button
                key={`${i}-${r.title}`}
                type="button"
                onClick={() => onCreateIdea(r.format, r.title)}
                className="block w-full rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4 text-left transition-colors hover:border-[#0D0E10]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-serif text-[19px] font-light leading-tight text-[#0D0E10]">{r.title}</span>
                  <span className="shrink-0 rounded-full border border-[#C5C6C8]/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#818283]">
                    {FORMAT_LABEL[r.format]}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">{r.rationale}</p>
              </button>
            ))}
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
