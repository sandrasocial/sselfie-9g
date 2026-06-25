"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminNav } from "@/components/admin/admin-nav"

interface ReviewEvent {
  id: number
  stripe_event_id: string
  event_type: string
  session_id: string | null
  customer_email: string | null
  product_type: string | null
  amount_cents: number | null
  currency: string | null
  reason: string
  raw_metadata: Record<string, unknown> | null
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  notes: string | null
  created_at: string
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function cents(amount: number | null, currency: string | null) {
  if (!amount || !currency) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  missing_email: { label: "Missing email", color: "bg-red-100 text-red-700" },
  missing_product_type: { label: "Missing product type", color: "bg-amber-100 text-amber-700" },
  processing_error: { label: "Processing error", color: "bg-red-100 text-red-700" },
  missing_metadata: { label: "Missing metadata", color: "bg-amber-100 text-amber-700" },
}

export default function WebhookReviewPage() {
  const [events, setEvents] = useState<ReviewEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [resolveNotes, setResolveNotes] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/webhook-review?resolved=${showResolved}`)
      const j = await res.json()
      setEvents(j.events || [])
    } finally {
      setLoading(false)
    }
  }, [showResolved])

  useEffect(() => {
    load()
  }, [load])

  const resolve = async (id: number) => {
    setResolvingId(id)
    try {
      await fetch("/api/admin/webhook-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes: resolveNotes || undefined }),
      })
      setExpandedId(null)
      setResolveNotes("")
      await load()
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <AdminNav />

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.32em] text-stone-500">
            Admin · Webhook Review
          </p>
          <h1 className="font-['Times_New_Roman'] text-3xl font-extralight uppercase tracking-[0.24em] text-stone-950 sm:text-4xl">
            Flagged Payments
          </h1>
          <p className="mt-3 text-sm text-stone-500">
            Stripe checkout events where email, product type, or metadata was missing.
            These payments may need manual delivery — check Stripe and resend from the{" "}
            <a href="/admin/customer-support" className="underline hover:text-stone-900">
              Customer Support
            </a>{" "}
            page.
          </p>
        </div>

        {/* Filter toggle */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => setShowResolved(false)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-[0.12em] transition ${
              !showResolved
                ? "bg-stone-900 text-white"
                : "bg-white border border-stone-300 text-stone-500 hover:text-stone-900"
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => setShowResolved(true)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-[0.12em] transition ${
              showResolved
                ? "bg-stone-900 text-white"
                : "bg-white border border-stone-300 text-stone-500 hover:text-stone-900"
            }`}
          >
            Resolved
          </button>
          <button
            onClick={load}
            className="ml-auto text-xs text-stone-400 hover:text-stone-700 underline"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-stone-400">Loading...</p>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
            <p className="text-sm font-medium text-green-700">
              {showResolved ? "No resolved events." : "✓ No flagged events — all payments processed cleanly."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => {
              const reason = REASON_LABELS[ev.reason] ?? {
                label: ev.reason,
                color: "bg-stone-100 text-stone-600",
              }
              const isExpanded = expandedId === ev.id

              return (
                <div
                  key={ev.id}
                  className="rounded-xl border border-stone-200 bg-white overflow-hidden"
                >
                  {/* Header row */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${reason.color}`}>
                      {reason.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-stone-800">
                        {ev.customer_email ?? (
                          <span className="text-red-500 font-semibold">No email</span>
                        )}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {ev.product_type ?? "unknown product"} · {cents(ev.amount_cents, ev.currency)} · {formatDate(ev.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ev.customer_email && (
                        <a
                          href={`/admin/customer-support?q=${encodeURIComponent(ev.customer_email)}`}
                          className="rounded bg-stone-100 px-3 py-1 text-xs text-stone-600 hover:bg-stone-200 transition"
                        >
                          Look up
                        </a>
                      )}
                      {ev.session_id && (
                        <a
                          href={`https://dashboard.stripe.com/payments/${ev.session_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded bg-blue-50 px-3 py-1 text-xs text-blue-600 hover:bg-blue-100 transition"
                        >
                          Stripe ↗
                        </a>
                      )}
                      {!ev.resolved && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                          className="rounded bg-green-700 px-3 py-1 text-xs text-white hover:bg-green-800 transition"
                        >
                          {isExpanded ? "Cancel" : "Resolve"}
                        </button>
                      )}
                      {ev.resolved && (
                        <span className="text-xs text-green-600 font-medium">✓ Resolved</span>
                      )}
                    </div>
                  </div>

                  {/* Notes if present */}
                  {ev.notes && !isExpanded && (
                    <div className="border-t border-stone-100 px-5 py-2 text-xs text-stone-500">
                      {ev.notes}
                    </div>
                  )}

                  {/* Stripe event ID */}
                  <div className="border-t border-stone-100 px-5 py-2 flex gap-6 text-[11px] text-stone-400">
                    <span>Event: {ev.stripe_event_id}</span>
                    {ev.session_id && <span>Session: {ev.session_id}</span>}
                    {ev.resolved_by && (
                      <span>Resolved by {ev.resolved_by} at {formatDate(ev.resolved_at)}</span>
                    )}
                  </div>

                  {/* Raw metadata (collapsed) */}
                  {ev.raw_metadata && Object.keys(ev.raw_metadata).length > 0 && (
                    <details className="border-t border-stone-100">
                      <summary className="cursor-pointer px-5 py-2 text-[11px] text-stone-400 hover:text-stone-600">
                        Raw metadata
                      </summary>
                      <pre className="overflow-x-auto bg-stone-50 px-5 py-3 text-[11px] text-stone-600">
                        {JSON.stringify(ev.raw_metadata, null, 2)}
                      </pre>
                    </details>
                  )}

                  {/* Resolve form */}
                  {isExpanded && !ev.resolved && (
                    <div className="border-t border-stone-200 bg-stone-50 px-5 py-4 space-y-3">
                      <p className="text-xs text-stone-500">
                        Before marking resolved: check Stripe for payment status, then use Customer
                        Support to resend the delivery email manually.
                      </p>
                      <textarea
                        value={resolveNotes}
                        onChange={(e) => setResolveNotes(e.target.value)}
                        placeholder="Resolution notes (optional) — e.g. 'Delivery resent manually 13 May'"
                        rows={2}
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-600 focus:outline-none"
                      />
                      <button
                        onClick={() => resolve(ev.id)}
                        disabled={resolvingId === ev.id}
                        className="rounded-lg bg-green-700 px-5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white hover:bg-green-800 disabled:opacity-50 transition"
                      >
                        {resolvingId === ev.id ? "Saving..." : "Mark resolved"}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
