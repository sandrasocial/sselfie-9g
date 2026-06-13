"use client"

import { useEffect, useMemo, useState } from "react"

type Audience = "nonbuyer" | "buyer"

type PreviewPayload = {
  ready: boolean
  dropKey: string
  collections: Array<{ id: string; name: string; heroImage: string; moodLine: string }>
  segments: {
    nonbuyers: { count: number; sampleRecipients: Array<{ email: string; name: string | null }> }
    buyers: { count: number; sampleRecipients: Array<{ email: string; name: string | null }> }
  }
  previews: {
    nonbuyer: { subject: string; html: string; text: string }
    buyer: { subject: string; html: string; text: string }
  }
  totalRecipients: number
}

export function VaultDropEmailPreview() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null)
  const [audience, setAudience] = useState<Audience>("nonbuyer")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<Audience | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/vault-drop-email", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Preview failed")
      setPayload(data)
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
        body: JSON.stringify({ audience: target }),
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

  useEffect(() => {
    load()
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
          Preview the exact drop email and send a test to ssa@ssasocial.com before any live run.
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
          A live drop needs at least 2 pending collections. You can still inspect this panel after publishing more shoots.
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-stone-400">Pending collections</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {payload.collections.map((collection) => (
            <div key={collection.id} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <p className="text-sm font-medium text-stone-950">{collection.name}</p>
              <p className="mt-1 text-xs text-stone-500">{collection.moodLine}</p>
            </div>
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
          onClick={load}
          className="rounded-full border border-stone-300 px-4 py-2 text-xs uppercase tracking-wide text-stone-600"
        >
          Refresh
        </button>
      </div>

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
