"use client"

// SSELFIE Studio 3.0 — Maya Concierge (MAYA-REBUILD-03: conversational rebuild).
//
// This is the missing layer Sandra felt. Instead of a form with one Generate button, Maya
// now holds a real streaming conversation (Claude Sonnet 4.5 via /api/app-v3/maya/chat),
// proposes EXACTLY 3 concept directions inline as cards, and the user clicks one to fire the
// synchronous OpenAI generation (/api/app-v3/maya/generate). "Tweak" is just another message.
//
// Reuses the lean primitives only (ConceptCard, concierge-context). It does NOT port the
// 2,237-line legacy chat interface or any Flux/Pro-mode wiring.

import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useConcierge } from "./concierge-context"
import { ConceptCard, type ConceptGenState } from "./concept-card"
import type { ConceptCard as ConceptCardData } from "@/lib/app-v3/maya/concept-types"
import type { OutputFormat } from "./types"

const FORMAT_OPTIONS: { id: OutputFormat; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "reel-cover", label: "Reel cover" },
  { id: "carousel", label: "Carousel" },
  { id: "story-slide", label: "Story slide" },
]

/** Pull the 3 concepts out of an emit_concepts tool part (output first, input while streaming). */
function extractConcepts(part: any): ConceptCardData[] | null {
  if (!part || typeof part !== "object") return null
  if (part.type !== "tool-emit_concepts" && part.type !== "dynamic-tool") return null
  const payload = part.output?.concepts ?? part.input?.concepts
  if (!Array.isArray(payload)) return null
  return payload.filter(
    (c: any) => c && typeof c.title === "string" && c.brief && typeof c.brief.outfit === "string",
  )
}

export function MayaConcierge() {
  const { session, isOpen, setOutputFormat, setReferenceSelfieUrl, close } = useConcierge()
  const fileInput = useRef<HTMLInputElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [input, setInput] = useState("")
  // Per-card generation state, keyed by `${messageId}:${conceptId}`.
  const [genState, setGenState] = useState<Record<string, ConceptGenState>>({})

  // Latest context for the chat transport (read fresh on every send).
  const extrasRef = useRef<{
    aestheticName: string
    aestheticIntent: string
    format: OutputFormat
    referenceSelfieUrl: string | null
  }>({ aestheticName: "", aestheticIntent: "", format: "photo", referenceSelfieUrl: null })

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/app-v3/maya/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { messages, ...extrasRef.current },
        }),
      }),
    [],
  )

  const { messages, sendMessage, status, error } = useChat({ transport })

  const isThinking = status === "submitted" || status === "streaming"

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isThinking])

  if (!isOpen || !session) return null
  const { aesthetic, outputFormat, referenceSelfieUrl } = session
  const format: OutputFormat = outputFormat ?? "photo"

  // Keep the transport context current.
  extrasRef.current = {
    aestheticName: aesthetic.name,
    aestheticIntent: aesthetic.intent,
    format,
    referenceSelfieUrl,
  }

  async function handleUpload(file: File) {
    setUploadError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !data?.url) throw new Error(data?.error || "Upload failed")
      setReferenceSelfieUrl(data.url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || isThinking) return
    sendMessage({ text })
    setInput("")
  }

  async function generateConcept(key: string, concept: ConceptCardData) {
    if (!referenceSelfieUrl) {
      setGenState((s) => ({
        ...s,
        [key]: { status: "error", error: "Add a selfie first so Maya keeps your face." },
      }))
      return
    }
    setGenState((s) => ({ ...s, [key]: { status: "generating" } }))
    try {
      const res = await fetch("/api/app-v3/maya/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: concept.brief,
          format,
          referenceSelfieUrl,
          conceptTitle: concept.title,
        }),
      })
      const data = (await res.json().catch(() => null)) as
        | { imageUrl?: string; error?: string }
        | null
      if (!res.ok || !data?.imageUrl) throw new Error(data?.error || "Generation failed")
      setGenState((s) => ({ ...s, [key]: { status: "done", imageUrl: data.imageUrl } }))
    } catch (e) {
      setGenState((s) => ({
        ...s,
        [key]: { status: "error", error: e instanceof Error ? e.message : "Generation failed" },
      }))
    }
  }

  const hasStarted = messages.length > 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-[#0D0E10]/30 backdrop-blur-[2px]"
      />
      <aside
        role="dialog"
        aria-label={`Maya — ${aesthetic.name}`}
        className="relative flex h-full w-full max-w-md flex-col bg-[#F8FAFA] shadow-xl"
      >
        {/* Header */}
        <header className="border-b border-[#C5C6C8]/40 px-6 py-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Maya</p>
          <h2 className="mt-2 font-serif text-[26px] font-light leading-tight text-[#0D0E10]">
            {aesthetic.name}
          </h2>
        </header>

        {/* Setup row: format + selfie (compact, always available) */}
        <div className="space-y-3 border-b border-[#C5C6C8]/40 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map((opt) => {
              const selected = format === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOutputFormat(opt.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                    selected
                      ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                      : "border-[#C5C6C8]/60 bg-white text-[#4F5052] hover:border-[#0D0E10]/40"
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2 text-[12px] text-[#4F5052] hover:border-[#0D0E10]/40 disabled:opacity-60"
            >
              {referenceSelfieUrl ? "✓ Selfie added" : uploading ? "Uploading…" : "Add your selfie"}
            </button>
            {referenceSelfieUrl && (
              <span className="text-[11px] text-[#818283]">Maya will keep your face.</span>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleUpload(f)
              }}
            />
          </div>
          {uploadError && <p className="text-[12px] text-[#282728]">{uploadError}</p>}
        </div>

        {/* Thread */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {/* Static opener */}
          <div className="max-w-[88%] rounded-[6px] rounded-tl-[2px] bg-white p-4 text-[15px] leading-relaxed text-[#282728]">
            <p>{aesthetic.name} — beautiful choice. {aesthetic.blurb}</p>
            <p className="mt-2">
              Tell me what you're making and who it's for. I'll give you three directions to pick from.
            </p>
          </div>

          {messages.map((m: any) => {
            const isUser = m.role === "user"
            const parts = Array.isArray(m.parts) ? m.parts : []
            const text = parts
              .filter((p: any) => p?.type === "text" && typeof p.text === "string")
              .map((p: any) => p.text)
              .join("")
            const conceptPart = parts.map(extractConcepts).find(Boolean) as
              | ConceptCardData[]
              | undefined

            return (
              <div key={m.id} className="space-y-4">
                {text.trim() && (
                  <div
                    className={
                      isUser
                        ? "ml-auto max-w-[88%] rounded-[6px] rounded-tr-[2px] bg-[#0D0E10] p-3.5 text-[15px] leading-relaxed text-white"
                        : "max-w-[88%] rounded-[6px] rounded-tl-[2px] bg-white p-4 text-[15px] leading-relaxed text-[#282728]"
                    }
                  >
                    {text}
                  </div>
                )}

                {conceptPart && conceptPart.length > 0 && (
                  <div className="space-y-3">
                    {conceptPart.map((concept) => {
                      const key = `${m.id}:${concept.id}`
                      return (
                        <ConceptCard
                          key={key}
                          concept={concept}
                          gen={genState[key] ?? { status: "idle" }}
                          onGenerate={() => void generateConcept(key, concept)}
                          disabled={!referenceSelfieUrl}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {isThinking && (
            <div className="flex items-center gap-2 text-[#818283]">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A6A7A8] [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A6A7A8] [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A6A7A8]" />
              </span>
              <span className="text-[13px]">Maya is thinking…</span>
            </div>
          )}

          {error && (
            <p className="rounded-[4px] bg-[#282728]/5 px-4 py-3 text-[13px] text-[#282728]">
              Maya couldn't reply just now. Try sending that again.
            </p>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-[#C5C6C8]/40 px-6 py-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={
                hasStarted ? "Tweak it, or ask for something new…" : "e.g. founder photos for my coaching launch"
              }
              className="flex-1 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-4 py-3 text-[15px] text-[#282728] outline-none focus:border-[#0D0E10]"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isThinking || input.trim().length === 0}
              className="rounded-[4px] bg-[#0D0E10] px-5 text-[12px] uppercase tracking-[0.16em] text-white disabled:opacity-40"
            >
              Send
            </button>
          </div>
          <button
            type="button"
            onClick={close}
            className="mt-3 text-[12px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Back to looks
          </button>
        </div>
      </aside>
    </div>
  )
}
