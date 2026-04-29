"use client"

import { useState } from "react"

type WorkbookAnswer = {
  productId: "what_to_say" | "show_up" | "get_paid"
  label: string
  value: string
}

const STORAGE_KEYS = [
  { productId: "what_to_say" as const, key: "wts_answers", prefix: "field_" },
  { productId: "show_up" as const, key: "showup_answers", prefix: "su_field_" },
  { productId: "get_paid" as const, key: "gp_answers", prefix: "gp_field_" },
]

const LABELS: Record<string, string[]> = {
  what_to_say: [
    "Who is your one person?",
    "What does she tell herself?",
    "What is the 90-day transformation?",
    "Why are you the right person?",
    "Your story",
    "Your expertise",
    "Your values",
    "Your vision",
    "Your voice",
    "Who do you help?",
    "What do you help them do?",
    "What can they do without?",
    "Story bucket",
    "Teach bucket",
    "Sell bucket",
    "Connect bucket",
    "Brand words",
  ],
  show_up: [
    "4 things you talk about most",
    "What is happening in your business this month?",
    "What should people do after 30 days?",
    "Week 1 theme",
    "Week 2 theme",
    "Week 3 theme",
    "Week 4 theme",
    "Most natural content type",
    "Content type you avoid",
    "Sunday reset time",
    "What would make this easier?",
  ],
  get_paid: [
    "Exact result",
    "Timeline",
    "Before and after",
    "Who has already paid you?",
    "What were they struggling with?",
    "What did they say after?",
    "Buyer in one sentence",
    "Most realistic 500 path",
    "What would you need to sell?",
    "What is stopping you?",
    "Offer name",
    "Offer price",
    "What they get",
    "How to buy",
    "Sales post hook",
    "Sales post story",
    "Sales post bridge",
    "Sales post offer",
    "Sales post CTA",
    "DM script",
    "Caption ask",
    "Email or voice note",
  ],
}

function parseStoredAnswers(productId: keyof typeof LABELS, key: string, prefix: string) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.entries(parsed)
      .map(([field, value]) => {
        if (typeof value !== "string" || !value.trim()) return null
        const index = Number(field.replace(prefix, ""))
        return {
          productId,
          label: LABELS[productId][Number.isFinite(index) ? index : -1] || "Workbook answer",
          value: value.trim(),
        }
      })
      .filter((item): item is WorkbookAnswer => Boolean(item))
  } catch {
    return []
  }
}

function collectWorkbookAnswers() {
  if (typeof window === "undefined") return []
  return STORAGE_KEYS.flatMap(item => parseStoredAnswers(item.productId, item.key, item.prefix))
}

export function VisibilityPlanGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [answerCount, setAnswerCount] = useState<number | null>(null)

  async function generatePlan() {
    const answers = collectWorkbookAnswers()
    setAnswerCount(answers.length)

    if (!answers.length) {
      setStatus("Fill in at least one workbook answer first. Then come back here.")
      return
    }

    setIsGenerating(true)
    setStatus("Maya is creating your styled plan...")

    try {
      const response = await fetch("/api/academy/visibility-suite/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "Maya could not create your plan right now.")
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      throw new Error("Plan URL missing.")
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong.")
      setIsGenerating(false)
    }
  }

  return (
    <div
      className="mt-8 border p-6 md:p-8"
      style={{ borderColor: "rgba(15,13,11,0.18)", background: "#EDE9E2" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-[#7A6F63]">
        Maya Deliverable
      </p>
      <h3 className="mt-4 font-serif text-[clamp(28px,5vw,48px)] uppercase leading-none text-[#0F0D0B]">
        Create your styled Visibility Plan.
      </h3>
      <p className="mt-4 max-w-2xl text-[14px] leading-[1.75] text-[#3D3830]">
        Maya will use the answers saved in your workbooks and turn them into one polished page:
        audit, message, content, sales path, and next 7 days.
      </p>
      <div className="mt-5 grid gap-3 text-[13px] leading-6 text-[#3D3830] md:grid-cols-3">
        <div className="border border-[#0F0D0B]/12 p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#7A6F63]">
            Market Fit
          </p>
          <p className="mt-2">What is clear, what is too broad, and what should change.</p>
        </div>
        <div className="border border-[#0F0D0B]/12 p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#7A6F63]">
            Pricing
          </p>
          <p className="mt-2">A practical signal for low-ticket, bundle, or high-touch support.</p>
        </div>
        <div className="border border-[#0F0D0B]/12 p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#7A6F63]">
            Next Step
          </p>
          <p className="mt-2">The exact posts, DM scripts, and actions to use this week.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={generatePlan}
        disabled={isGenerating}
        className="mt-7 inline-flex px-8 py-[13px] text-[10px] font-semibold uppercase tracking-[0.22em] transition-opacity hover:opacity-90 disabled:opacity-45"
        style={{ background: "#0F0D0B", color: "#F4F0E6" }}
      >
        {isGenerating ? "Creating Plan..." : "Audit My Answers"}
      </button>
      {status ? (
        <p className="mt-4 text-[13px] leading-6 text-[#7A6F63]">
          {status}
          {answerCount !== null ? ` (${answerCount} saved answers found.)` : ""}
        </p>
      ) : null}
    </div>
  )
}
