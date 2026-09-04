"use client"

import { Inter } from "next/font/google"
import { useCallback, useRef, useState } from "react"
import { Markdown } from "@/components/app-v3/markdown"
import { MayaActionCard } from "@/components/app-v3/maya-action-card"
import type { MayaGuidanceResult } from "@/lib/app-v3/maya/guidance/types"

const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

// ─── Design tokens - mirrors app CSS variables (single design system) ────────
const C = {
  ink: "var(--app-text-primary, #0a0a0a)",
  inkSoft: "var(--app-glass-bg, #f5f5f5)",
  inkLift: "var(--app-btn-secondary-bg, rgba(10,10,10,0.04))",
  cream: "var(--app-bg, #ffffff)",
  stone: "var(--app-text-muted, #8a8780)",
  body: "var(--app-text-secondary, #666666)",
  muted: "var(--app-text-muted, #8a8780)",
  div: "var(--app-border, #e5e5e5)",
  divStrong: "var(--app-border, #e5e5e5)",
}

const PAPER_INPUT_BORDER = "#BEB5A8"
const PAPER_INPUT_FOCUS = "#6F665A"

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionLevel = "bare_minimum" | "bold_move" | "bonus_vibe"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface LessonMayaChatProps {
  courseId: number
  lessonId: number
  lessonTitle: string
  courseTitle: string
  keyTakeaways: string[]
  actionStep: Record<string, string>
  chosenActionLevel: ActionLevel | null
  reflectionPrompt?: string
  lessonContext?: string
  workbookFocus?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ACTION_LABELS: Record<ActionLevel, string> = {
  bare_minimum: "Bare Minimum",
  bold_move: "Bold Move",
  bonus_vibe: "Bonus Vibe",
}

function buildContextPrefix(props: LessonMayaChatProps): string {
  const { lessonTitle, courseTitle, keyTakeaways, actionStep, chosenActionLevel, lessonContext, workbookFocus } = props
  const takeaways = keyTakeaways
    .slice(0, 3)
    .map((t) => `• ${t}`)
    .join("\n")

  const lines = [
    `[Lesson context: "${lessonTitle}" from ${courseTitle}.`,
    lessonContext ? `Video focus: ${lessonContext}` : null,
    workbookFocus ? `Workbook/download focus: ${workbookFocus}` : null,
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
  const [guidanceResult, setGuidanceResult] = useState<MayaGuidanceResult | null>(null)

  const guidanceUnavailableRef = useRef(false)
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

      // Keep every fallback turn grounded in the active lesson. The primary
      // guidance route receives lessonRef on every turn; the main Maya chat
      // fallback should retain the same grounding throughout the conversation.
      const textToSend = buildContextPrefix(props) + userText

      const userMessage: ChatMessage = { role: "user", content: userText }
      const apiMessage: ChatMessage = { role: "user", content: textToSend }

      const nextMessages = [...messages, userMessage]
      const apiMessages = [
        ...messages,
        apiMessage,
      ]

      setMessages(nextMessages)
      setInput("")
      setIsStreaming(true)
      setStreamingText("")
      setGuidanceResult(null)
      scrollToBottom()

      try {
        if (!guidanceUnavailableRef.current) {
          const guidanceResponse = await fetch("/api/app-v3/maya/guidance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              taskId: `maya-learning-v1-${props.courseId}-${props.lessonId}`,
              job: "learn_next",
              question: userText,
              lessonRef: { courseId: props.courseId, lessonId: props.lessonId },
              memberGoal: chosenActionLevel
                ? (actionStep[chosenActionLevel] ?? lessonTitle)
                : lessonTitle,
            }),
          })
          if (guidanceResponse.ok) {
            const guidance = (await guidanceResponse.json()) as MayaGuidanceResult
            const assistantText = `${guidance.recommendation}\n\n${guidance.reason}`
            setGuidanceResult(guidance)
            setMessages((prev) => [...prev, { role: "assistant", content: assistantText }])
            setStreamingText("")
            scrollToBottom()
            return
          }
          if (guidanceResponse.status === 404) guidanceUnavailableRef.current = true
          else throw new Error("Maya couldn't load Sandra's guidance. Try again.")
        }

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
        border: "1px solid #BEB5A8",
        borderTop: "2px solid #0F0D0B",
        background: "#F8F6F2",
        boxShadow: "0 12px 36px rgba(15,13,11,0.14), 0 2px 8px rgba(15,13,11,0.08)",
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
            style={{ color: C.body, fontWeight: 600 }}
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
              style={{ scrollbarWidth: "none", background: "#EEE9E1" }}
            >
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
                  {msg.role === "user" ? (
                    <p
                      className={`${inter.className} max-w-[80%] px-4 py-3 text-[13px] leading-[1.65]`}
                      style={{
                        background: C.inkSoft,
                        color: C.ink,
                        fontWeight: 400,
                        border: `1px solid ${C.div}`,
                      }}
                    >
                      {msg.content}
                    </p>
                  ) : (
                    <div
                      className={`${inter.className} text-[13px] leading-[1.75]`}
                      style={{ color: C.ink, fontWeight: 400 }}
                    >
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming assistant message */}
              {streamingText && (
                <p
                  className={`${inter.className} text-[13px] leading-[1.75]`}
                  style={{ color: C.ink, fontWeight: 400 }}
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

              {guidanceResult ? (
                <div className="space-y-3">
                  <div className="border-t pt-3" style={{ borderColor: C.div }}>
                    <p
                      className={`${inter.className} text-[9px] uppercase tracking-[0.18em]`}
                      style={{ color: C.muted, fontWeight: 600 }}
                    >
                      Sources
                    </p>
                    <p
                      className={`${inter.className} mt-1 text-[11px] leading-relaxed`}
                      style={{ color: C.body, fontWeight: 400 }}
                    >
                      {Array.from(
                        new Set(guidanceResult.sourceRefs.map(source => source.title))
                      ).join(", ")}
                    </p>
                  </div>
                  <MayaActionCard
                    key={guidanceResult.nextAction.id}
                    descriptor={guidanceResult.nextAction}
                    preview="Return to the action you chose in this lesson. Your progress and notes stay here."
                    onExecute={async () => {
                      document
                        .getElementById("academy-lesson-action")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}
                  />
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Chips - shown before first message */}
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
                            background: C.ink,
                            color: C.cream,
                            border: "1px solid transparent",
                            fontWeight: 600,
                            boxShadow:
                              "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)",
                          }
                        : {
                            background: "transparent",
                            color: C.body,
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
              className={`${inter.className} academy-paper-input min-w-0 flex-1 px-4 py-3 text-[13px] outline-none transition-colors disabled:opacity-50`}
              style={{
                background: C.cream,
                border: `1px solid ${PAPER_INPUT_BORDER}`,
                color: C.ink,
                fontWeight: 400,
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -1px 0 rgba(0,0,0,0.08)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = PAPER_INPUT_FOCUS
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = PAPER_INPUT_BORDER
              }}
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className={`${inter.className} shrink-0 px-4 py-2 text-[10px] uppercase tracking-[0.22em] transition-opacity disabled:opacity-30`}
              style={{
                background: input.trim() ? C.ink : "transparent",
                color: input.trim() ? C.cream : C.muted,
                border: input.trim()
                  ? "1px solid transparent"
                  : `1px solid ${C.divStrong}`,
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
        .academy-paper-input::placeholder {
          color: rgba(15, 13, 11, 0.52);
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
