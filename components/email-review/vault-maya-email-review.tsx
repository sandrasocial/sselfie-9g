"use client"

import { useMemo, useState } from "react"

export interface VaultMayaEmailReviewItem {
  id: string
  sequence: string
  audience: string
  job: string
  guardrail: string
  status: "ready" | "needs-proof"
  subject: string
  html: string
}

interface Props {
  items: VaultMayaEmailReviewItem[]
  planning: {
    targetMembers: number
    eligibleAudience: number
    requiredConversionRate: number
    targetMrrUsd: number
  }
}

export function VaultMayaEmailReview({ items, planning }: Props) {
  const [selectedId, setSelectedId] = useState(items[0]?.id || "")
  const [mode, setMode] = useState<"mobile" | "desktop">("mobile")
  const selected = useMemo(
    () => items.find(item => item.id === selectedId) || items[0],
    [items, selectedId]
  )

  if (!selected) return null

  const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value)

  return (
    <main className="min-h-screen bg-brand-pearl text-brand-obsidian">
      <header className="border-b border-brand-whisper bg-white px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-[1380px]">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.34em] text-brand-smoke">
            Vault Maya · email review
          </p>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-3xl font-serif text-4xl font-normal leading-[0.98] tracking-[-0.025em] md:text-6xl">
                The complete Vault Maya launch.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-dark md:text-base">
                {items.length} messages, separated by audience and job. Nothing on this page sends.
              </p>
            </div>
            <div className="flex w-fit border border-brand-whisper bg-brand-pearl p-1">
              {(["mobile", "desktop"] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] transition-colors ${
                    mode === value ? "bg-brand-obsidian text-white" : "text-stone-dark"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8 grid max-w-3xl grid-cols-2 gap-px bg-brand-whisper md:grid-cols-4">
            {[
              [formatNumber(planning.targetMembers), "member goal"],
              [formatNumber(planning.eligibleAudience), "eligible contacts"],
              [`${(planning.requiredConversionRate * 100).toFixed(1)}%`, "needed to join"],
              [`$${formatNumber(planning.targetMrrUsd)}`, "new monthly revenue"],
            ].map(([value, label]) => (
              <div key={label} className="bg-brand-pearl px-4 py-4">
                <strong className="block font-serif text-2xl font-normal">{value}</strong>
                <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.16em] text-brand-smoke">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1380px] gap-8 px-5 py-8 md:px-10 lg:grid-cols-[320px_1fr] lg:gap-12 lg:py-12">
        <aside className="lg:sticky lg:top-5 lg:self-start">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-smoke">
            The sequence
          </p>
          <div className="border-y border-brand-whisper">
            {items.map(item => {
              const active = item.id === selected.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`grid w-full grid-cols-[68px_1fr] gap-4 border-b border-brand-whisper px-0 py-5 text-left last:border-b-0 ${
                    active ? "text-brand-obsidian" : "text-brand-smoke hover:text-stone-dark"
                  }`}
                >
                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em]">
                    {item.sequence}
                  </span>
                  <span>
                    <span className="block font-serif text-xl leading-none">{item.subject}</span>
                    <span className="mt-2 block text-[10px] uppercase tracking-[0.16em]">
                      {item.audience}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-6 border-l-2 border-brand-obsidian bg-white px-5 py-4 text-sm leading-6 text-stone-dark">
            Vault Maya stays out of the permanent free-prompts sequence. The freebie keeps one job:
            help her create first, then introduce the Prompt Vault.
          </div>
        </aside>

        <section>
          <div className="mb-6 grid gap-4 border-b border-brand-whisper pb-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-brand-smoke">
                  {selected.sequence} · {selected.audience}
                </p>
                <span
                  className={`border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${
                    selected.status === "ready"
                      ? "border-brand-whisper text-stone-dark"
                      : "border-brand-obsidian bg-brand-obsidian text-white"
                  }`}
                >
                  {selected.status === "ready" ? "Copy draft ready" : "Needs Sandra's proof image"}
                </span>
              </div>
              <h2 className="mt-3 font-serif text-3xl font-normal leading-tight md:text-4xl">
                {selected.subject}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-dark">One job: {selected.job}</p>
              <p className="mt-1 text-xs leading-5 text-brand-smoke">
                Send rule: {selected.guardrail}
              </p>
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-brand-smoke">
              Preview · {mode}
            </p>
          </div>

          <div className="overflow-x-auto bg-brand-whisper p-3 md:p-8">
            <iframe
              key={`${selected.id}-${mode}`}
              title={`${selected.subject} email preview`}
              srcDoc={selected.html}
              className="mx-auto block min-h-[1020px] border-0 bg-white shadow-xl transition-[width] duration-300"
              style={{ width: mode === "mobile" ? 390 : 720, maxWidth: "100%" }}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
