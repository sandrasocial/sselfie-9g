"use client"

import { Inter } from "next/font/google"
import { useCallback, useRef, useState } from "react"

const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

// ─── Design tokens (mirror lesson-viewer-client) ──────────────────────────────
const C = {
  ink: "#0F0D0B",
  inkSoft: "#1E1A15",
  cream: "#EDE9E2",
  stone: "#C4B5A0",
  muted: "#7A6F63",
  div: "rgba(237,233,226,0.10)",
  divStrong: "rgba(237,233,226,0.18)",
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionLevel = "bare_minimum" | "bold_move" | "bonus_vibe"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface LessonMayaChatProps {
  lessonTitle: string
  courseTitle: string
  keyTakeaways: string[]
  actionStep: Record<string, string>
  chosenActionLevel: ActionLevel | null
  reflectionPrompt?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ACTION_LABELS: Record<ActionLevel, string> = {
  bare_minimum: "Bare Minimum",
  bold_move: "Bold Move",
  bonus_vibe: "Bonus Vibe",
}

function buildContextPrefix(props: LessonMayaChatProps): string {
  const { lessonTitle, courseTitle, keyTakeaways, actionStep, chosenActionLevel } = props
  const takeaways = keyTakeaways
    .slice(0, 3)
    .map((t) => `• ${t}`)
    .join("\n")

  const lines = [
    `[Lesson context: "${lessonTitle}" from ${courseTitle}.`,
    takeaways ? `Key takeaways:\n${takeaways}` : null,
    chosenActionLevel
      ? `Committed action (${ACTION_LABELS[chosenActionLevel]}): "${actionStep[chosenActionLevel] ?? ""}"`
      : null,
    "]",
    "",
  ]
  return lines.filter(Boolean).join("\n")
}

function buildChips(
  chosenActionLevel: ActionLevel | null,
  actionStep: Record<string, string>,
): Array<{ label: string; prompt: string; primary?: boolean }> {
  const chips: Array<{ label: string; prompt: string; primary?: boolean }> = []

  if (chosenActionLevel) {
    const label = ACTION_LABELS[chosenActionLevel]
    const action = actionStep[chosenActionLevel]
    if (action) {
      chips.push({
        label: `Do my ${label} action`,
        prompt: `Help me do my ${label} action right now: "${action}"`,
        primary: true,
      })
    }
  }

  chips.push(
    { label: "Walk me through this", prompt: "Walk me through this lesson step by step and tell me what to do first." },
    { label: "Make content from this", prompt: "Help me turn this lesson into a piece of content I can post this week." },
    { label: "I have a question", prompt: "I have a question about this lesson." },
  )

  return chips.slice(0, 4)
}

// ─── Stream parser ────────────────────────────────────────────────────────────
// AI SDK Data Stream Protocol: text deltas arrive as  0:"chunk text"
function parseAIStreamChunk(raw: string): string {
  let text = ""
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("0:")) {
      try {
        const parsed = JSON.parse(trimmed.slice(2))
        if (typeof parsed === "string") text += parsed
      } catch {
        // ignore malformed lines
      }
    }
  }
  return text
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LessonMayaChat(props: LessonMayaChatProps) {
  const { lessonTitle, courseTitle, keyTakeaways, actionStep, chosenActionLevel, reflectionPrompt } = props

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const contextPrefixUsedRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const chips = buildChips(chosenActionLevel, actionStep)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
  }, [])

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isStreaming) return
      setError(null)
      setOpen(true)

      // On the first message, prepend lesson context invisibly so Maya has it
      const textToSend = contextPrefixUsedRef.current
        ? userText
        : buildContextPrefix(props) + userText

      if (!contextPrefixUsedRef.current) {
        contextPrefixUsedRef.current = true
      }

      const userMessage: ChatMessage = { role: "user", content: userText }
      const apiMessage: ChatMessage = { role: "user", content: textToSend }

      const nextMessages = [...messages, userMessage]
      const apiMessages = [
        ...messages, // prior turns already have context
        apiMessage,
      ]

      setMessages(nextMessages)
      setInput("")
      setIsStreaming(true)
      setStreamingText("")
      scrollToBottom()

      try {
        const response = await fetch("/api/maya/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-chat-type": "maya",
          },
          credentials: "include",
          body: JSON.stringify({ messages: apiMessages }),
        })

        if (!response.ok || !response.body) {
          throw new Error(`Maya couldn't respond (${response.status})`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let assistantText = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const delta = parseAIStreamChunk(chunk)
          if (delta) {
            assistantText += delta
            setStreamingText(assistantText)
            scrollToBottom()
          }
        }

        setMessages((prev) => [...prev, { role: "assistant", content: assistantText }])
        setStreamingText("")
        scrollToBottom()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.")
      } finally {
        setIsStreaming(false)
      }
    },
    [isStreaming, messages, props, scrollToBottom],
  )

  const handleChipClick = useCallback(
    (prompt: string) => {
      void sendMessage(prompt)
    },
    [sendMessage],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      void sendMessage(input)
    },
    [input, sendMessage],
  )

  const hasMessages = messages.length > 0

  return (
    <div
      className="overflow-hidden"
      style={{
        border: `1px solid ${C.divStrong}`,
        background: C.inkSoft,
      }}
    >
      {/* ── Header / toggle ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inter.className} flex w-full items-center justify-between px-5 py-4 transition-colors`}
        style={{
          background: "transparent",
          borderBottom: open ? `1px solid ${C.div}` : "none",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isStreaming ? "#a3e9b0" : C.stone,
              boxShadow: isStreaming ? "0 0 6px #a3e9b0" : "none",
              transition: "all 0.3s",
              flexShrink: 0,
            }}
          />
          <span
            className="text-[10px] uppercase tracking-[0.4em]"
            style={{ color: C.stone, fontWeight: 600 }}
          >
            Ask Maya
          </span>
          {hasMessages && !open && (
            <span
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: C.muted, fontWeight: 500 }}
            >
              · {messages.filter((m) => m.role === "assistant").length} response
              {messages.filter((m) => m.role === "assistant").length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span style={{ color: C.muted, fontSize: 14, lineHeight: 1 }}>{open ? "−" : "+"}</span>
      </button>

      {/* ── Expanded content ── */}
      {open && (
        <div className="flex flex-col" style={{ maxHeight: 480 }}>

          {/* Messages */}
          {hasMessages && (
            <div
              className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
              style={{ scrollbarWidth: "none" }}
            >
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
                  {msg.role === "user" ? (
                    <p
                      className={`${inter.className} max-w-[80%] rounded-sm px-4 py-3 text-[13px] leading-[1.65]`}
                      style={{
                        background: "rgba(237,233,226,0.07)",
                        color: C.cream,
                        fontWeight: 300,
                        border: `1px solid ${C.div}`,
                      }}
                    >
                      {msg.content}
                    </p>
                  ) : (
                    <p
                      className={`${inter.className} text-[13px] leading-[1.75]`}
                      style={{ color: C.stone, fontWeight: 300 }}
                    >
                      {msg.content}
                    </p>
                  )}
                </div>
              ))}

              {/* Streaming assistant message */}
              {streamingText && (
                <p
                  className={`${inter.className} text-[13px] leading-[1.75]`}
                  style={{ color: C.stone, fontWeight: 300 }}
                >
                  {streamingText}
                  <span
                    style={{
                      display: "inline-block",
                      width: 4,
                      height: 13,
                      background: C.muted,
                      marginLeft: 2,
                      verticalAlign: "middle",
                      animation: "maya-blink 1s step-end infinite",
                    }}
                  />
                </p>
              )}

              {error && (
                <p
                  className={`${inter.className} text-[12px]`}
                  style={{ color: "#E57373", fontWeight: 300 }}
                >
                  {error}
                </p>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Chips — shown before first message */}
          {!hasMessages && !isStreaming && (
            <div className="px-5 pt-4 pb-3 space-y-3">
              <p
                className={`${inter.className} text-[10px] uppercase tracking-[0.4em]`}
                style={{ color: C.muted, fontWeight: 600 }}
              >
                Quick start
              </p>
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => handleChipClick(chip.prompt)}
                    disabled={isStreaming}
                    className={`${inter.className} px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-opacity hover:opacity-80 disabled:opacity-40`}
                    style={
                      chip.primary
                        ? {
                            background: C.cream,
                            color: C.ink,
                            border: "1px solid transparent",
                            fontWeight: 600,
                            boxShadow:
                              "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4)",
                          }
                        : {
                            background: "transparent",
                            color: C.stone,
                            border: `1px solid ${C.divStrong}`,
                            fontWeight: 500,
                          }
                    }
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-5 py-3"
            style={{ borderTop: `1px solid ${C.div}` }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                hasMessages ? "Follow up..." : `Ask Maya about "${lessonTitle}"...`
              }
              disabled={isStreaming}
              className={`${inter.className} min-w-0 flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:opacity-40 disabled:opacity-50`}
              style={{ color: C.cream, fontWeight: 300 }}
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className={`${inter.className} shrink-0 px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition-opacity disabled:opacity-30`}
              style={{
                background: "transparent",
                color: C.cream,
                border: `1px solid ${C.divStrong}`,
                fontWeight: 600,
              }}
            >
              {isStreaming ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}

      {/* Blink animation */}
      <style>{`
        @keyframes maya-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
