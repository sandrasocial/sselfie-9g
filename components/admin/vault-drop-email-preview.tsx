"use client"

import { useEffect, useMemo, useState } from "react"

type Audience = "nonbuyer" | "buyer"

type CollectionPreview = { id: string; name: string; heroImage: string; moodLine: string }

type RunPreview = {
  id: string
  dropKey: string
  status: string
  collectionSlugs: string[]
  nonBuyer: { total: number; sent: number; failed: number; skipped: number; processed: number; remaining: number }
  buyer: { total: number; sent: number; failed: number; skipped: number; processed: number; remaining: number }
}

type PreviewPayload = {
  ready: boolean
  dropKey: string
  selectedCollectionIds: string[]
  missingCollectionIds: string[]
  availableCollections: CollectionPreview[]
  collections: CollectionPreview[]
  segments: {
    nonbuyers: { count: number; sampleRecipients: Array<{ email: string; name: string | null }> }
    buyers: { count: number; sampleRecipients: Array<{ email: string; name: string | null }> }
  }
  previews: {
    nonbuyer: { subject: string; html: string; text: string }
    buyer: { subject: string; html: string; text: string }
  }
  totalRecipients: number
  latestRun: RunPreview | null
}

export function VaultDropEmailPreview() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null)
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([])
  const [run, setRun] = useState<RunPreview | null>(null)
  const [audience, setAudience] = useState<Audience>("nonbuyer")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<Audience | null>(null)
  const [liveSending, setLiveSending] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load(ids = selectedCollectionIds) {
    setLoading(true)
    setError(null)
    try {
      const query = ids.length > 0 ? `?collectionIds=${encodeURIComponent(ids.join(","))}` : ""
      const response = await fetch(`/api/admin/vault-drop-email${query}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Preview failed")
      setPayload(data)
      setRun(data.latestRun || null)
      if (ids.length === 0 && Array.isArray(data.selectedCollectionIds)) {
        setSelectedCollectionIds(data.selectedCollectionIds)
      }
    } catch (err: any) {
      setError(err?.message || "Preview failed")
    } finally {
      setLoading(false)
    }
  }

  async function sendTest(target: Audience) {
    setSending(target)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/vault-drop-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_test", audience: target, collectionIds: selectedCollectionIds }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Test send failed")
      setMessage(`Sent ${target === "buyer" ? "buyer" : "free preview"} test to ${data.to}.`)
    } catch (err: any) {
      setError(err?.message || "Test send failed")
    } finally {
      setSending(null)
    }
  }

  async function sendLiveNow() {
    setLiveSending(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/vault-drop-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_live_now", collectionIds: selectedCollectionIds }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Could not send live email")
      setRun(data.run)
      setMessage(
        data.done?.all
          ? "Done. The drop email was sent."
          : "Started sending. Click Continue sending if there are more people left.",
      )
      await load(selectedCollectionIds)
    } catch (err: any) {
      setError(err?.message || "Could not send live email")
    } finally {
      setLiveSending(false)
    }
  }

  async function processBatch() {
    const runId = run?.id
    if (!runId) return
    setProcessing(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/vault-drop-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process_batch",
          runId,
          audienceType: "all",
          collectionIds: selectedCollectionIds,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Batch failed")
      if (data.run) setRun(data.run)
      setMessage(data.done?.all ? "Done. The drop email was sent." : "Batch sent. Keep going until both groups are done.")
      await load(selectedCollectionIds)
    } catch (err: any) {
      setError(err?.message || "Batch failed")
    } finally {
      setProcessing(false)
    }
  }

  function toggleCollection(id: string) {
    const next = selectedCollectionIds.includes(id)
      ? selectedCollectionIds.filter((collectionId) => collectionId !== id)
      : [...selectedCollectionIds, id]
    setSelectedCollectionIds(next)
    void load(next)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activePreview = payload?.previews[audience]
  const stats = useMemo(() => {
    if (!payload) return []
    return [
      { label: "Pending collections", value: String(payload.collections.length) },
      { label: "Free preview recipients", value: String(payload.segments.nonbuyers.count) },
      { label: "Vault buyer recipients", value: String(payload.segments.buyers.count) },
      { label: "Total live recipients", value: String(payload.totalRecipients) },
    ]
  }, [payload])

  if (loading) {
    return <p className="text-sm text-stone-500">Building the live email preview...</p>
  }

  if (error && !payload) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    )
  }

  if (!payload) return null

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif text-2xl font-light text-stone-950">Vault drop email</h3>
        <p className="mt-1 text-sm text-stone-600">
          Preview the exact drop email. Send a test first, then send live when you are ready.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-stone-400">{item.label}</p>
            <p className="mt-1 font-serif text-xl font-light text-stone-950">{item.value}</p>
          </div>
        ))}
      </div>

      {!payload.ready && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          A live drop needs at least 2 valid pending collections. Select two new shoots before starting a run.
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-stone-400">Pick collections for this drop</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {payload.availableCollections.map((collection) => (
            <label
              key={collection.id}
              className={`grid cursor-pointer grid-cols-[72px_1fr_auto] gap-3 rounded-lg border p-2 ${
                selectedCollectionIds.includes(collection.id)
                  ? "border-stone-950 bg-stone-50"
                  : "border-stone-100 bg-white"
              }`}
            >
              {collection.heroImage ? (
                <img
                  src={collection.heroImage}
                  alt=""
                  className="h-[88px] w-[72px] rounded-md object-cover"
                />
              ) : (
                <div className="h-[88px] w-[72px] rounded-md bg-stone-100" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-medium text-stone-950">{collection.name}</span>
                <span className="mt-1 block text-xs text-stone-500">{collection.moodLine}</span>
                <span className="mt-2 block truncate text-[11px] text-stone-400">{collection.heroImage}</span>
              </span>
              <input
                type="checkbox"
                checked={selectedCollectionIds.includes(collection.id)}
                onChange={() => toggleCollection(collection.id)}
                className="mt-1 h-4 w-4 accent-stone-950"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAudience("nonbuyer")}
          className={`rounded-full px-4 py-2 text-xs uppercase tracking-wide ${
            audience === "nonbuyer" ? "bg-stone-950 text-white" : "border border-stone-300 text-stone-600"
          }`}
        >
          Free preview email
        </button>
        <button
          type="button"
          onClick={() => setAudience("buyer")}
          className={`rounded-full px-4 py-2 text-xs uppercase tracking-wide ${
            audience === "buyer" ? "bg-stone-950 text-white" : "border border-stone-300 text-stone-600"
          }`}
        >
          Buyer email
        </button>
        <button
          type="button"
          onClick={() => load(selectedCollectionIds)}
          className="rounded-full border border-stone-300 px-4 py-2 text-xs uppercase tracking-wide text-stone-600"
        >
          Refresh
        </button>
      </div>

      {run && (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-400">Live run</p>
              <p className="mt-1 text-sm font-medium text-stone-950">{run.status} · {run.id}</p>
            </div>
            <button
              type="button"
              onClick={processBatch}
              disabled={!payload.ready || processing || run.status === "completed" || run.status === "partially_completed"}
              className="rounded-full bg-stone-950 px-4 py-2 text-xs uppercase tracking-wide text-white disabled:opacity-40"
            >
              {processing ? "Sending" : "Continue sending"}
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
              Free preview: {run.nonBuyer.processed}/{run.nonBuyer.total} processed · {run.nonBuyer.sent} sent
            </div>
            <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
              Buyers: {run.buyer.processed}/{run.buyer.total} processed · {run.buyer.sent} sent
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs uppercase tracking-wide text-stone-400">Subject</p>
        <p className="mt-1 text-sm font-medium text-stone-950">{activePreview?.subject}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-stone-400">HTML preview</p>
          <button
            type="button"
            onClick={() => sendTest(audience)}
            disabled={!payload.ready || sending !== null}
            className="rounded-full bg-stone-950 px-4 py-2 text-xs uppercase tracking-wide text-white disabled:opacity-40"
          >
            {sending === audience ? "Sending" : `Send ${audience === "buyer" ? "buyer" : "free"} test`}
          </button>
          <button
            type="button"
            onClick={sendLiveNow}
            disabled={!payload.ready || liveSending || run?.status === "completed" || run?.status === "partially_completed"}
            className="rounded-full border border-stone-950 px-4 py-2 text-xs uppercase tracking-wide text-stone-950 disabled:opacity-40"
          >
            {liveSending ? "Sending live" : "Send live now"}
          </button>
        </div>
        <iframe
          title="Vault drop email preview"
          srcDoc={activePreview?.html || ""}
          className="h-[720px] w-full bg-white"
        />
      </div>

      <details className="rounded-xl border border-stone-200 bg-white p-4">
        <summary className="cursor-pointer text-xs uppercase tracking-wide text-stone-500">
          Plain text version
        </summary>
        <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-stone-600">
          {activePreview?.text}
        </pre>
      </details>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
