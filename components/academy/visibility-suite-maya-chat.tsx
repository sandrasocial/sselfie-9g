"use client"

import { useEffect, useState } from "react"

const QUICK_PROMPTS = [
  "Tell Me Where To Start",
  "Review My Answers",
  "Create My Next 7 Days",
  "What Is My Next Paid Move?",
]

type Message = {
  role: "user" | "maya"
  text: string
}

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

const LABELS: Record<WorkbookAnswer["productId"], string[]> = {
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
    "Message test",
    "Proof",
    "Content-to-offer bridge",
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
    "Realistic weekly post capacity",
    "Best content formats right now",
    "Existing content assets",
    "Repurposing opportunity",
  ],
  get_paid: [
    "Exact result",
    "Timeline",
    "Before and after",
    "Who do you help?",
    "What do you help them do?",
    "How long does it take?",
    "What does it help them do?",
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
    "Buyer urgency",
    "Willingness to pay signal",
    "Delivery boundary",
    "First 10 buyers",
    "What part of selling feels hardest",
  ],
}

const THREAD_STORAGE_KEY = "visibility_suite_maya_thread"

const C = {
  ink: "#0F0D0B",
  cream: "#EDE9E2",
  creamWarm: "#F4F0E6",
  stone: "#C4B5A0",
  muted: "#7A6F63",
  div: "rgba(15,13,11,0.10)",
  divStrong: "rgba(15,13,11,0.18)",
}

type Props = {
  ownedProducts: string[]
}

export default function VisibilitySuiteMayaChat({ ownedProducts }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "maya",
      text: "I know your Visibility To Paid path. Ask me where you are, what to finish first, or how to turn your workbook answers into your Maya Visibility Plan.",
    },
  ])
  const [question, setQuestion] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THREAD_STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed) || !parsed.length) return
      const restored = parsed.filter(
        (item): item is Message =>
          item &&
          typeof item === "object" &&
          (item.role === "user" || item.role === "maya") &&
          typeof item.text === "string"
      )
      if (restored.length) setMessages(restored.slice(-16))
    } catch {
      // Ignore broken localStorage data.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(messages.slice(-16)))
    } catch {
      // Ignore private-mode storage failures.
    }
  }, [messages])

  function collectWorkbookAnswers() {
    if (typeof window === "undefined") return []

    return STORAGE_KEYS.flatMap(item => {
      try {
        const raw = window.localStorage.getItem(item.key)
        if (!raw) return []
        const parsed = JSON.parse(raw) as Record<string, unknown>
        return Object.entries(parsed)
          .map(([field, value]) => {
            if (typeof value !== "string" || !value.trim()) return null
            const index = Number(field.replace(item.prefix, ""))
            return {
              productId: item.productId,
              label:
                LABELS[item.productId][Number.isFinite(index) ? index : -1] || "Workbook answer",
              value: value.trim(),
            }
          })
          .filter((answer): answer is WorkbookAnswer => Boolean(answer))
      } catch {
        return []
      }
    })
  }

  function renderMarkdown(text: string) {
    const html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^\s*[-•]\s+(.+)$/gm, "<li>$1</li>")
      .replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>")
      .replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, match => `<ul>${match}</ul>`)
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br />")

    return { __html: html }
  }

  async function askMaya(nextQuestion: string) {
    const cleanQuestion = nextQuestion.trim()
    if (!cleanQuestion || isSending) return

    setError(null)
    setQuestion("")
    setIsSending(true)
    setMessages(prev => [...prev, { role: "user", text: cleanQuestion }])
    const answers = collectWorkbookAnswers()

    try {
      const response = await fetch("/api/academy/visibility-suite/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, ownedProducts, answers }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Maya could not answer right now.")
      }

      setMessages(prev => [...prev, { role: "maya", text: data.answer }])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => askMaya(prompt)}
            disabled={isSending}
            className="px-4 py-2 text-[11px] uppercase tracking-[0.22em] transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{
              border: `1px solid ${C.divStrong}`,
              color: C.muted,
              fontWeight: 600,
              background: "transparent",
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message thread */}
      <div
        className="space-y-4 p-6"
        style={{ background: C.cream, border: `1px solid ${C.divStrong}` }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "maya" && (
              <span
                className="mt-1 shrink-0 text-[9px] uppercase tracking-[0.4em]"
                style={{ color: C.stone, fontWeight: 600 }}
              >
                Maya
              </span>
            )}
            {msg.role === "maya" ? (
              <div
                className="max-w-[82%] text-[14px] leading-[1.72] [&_li]:mb-1 [&_li]:ml-4 [&_p]:mb-3 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc"
                style={{ color: "#3D3830", fontWeight: 400 }}
                dangerouslySetInnerHTML={renderMarkdown(msg.text)}
              />
            ) : (
              <div
                className="max-w-[82%] text-[14px] leading-[1.72]"
                style={{ color: C.ink, fontWeight: 500 }}
              >
                {msg.text}
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <p className="text-[12px]" style={{ color: C.stone, fontWeight: 400 }}>
            Maya is thinking…
          </p>
        )}

        {error && (
          <p className="text-[12px]" style={{ color: "#8B2525" }}>
            {error}
          </p>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={e => {
          e.preventDefault()
          askMaya(question)
        }}
        className="flex gap-0"
        style={{ border: `1px solid ${C.divStrong}` }}
      >
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask Maya about your next step..."
          disabled={isSending}
          className="min-w-0 flex-1 bg-transparent px-5 py-4 text-[13px] outline-none placeholder:opacity-40 disabled:opacity-50"
          style={{ color: C.ink }}
        />
        <button
          type="submit"
          disabled={!question.trim() || isSending}
          className="shrink-0 px-6 py-4 text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{ background: C.ink, color: C.creamWarm, fontWeight: 600 }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
