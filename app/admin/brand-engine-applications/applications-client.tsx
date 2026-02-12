"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

type PipelineStage =
  | "applied"
  | "qualified_queue"
  | "contacted"
  | "call_booked"
  | "call_completed"
  | "offer_sent"
  | "closed_won"
  | "closed_lost"
  | "nurture"

type PriorityTier = "high" | "medium" | "low"

interface Application {
  id: number
  name: string
  email: string
  website: string
  offer_type: string | null
  revenue: string
  current_spend: string
  biggest_bottleneck: string
  hours_per_week: string
  business_description: string
  why_interested: string
  ready_to_invest: string
  qualified: boolean
  status: string
  pipeline_stage: PipelineStage | null
  qualification_score: number | null
  qualification_notes: string | null
  priority_tier: PriorityTier | null
  source_channel: string | null
  source_detail: string | null
  calendly_sent: boolean
  draft_mode: boolean | null
  call_booked_at: string | null
  call_completed_at: string | null
  offer_sent_at: string | null
  closed_at: string | null
  closed_reason: string | null
  expected_value_cents: number | null
  cash_collected_cents: number | null
  notes: string | null
  created_at: string
}

const PIPELINE_OPTIONS: { value: PipelineStage; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "qualified_queue", label: "Qualified Queue" },
  { value: "contacted", label: "Contacted" },
  { value: "call_booked", label: "Call Booked" },
  { value: "call_completed", label: "Call Completed" },
  { value: "offer_sent", label: "Offer Sent" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
  { value: "nurture", label: "Nurture" },
]

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "n/a"
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatEuro(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100)
}

export default function BrandEngineApplicationsClient({ applications }: { applications: Application[] }) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)

  const normalized = useMemo(
    () =>
      applications.map((app) => ({
        ...app,
        pipeline_stage: (app.pipeline_stage || (app.qualified ? "qualified_queue" : "nurture")) as PipelineStage,
        qualification_score: app.qualification_score ?? 0,
        priority_tier: (app.priority_tier || "low") as PriorityTier,
        cash_collected_cents: app.cash_collected_cents ?? 0,
        expected_value_cents: app.expected_value_cents ?? 0,
      })),
    [applications],
  )

  const qualifiedQueue = normalized
    .filter((app) => ["qualified_queue", "contacted", "call_booked", "call_completed", "offer_sent"].includes(app.pipeline_stage))
    .sort((a, b) => (b.qualification_score || 0) - (a.qualification_score || 0))

  const closedWon = normalized.filter((app) => app.pipeline_stage === "closed_won")
  const closedLost = normalized.filter((app) => app.pipeline_stage === "closed_lost")
  const callsBooked = normalized.filter((app) => app.call_booked_at || app.pipeline_stage === "call_booked" || app.pipeline_stage === "call_completed" || app.pipeline_stage === "offer_sent" || app.pipeline_stage === "closed_won" || app.pipeline_stage === "closed_lost")
  const cashCollectedCents = normalized.reduce((sum, app) => sum + (app.cash_collected_cents || 0), 0)
  const expectedPipelineCents = qualifiedQueue.reduce((sum, app) => sum + (app.expected_value_cents || 0), 0)
  const closeRate = callsBooked.length > 0 ? Math.round((closedWon.length / callsBooked.length) * 100) : 0

  const sourceBreakdown = normalized.reduce<Record<string, number>>((acc, app) => {
    const key = (app.source_channel || "unknown").toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  async function handleUpdate(appId: number, payload: Record<string, unknown>) {
    setUpdating(appId)
    try {
      const response = await fetch("/api/admin/brand-engine-applications/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: appId,
          ...payload,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || "Failed to update application")
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update application")
    } finally {
      setUpdating(null)
    }
  }

  async function handleStageChange(appId: number, stage: PipelineStage) {
    const timestamp = new Date().toISOString()
    const payload: Record<string, unknown> = {
      pipelineStage: stage,
      status: stage,
    }

    if (stage === "call_booked") {
      payload.callBookedAt = timestamp
      payload.calendlySent = true
    }
    if (stage === "call_completed") {
      payload.callCompletedAt = timestamp
    }
    if (stage === "offer_sent") {
      payload.offerSentAt = timestamp
    }
    if (stage === "closed_won") {
      const input = prompt("Cash collected in EUR (numbers only)", "2497")
      const amount = Number(input || 0)
      payload.closedAt = timestamp
      payload.cashCollectedCents = Number.isFinite(amount) ? Math.round(amount * 100) : 0
      payload.closeReason = "won"
    }
    if (stage === "closed_lost") {
      const reason = prompt("Close-lost reason (optional)", "")
      payload.closedAt = timestamp
      payload.closeReason = reason || "lost"
    }

    await handleUpdate(appId, payload)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <Link
              href="/admin/project-tracker"
              className="text-xs tracking-[0.2em] uppercase text-stone-400 hover:text-stone-600 transition-colors mb-2 inline-block"
            >
              ← Back to Tracker
            </Link>
            <h1 className="text-2xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950">
              Brand Engine Launch Tracker
            </h1>
          </div>
          <div className="text-right">
            <div className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Draft Mode</div>
            <div className="text-sm text-stone-700 uppercase tracking-[0.1em]">Enabled</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Applications</div>
            <div className="text-3xl font-['Times_New_Roman'] text-stone-950">{normalized.length}</div>
          </div>
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Calls Booked</div>
            <div className="text-3xl font-['Times_New_Roman'] text-blue-700">{callsBooked.length}</div>
          </div>
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Closed Won</div>
            <div className="text-3xl font-['Times_New_Roman'] text-green-700">{closedWon.length}</div>
          </div>
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Cash Collected</div>
            <div className="text-3xl font-['Times_New_Roman'] text-stone-950">{formatEuro(cashCollectedCents)}</div>
          </div>
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Close Rate</div>
            <div className="text-3xl font-['Times_New_Roman'] text-stone-950">{closeRate}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-3">Qualified Pipeline Value</div>
            <div className="text-4xl font-['Times_New_Roman'] text-stone-950">{formatEuro(expectedPipelineCents)}</div>
            <div className="text-xs text-stone-500 mt-2">From active qualified queue (expected values).</div>
          </div>
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-3">Lead Sources</div>
            <div className="space-y-2">
              {Object.keys(sourceBreakdown).length === 0 && <div className="text-sm text-stone-500">No source data yet.</div>}
              {Object.entries(sourceBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <div key={source} className="flex justify-between text-sm">
                    <span className="uppercase tracking-[0.08em] text-stone-600">{source}</span>
                    <span className="text-stone-950">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-4">
            Qualification Queue ({qualifiedQueue.length})
          </h2>
          <div className="space-y-4">
            {qualifiedQueue.length === 0 ? (
              <div className="bg-white border border-stone-200 p-8 text-center text-stone-500">No qualified leads in queue.</div>
            ) : (
              qualifiedQueue.map((app) => (
                <div key={app.id} className="bg-white border border-stone-200 p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-['Times_New_Roman'] text-stone-950">{app.name}</h3>
                      <p className="text-sm text-stone-600">{app.email}</p>
                      <a
                        href={app.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {app.website}
                      </a>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-stone-500">{formatDate(app.created_at)}</div>
                      <div className="text-sm uppercase tracking-[0.1em] text-stone-700 mt-2">
                        Score {app.qualification_score}
                      </div>
                      <div className="text-xs uppercase tracking-[0.1em] text-stone-500 mt-1">
                        Priority {app.priority_tier}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs uppercase tracking-[0.1em] text-stone-500 mb-4">
                    <div>
                      <div>Offer</div>
                      <div className="text-sm text-stone-900 normal-case tracking-normal">{app.offer_type || "cohort"}</div>
                    </div>
                    <div>
                      <div>Revenue</div>
                      <div className="text-sm text-stone-900 normal-case tracking-normal">{app.revenue}</div>
                    </div>
                    <div>
                      <div>Spend</div>
                      <div className="text-sm text-stone-900 normal-case tracking-normal">{app.current_spend}</div>
                    </div>
                    <div>
                      <div>Source</div>
                      <div className="text-sm text-stone-900 normal-case tracking-normal">{app.source_channel || "unknown"}</div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                    <label className="text-xs uppercase tracking-[0.15em] text-stone-500">Pipeline Stage</label>
                    <select
                      value={app.pipeline_stage}
                      onChange={(e) => handleStageChange(app.id, e.target.value as PipelineStage)}
                      disabled={updating === app.id}
                      className="bg-white border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none"
                    >
                      {PIPELINE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleUpdate(app.id, { calendlySent: true, callBookedAt: new Date().toISOString(), pipelineStage: "call_booked", status: "calendly_sent" })}
                      disabled={updating === app.id}
                      className="border border-stone-300 px-3 py-2 text-xs uppercase tracking-[0.15em] hover:bg-stone-100 transition-colors"
                    >
                      Mark Call Booked
                    </button>
                    <button
                      onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                      className="text-xs uppercase tracking-[0.15em] text-stone-600 hover:text-stone-950"
                    >
                      {selectedApp?.id === app.id ? "Hide Details ▲" : "Show Details ▼"}
                    </button>
                  </div>

                  {selectedApp?.id === app.id && (
                    <div className="pt-4 border-t border-stone-200 space-y-3 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-1">Biggest Bottleneck</div>
                        <p className="text-stone-700">{app.biggest_bottleneck}</p>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-1">Business Description</div>
                        <p className="text-stone-700">{app.business_description}</p>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-1">Why Interested</div>
                        <p className="text-stone-700">{app.why_interested}</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <div className="uppercase tracking-[0.1em] text-stone-500">Call Booked</div>
                          <div className="text-stone-700">{formatDate(app.call_booked_at)}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-[0.1em] text-stone-500">Call Completed</div>
                          <div className="text-stone-700">{formatDate(app.call_completed_at)}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-[0.1em] text-stone-500">Offer Sent</div>
                          <div className="text-stone-700">{formatDate(app.offer_sent_at)}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-[0.1em] text-stone-500">Closed</div>
                          <div className="text-stone-700">{formatDate(app.closed_at)}</div>
                        </div>
                      </div>
                      {app.source_detail && (
                        <div>
                          <div className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-1">Source Detail</div>
                          <p className="text-stone-700 break-all">{app.source_detail}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {(closedWon.length > 0 || closedLost.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-stone-200 p-6">
              <h3 className="text-lg font-['Times_New_Roman'] tracking-[0.05em] mb-3">Closed Won ({closedWon.length})</h3>
              <div className="space-y-2 text-sm">
                {closedWon.map((app) => (
                  <div key={app.id} className="flex justify-between">
                    <span>{app.name}</span>
                    <span>{formatEuro(app.cash_collected_cents || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-stone-200 p-6">
              <h3 className="text-lg font-['Times_New_Roman'] tracking-[0.05em] mb-3">Closed Lost ({closedLost.length})</h3>
              <div className="space-y-2 text-sm text-stone-700">
                {closedLost.map((app) => (
                  <div key={app.id} className="flex justify-between">
                    <span>{app.name}</span>
                    <span>{app.closed_reason || "lost"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
