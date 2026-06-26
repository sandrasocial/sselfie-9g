"use client"

import { useState } from "react"
import type { ContentBrief, ContentBriefPiece } from "@/lib/content-engine/brief-generator"

type ReportRow = {
  id: number
  period_start: string
  period_end: string
  payload: ContentBrief
  created_at: string
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  } catch {
    return value
  }
}

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

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-stone-800">{value}</p>
    </div>
  )
}

function DemandMapSection({ brief }: { brief: ContentBrief }) {
  const map = brief.demandMap
  if (!map) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-serif text-xl text-stone-950">Demand map</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          This saved brief was generated before the demand-map rebuild. Generate a fresh brief to
          see the painful before, desired after, belief shift, and offer bridge.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-stone-950 bg-stone-950 p-5 text-white">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Demand map</p>
          <h2 className="mt-2 font-serif text-2xl font-light text-white">
            What demand should this week create?
          </h2>
        </div>
        <CopyChip
          label="Copy demand map"
          text={[
            `Strongest demand signal: ${map.strongestDemandSignal}`,
            `Painful before: ${map.painfulBefore}`,
            `Desired after: ${map.desiredAfter}`,
            `Belief shift: ${map.beliefShift}`,
            `Primary offer bridge: ${map.primaryOfferBridge}`,
            `Content warning: ${map.contentWarning}`,
          ].join("\n")}
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[
          ["Strongest demand signal", map.strongestDemandSignal],
          ["Painful before", map.painfulBefore],
          ["Desired after", map.desiredAfter],
          ["Belief shift", map.beliefShift],
          ["Primary offer bridge", map.primaryOfferBridge],
          ["Do not repeat", map.contentWarning],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">{label}</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-100">{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function PieceCard({ piece }: { piece: ContentBriefPiece }) {
  const fullCopy = [
    piece.caption,
    "",
    piece.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" "),
  ].join("\n")

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-stone-950 px-3 py-1 text-xs uppercase tracking-wide text-white">
          {piece.day}
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs uppercase tracking-wide text-stone-700">
          {piece.format}
        </span>
        <h3 className="ml-1 font-medium text-stone-950">{piece.title}</h3>
      </div>

      <p className="mt-4 font-serif text-lg text-stone-900">{piece.hook}</p>

      {(piece.demandSignal || piece.painfulBefore || piece.desiredAfter || piece.beliefShift) && (
        <div className="mt-4 rounded-xl border border-stone-950 bg-stone-950 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-stone-400">
            Demand logic
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                Demand signal
              </p>
              <p className="mt-1 text-sm leading-relaxed text-stone-100">{piece.demandSignal}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                Painful before
              </p>
              <p className="mt-1 text-sm leading-relaxed text-stone-100">{piece.painfulBefore}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                Desired after
              </p>
              <p className="mt-1 text-sm leading-relaxed text-stone-100">{piece.desiredAfter}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                Belief shift
              </p>
              <p className="mt-1 text-sm leading-relaxed text-stone-100">{piece.beliefShift}</p>
            </div>
          </div>
        </div>
      )}

      <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 font-sans text-sm leading-relaxed text-stone-800">
        {piece.caption}
      </pre>

      {piece.carouselOutline.length > 0 && (
        <div className="mt-3 rounded-xl border border-stone-200 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Carousel slides</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-800">
            {piece.carouselOutline.map((slide, index) => (
              <li key={index}>{slide}</li>
            ))}
          </ol>
        </div>
      )}

      {piece.format === "reel" && piece.reelCoverText && (
        <p className="mt-3 text-sm text-stone-700">
          <span className="text-xs uppercase tracking-wide text-stone-500">Reel cover: </span>
          {piece.reelCoverText}
        </p>
      )}

      <div className="mt-3 rounded-xl border border-stone-200 p-4">
        <p className="text-xs uppercase tracking-wide text-stone-500">Photoshoot prompt</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-800">{piece.photoshootPrompt}</p>
      </div>

      {(piece.visualProof || piece.offerBridge || piece.whyThisCreatesDemand) && (
        <div className="mt-3 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-3">
          <DetailRow label="Visual proof" value={piece.visualProof} />
          <DetailRow label="Offer bridge" value={piece.offerBridge} />
          <DetailRow label="Why this creates demand" value={piece.whyThisCreatesDemand} />
        </div>
      )}

      <p className="mt-3 text-sm text-stone-600">
        <span className="text-xs uppercase tracking-wide text-stone-500">Why this works: </span>
        {piece.whyThisWorks}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <CopyChip label="Copy caption + tags" text={fullCopy} />
        <CopyChip label="Copy hook" text={piece.hook} />
        <CopyChip label="Copy photoshoot prompt" text={piece.photoshootPrompt} />
        {piece.carouselOutline.length > 0 && (
          <CopyChip label="Copy slides" text={piece.carouselOutline.join("\n")} />
        )}
      </div>
    </div>
  )
}

export function ContentBriefClient({ initialReports }: { initialReports: ReportRow[] }) {
  const [reports, setReports] = useState<ReportRow[]>(initialReports)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = reports[selectedIndex]
  const brief = selected?.payload

  async function generateNow() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/content-brief", { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Generation failed")
      }
      const refreshed = await fetch("/api/admin/content-brief").then((r) => r.json())
      setReports(refreshed.reports || [])
      setSelectedIndex(0)
    } catch (e: any) {
      setError(e?.message || "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generateNow}
          disabled={generating}
          className="rounded-full bg-stone-950 px-5 py-2 text-sm text-white transition hover:bg-stone-800 disabled:opacity-50"
        >
          {generating ? "Building your brief (takes a minute)..." : "Generate this week's brief"}
        </button>
        {reports.length > 0 && (
          <select
            value={selectedIndex}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-800"
          >
            {reports.map((report, index) => (
              <option key={report.id} value={index}>
                Week of {formatDate(report.period_start)} ({formatDate(report.created_at)})
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>
      )}

      {!brief && !generating && (
        <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-600">
          No brief yet. Hit the button above and the engine will pull your post data, audience signals,
          and live hook research, then write your week.
        </p>
      )}

      {brief && (
        <>
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="text-xs uppercase tracking-wide text-stone-500">Account snapshot</h2>
            <p className="mt-2 text-sm text-stone-800">
              @{brief.accountSnapshot.username}
              {brief.accountSnapshot.followers ? ` · ${brief.accountSnapshot.followers.toLocaleString()} followers` : ""}
              {` · ${brief.accountSnapshot.postsAnalyzed} posts analyzed`}
              {brief.accountSnapshot.insightsLevel === "basic"
                ? " · basic metrics (reconnect Instagram to unlock reach, saves and shares)"
                : " · full metrics"}
            </p>
          </section>

          <DemandMapSection brief={brief} />

          <section>
            <h2 className="mb-3 font-serif text-xl text-stone-950">What worked last week</h2>
            <div className="space-y-2">
              {brief.performanceRecap.map((post, index) => (
                <div key={index} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs uppercase tracking-wide text-stone-600">
                      {post.format}
                    </span>
                    <span className="text-xs text-stone-500">
                      {post.likes.toLocaleString()} likes · {post.comments.toLocaleString()} comments
                    </span>
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-stone-500 underline hover:text-stone-950"
                      >
                        open post
                      </a>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-stone-900">&quot;{post.hookLine}&quot;</p>
                  <p className="mt-1 text-sm text-stone-600">{post.whyItWorked}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-stone-950">What your audience wants</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">Most copied prompts (30d)</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-800">
                  {brief.audienceDemand.topPrompts.map((prompt, index) => (
                    <li key={index} className="flex justify-between gap-3">
                      <span>{prompt.title}</span>
                      <span className="text-stone-500">{prompt.copies}x</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">DM themes</p>
                <ul className="mt-2 space-y-2 text-sm text-stone-800">
                  {brief.audienceDemand.dmThemes.map((theme, index) => (
                    <li key={index}>
                      <span className="font-medium">{theme.theme}</span>
                      <span className="block text-stone-600">{theme.evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-stone-950">Hooks with receipts</h2>
            <div className="space-y-2">
              {brief.hookIntelligence.map((hook, index) => (
                <div key={index} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${
                        hook.source === "your-data"
                          ? "bg-stone-950 text-white"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {hook.source === "your-data" ? "Your data" : "Research"}
                    </span>
                    <span className="text-xs text-stone-500">{hook.pattern}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-stone-900">{hook.hook}</p>
                  <p className="mt-1 text-sm text-stone-600">{hook.evidence}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-stone-950">Your week, ready to post</h2>
            <div className="space-y-4">
              {brief.contentPlan.map((piece, index) => (
                <PieceCard key={index} piece={piece} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-serif text-xl text-stone-950">Story sequence: {brief.storySequence.theme}</h2>
            <ol className="mt-3 space-y-3">
              {brief.storySequence.frames.map((frame) => (
                <li key={frame.frame} className="rounded-xl bg-stone-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-stone-500">Frame {frame.frame}</p>
                  <p className="mt-1 text-sm text-stone-800">{frame.content}</p>
                  <p className="mt-1 text-xs text-stone-500">Interaction: {frame.interaction}</p>
                </li>
              ))}
            </ol>
          </section>

          {brief.researchNotes && (
            <details className="rounded-2xl border border-stone-200 bg-white p-5">
              <summary className="cursor-pointer text-sm font-medium text-stone-800">
                Research notes (what the web search found)
              </summary>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-700">
                {brief.researchNotes}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  )
}
