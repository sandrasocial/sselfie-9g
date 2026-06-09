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
import Image from "next/image"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useConcierge } from "./concierge-context"
import { ConceptCard, type ConceptGenState } from "./concept-card"
import { ClarifyCard } from "./clarify-card"
import { Markdown } from "./markdown"
import { TypingDots } from "./loading"
import { ImageLightbox } from "./image-lightbox"
import { CreditModal } from "./credit-modal"
import { ReferenceLibraryModal } from "./reference-library-modal"
import { ChatHistoryModal } from "./chat-history-modal"
import { MemoryModal, type Memory } from "./memory-modal"
import type { ConceptCard as ConceptCardData, ClarifyPrompt } from "@/lib/app-v3/maya/concept-types"
import type { OutputFormat } from "./types"

/** Maya's profile image (one of Sandra's editorial portraits). Swap freely. */
const MAYA_AVATAR = "/images/ai-prompts/clean-girl-morning-shot-1.jpg"

/** Small round avatar for the chat thread (texting-a-friend feel). */
function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  return (
    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-[#C5C6C8]/50 bg-[#ECEDED]">
      {src ? (
        <Image src={src} alt="" fill className="object-cover" sizes="28px" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] uppercase text-[#818283]">
          {fallback}
        </span>
      )}
    </div>
  )
}

/** Stable conversation id (client-side). */
function newChatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `c_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
}

/** Title a conversation from its first user message. */
function deriveTitle(msgs: any[]): string | null {
  const firstUser = msgs.find((m) => m?.role === "user")
  if (!firstUser) return null
  const parts = Array.isArray(firstUser.parts) ? firstUser.parts : []
  const text = parts
    .filter((p: any) => p?.type === "text" && typeof p.text === "string")
    .map((p: any) => p.text)
    .join(" ")
    .trim()
  return text ? text.slice(0, 80) : null
}

const FORMAT_OPTIONS: { id: OutputFormat; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "reel-cover", label: "Reel cover" },
  { id: "carousel", label: "Carousel" },
  { id: "story-slide", label: "Story slide" },
]

// Tapping a format is the first guided step: it asks Maya (in natural words) to pull 3 directions.
const FORMAT_PHRASE: Record<OutputFormat, string> = {
  photo: "Let's create photos.",
  "reel-cover": "Let's make a Reel cover.",
  carousel: "Let's make a carousel.",
  "story-slide": "Let's make a Story slide.",
}

type UploadSlot = "face" | "side" | "body" | "inspiration"

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

/** Pull an inline question out of an ask_clarify tool part. */
function extractClarify(part: any): ClarifyPrompt | null {
  if (!part || typeof part !== "object") return null
  if (part.type !== "tool-ask_clarify" && part.type !== "dynamic-tool") return null
  const payload = part.output ?? part.input
  if (!payload || typeof payload.question !== "string" || !Array.isArray(payload.options)) return null
  const options = payload.options.filter((o: any) => typeof o === "string" && o.trim().length > 0)
  if (options.length === 0) return null
  return { question: payload.question, options, allowFreeText: Boolean(payload.allowFreeText) }
}

export function MayaConcierge() {
  const { session, isOpen, setOutputFormat, setReferenceSelfieUrl, close } = useConcierge()
  const fileInput = useRef<HTMLInputElement>(null)
  const sideInput = useRef<HTMLInputElement>(null)
  const bodyInput = useRef<HTMLInputElement>(null)
  const inspoInput = useRef<HTMLInputElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLInputElement>(null)
  const lastPulledFormatRef = useRef<string | null>(null)
  const sessionStartRef = useRef<number | null>(null)

  const [uploadingSlot, setUploadingSlot] = useState<UploadSlot | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [input, setInput] = useState("")
  // Per-card generation state, keyed by `${messageId}:${conceptId}`.
  const [genState, setGenState] = useState<Record<string, ConceptGenState>>({})
  // Fullscreen viewer: the set of image urls currently open (null = closed).
  const [lightbox, setLightbox] = useState<string[] | null>(null)
  // Out-of-credits modal (opened when /generate returns 402).
  const [creditModal, setCreditModal] = useState<{ open: boolean; balance: number | null }>({
    open: false,
    balance: null,
  })
  // Past-selfie picker.
  const [libraryOpen, setLibraryOpen] = useState(false)
  // Cross-session memory (Phase E): what Maya already knows + the name she was given.
  const [memory, setMemory] = useState<Memory | null>(null)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [namingDismissed, setNamingDismissed] = useState(false)
  const [justNamed, setJustNamed] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    fetch("/api/app-v3/maya/memory")
      .then((r) => r.json())
      .then((d) =>
        setMemory({
          agentName: d?.agentName ?? null,
          brandNotes: d?.brandNotes ?? null,
          preferences: d?.preferences ?? null,
          userAvatarUrl: d?.userAvatarUrl ?? null,
        }),
      )
      .catch(() => setMemory({ agentName: null, brandNotes: null, preferences: null, userAvatarUrl: null }))
  }, [isOpen])

  // Optional uploads (front face lives in session). Kept simple: hidden until "Add more".
  const [showMore, setShowMore] = useState(false)
  const [sideProfileUrl, setSideProfileUrl] = useState<string | null>(null)
  const [fullBodyUrl, setFullBodyUrl] = useState<string | null>(null)
  const [inspirationUrl, setInspirationUrl] = useState<string | null>(null)

  // Latest context for the chat transport (read fresh on every send).
  const extrasRef = useRef<{
    aestheticName: string
    aestheticIntent: string
    aestheticId: string
    format: OutputFormat
    referenceSelfieUrl: string | null
    inspirationImageUrl: string | null
  }>({
    aestheticName: "",
    aestheticIntent: "",
    aestheticId: "",
    format: "photo",
    referenceSelfieUrl: null,
    inspirationImageUrl: null,
  })

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

  const { messages, sendMessage, status, error, setMessages } = useChat({ transport })

  const isThinking = status === "submitted" || status === "streaming"

  // Conversation persistence (Phase C). Client-driven save on each completed turn.
  const [chatId, setChatId] = useState<string>(() => newChatId())
  const [historyOpen, setHistoryOpen] = useState(false)
  const savedCountRef = useRef(0)

  useEffect(() => {
    if (status !== "ready") return
    if (messages.length === 0 || messages.length === savedCountRef.current) return
    const last = messages[messages.length - 1] as { role?: string } | undefined
    if (last?.role !== "assistant") return
    savedCountRef.current = messages.length
    void fetch("/api/app-v3/maya/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: chatId, messages, title: deriveTitle(messages) }),
    }).catch(() => {})
  }, [status, messages, chatId])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isThinking])

  // When a new look (or a Content idea) opens Maya, allow its format to pull fresh directions.
  // Kept minimal on purpose: no message/chat mutation here, so it can't race the pull below.
  useEffect(() => {
    if (!session) return
    if (session.startedAt === sessionStartRef.current) return
    sessionStartRef.current = session.startedAt
    lastPulledFormatRef.current = null
  }, [session])

  // Maya-guided: once a format is chosen (a chip tap, or preselected from Content), she
  // pulls directions automatically. One pull per format; resets on a new chat or new session.
  useEffect(() => {
    if (!isOpen || !session) return
    const fmt = session.outputFormat
    if (!fmt || isThinking) return
    if (lastPulledFormatRef.current === fmt) return
    lastPulledFormatRef.current = fmt
    extrasRef.current = { ...extrasRef.current, format: fmt }
    sendMessage({ text: FORMAT_PHRASE[fmt] })
  }, [isOpen, session, isThinking, sendMessage])

  if (!isOpen || !session) return null
  const { aesthetic, outputFormat, referenceSelfieUrl } = session
  const format: OutputFormat = outputFormat ?? "photo"

  // Keep the transport context current.
  extrasRef.current = {
    aestheticName: aesthetic.name,
    aestheticIntent: aesthetic.intent,
    aestheticId: aesthetic.id,
    format,
    referenceSelfieUrl,
    inspirationImageUrl: inspirationUrl,
  }

  async function handleUpload(slot: UploadSlot, file: File) {
    setUploadError(null)
    setUploadingSlot(slot)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !data?.url) throw new Error(data?.error || "Upload failed")
      if (slot === "face") setReferenceSelfieUrl(data.url)
      else if (slot === "side") setSideProfileUrl(data.url)
      else if (slot === "body") setFullBodyUrl(data.url)
      else setInspirationUrl(data.url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploadingSlot(null)
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || isThinking) return
    sendMessage({ text })
    setInput("")
  }

  function handleNewChat() {
    if (isThinking) return
    savedCountRef.current = 0
    lastPulledFormatRef.current = null // let the current format re-pull fresh directions
    setMessages([])
    setGenState({})
    setInput("")
    setChatId(newChatId())
    setHistoryOpen(false)
  }

  async function handleSelectChat(id: string) {
    try {
      const res = await fetch(`/api/app-v3/maya/chats/${id}`)
      if (!res.ok) return
      const data = (await res.json().catch(() => null)) as { messages?: unknown[] } | null
      const loaded = Array.isArray(data?.messages) ? data.messages : []
      savedCountRef.current = loaded.length
      setChatId(id)
      setGenState({})
      setMessages(loaded as any)
      setHistoryOpen(false)
    } catch {
      /* leave history open so the user can retry */
    }
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
          referenceSelfieUrls: [sideProfileUrl, fullBodyUrl].filter(Boolean),
          aestheticId: aesthetic.id,
          conceptTitle: concept.title,
        }),
      })
      const data = (await res.json().catch(() => null)) as
        | { imageUrl?: string; imageUrls?: string[]; error?: string; code?: string; current?: number }
        | null
      if (res.status === 402 || data?.code === "insufficient_credits") {
        // Graceful path: reset the card and open the top-up modal instead of a raw error.
        setGenState((s) => ({ ...s, [key]: { status: "idle" } }))
        setCreditModal({ open: true, balance: typeof data?.current === "number" ? data.current : null })
        return
      }
      const urls =
        Array.isArray(data?.imageUrls) && data.imageUrls.length > 0
          ? data.imageUrls
          : data?.imageUrl
            ? [data.imageUrl]
            : []
      if (!res.ok || urls.length === 0) throw new Error(data?.error || "Generation failed")
      setGenState((s) => ({ ...s, [key]: { status: "done", imageUrls: urls } }))
    } catch (e) {
      setGenState((s) => ({
        ...s,
        [key]: { status: "error", error: e instanceof Error ? e.message : "Generation failed" },
      }))
    }
  }

  const hasStarted = messages.length > 0
  const agentLabel = memory?.agentName?.trim() || "Maya"

  // Tap-first: choosing a format asks Maya to pull 3 directions for it (no typing needed).
  function handlePickFormat(id: OutputFormat) {
    if (isThinking) return
    setOutputFormat(id) // the auto-pull effect sends the request for the chosen format
  }

  function focusComposer() {
    composerRef.current?.focus()
  }
  const userAvatar = memory?.userAvatarUrl ?? null
  const showNaming = memory !== null && !memory.agentName && !namingDismissed && !hasStarted

  async function saveName() {
    const n = nameDraft.trim()
    if (!n) return
    setNamingDismissed(true)
    try {
      const res = await fetch("/api/app-v3/maya/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: n }),
      })
      const d = (await res.json().catch(() => null)) as Memory | null
      if (res.ok && d) {
        setMemory({
          agentName: d.agentName ?? n,
          brandNotes: d.brandNotes ?? null,
          preferences: d.preferences ?? null,
          userAvatarUrl: d.userAvatarUrl ?? null,
        })
      }
    } catch {
      /* ignore; she can name later from Memory */
    }
    setJustNamed(n)
    setNameDraft("")
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-[#0D0E10]/30 backdrop-blur-[2px] animate-in fade-in duration-200 motion-reduce:animate-none"
      />
      <aside
        role="dialog"
        aria-label={`${agentLabel}, ${aesthetic.name}`}
        className="relative flex h-full w-full max-w-md flex-col bg-[#F8FAFA] shadow-xl animate-in slide-in-from-right duration-300 ease-out motion-reduce:animate-none"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-[#C5C6C8]/40 px-6 py-5">
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-[0.3em] text-[#818283]">{agentLabel}</p>
            <h2 className="mt-2 truncate font-serif text-[26px] font-light leading-tight text-[#0D0E10]">
              {aesthetic.name}
            </h2>
          </div>
          <div className="-my-1 flex shrink-0 items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleNewChat}
              disabled={isThinking}
              className="py-1 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:text-[#0D0E10] disabled:opacity-40"
            >
              New chat
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="py-1 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:text-[#0D0E10]"
            >
              History
            </button>
            <button
              type="button"
              onClick={() => setMemoryOpen(true)}
              className="py-1 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:text-[#0D0E10]"
            >
              Memory
            </button>
          </div>
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
                  onClick={() => handlePickFormat(opt.id)}
                  disabled={isThinking}
                  className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors disabled:opacity-50 ${
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

          {/* Required: front-face selfie */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploadingSlot === "face"}
              className="flex items-center gap-2 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2 text-[12px] text-[#4F5052] hover:border-[#0D0E10]/40 disabled:opacity-60"
            >
              {referenceSelfieUrl ? "✓ Selfie added" : uploadingSlot === "face" ? "Uploading…" : "Add your selfie"}
            </button>
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
            >
              Use a past selfie
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
                if (f) void handleUpload("face", f)
              }}
            />
          </div>

          {/* Optional extras — tucked away so a single selfie still just works */}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="text-[11px] uppercase tracking-[0.16em] text-[#818283] hover:text-[#0D0E10]"
          >
            {showMore ? "Hide extras" : "Add more for a better match (optional)"}
          </button>

          {showMore && (
            <div className="space-y-2">
              <p className="text-[11px] leading-relaxed text-[#818283]">
                Full-body looks come out best with a few angles. All optional.
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { slot: "side" as const, ref: sideInput, added: !!sideProfileUrl, label: "Side profile" },
                    { slot: "body" as const, ref: bodyInput, added: !!fullBodyUrl, label: "Full body" },
                    { slot: "inspiration" as const, ref: inspoInput, added: !!inspirationUrl, label: "Inspiration pose/vibe" },
                  ]
                ).map(({ slot, ref, added, label }) => (
                  <span key={slot}>
                    <button
                      type="button"
                      onClick={() => ref.current?.click()}
                      disabled={uploadingSlot === slot}
                      className="rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2 text-[12px] text-[#4F5052] hover:border-[#0D0E10]/40 disabled:opacity-60"
                    >
                      {added ? `✓ ${label}` : uploadingSlot === slot ? "Uploading…" : `+ ${label}`}
                    </button>
                    <input
                      ref={ref}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void handleUpload(slot, f)
                      }}
                    />
                  </span>
                ))}
              </div>
            </div>
          )}

          {uploadError && <p className="text-[12px] text-[#282728]">{uploadError}</p>}
        </div>

        {/* Thread */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {/* Static opener */}
          <div className="flex items-end gap-2">
            <Avatar src={MAYA_AVATAR} fallback={agentLabel.charAt(0)} />
            <div className="max-w-[80%] rounded-[6px] rounded-tl-[2px] bg-white p-4 text-[15px] leading-relaxed text-[#282728]">
              <p>{aesthetic.name}. Gorgeous choice. ✨</p>
              <p className="mt-2">{aesthetic.blurb}</p>
              <p className="mt-2">
                What are we making? Pick one above and I'll pull three directions for you.
              </p>
              {!referenceSelfieUrl && (
                <p className="mt-3 text-[14px] text-[#4F5052]">
                  When you're ready, drop a selfie facing a window with soft, even light.
                  <br />
                  For full-body looks, a side profile and a full-body shot help too. All optional. 🤍
                </p>
              )}
            </div>
          </div>

          {/* First-run: name your agent (the ownership moment). Skippable. */}
          {showNaming && (
            <div className="rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
              <p className="text-[14px] leading-relaxed text-[#282728]">
                One quick thing: what would you like to call me? It makes this ours. 🤍
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void saveName()
                    }
                  }}
                  placeholder="e.g. Aria"
                  className="flex-1 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[15px] text-[#282728] outline-none focus:border-[#0D0E10]"
                />
                <button
                  type="button"
                  onClick={() => void saveName()}
                  disabled={nameDraft.trim().length === 0}
                  className="rounded-[4px] bg-[#0D0E10] px-4 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-40"
                >
                  Save
                </button>
              </div>
              <button
                type="button"
                onClick={() => setNamingDismissed(true)}
                className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[#818283] hover:text-[#4F5052]"
              >
                Maybe later
              </button>
            </div>
          )}

          {/* Maya acknowledges her new name */}
          {justNamed && (
            <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
              <Avatar src={MAYA_AVATAR} fallback={justNamed.charAt(0)} />
              <div className="max-w-[80%] rounded-[6px] rounded-tl-[2px] bg-white p-4 text-[15px] leading-relaxed text-[#282728]">
                Love it. I'm {justNamed} now. Let's make something beautiful. 🤍
              </div>
            </div>
          )}


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
            const clarifyPart = parts.map(extractClarify).find(Boolean) as ClarifyPrompt | undefined

            return (
              <div
                key={m.id}
                className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
              >
                {text.trim() &&
                  (isUser ? (
                    <div className="flex flex-row-reverse items-end gap-2">
                      <Avatar src={userAvatar} fallback="You" />
                      <div className="max-w-[80%] rounded-[6px] rounded-tr-[2px] bg-[#0D0E10] p-3.5 text-[15px] leading-relaxed text-white">
                        {text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <Avatar src={MAYA_AVATAR} fallback={agentLabel.charAt(0)} />
                      <div className="max-w-[80%] rounded-[6px] rounded-tl-[2px] bg-white p-4">
                        <Markdown>{text}</Markdown>
                      </div>
                    </div>
                  ))}

                {clarifyPart && (
                  <ClarifyCard
                    clarify={clarifyPart}
                    onPick={(answer) => sendMessage({ text: answer })}
                    onFreeText={focusComposer}
                    disabled={isThinking}
                  />
                )}

                {conceptPart && conceptPart.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[12px] text-[#818283]">Tap the one that feels most like you. 🤍</p>
                    {conceptPart.map((concept) => {
                      const key = `${m.id}:${concept.id}`
                      return (
                        <ConceptCard
                          key={key}
                          concept={concept}
                          gen={genState[key] ?? { status: "idle" }}
                          format={format}
                          onGenerate={() => void generateConcept(key, concept)}
                          onOpen={(urls) => setLightbox(urls)}
                          onTweak={focusComposer}
                          disabled={!referenceSelfieUrl}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {isThinking && <TypingDots />}

          {error && (
            <p className="rounded-[4px] bg-[#282728]/5 px-4 py-3 text-[13px] text-[#282728]">
              Maya couldn't reply just now. Try sending that again.
            </p>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Composer — secondary: refinement only, the happy path is the taps above */}
        <div className="border-t border-[#C5C6C8]/40 px-6 py-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#818283]">Refine with Maya</p>
          <div className="flex gap-2">
            <input
              ref={composerRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Want something different? Ask Maya. e.g. darker, closer, more founder energy…"
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

      {lightbox && <ImageLightbox images={lightbox} onClose={() => setLightbox(null)} />}

      <CreditModal
        open={creditModal.open}
        balance={creditModal.balance}
        onClose={() => setCreditModal({ open: false, balance: null })}
      />

      <ReferenceLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onPick={(url) => setReferenceSelfieUrl(url)}
      />

      <ChatHistoryModal
        open={historyOpen}
        currentChatId={chatId}
        onClose={() => setHistoryOpen(false)}
        onSelect={(id) => void handleSelectChat(id)}
      />

      <MemoryModal open={memoryOpen} onClose={() => setMemoryOpen(false)} onSaved={(m) => setMemory(m)} />
    </div>
  )
}
