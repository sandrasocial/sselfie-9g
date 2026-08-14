"use client"

import type React from "react"
import { useState, useTransition } from "react"

import { WORK_WITH_ME_TIMELINE } from "@/lib/work-with-me/offer"

const BOOKING_URL = "https://calendly.com/sandrasocial/work-with-me-session-45-min"

type Project = Record<string, unknown> | null

const FIELDS = [
  { key: "businessName", db: "business_name", label: "Business name", required: true, rows: 1 },
  {
    key: "businessSummary",
    db: "business_summary",
    label: "What does your business do?",
    required: true,
    rows: 4,
  },
  {
    key: "idealCustomer",
    db: "ideal_customer",
    label: "Who is your best customer?",
    required: true,
    rows: 4,
  },
  {
    key: "currentOffer",
    db: "current_offer",
    label: "What do you sell now, and what does a client usually pay?",
    required: true,
    rows: 4,
  },
  {
    key: "marketingBurden",
    db: "marketing_burden",
    label: "What marketing work keeps falling back on you?",
    required: true,
    rows: 4,
  },
  {
    key: "aiAttempts",
    db: "ai_attempts",
    label: "What have you tried with AI, and where did you get stuck?",
    required: false,
    rows: 4,
  },
  {
    key: "weeklyOutput",
    db: "weekly_output",
    label: "What would you love your team to help create every week?",
    required: true,
    rows: 4,
  },
  {
    key: "voiceExamples",
    db: "voice_examples",
    label: "Paste links or examples that sound most like you",
    required: false,
    rows: 3,
  },
  {
    key: "visualDirection",
    db: "visual_direction",
    label: "Describe the visual feeling you want to keep",
    required: false,
    rows: 3,
  },
  {
    key: "businessLinks",
    db: "business_links",
    label: "Website, Instagram, offers, or anything I should read",
    required: false,
    rows: 3,
  },
] as const

function initialValues(project: Project) {
  return Object.fromEntries(
    FIELDS.map(field => [field.key, String(project?.[field.db] || "")])
  ) as Record<string, string>
}

export function WorkWithMeClientHome({ initialProject }: { initialProject: Project }) {
  const [values, setValues] = useState(() => initialValues(initialProject))
  const [saved, setSaved] = useState(Boolean(initialProject?.intake_completed_at))
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    startTransition(async () => {
      const response = await fetch("/api/work-with-me/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        setError(data?.error || "I could not save this yet. Please try again.")
        return
      }
      setSaved(true)
    })
  }

  return (
    <main className="min-h-screen bg-[#f3f0ea] text-stone-950">
      <section className="border-b border-stone-300 bg-stone-950 px-5 py-16 text-stone-50 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-400">
            Work With Me
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-5xl font-light leading-none sm:text-7xl">
            Your AI Content Team
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-stone-300">
            We have six weeks to build a team that knows your business and helps carry the weekly
            marketing work. Start with the intake below, then book our kickoff call.
          </p>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex bg-stone-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-950"
          >
            Book your kickoff call
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
          The six weeks
        </p>
        <div className="mt-6 divide-y divide-stone-300 border-y border-stone-300">
          {WORK_WITH_ME_TIMELINE.map(item => (
            <div key={item.week} className="grid gap-2 py-5 sm:grid-cols-[90px_220px_1fr] sm:gap-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Week {item.week}
              </p>
              <h2 className="font-serif text-2xl font-light">{item.title}</h2>
              <p className="text-sm leading-6 text-stone-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-300 bg-[#e9e4dc] px-5 py-14 sm:px-8 sm:py-20">
        <form onSubmit={submit} className="mx-auto max-w-4xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Your Business Brain
          </p>
          <h2 className="mt-4 max-w-2xl font-serif text-4xl font-light sm:text-5xl">
            Give me the real business, not the polished version.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
            This is what I use to build and train your team. You can come back and update it if
            something changes.
          </p>
          <div className="mt-10 grid gap-6">
            {FIELDS.map(field => (
              <label key={field.key} className="grid gap-2 text-sm text-stone-700">
                <span>
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {field.rows === 1 ? (
                  <input
                    required={field.required}
                    value={values[field.key]}
                    onChange={event =>
                      setValues(current => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="border border-stone-300 bg-[#f8f5ef] px-4 py-3 outline-none focus:border-stone-950"
                  />
                ) : (
                  <textarea
                    required={field.required}
                    rows={field.rows}
                    value={values[field.key]}
                    onChange={event =>
                      setValues(current => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="border border-stone-300 bg-[#f8f5ef] px-4 py-3 outline-none focus:border-stone-950"
                  />
                )}
              </label>
            ))}
          </div>
          <button
            disabled={pending}
            className="mt-8 bg-stone-950 px-7 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-50"
          >
            {pending ? "Saving..." : saved ? "Save my updates" : "Send my intake"}
          </button>
          {saved ? (
            <p className="mt-4 text-sm text-stone-700">
              Saved 🤍 I have what I need to start building.
            </p>
          ) : null}
          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        </form>
      </section>
    </main>
  )
}
