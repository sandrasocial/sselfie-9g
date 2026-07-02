"use client"

// POST-NOW-01: the "I need something to post now" button + option cards.
// Lives at the top of /admin/content-brief (and linked from /admin home).
// Mobile-first: Sandra uses this on her phone at night.

import { useState } from "react"

export type PostNowOption = {
  id?: number
  type: "repurpose" | "trend-test" | "story-sequence"
  title: string
  source: string
  executeIn: string
  steps: string[]
  permalink?: string | null
}

const TYPE_META: Record<PostNowOption["type"], { label: string; badgeClass: string }> = {
  repurpose: { label: "Repurpose a winner", badgeClass: "bg-stone-950 text-white" },
  "trend-test": { label: "Trend to test", badgeClass: "bg-stone-200 text-stone-800" },
  "story-sequence": { label: "Tonight's story sequence", badgeClass: "bg-stone-100 text-stone-700" },
}

function OptionCard({ option }: { option: PostNowOption }) {
  const [status, setStatus] = useState<"open" | "saving" | "used" | "dismissed" | "error">("open")
  const meta = TYPE_META[option.type]

  async function mark(next: "used" | "dismissed") {
    if (!option.id) return
    setStatus("saving")
    try {
      const res = await fetch("/api/admin/content-kit/post-now", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: option.id, status: next }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || "Update failed")
      setStatus(next)
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${meta.badgeClass}`}>
          {meta.label}
        </span>
        <span className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs uppercase tracking-wide text-stone-700">
          {option.executeIn}
        </span>
      </div>

      <h3 className="mt-3 font-serif text-lg leading-snug text-stone-950">{option.title}</h3>

      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        <span className="uppercase tracking-wide">From: </span>
        {option.source}
      </p>

      <ol className="mt-3 space-y-1.5">
        {option.steps.map((step, index) => (
          <li key={index} className="flex gap-2 text-sm leading-relaxed text-stone-800">
            <span className="select-none text-stone-400">{index + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {option.permalink && (
        <a
          href={option.permalink}
          target="_blank"
          rel="noreferrer"
          className="mt-3 text-xs text-stone-500 underline underline-offset-4 hover:text-stone-950"
        >
          Open the original post
        </a>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
        {status === "used" && (
          <p className="text-xs text-stone-600">Marked as used. It won&apos;t come back.</p>
        )}
        {status === "dismissed" && (
          <p className="text-xs text-stone-600">Okay, hidden for 14 days.</p>
        )}
        {(status === "open" || status === "saving" || status === "error") && (
          <>
            <button
              type="button"
              onClick={() => mark("used")}
              disabled={status === "saving" || !option.id}
              className="rounded-full bg-stone-950 px-4 py-1.5 text-xs uppercase tracking-wide text-white transition hover:bg-stone-800 disabled:opacity-50"
            >
              Used it
            </button>
            <button
              type="button"
              onClick={() => mark("dismissed")}
              disabled={status === "saving" || !option.id}
              className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-xs uppercase tracking-wide text-stone-700 transition hover:border-stone-950 hover:text-stone-950 disabled:opacity-50"
            >
              Not for me
            </button>
            {status === "error" && (
              <span className="text-xs text-red-700">Couldn&apos;t save. Try again.</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function PostNowClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<PostNowOption[]>([])
  const [missingInputs, setMissingInputs] = useState<string[]>([])
  const [batch, setBatch] = useState(0)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/content-kit/post-now", { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Could not pull options right now")
      }
      setOptions(Array.isArray(json.options) ? json.options : [])
      setMissingInputs(Array.isArray(json.missingInputs) ? json.missingInputs : [])
      setBatch((current) => current + 1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not pull options right now")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="post-now" className="scroll-mt-6 rounded-2xl border border-stone-950 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Post tonight</p>
          <h2 className="mt-1 font-serif text-2xl font-light tracking-tight text-stone-950">
            Stuck on what to post?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            Three ready-tonight options pulled from your winners, this week&apos;s brief, and what
            your audience asked. Nothing you&apos;ve already used comes back.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="w-full shrink-0 rounded-full bg-stone-950 px-5 py-2.5 text-sm text-white transition hover:bg-stone-800 disabled:opacity-50 sm:w-auto"
        >
          {loading
            ? "Pulling from your winners and this week's brief..."
            : options.length > 0
              ? "Give me three fresh ones"
              : "I need something to post now"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </p>
      )}

      {missingInputs.length > 0 && options.length > 0 && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-stone-700">
          Heads up: no {missingInputs.join(", no ")} this run. These options are built from
          what&apos;s left.
        </p>
      )}

      {options.length > 0 && (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {options.map((option, index) => (
            <OptionCard key={`${batch}-${option.id ?? index}`} option={option} />
          ))}
        </div>
      )}
    </section>
  )
}
