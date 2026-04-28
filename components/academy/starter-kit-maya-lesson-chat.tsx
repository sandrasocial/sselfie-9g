"use client"

import { useState } from "react"

const promptStarters = [
  "Walk me through the Lightroom preset steps.",
  "Give me the iPhone edit settings.",
  "What should I do if my photo looks too dark?",
  "Give me a simple checklist for editing one selfie.",
]

type Message = {
  role: "user" | "maya"
  text: string
}

const C = {
  ink: "#0F0D0B",
  cream: "#EDE9E2",
  creamWarm: "#F4F0E6",
  stone: "#C4B5A0",
  muted: "#7A6F63",
  div: "rgba(244,240,230,0.16)",
}

export function StarterKitMayaLessonChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "maya",
      text:
        "Ask me about the editing masterclass. I can pull out the exact settings, walk you through Lightroom, or give you the next step for one photo.",
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
    setMessages((current) => [...current, { role: "user", text: cleanQuestion }])

    try {
      const response = await fetch("/api/academy/starter-kit/editing-masterclass-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: cleanQuestion }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Maya could not answer right now.")
      }

      setMessages((current) => [
        ...current,
        {
          role: "maya",
          text: data?.answer || "Start with one photo. Apply the preset lightly, then adjust only what the photo needs.",
        },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Maya could not answer right now."
      setError(message)
      setMessages((current) => [
        ...current,
        {
          role: "maya",
          text: "I could not answer that just now. Try one of the lesson prompts below or send the question again.",
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(320px,1.14fr)]">
      <article
        className="p-8 md:p-10"
        style={{ background: C.ink, border: `1px solid ${C.ink}`, color: C.creamWarm }}
      >
        <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.stone, fontWeight: 600 }}>
          Editing Masterclass
        </p>
        <h2
          className="mt-5 font-serif uppercase"
          style={{
            fontWeight: 300,
            fontSize: "clamp(30px, 5vw, 54px)",
            lineHeight: 1.04,
            textShadow:
              "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)",
          }}
        >
          Ask Maya while you edit
        </h2>
        <p className="mt-5 text-[14px] leading-[1.78]" style={{ color: "rgba(244,240,230,0.76)" }}>
          Maya uses Sandra's editing masterclass transcript here. Ask for the exact steps, the iPhone settings, or what to do next with one selfie.
        </p>
        <div className="mt-7 grid gap-2">
          {promptStarters.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => askMaya(prompt)}
              disabled={isSending}
              className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.22em] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                border: `1px solid ${C.div}`,
                color: C.creamWarm,
                background: "rgba(244,240,230,0.04)",
                fontWeight: 600,
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </article>

      <article
        className="p-5 md:p-6"
        style={{ background: C.creamWarm, border: "1px solid rgba(15,13,11,0.18)", color: C.ink }}
      >
        <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === "user" ? "ml-auto max-w-[88%]" : "mr-auto max-w-[92%]"}
            >
              <p
                className="mb-1 text-[9px] uppercase tracking-[0.32em]"
                style={{ color: C.muted, fontWeight: 600 }}
              >
                {message.role === "user" ? "You" : "Maya"}
              </p>
              <div
                className="whitespace-pre-wrap px-4 py-3 text-[13px] leading-[1.66]"
                style={{
                  background: message.role === "user" ? C.ink : C.cream,
                  color: message.role === "user" ? C.creamWarm : C.ink,
                  border: message.role === "user" ? `1px solid ${C.ink}` : "1px solid rgba(15,13,11,0.12)",
                }}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <p className="mt-4 text-[12px] leading-[1.6]" style={{ color: "#7B2D20" }}>
            {error}
          </p>
        ) : null}

        <form
          className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            askMaya(question)
          }}
        >
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about presets, iPhone settings, HypePic, or CapCut..."
            rows={3}
            className="min-h-[88px] resize-none px-4 py-3 text-[14px] leading-[1.6] outline-none"
            style={{
              background: C.cream,
              color: C.ink,
              border: "1px solid rgba(15,13,11,0.18)",
            }}
          />
          <button
            type="submit"
            disabled={isSending || !question.trim()}
            className="px-6 py-3 text-[10px] uppercase tracking-[0.24em] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:self-end"
            style={{
              background: C.ink,
              color: C.creamWarm,
              fontWeight: 600,
              border: `1px solid ${C.ink}`,
            }}
          >
            {isSending ? "Asking" : "Ask Maya"}
          </button>
        </form>
      </article>
    </section>
  )
}
