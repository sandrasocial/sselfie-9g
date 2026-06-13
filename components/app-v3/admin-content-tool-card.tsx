"use client"

import { useState } from "react"

type AdminToolShoot = {
  id: number
  title: string
  status?: string
  approvedShotCount?: number
  publishReady?: boolean
  publishNeeded?: number
  publishedVaultSlug?: string | null
  emailDropStatus?: string | null
  heroImageUrl?: string | null
}

type AdminToolSlide = {
  index: number
  kind?: string
  role?: string
  title: string
}

type AdminVaultDropRun = {
  id: string
  status: string
  nonBuyer: { total: number; sent: number; failed: number; skipped: number; processed: number; remaining: number }
  buyer: { total: number; sent: number; failed: number; skipped: number; processed: number; remaining: number }
}

type AdminVaultDropEmail = {
  ready: boolean
  dropKey: string
  selectedCollectionIds: string[]
  missingCollectionIds: string[]
  collections: Array<{ id: string; name: string; heroImage: string; moodLine: string }>
  availableCollections: Array<{ id: string; name: string; heroImage: string; moodLine: string }>
  segments: {
    nonbuyers: { count: number }
    buyers: { count: number }
  }
  totalRecipients: number
  latestRun?: AdminVaultDropRun | null
}

export type AdminContentToolResult =
  | {
      kind: "sources"
      format?: string | null
      shoots: AdminToolShoot[]
    }
  | {
      kind: "carousel"
      deck: {
        id: number
        title: string
        status: string
        caption: string
        sourceShootId?: number | null
        sourceShootTitle?: string | null
        slides: AdminToolSlide[]
      }
      sourceShoot?: AdminToolShoot | null
    }
  | {
      kind: "story"
      sequence: {
        id: number
        title: string
        status: string
        sourceShootId?: number | null
        sourceShootTitle?: string | null
        slides: AdminToolSlide[]
      }
      sourceShoot?: AdminToolShoot | null
    }
  | {
      kind: "vault-publish"
      shoot: AdminToolShoot
      collection: {
        id: number
        slug: string
        publishedAt: string
        shotCount: number
      }
      dropEmail: AdminVaultDropEmail
    }
  | {
      kind: "vault-drop-handoff"
      dropEmail: AdminVaultDropEmail
    }
  | {
      kind: "error"
      tool?: string
      message: string
      shoots?: AdminToolShoot[]
    }

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#0D0E10] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white">
      {children}
    </span>
  )
}

function SourceShoot({ shoot }: { shoot?: AdminToolShoot | null }) {
  if (!shoot) return null
  return (
    <div className="mt-3 flex items-center gap-3 rounded-[6px] border border-[#C5C6C8]/50 bg-white p-2.5">
      {shoot.heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shoot.heroImageUrl} alt="" className="h-14 w-11 rounded-[4px] object-cover" loading="lazy" />
      ) : (
        <div className="h-14 w-11 rounded-[4px] bg-[#ECEDED]" />
      )}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#818283]">Source shoot</p>
        <p className="truncate text-[13px] font-medium text-[#0D0E10]">{shoot.title}</p>
        <p className="text-[12px] text-[#818283]">{shoot.approvedShotCount ?? 0} approved shots</p>
      </div>
    </div>
  )
}

function SlidesList({ slides }: { slides: AdminToolSlide[] }) {
  return (
    <div className="mt-3 space-y-1.5">
      {slides.slice(0, 8).map((slide) => (
        <div key={slide.index} className="rounded-[4px] bg-white px-3 py-2 text-[12px] text-[#4F5052]">
          <span className="text-[#818283]">
            {slide.index + 1}. {slide.kind || slide.role || "slide"} ·{" "}
          </span>
          {slide.title}
        </div>
      ))}
    </div>
  )
}

function SourcesCard({ shoots }: { shoots: AdminToolShoot[] }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Badge>Ready shoots</Badge>
        <span className="text-[12px] text-[#818283]">{shoots.length} available</span>
      </div>
      <div className="mt-3 space-y-2">
        {shoots.length > 0 ? (
          shoots.map((shoot) => <SourceShoot key={shoot.id} shoot={shoot} />)
        ) : (
          <p className="text-[13px] leading-relaxed text-[#4F5052]">
            Approve at least 2 rendered shots in Shoot Studio, then Maya can make carousels and
            story sequences from that shoot.
          </p>
        )}
      </div>
    </>
  )
}

function CarouselCard({ result }: { result: Extract<AdminContentToolResult, { kind: "carousel" }> }) {
  const deck = result.deck
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Carousel draft</Badge>
        <span className="text-[12px] text-[#818283]">{deck.slides.length} slides</span>
      </div>
      <h3 className="mt-3 font-serif text-[21px] font-light leading-tight text-[#0D0E10]">{deck.title}</h3>
      <SourceShoot shoot={result.sourceShoot} />
      <SlidesList slides={deck.slides} />
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`/api/admin/content-kit/render/${deck.id}/0?format=cover`}
          className="rounded-[4px] bg-[#0D0E10] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white"
        >
          Download cover
        </a>
        {deck.slides.slice(0, 3).map((slide) => (
          <a
            key={slide.index}
            href={`/api/admin/content-kit/render/${deck.id}/${slide.index}`}
            className="rounded-[4px] border border-[#C5C6C8]/70 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#4F5052]"
          >
            Slide {slide.index + 1}
          </a>
        ))}
      </div>
      {deck.caption && (
        <details className="mt-3 rounded-[6px] bg-white px-3 py-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-[#818283]">
            Caption
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#4F5052]">{deck.caption}</p>
        </details>
      )}
    </>
  )
}

function StoryCard({ result }: { result: Extract<AdminContentToolResult, { kind: "story" }> }) {
  const sequence = result.sequence
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Story sequence</Badge>
        <span className="text-[12px] text-[#818283]">{sequence.slides.length} slides</span>
      </div>
      <h3 className="mt-3 font-serif text-[21px] font-light leading-tight text-[#0D0E10]">{sequence.title}</h3>
      <SourceShoot shoot={result.sourceShoot} />
      <SlidesList slides={sequence.slides} />
      <div className="mt-4 flex flex-wrap gap-2">
        {sequence.slides.slice(0, 4).map((slide) => (
          <a
            key={slide.index}
            href={`/api/admin/content-kit/story/${sequence.id}/${slide.index}`}
            className="rounded-[4px] border border-[#C5C6C8]/70 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#4F5052]"
          >
            Story {slide.index + 1}
          </a>
        ))}
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[6px] bg-white px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[#818283]">{label}</p>
      <p className="mt-1 font-serif text-[20px] font-light leading-none text-[#0D0E10]">{value}</p>
    </div>
  )
}

function CollectionStrip({ collections }: { collections: AdminVaultDropEmail["collections"] }) {
  if (collections.length === 0) {
    return <p className="mt-3 text-[13px] leading-relaxed text-[#4F5052]">No pending collections selected yet.</p>
  }
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {collections.map((collection) => (
        <div key={collection.id} className="grid grid-cols-[46px_1fr] gap-2 rounded-[6px] bg-white p-2">
          {collection.heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={collection.heroImage} alt="" className="h-14 w-[46px] rounded-[4px] object-cover" loading="lazy" />
          ) : (
            <div className="h-14 w-[46px] rounded-[4px] bg-[#ECEDED]" />
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-[#0D0E10]">{collection.name}</p>
            <p className="line-clamp-2 text-[11px] leading-snug text-[#818283]">{collection.moodLine}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function VaultDropActions({ dropEmail }: { dropEmail: AdminVaultDropEmail }) {
  const [run, setRun] = useState<AdminVaultDropRun | null>(dropEmail.latestRun ?? null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const collectionIds = dropEmail.selectedCollectionIds

  async function post(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action)
    setMessage(null)
    setError(null)
    try {
      const response = await fetch("/api/admin/vault-drop-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, collectionIds, ...extra }),
      })
      const data = await response.json()
      if (!response.ok || data.success === false) throw new Error(data.error || "Action failed")
      if (data.run) setRun(data.run)
      if (action === "send_test") {
        setMessage(`Test sent to ${data.to}.`)
      } else if (action === "start_live_run") {
        setMessage(data.existing ? "Using the existing live run." : "Live run created. No emails have sent yet.")
      } else {
        setMessage(data.done?.all ? "Drop complete." : "Batch processed. Keep going until both segments are done.")
      }
    } catch (err: any) {
      setError(err?.message || "Action failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => post("send_test", { audience: "nonbuyer" })}
          disabled={!dropEmail.ready || busy !== null}
          className="rounded-[4px] bg-[#0D0E10] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white disabled:opacity-40"
        >
          {busy === "send_test" ? "Sending" : "Send free test"}
        </button>
        <button
          type="button"
          onClick={() => post("send_test", { audience: "buyer" })}
          disabled={!dropEmail.ready || busy !== null}
          className="rounded-[4px] bg-[#0D0E10] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white disabled:opacity-40"
        >
          {busy === "send_test" ? "Sending" : "Send buyer test"}
        </button>
        <button
          type="button"
          onClick={() => post("start_live_run")}
          disabled={!dropEmail.ready || busy !== null || Boolean(run)}
          className="rounded-[4px] border border-[#0D0E10] bg-white px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#0D0E10] disabled:opacity-40"
        >
          {busy === "start_live_run" ? "Starting" : "Start live run"}
        </button>
        <button
          type="button"
          onClick={() => post("process_batch", { runId: run?.id, audienceType: "all" })}
          disabled={!dropEmail.ready || busy !== null || !run || run.status === "completed" || run.status === "partially_completed"}
          className="rounded-[4px] border border-[#C5C6C8]/70 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#4F5052] disabled:opacity-40"
        >
          {busy === "process_batch" ? "Processing" : "Process next batch"}
        </button>
      </div>
      {run && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-[6px] bg-white px-3 py-2 text-[12px] text-[#4F5052]">
            Free: {run.nonBuyer.processed}/{run.nonBuyer.total} processed · {run.nonBuyer.sent} sent
          </div>
          <div className="rounded-[6px] bg-white px-3 py-2 text-[12px] text-[#4F5052]">
            Buyers: {run.buyer.processed}/{run.buyer.total} processed · {run.buyer.sent} sent
          </div>
        </div>
      )}
      {message && <p className="mt-3 text-[12px] text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-[12px] text-red-700">{error}</p>}
    </>
  )
}

function VaultDropCard({ dropEmail }: { dropEmail: AdminVaultDropEmail }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Vault drop handoff</Badge>
        <span className="text-[12px] text-[#818283]">{dropEmail.ready ? "Ready for approval" : "Needs one more collection"}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Free" value={dropEmail.segments.nonbuyers.count} />
        <Stat label="Buyers" value={dropEmail.segments.buyers.count} />
        <Stat label="Total" value={dropEmail.totalRecipients} />
      </div>
      {!dropEmail.ready && (
        <p className="mt-3 rounded-[6px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
          A drop needs at least 2 valid pending collections. Publish one more Shoot Studio collection before live sending.
        </p>
      )}
      <CollectionStrip collections={dropEmail.collections} />
      <VaultDropActions dropEmail={dropEmail} />
    </>
  )
}

function VaultPublishCard({ result }: { result: Extract<AdminContentToolResult, { kind: "vault-publish" }> }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Published to Vault</Badge>
        <span className="text-[12px] text-[#818283]">{result.collection.shotCount} prompts</span>
      </div>
      <h3 className="mt-3 font-serif text-[21px] font-light leading-tight text-[#0D0E10]">{result.shoot.title}</h3>
      <SourceShoot shoot={result.shoot} />
      <p className="mt-3 rounded-[6px] bg-white px-3 py-2 text-[12px] text-[#4F5052]">
        Vault slug: {result.collection.slug} · Email drop status: queued
      </p>
      <div className="mt-4">
        <VaultDropCard dropEmail={result.dropEmail} />
      </div>
    </>
  )
}

export function AdminContentToolCard({ result }: { result: AdminContentToolResult }) {
  return (
    <div className="rounded-[8px] border border-[#C5C6C8]/70 bg-[#F1F2F2] p-4">
      {result.kind === "sources" && <SourcesCard shoots={result.shoots} />}
      {result.kind === "carousel" && <CarouselCard result={result} />}
      {result.kind === "story" && <StoryCard result={result} />}
      {result.kind === "vault-publish" && <VaultPublishCard result={result} />}
      {result.kind === "vault-drop-handoff" && <VaultDropCard dropEmail={result.dropEmail} />}
      {result.kind === "error" && (
        <>
          <Badge>{result.tool || "Tool"} needs setup</Badge>
          <p className="mt-3 text-[13px] leading-relaxed text-[#4F5052]">{result.message}</p>
          {Array.isArray(result.shoots) && result.shoots.length > 0 && <SourcesCard shoots={result.shoots} />}
        </>
      )}
    </div>
  )
}
