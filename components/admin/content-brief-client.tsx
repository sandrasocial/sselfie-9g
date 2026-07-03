"use client"

import { useState } from "react"
import type { ContentBrief, ContentBriefPiece } from "@/lib/content-engine/brief-generator"

export type ContentBriefReportRow = {
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

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

const FUNNEL_STAGE_META: Record<
  ContentBriefPiece["funnelStage"],
  { label: string; description: string; badgeClass: string }
> = {
  cold: {
    label: "Cold · feed reach → right first step",
    description:
      "Selfie/iPhone tutorials use KIT → Selfie Starter Kit. AI prompt/photo content uses PROMPT → AI Prompts, then the planned Selfie To AI Photos Kit / Vault path.",
    badgeClass: "bg-stone-100 text-stone-700",
  },
  warm: {
    label: "Warm · Story/DM trust → Visibility To Paid",
    description: "For the audience already asking how you built this. Belongs in Stories, DMs, and email. Next step: apply / reply WORK for the Visibility To Paid Sprint.",
    badgeClass: "bg-stone-200 text-stone-800",
  },
  activation: {
    label: "Activation · buyers → SUITE",
    description: "For people already in the funnel (Vault buyers, trial members). Bridges them into SUITE or deeper Suite use.",
    badgeClass: "bg-stone-950 text-white",
  },
}

function pieceToHandoffTopic(piece: ContentBriefPiece): string {
  return [piece.hook, piece.shortSuggestion, piece.demandSignal, piece.offerBridge]
    .filter(Boolean)
    .join(" · ")
}

function HandoffButton({
  label,
  busyLabel,
  endpoint,
  body,
  redirectTo,
}: {
  label: string
  busyLabel: string
  endpoint: string
  body: Record<string, unknown>
  redirectTo: string
}) {
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle")

  async function send() {
    setStatus("busy")
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Could not create draft")
      }
      window.location.href = redirectTo
    } catch {
      setStatus("error")
    }
  }

  return (
    <button
      type="button"
      onClick={send}
      disabled={status === "busy"}
      className="rounded-full border border-stone-950 bg-white px-3 py-1 text-xs uppercase tracking-wide text-stone-950 transition hover:bg-stone-950 hover:text-white disabled:opacity-50"
    >
      {status === "busy" ? busyLabel : status === "error" ? "Failed, try again" : label}
    </button>
  )
}

function compactNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "n/a"
  return value.toLocaleString("en-US")
}

function money(cents: number | null | undefined): string {
  return `$${((cents || 0) / 100).toFixed(0)}`
}

function GrowthTruthSection({ brief }: { brief: ContentBrief }) {
  const truth = brief.growthTruth
  if (!truth) return null

  const metrics = [
    {
      label: "Instagram",
      value: `${compactNumber(truth.instagram.followers)} followers`,
      source: truth.sources.instagramProfile,
    },
    {
      label: "Recent IG",
      value: `${compactNumber(truth.recentInstagram.sumLatestPostReach)} summed reach`,
      source: truth.sources.instagramPerformance,
    },
    {
      label: "ManyChat",
      value: `${compactNumber(truth.manychat.captures)} captures`,
      source: truth.sources.manychat,
    },
    {
      label: "Prompt Vault",
      value: `${compactNumber(truth.promptVault.payments)} purchases · ${money(truth.promptVault.revenueCents)}`,
      source: truth.sources.money,
    },
    {
      label: "Suite",
      value: `${compactNumber(truth.suite.activePaidMembers)} paid · ${compactNumber(truth.suite.activeTrials)} trials`,
      source: truth.sources.members,
    },
    {
      label: "Email",
      value: truth.email.subscribedContacts == null
        ? "not fetched in fast snapshot"
        : `${compactNumber(truth.email.subscribedContacts)} subscribed`,
      source: truth.sources.email,
    },
  ]

  return (
    <section className="rounded-2xl border border-stone-950 bg-stone-950 p-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Growth truth</p>
          <h2 className="mt-2 font-serif text-2xl font-light text-white">
            The audit numbers this brief is allowed to use
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            {truth.positioning.currentPublicLane}
          </p>
        </div>
        <CopyChip
          label="Copy truth"
          text={[
            `Instagram: ${compactNumber(truth.instagram.followers)} followers`,
            `Recent IG: ${compactNumber(truth.recentInstagram.sumLatestPostReach)} summed latest per-post reach (${truth.recentInstagram.reachNote})`,
            `ManyChat: ${compactNumber(truth.manychat.captures)} captures`,
            `Prompt Vault: ${compactNumber(truth.promptVault.payments)} purchases, ${money(truth.promptVault.revenueCents)}`,
            `Suite: ${compactNumber(truth.suite.activePaidMembers)} paid, ${compactNumber(truth.suite.activeTrials)} trials`,
            `Email: ${truth.email.subscribedContacts == null ? "not fetched in fast snapshot" : `${compactNumber(truth.email.subscribedContacts)} subscribed`}`,
            `Leaks: ${truth.leaks.join(" | ")}`,
          ].join("\n")}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(metric => (
          <div key={metric.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">{metric.label}</p>
            <p className="mt-1 font-serif text-xl font-light text-white">{metric.value}</p>
            <p className="mt-1 text-xs text-stone-500">Source: {metric.source}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-amber-200/25 bg-amber-200/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-amber-100">Leaks to address first</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-stone-100">
          {truth.leaks.map((leak, index) => (
            <li key={index}>{leak}</li>
          ))}
        </ul>
      </div>
    </section>
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

function CopyHookChip({ text }: { text: string }) {
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
      className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm font-medium text-stone-900 transition hover:border-stone-950 hover:text-stone-950"
    >
      {copied ? "Copied" : text}
    </button>
  )
}

function OnScreenHookBankSection({ brief }: { brief: ContentBrief }) {
  const entries = safeArray(brief.onScreenHookBank)
  if (entries.length === 0) return null

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-stone-500">On-screen hook bank</p>
          <h2 className="mt-2 font-serif text-xl text-stone-950">On-screen hooks that stop the scroll</h2>
          <p className="mt-1 text-sm text-stone-600">
            Proven first-frame text overlays for reels, carousels, and stories. Tap a line to copy it.
            This is the text ON the video, not the caption.
          </p>
        </div>
        <CopyChip label="Copy all hooks" text={entries.map((entry) => entry.text).join("\n")} />
      </div>
      <div className="mt-4 space-y-2">
        {entries.map((entry, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <CopyHookChip text={entry.text} />
            <span
              className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${
                entry.source === "your-data" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              {entry.source === "your-data" ? "Your data" : "Research"}
            </span>
            <span className="text-xs text-stone-500">{entry.pattern}</span>
            {entry.watchThroughMechanic && (
              <span className="text-xs text-stone-400">Keeps them watching: {entry.watchThroughMechanic}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function TrendRadarSection({ brief }: { brief: ContentBrief }) {
  const entries = safeArray(brief.trendRadar)
  if (entries.length === 0) return null

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Trend radar</p>
      <h2 className="mt-2 font-serif text-xl text-stone-950">The waves moving this week</h2>
      <p className="mt-1 text-sm text-stone-600">
        Current AI-photo trends and how to ride each one while staying still you, never fake.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry, index) => (
          <div key={index} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-medium text-stone-950">{entry.trend}</p>
            <p className="mt-2 text-xs leading-relaxed text-stone-600">{entry.whyItsMoving}</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-800">{entry.howSandraRidesIt}</p>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              <span className="uppercase tracking-wide">No-fake guardrail: </span>
              {entry.noFakeGuardrail}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

const ENGAGEMENT_LABEL: Record<string, string> = {
  save: "Engineered for saves",
  share: "Engineered for shares",
  comment: "Engineered for comments",
  follow: "Engineered for follows",
}

function PieceCard({ piece }: { piece: ContentBriefPiece }) {
  const carouselOutline = safeArray(piece.carouselOutline)
  const onScreenText = safeArray(piece.onScreenText)
  const hashtags = safeArray(piece.hashtags)
  const fullCopy = [
    piece.caption || "",
    "",
    hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" "),
  ].filter(Boolean).join("\n")
  const stageMeta = FUNNEL_STAGE_META[piece.funnelStage] || FUNNEL_STAGE_META.cold
  const handoffTopic = pieceToHandoffTopic(piece)

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

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${stageMeta.badgeClass}`}>
          {stageMeta.label}
        </span>
        {piece.engineeredFor && (
          <span className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs uppercase tracking-wide text-stone-700">
            {ENGAGEMENT_LABEL[piece.engineeredFor] || piece.engineeredFor}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-stone-500">{stageMeta.description}</p>
      {piece.engagementMechanic && (
        <p className="mt-1 text-xs text-stone-500">
          <span className="uppercase tracking-wide">Earn it with: </span>
          {piece.engagementMechanic}
        </p>
      )}

      <p className="mt-4 font-serif text-lg text-stone-900">{piece.hook}</p>

      {piece.shortSuggestion && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Short suggestion
          </p>
          <p className="mt-1 text-sm leading-relaxed text-stone-800">{piece.shortSuggestion}</p>
        </div>
      )}

      {(piece.trendMechanic || piece.competitorPattern) && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <DetailRow label="Trend mechanic" value={piece.trendMechanic} />
          <DetailRow label="Creator pattern to adapt" value={piece.competitorPattern} />
        </div>
      )}

      {piece.visualHook && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">
            Visual hook · first 2 seconds
          </p>
          <p className="mt-1 text-sm leading-relaxed text-stone-800">{piece.visualHook}</p>
        </div>
      )}

      {onScreenText.length > 0 && (
        <div className="mt-3 rounded-xl border border-stone-950 bg-stone-950 p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
              Text on screen {piece.format === "carousel" ? "· one line per slide" : "· beat by beat"}
            </p>
            <CopyChip label="Copy on-screen text" text={onScreenText.join("\n")} />
          </div>
          <ol className="mt-3 space-y-1.5">
            {onScreenText.map((line, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed">
                <span className="select-none text-stone-500">
                  {piece.format === "carousel" ? `S${index + 1}` : `${index + 1}.`}
                </span>
                <span className="font-medium text-stone-50">{line}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(piece.demandSignal || piece.painfulBefore || piece.desiredAfter || piece.beliefShift || piece.whatToAvoid) && (
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
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                Avoid
              </p>
              <p className="mt-1 text-sm leading-relaxed text-stone-100">{piece.whatToAvoid}</p>
            </div>
          </div>
        </div>
      )}

      {piece.executionNotes && (
        <div className="mt-3 rounded-xl border border-stone-200 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Execution notes</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-800">{piece.executionNotes}</p>
        </div>
      )}

      {piece.chatgptContextPrompt && (
        <div className="mt-3 rounded-xl border border-stone-950 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">Context for ChatGPT</p>
            <CopyChip label="Copy context" text={piece.chatgptContextPrompt} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-stone-800">{piece.chatgptContextPrompt}</p>
        </div>
      )}

      {piece.caption && (
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 font-sans text-sm leading-relaxed text-stone-800">
          {piece.caption}
        </pre>
      )}

      {carouselOutline.length > 0 && (
        <div className="mt-3 rounded-xl border border-stone-200 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Carousel slides</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-800">
            {carouselOutline.map((slide, index) => (
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

      {piece.audioSuggestion && (
        <p className="mt-3 text-sm text-stone-700">
          <span className="text-xs uppercase tracking-wide text-stone-500">Audio: </span>
          {piece.audioSuggestion}
        </p>
      )}

      {piece.photoshootPrompt && (
        <div className="mt-3 rounded-xl border border-stone-200 p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Legacy photoshoot prompt</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-800">{piece.photoshootPrompt}</p>
        </div>
      )}

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
        {piece.chatgptContextPrompt && <CopyChip label="Copy ChatGPT context" text={piece.chatgptContextPrompt} />}
        {fullCopy && <CopyChip label="Copy caption + tags" text={fullCopy} />}
        <CopyChip label="Copy hook" text={piece.hook} />
        {piece.photoshootPrompt && <CopyChip label="Copy photoshoot prompt" text={piece.photoshootPrompt} />}
        {carouselOutline.length > 0 && (
          <CopyChip label="Copy slides" text={carouselOutline.join("\n")} />
        )}
      </div>

      {(piece.format === "carousel" || piece.funnelStage === "warm") && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
          {piece.format === "carousel" && (
            <HandoffButton
              label="Send to Carousel Kit →"
              busyLabel="Creating draft…"
              endpoint="/api/admin/content-kit"
              body={{ topic: handoffTopic, mode: "standard" }}
              redirectTo="/admin/content-brief?open=carousel-kit#carousel-kit"
            />
          )}
          {piece.funnelStage === "warm" && (
            <HandoffButton
              label="Send to Story Sequences →"
              busyLabel="Creating draft…"
              endpoint="/api/admin/content-kit/stories"
              body={{ topic: handoffTopic }}
              redirectTo="/admin/content-brief?open=story-sequences#story-sequences"
            />
          )}
        </div>
      )}
    </div>
  )
}

export function ContentBriefClient({ initialReports }: { initialReports: ContentBriefReportRow[] }) {
  const [reports, setReports] = useState<ContentBriefReportRow[]>(initialReports)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = reports[selectedIndex]
  const brief = selected?.payload
  const performanceRecap = safeArray(brief?.performanceRecap)
  const topPrompts = safeArray(brief?.audienceDemand?.topPrompts)
  const dmThemes = safeArray(brief?.audienceDemand?.dmThemes)
  const hookIntelligence = safeArray(brief?.hookIntelligence)
  const contentPlan = safeArray(brief?.contentPlan)
  const storyFrames = safeArray(brief?.storySequence?.frames)
  const audienceQuestions = safeArray(brief?.demandMap?.audienceQuestions)

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed")
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
          competitor patterns, and live hook research, then give you short directions to develop.
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

          <GrowthTruthSection brief={brief} />

          <DemandMapSection brief={brief} />

          <OnScreenHookBankSection brief={brief} />

          <TrendRadarSection brief={brief} />

          <section>
            <h2 className="mb-3 font-serif text-xl text-stone-950">What worked last week</h2>
            <div className="space-y-2">
              {performanceRecap.map((post, index) => (
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
                  {topPrompts.map((prompt, index) => (
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
                  {dmThemes.map((theme, index) => (
                    <li key={index}>
                      <span className="font-medium">{theme.theme}</span>
                      <span className="block text-stone-600">{theme.evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {audienceQuestions.length > 0 && (
              <div className="mt-3 rounded-xl border border-stone-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">
                  Questions your audience actually asked
                </p>
                <ul className="mt-2 space-y-2 text-sm text-stone-800">
                  {audienceQuestions.map((entry, index) => (
                    <li key={index}>
                      <span className="font-medium">&quot;{entry.question}&quot;</span>
                      <span className="block text-stone-600">Answer it with: {entry.suggestedAnswerContent}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-stone-950">Hooks with receipts</h2>
            <div className="space-y-2">
              {hookIntelligence.map((hook, index) => (
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
            <h2 className="mb-1 font-serif text-xl text-stone-950">Suggested directions to develop</h2>
            <p className="mb-4 text-sm text-stone-600">
              Cold attention gets the Kit. Warm trust gets Visibility To Paid. Paid activation gets SUITE.
            </p>
            <div className="space-y-8">
              {(["cold", "warm", "activation"] as const).map((stage) => {
                const pieces = contentPlan.filter((piece) => (piece.funnelStage || "cold") === stage)
                if (pieces.length === 0) return null
                const meta = FUNNEL_STAGE_META[stage]
                return (
                  <div key={stage}>
                    <div className="mb-3 flex items-baseline gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                      <p className="text-xs text-stone-500">{meta.description}</p>
                    </div>
                    <div className="space-y-4">
                      {pieces.map((piece, index) => (
                        <PieceCard key={index} piece={piece} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-serif text-xl text-stone-950">Story sequence: {brief.storySequence?.theme || "Untitled"}</h2>
            <ol className="mt-3 space-y-3">
              {storyFrames.map((frame) => (
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
