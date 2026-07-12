"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { readAdminJson } from "@/lib/admin/safe-fetch-json"

type WorkWithMeApplication = {
  id: number
  name: string
  email: string
  instagram_handle: string | null
  qualification_score: number
  readiness: string | null
  qualified: boolean
  priority_tier: string | null
  pipeline_stage: string
  notes: string | null
  current_challenge: string | null
  desired_outcome: string | null
  current_offer: string | null
  checkout_url: string | null
  checkout_created_at: string | null
  created_at: string
}

const STAGE_LABELS: Record<string, string> = {
  applied: "New",
  qualified_queue: "Qualified",
  contacted: "Contacted",
  call_booked: "Call booked",
  call_completed: "Call complete",
  offer_sent: "Payment link created",
  closed_won: "Paid",
  closed_lost: "Closed",
  nurture: "Follow up later",
}

function stageLabel(stage: string) {
  return STAGE_LABELS[stage] || stage.replaceAll("_", " ")
}

function dateLabel(value: string | null | undefined) {
  if (!value) return ""
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function instagramUrl(handle: string) {
  return `https://instagram.com/${handle.replace(/^@/, "")}`
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const fallback = document.createElement("textarea")
  fallback.value = text
  fallback.style.position = "fixed"
  fallback.style.opacity = "0"
  document.body.appendChild(fallback)
  fallback.select()
  document.execCommand("copy")
  fallback.remove()
}

export function WorkWithMePipeline() {
  const [applications, setApplications] = useState<WorkWithMeApplication[]>([])
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const copiedTimer = useRef<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/work-with-me", { cache: "no-store" })
      const data = await readAdminJson(response)
      if (!response.ok) throw new Error(data?.error || "Could not load applications.")
      const nextApplications = (data?.applications || []) as WorkWithMeApplication[]
      setApplications(nextApplications)
      setNotes(Object.fromEntries(nextApplications.map(application => [application.id, application.notes || ""])))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load applications.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    },
    [],
  )

  const openCount = applications.filter(
    application => !["closed_won", "closed_lost"].includes(application.pipeline_stage),
  ).length

  function showCopied(applicationId: number) {
    setCopiedId(applicationId)
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => {
      setCopiedId(current => (current === applicationId ? null : current))
      copiedTimer.current = null
    }, 3000)
  }

  async function updateApplication(
    applicationId: number,
    action: "contacted" | "call_booked" | "lost" | "save_notes",
  ) {
    setBusyId(applicationId)
    setError("")
    try {
      const response = await fetch("/api/admin/work-with-me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action, notes: notes[applicationId] || "" }),
      })
      const data = await readAdminJson(response)
      if (!response.ok) throw new Error(data?.error || "Could not update the application.")
      await load()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update the application.")
    } finally {
      setBusyId(null)
    }
  }

  async function createCheckout(applicationId: number) {
    setBusyId(applicationId)
    setError("")
    try {
      const response = await fetch("/api/admin/work-with-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action: "create_checkout" }),
      })
      const data = await readAdminJson(response)
      if (!response.ok) throw new Error(data?.error || "Could not create the payment link.")
      await load()
      try {
        await copyText(data.checkoutUrl)
        showCopied(applicationId)
      } catch {
        setError("The payment link was checked, but your browser could not copy it. Try the copy button again.")
      }
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not create the payment link.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Warm revenue lane
          </p>
          <h1 className="mt-2 font-serif text-4xl font-light text-stone-950">Work With Me</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Move each application from personal contact to a copied €2,000 payment link. Nothing is
            emailed automatically from this page.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm text-stone-600">
          <strong className="text-stone-950">{openCount}</strong> open application{openCount === 1 ? "" : "s"}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-12 text-sm text-stone-500">Loading applications...</p>
      ) : applications.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <p className="font-serif text-2xl text-stone-950">No applications yet</p>
          <p className="mt-2 text-sm text-stone-500">New Work With Me applications will appear here.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {applications.map(application => {
            const isBusy = busyId === application.id
            const isClosed = ["closed_won", "closed_lost"].includes(application.pipeline_stage)
            const canContact = ["applied", "qualified_queue", "contacted"].includes(application.pipeline_stage)
            const canBook = ["qualified_queue", "contacted", "call_booked"].includes(application.pipeline_stage)
            const canCreateCheckout = ["contacted", "call_booked", "call_completed", "offer_sent"].includes(
              application.pipeline_stage,
            )

            return (
              <article key={application.id} className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-2xl font-light text-stone-950">{application.name}</h2>
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                        {stageLabel(application.pipeline_stage)}
                      </span>
                      {application.qualified ? (
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                          Qualified
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
                      <a className="underline underline-offset-2 hover:text-stone-950" href={`mailto:${application.email}`}>
                        {application.email}
                      </a>
                      {application.instagram_handle ? (
                        <a
                          className="underline underline-offset-2 hover:text-stone-950"
                          href={instagramUrl(application.instagram_handle)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {application.instagram_handle}
                        </a>
                      ) : null}
                      <span>Applied {dateLabel(application.created_at)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs sm:min-w-48">
                    <div className="rounded-xl bg-stone-50 px-3 py-2">
                      <span className="block text-[10px] uppercase tracking-wide text-stone-500">Score</span>
                      <strong className="mt-1 block text-base text-stone-950">{application.qualification_score}/100</strong>
                    </div>
                    <div className="rounded-xl bg-stone-50 px-3 py-2">
                      <span className="block text-[10px] uppercase tracking-wide text-stone-500">Readiness</span>
                      <strong className="mt-1 block text-base capitalize text-stone-950">{application.readiness || "Unknown"}</strong>
                    </div>
                  </div>
                </div>

                <details className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium text-stone-700">Application answers</summary>
                  <div className="mt-4 grid gap-4 text-sm leading-6 text-stone-600 md:grid-cols-3">
                    <div><strong className="block text-stone-950">What feels stuck</strong>{application.current_challenge || "Not provided"}</div>
                    <div><strong className="block text-stone-950">Desired outcome</strong>{application.desired_outcome || "Not provided"}</div>
                    <div><strong className="block text-stone-950">Current offer</strong>{application.current_offer || "Not provided"}</div>
                  </div>
                </details>

                <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-stone-500" htmlFor={`notes-${application.id}`}>
                  Notes
                </label>
                <textarea
                  id={`notes-${application.id}`}
                  value={notes[application.id] || ""}
                  onChange={event => setNotes(current => ({ ...current, [application.id]: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-stone-950"
                  placeholder="Add call notes or the next follow-up."
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => updateApplication(application.id, "save_notes")}
                    className="rounded-full border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 hover:border-stone-950 disabled:opacity-40"
                  >
                    Save notes
                  </button>
                  {canContact ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => updateApplication(application.id, "contacted")}
                      className="rounded-full border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 hover:border-stone-950 disabled:opacity-40"
                    >
                      Mark contacted
                    </button>
                  ) : null}
                  {canBook ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => updateApplication(application.id, "call_booked")}
                      className="rounded-full border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 hover:border-stone-950 disabled:opacity-40"
                    >
                      Mark call booked
                    </button>
                  ) : null}
                  {canCreateCheckout ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => createCheckout(application.id)}
                      className="rounded-full bg-stone-950 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-40"
                    >
                      {copiedId === application.id
                        ? "Copied"
                        : application.checkout_url
                          ? "Copy €2,000 link"
                          : "Create €2,000 link"}
                    </button>
                  ) : null}
                  {!isClosed ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => updateApplication(application.id, "lost")}
                      className="rounded-full px-4 py-2 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-950 disabled:opacity-40"
                    >
                      Mark lost
                    </button>
                  ) : null}
                </div>

                {application.checkout_url ? (
                  <div className="mt-3">
                    <p className="text-xs text-stone-500">
                      Payment link created {dateLabel(application.checkout_created_at)}. The copy button checks that it is still active before copying it.
                    </p>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
