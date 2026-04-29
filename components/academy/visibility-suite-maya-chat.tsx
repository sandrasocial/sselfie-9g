"use client"

import { useState } from "react"

const QUICK_PROMPTS = [
  "Where should I start?",
  "Review my answers so far",
  "Turn this into my weekly plan",
  "Help me work out my monetisation path",
  "What is my next move?",
]

type Message = {
  role: "user" | "maya"
  text: string
}

const C = {
  ink:       "#0F0D0B",
  cream:     "#EDE9E2",
  creamWarm: "#F4F0E6",
  stone:     "#C4B5A0",
  muted:     "#7A6F63",
  div:       "rgba(15,13,11,0.10)",
  divStrong: "rgba(15,13,11,0.18)",
}

type Props = {
  ownedProducts: string[]
}

export default function VisibilitySuiteMayaChat({ ownedProducts }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "maya",
      text: "I know your suite. Ask me where to start, what to focus on, or how to turn this into a plan you'll actually use.",
    },
  ])
  const [question, setQuestion] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function askMaya(nextQuestion: string) {
    const cleanQuestion = nextQuestion.trim()
    if (!cleanQuestion || isSending) return

    setError(null)
    setQuestion("")
    setIsSending(true)
    setMessages((prev) => [...prev, { role: "user", text: cleanQuestion }])

    try {
      const response = await fetch("/api/academy/visibility-suite/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, ownedProducts }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Maya could not answer right now.")
      }

      setMessages((prev) => [...prev, { role: "maya", text: data.answer }])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
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
            <p
              className="max-w-[82%] text-[14px] leading-[1.72]"
              style={{
                color: msg.role === "maya" ? "#3D3830" : C.ink,
                fontWeight: msg.role === "user" ? 500 : 400,
              }}
            >
              {msg.text}
            </p>
          </div>
        ))}

        {isSending && (
          <p
            className="text-[12px]"
            style={{ color: C.stone, fontWeight: 400 }}
          >
            Maya is thinking…
          </p>
        )}

        {error && (
          <p
            className="text-[12px]"
            style={{ color: "#8B2525" }}
          >
            {error}
          </p>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          askMaya(question)
        }}
        className="flex gap-0"
        style={{ border: `1px solid ${C.divStrong}` }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Maya anything about the suite…"
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
