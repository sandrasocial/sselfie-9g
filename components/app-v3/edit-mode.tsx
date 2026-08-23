"use client"

// Conversational Edit a Photo workspace.
// The existing direct controls remain available, while Maya can apply any free-written change.
// Every result is a new Gallery version; the original and all earlier versions stay recoverable.

import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

import { buildLikenessAcknowledgement } from "@/lib/app-v3/maya/likeness-capture-ux"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

import { Spinner } from "./loading"
import type { OutputFormat } from "./types"
import { useAccessibleModal } from "./use-accessible-modal"

interface EditModeProps {
  imageUrl: string
  format: OutputFormat
  sourceImageId?: number | null
  sourceTitle?: string | null
  referenceSelfieUrl?: string | null
  onClose: () => void
  onResult: (newUrl: string, aiImageId?: number | null) => void
  onCreditBlock?: (balance: number | null) => void
  onBusyChange?: (busy: boolean) => void
}

interface EditDirection {
  id: "clean-natural" | "cool-editorial" | "warm-lifestyle"
  label: string
  description: string
  instruction: string
}

interface EditVersion {
  id: string
  imageUrl: string
  aiImageId: number | null
  assetId: string | null
  rootAssetId: string | null
  history: EditHistoryEntry[]
  label: string
  instruction: string | null
}

interface EditHistoryEntry {
  assetId: string
  instruction: string
}

interface EditConversation {
  workspacePath: "edit-photo"
  action: "apply"
  sourceAssetId: string
  rootAssetId?: string
  history: EditHistoryEntry[]
}

interface PendingEditConfirmation {
  id: string
  instruction: string
  displayText: string
  creditCost: 1
  conversation: EditConversation
}

interface EditReceipt {
  action: "apply" | "undo"
  sourceAssetId: string
  resultAssetId: string
  rootAssetId: string
  instruction: string | null
  historyDepth: number
  creditRequestId: string | null
}

interface EditTurn {
  id: string
  request: string
  response: string
  versionId: string
}

const EDIT_DIRECTIONS: readonly EditDirection[] = [
  {
    id: "clean-natural",
    label: "Clean Natural",
    description: "Believable color, gentle contrast and true-to-life skin.",
    instruction:
      "Give this photo a clean natural edit. Correct the crop only if needed, balance exposure, recover bright detail, open heavy shadows, correct temperature and tint, then use gentle contrast and restrained vibrance. Keep skin tone and texture true to life.",
  },
  {
    id: "cool-editorial",
    label: "Cool Editorial",
    description: "Cooler shadows, controlled highlights and lower saturation.",
    instruction:
      "Give this photo a cool editorial color grade. Use slightly cooler shadows, neutral-to-warm believable skin, controlled highlights and lower overall saturation without making the skin grey. Keep natural texture and strong clean contrast.",
  },
  {
    id: "warm-lifestyle",
    label: "Warm Lifestyle",
    description: "Warm highlights, soft shadows and protected whites.",
    instruction:
      "Give this photo a warm lifestyle color grade. Use warm highlights, soft dimensional shadows and moderate vibrance. Keep whites clean instead of orange and keep the skin tone believable with natural texture.",
  },
] as const

const EDIT_STARTERS = [
  "Change the outfit to ",
  "Change the location to ",
  "Change the hairstyle to ",
  "Add this product or object: ",
  "Change the camera and lens look to ",
  "Change the lighting to ",
] as const

function editVersionId() {
  return `edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function requestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replaceAll("-", "_")
  }
  return `edit_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`
}

function messageText(message: any): string {
  if (!Array.isArray(message?.parts)) return ""
  return message.parts
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim()
}

function editConfirmationFromPart(part: any): PendingEditConfirmation | null {
  const isEditTool =
    part?.type === "tool-edit_photo" ||
    (part?.type === "dynamic-tool" && part?.toolName === "edit_photo")
  if (!isEditTool) return null
  const output = part.output
  if (
    output?.status !== "confirmation_required" ||
    output?.creditCost !== 1 ||
    typeof output?.instruction !== "string" ||
    output?.conversation?.workspacePath !== "edit-photo" ||
    output?.conversation?.action !== "apply" ||
    typeof output?.conversation?.sourceAssetId !== "string"
  ) {
    return null
  }
  return {
    id: typeof part.toolCallId === "string" ? part.toolCallId : editVersionId(),
    instruction: output.instruction,
    displayText: output.instruction,
    creditCost: 1,
    conversation: output.conversation,
  }
}

function latestEditConfirmation(messages: any[]): PendingEditConfirmation | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const parts = Array.isArray(messages[messageIndex]?.parts) ? messages[messageIndex].parts : []
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const confirmation = editConfirmationFromPart(parts[partIndex])
      if (confirmation) return confirmation
    }
  }
  return null
}

export function EditMode({
  imageUrl,
  sourceImageId,
  sourceTitle,
  referenceSelfieUrl,
  onClose,
  onResult,
  onCreditBlock,
  onBusyChange,
}: EditModeProps) {
  const originalVersionRef = useRef<EditVersion>({
    id: "original",
    imageUrl,
    aiImageId: sourceImageId ?? null,
    assetId: sourceImageId ? `ai_${sourceImageId}` : null,
    rootAssetId: null,
    history: [],
    label: "Original",
    instruction: null,
  })
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const referenceInputRef = useRef<HTMLInputElement | null>(null)
  const [versions, setVersions] = useState<EditVersion[]>([originalVersionRef.current])
  const [activeVersionId, setActiveVersionId] = useState("original")
  const [turns, setTurns] = useState<EditTurn[]>([])
  const [localConfirmation, setLocalConfirmation] = useState<PendingEditConfirmation | null>(null)
  const [resolvedConfirmationIds, setResolvedConfirmationIds] = useState<string[]>([])
  const [instruction, setInstruction] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(true)
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null)
  const [referenceUploading, setReferenceUploading] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [likenessMessage, setLikenessMessage] = useState<string | null>(null)
  const [likenessOffer, setLikenessOffer] = useState<string | null>(null)
  const [savingLikeness, setSavingLikeness] = useState(false)

  const activeVersion =
    versions.find(version => version.id === activeVersionId) ?? originalVersionRef.current
  const originalVersion = originalVersionRef.current
  const hasEditedVersion = activeVersion.id !== originalVersion.id
  const displayedVersion = showOriginal ? originalVersion : activeVersion

  const editContextRef = useRef({
    sourceAssetId: activeVersion.assetId,
    sourceImageUrl: activeVersion.imageUrl,
    sourceTitle: sourceTitle ?? undefined,
    rootAssetId: activeVersion.rootAssetId ?? undefined,
    history: activeVersion.history,
  })
  editContextRef.current = {
    sourceAssetId: activeVersion.assetId,
    sourceImageUrl: activeVersion.imageUrl,
    sourceTitle: sourceTitle ?? undefined,
    rootAssetId: activeVersion.rootAssetId ?? undefined,
    history: activeVersion.history,
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/app-v3/maya/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            workspacePath: "edit-photo",
            workspaceAction: "edit-photo",
            editContext: editContextRef.current,
          },
        }),
      }),
    []
  )
  const { messages, sendMessage, status: chatStatus, error: chatError } = useChat({ transport })
  const chatBusy = chatStatus === "submitted" || chatStatus === "streaming"
  const streamedConfirmation = latestEditConfirmation(messages as any[])
  const pendingConfirmation =
    localConfirmation ??
    (streamedConfirmation && !resolvedConfirmationIds.includes(streamedConfirmation.id)
      ? streamedConfirmation
      : null)

  const closeWhenIdle = () => {
    if (!busy && !referenceUploading && !chatBusy) onClose()
  }
  const { dialogRef, initialFocusRef } = useAccessibleModal(true, closeWhenIdle)

  useEffect(() => {
    onBusyChange?.(busy || referenceUploading || chatBusy)
    return () => onBusyChange?.(false)
  }, [busy, chatBusy, onBusyChange, referenceUploading])

  async function rememberLikenessOffer() {
    if (!likenessOffer || savingLikeness) return
    setSavingLikeness(true)
    try {
      const response = await fetch("/api/app-v3/maya/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addLikenessNote: likenessOffer }),
      })
      if (!response.ok) throw new Error("Could not save that yet.")
      setLikenessMessage(buildLikenessAcknowledgement(likenessOffer))
      setLikenessOffer(null)
    } catch (memoryError) {
      setError(memoryError instanceof Error ? memoryError.message : "Could not save that yet.")
    } finally {
      setSavingLikeness(false)
    }
  }

  function dismissLikenessOffer() {
    void trackAnalyticsEvent({
      event: "suite_likeness_offer_dismissed",
      properties: { source: "app-v3-edit" },
    })
    setLikenessOffer(null)
  }

  function chooseVersion(version: EditVersion) {
    if (busy || chatBusy) return
    if (pendingConfirmation) {
      setResolvedConfirmationIds(current => [...current, pendingConfirmation.id])
    }
    setActiveVersionId(version.id)
    setShowOriginal(false)
    setLocalConfirmation(null)
    setError(null)
    setSaveMessage(
      version.id === "original"
        ? "Original selected. Your edited versions are still safe in Gallery."
        : `${version.label} selected.`
    )
    onResult(version.imageUrl, version.aiImageId)
  }

  async function undoLastChange() {
    const activeIndex = versions.findIndex(version => version.id === activeVersionId)
    const previous = versions[activeIndex - 1]
    if (busy || chatBusy || activeIndex <= 0 || !previous?.assetId || !activeVersion.assetId) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/app-v3/maya/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: {
            workspacePath: "edit-photo",
            action: "undo",
            sourceAssetId: activeVersion.assetId,
            ...(activeVersion.rootAssetId ? { rootAssetId: activeVersion.rootAssetId } : {}),
            undoToAssetId: previous.assetId,
            history: activeVersion.history,
          },
        }),
      })
      const data = (await response.json().catch(() => null)) as {
        imageUrl?: string
        aiImageId?: number | null
        error?: string
      } | null
      if (!response.ok || !data?.imageUrl) throw new Error(data?.error || "Could not undo that.")
      chooseVersion(previous)
    } catch (undoError) {
      setError(undoError instanceof Error ? undoError.message : "Could not undo that.")
    } finally {
      setBusy(false)
    }
  }

  async function uploadEditReference(file: File) {
    if (referenceUploading || busy) return
    setReferenceUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("slot", "edit-reference")
      const response = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const data = (await response.json().catch(() => null)) as {
        url?: string
        error?: string
      } | null
      if (!response.ok || !data?.url) throw new Error(data?.error || "Reference upload failed")
      setReferenceImageUrl(data.url)
      setSaveMessage("Reference added. Tell Maya what to use from it.")
      composerRef.current?.focus()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Reference upload failed")
    } finally {
      setReferenceUploading(false)
      if (referenceInputRef.current) referenceInputRef.current.value = ""
    }
  }

  function prepareDirectEdit(direction: EditDirection) {
    if (busy || chatBusy || referenceUploading) return
    if (!activeVersion.assetId) {
      setError("Choose a saved photo from Gallery before editing with Maya.")
      return
    }
    setError(null)
    if (pendingConfirmation) {
      setResolvedConfirmationIds(current => [...current, pendingConfirmation.id])
    }
    setLocalConfirmation({
      id: requestId(),
      instruction: direction.instruction,
      displayText: `Use ${direction.label}`,
      creditCost: 1,
      conversation: {
        workspacePath: "edit-photo",
        action: "apply",
        sourceAssetId: activeVersion.assetId,
        ...(activeVersion.rootAssetId ? { rootAssetId: activeVersion.rootAssetId } : {}),
        history: activeVersion.history,
      },
    })
  }

  async function applyConfirmedEdit(confirmation: PendingEditConfirmation) {
    if (busy || chatBusy || referenceUploading) return
    setBusy(true)
    setError(null)
    setSaveMessage(null)
    try {
      const confirmedRequestId = requestId()
      const response = await fetch("/api/app-v3/maya/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: confirmation.instruction,
          sourceTitle,
          referenceSelfieUrl,
          referenceImageUrl,
          conversation: {
            ...confirmation.conversation,
            creditConfirmation: {
              confirmed: true,
              expectedCost: 1,
              requestId: confirmedRequestId,
            },
          },
        }),
      })
      const data = (await response.json().catch(() => null)) as {
        imageUrl?: string
        aiImageId?: number | null
        error?: string
        code?: string
        current?: number
        editReceipt?: EditReceipt
        likenessMemory?:
          | { status: "captured"; note: string; acknowledgement: string }
          | { status: "offer"; note: string }
      } | null
      if (
        onCreditBlock &&
        (response.status === 402 ||
          data?.code === "insufficient_credits" ||
          data?.code === "generation_locked")
      ) {
        onCreditBlock(typeof data?.current === "number" ? data.current : null)
        return
      }
      if (!response.ok || !data?.imageUrl || !data.editReceipt) {
        throw new Error(data?.error || "Could not make that change.")
      }

      const nextHistory = [
        ...confirmation.conversation.history,
        { assetId: data.editReceipt.resultAssetId, instruction: confirmation.instruction },
      ]
      const nextNumber = versions.length
      const nextVersion: EditVersion = {
        id: editVersionId(),
        imageUrl: data.imageUrl,
        aiImageId: data.aiImageId ?? null,
        assetId: data.editReceipt.resultAssetId,
        rootAssetId: data.editReceipt.rootAssetId,
        history: nextHistory,
        label: `Version ${nextNumber}`,
        instruction: confirmation.displayText,
      }
      setVersions(current => [...current, nextVersion])
      setActiveVersionId(nextVersion.id)
      setShowOriginal(false)
      setTurns(current => [
        ...current,
        {
          id: nextVersion.id,
          request: confirmation.displayText,
          response: "Done. Your original is still safe. What would you like to change next?",
          versionId: nextVersion.id,
        },
      ])
      setInstruction("")
      setSaveMessage("Saved to Gallery as a new version.")
      setResolvedConfirmationIds(current => [...current, confirmation.id])
      setLocalConfirmation(null)

      if (data.likenessMemory?.status === "captured") {
        setLikenessMessage(data.likenessMemory.acknowledgement)
        setLikenessOffer(null)
      } else if (data.likenessMemory?.status === "offer") {
        setLikenessMessage(null)
        setLikenessOffer(data.likenessMemory.note)
        void trackAnalyticsEvent({
          event: "suite_likeness_offer_shown",
          properties: { source: "app-v3-edit" },
        })
      }
      onResult(data.imageUrl, data.aiImageId ?? null)
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Could not make that change.")
    } finally {
      setBusy(false)
    }
  }

  function sendEditMessage(text: string) {
    const change = text.trim()
    if (!change || busy || chatBusy || referenceUploading) return
    if (!activeVersion.assetId) {
      setError("Choose a saved photo from Gallery before editing with Maya.")
      return
    }
    setError(null)
    setSaveMessage(null)
    if (pendingConfirmation) {
      setResolvedConfirmationIds(current => [...current, pendingConfirmation.id])
    }
    setLocalConfirmation(null)
    sendMessage({ text: change })
    setInstruction("")
  }

  function dismissConfirmation() {
    if (!pendingConfirmation || busy) return
    setResolvedConfirmationIds(current => [...current, pendingConfirmation.id])
    setLocalConfirmation(null)
  }

  function seedInstruction(starter: string) {
    setInstruction(starter)
    window.requestAnimationFrame(() => {
      composerRef.current?.focus()
      composerRef.current?.setSelectionRange(starter.length, starter.length)
    })
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-mode-title"
      className="fixed inset-0 z-[80] flex h-[100dvh] flex-col bg-[color:var(--suite-night)] text-white animate-in fade-in duration-200 motion-reduce:animate-none"
    >
      <header className="flex min-h-[64px] shrink-0 items-center justify-between border-b border-white/20 px-4 pt-[env(safe-area-inset-top)] sm:px-7">
        <div className="flex min-w-0 items-baseline gap-4">
          <span className="font-serif text-[24px] font-light tracking-[-0.045em] sm:text-[29px]">
            SSELFIE
          </span>
          <h2
            id="edit-mode-title"
            className="truncate text-[9px] uppercase tracking-[0.23em] text-white/55"
          >
            Edit with Maya
          </h2>
        </div>
        <button
          ref={initialFocusRef}
          type="button"
          onClick={closeWhenIdle}
          disabled={busy || referenceUploading || chatBusy}
          className="min-h-11 border-l border-white/20 px-4 text-[9px] uppercase tracking-[0.18em] text-white/75 transition-colors hover:bg-white hover:text-[color:var(--suite-night)] disabled:opacity-40 sm:text-[10px]"
        >
          Save &amp; return
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="relative flex min-h-[36dvh] min-w-0 flex-1 flex-col border-b border-white/20 bg-[color:var(--suite-night)] lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayedVersion.imageUrl}
              alt={showOriginal ? "Original photo" : "Current edited version"}
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
            {busy ? (
              <div
                role="status"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[color:var(--suite-night)]/72"
              >
                <Spinner className="h-8 w-8 border-white/40 border-t-white" />
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/82">
                  Making your change…
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid shrink-0 grid-cols-[1fr_auto] border-t border-white/20 bg-[color:var(--suite-night)]">
            <div className="flex min-w-0 divide-x divide-white/20">
              <button
                type="button"
                onClick={() => setShowOriginal(true)}
                aria-pressed={showOriginal}
                className={`min-h-12 flex-1 px-3 text-[9px] uppercase tracking-[0.16em] transition-colors ${
                  showOriginal
                    ? "bg-white text-[color:var(--suite-night)]"
                    : "text-white/65 hover:text-white"
                }`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => setShowOriginal(false)}
                aria-pressed={!showOriginal}
                className={`min-h-12 flex-1 px-3 text-[9px] uppercase tracking-[0.16em] transition-colors ${
                  !showOriginal
                    ? "bg-[color:var(--suite-accent)] text-white"
                    : "text-white/65 hover:text-white"
                }`}
              >
                {activeVersion.id === originalVersion.id ? "Current" : activeVersion.label}
              </button>
            </div>
            <button
              type="button"
              onClick={undoLastChange}
              disabled={busy || !hasEditedVersion}
              className="min-h-12 border-l border-white/20 px-5 text-[9px] uppercase tracking-[0.16em] text-white/68 hover:text-white disabled:opacity-30"
            >
              Undo last
            </button>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col bg-[color:var(--suite-canvas)] text-[color:var(--suite-night)]">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="border-b border-[color:var(--suite-steel)] px-4 py-4 sm:px-5">
              <p className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--suite-accent)]">
                Maya
              </p>
              <p className="mt-2 max-w-sm font-serif text-[23px] font-light leading-tight">
                What would you like to change?
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--suite-slate)]">
                Change the styling, setting, hair, objects, color, camera, light or anything else.
                If you do not ask to change your identity, Maya keeps it.
              </p>
            </div>

            {messages.length > 0 ? (
              <ol className="border-b border-[color:var(--suite-steel)]">
                {(messages as any[]).map(message => {
                  const text = messageText(message)
                  if (!text) return null
                  const fromMember = message.role === "user"
                  return (
                    <li
                      key={message.id}
                      className="border-b border-[color:var(--suite-steel)]/70 p-4 last:border-b-0"
                    >
                      {fromMember ? (
                        <div className="ml-8 border-l-2 border-[color:var(--suite-accent)] pl-3 text-[13px] leading-relaxed">
                          {text}
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[color:var(--suite-night)] text-[8px] uppercase text-white">
                            M
                          </span>
                          <p className="min-w-0 flex-1 whitespace-pre-wrap text-[12px] leading-relaxed text-[color:var(--suite-slate)]">
                            {text}
                          </p>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            ) : null}

            {chatBusy ? (
              <div
                role="status"
                className="flex items-center gap-3 border-b border-[color:var(--suite-steel)] px-4 py-3 sm:px-5"
              >
                <Spinner className="h-4 w-4 border-[color:var(--suite-steel)] border-t-[color:var(--suite-night)]" />
                <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--suite-slate)]">
                  Maya is reading your direction
                </span>
              </div>
            ) : null}

            {chatError ? (
              <p
                role="alert"
                className="border-b border-[color:var(--suite-steel)] bg-white px-4 py-3 text-[12px] text-[color:var(--ss-brand-error)] sm:px-5"
              >
                Maya could not read that direction. Try sending it again.
              </p>
            ) : null}

            {pendingConfirmation ? (
              <section className="border-b-[3px] border-[color:var(--suite-night)] bg-white px-4 py-4 sm:px-5">
                <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--suite-accent)]">
                  Ready to apply
                </p>
                <p className="mt-2 text-[13px] leading-relaxed">
                  {pendingConfirmation.displayText}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--suite-slate)]">
                  Maya will save the result as a new version. Your original stays unchanged.
                </p>
                <div className="mt-4 grid grid-cols-[1fr_auto] gap-px bg-[color:var(--suite-night)]">
                  <button
                    type="button"
                    onClick={() => void applyConfirmedEdit(pendingConfirmation)}
                    disabled={busy || chatBusy}
                    className="min-h-11 bg-[color:var(--suite-accent)] px-4 text-[9px] uppercase tracking-[0.16em] text-white disabled:opacity-40"
                  >
                    Use 1 credit
                  </button>
                  <button
                    type="button"
                    onClick={dismissConfirmation}
                    disabled={busy || chatBusy}
                    className="min-h-11 bg-white px-4 text-[9px] uppercase tracking-[0.16em] disabled:opacity-40"
                  >
                    Change direction
                  </button>
                </div>
              </section>
            ) : null}

            {turns.length > 0 ? (
              <ol className="border-b border-[color:var(--suite-steel)]">
                {turns.map((turn, index) => {
                  const version = versions.find(item => item.id === turn.versionId)
                  const active = version?.id === activeVersionId
                  return (
                    <li
                      key={turn.id}
                      className="border-b border-[color:var(--suite-steel)]/70 p-4 last:border-b-0"
                    >
                      <div className="ml-8 border-l-2 border-[color:var(--suite-accent)] pl-3 text-[13px] leading-relaxed">
                        {turn.request}
                      </div>
                      <div className="mt-3 flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[color:var(--suite-night)] text-[8px] uppercase text-white">
                          M
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] leading-relaxed text-[color:var(--suite-slate)]">
                            {turn.response}
                          </p>
                          {version ? (
                            <button
                              type="button"
                              onClick={() => chooseVersion(version)}
                              disabled={busy || active}
                              className="mt-2 min-h-9 text-[9px] uppercase tracking-[0.15em] text-[color:var(--suite-night)] underline underline-offset-4 disabled:no-underline disabled:opacity-45"
                            >
                              {active ? `Using version ${index + 1}` : `Use version ${index + 1}`}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="border-b border-[color:var(--suite-steel)] bg-white px-4 py-3 text-[12px] text-[color:var(--ss-brand-error)] sm:px-5"
              >
                {error}
              </p>
            ) : null}
            {saveMessage ? (
              <p
                role="status"
                className="border-b border-[color:var(--suite-steel)] bg-white px-4 py-3 text-[12px] text-[color:var(--suite-slate)] sm:px-5"
              >
                {saveMessage}
              </p>
            ) : null}
            {likenessMessage ? (
              <p className="border-b border-[color:var(--suite-steel)] bg-white px-4 py-3 text-[12px] text-[color:var(--suite-slate)] sm:px-5">
                {likenessMessage}
              </p>
            ) : null}
            {likenessOffer ? (
              <div className="border-b border-[color:var(--suite-steel)] bg-white px-4 py-4 sm:px-5">
                <p className="text-[12px] leading-relaxed text-[color:var(--suite-slate)]">
                  Remember that for future photos?
                </p>
                <div className="mt-2 flex gap-4">
                  <button
                    type="button"
                    onClick={() => void rememberLikenessOffer()}
                    disabled={savingLikeness}
                    className="min-h-10 text-[9px] uppercase tracking-[0.16em] underline underline-offset-4 disabled:opacity-40"
                  >
                    {savingLikeness ? "Saving…" : "Remember it"}
                  </button>
                  <button
                    type="button"
                    onClick={dismissLikenessOffer}
                    disabled={savingLikeness}
                    className="min-h-10 text-[9px] uppercase tracking-[0.16em] text-[color:var(--suite-slate)] disabled:opacity-40"
                  >
                    Not now
                  </button>
                </div>
              </div>
            ) : null}

            <div className="border-b border-[color:var(--suite-steel)]">
              <button
                type="button"
                onClick={() => setControlsOpen(open => !open)}
                aria-expanded={controlsOpen}
                className="flex min-h-12 w-full items-center justify-between px-4 text-left text-[9px] uppercase tracking-[0.2em] sm:px-5"
              >
                Styles &amp; edit controls
                <span aria-hidden className="text-[17px] font-light">
                  {controlsOpen ? "−" : "+"}
                </span>
              </button>
              {controlsOpen ? (
                <div className="border-t border-[color:var(--suite-steel)] bg-white">
                  <div className="grid grid-cols-3 divide-x divide-[color:var(--suite-steel)]">
                    {EDIT_DIRECTIONS.map(direction => (
                      <button
                        key={direction.id}
                        type="button"
                        disabled={busy || referenceUploading}
                        onClick={() => prepareDirectEdit(direction)}
                        className="min-h-[116px] px-2 py-3 text-left transition-colors hover:bg-[color:var(--suite-night)] hover:text-white disabled:opacity-40 sm:px-3"
                      >
                        <span className="block text-[9px] uppercase tracking-[0.12em]">
                          {direction.label}
                        </span>
                        <span className="mt-2 block text-[10px] leading-relaxed opacity-62">
                          {direction.description}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[color:var(--suite-steel)] px-4 py-4 sm:px-5">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--suite-slate)]">
                      Start a change
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {EDIT_STARTERS.map(starter => (
                        <button
                          key={starter}
                          type="button"
                          onClick={() => seedInstruction(starter)}
                          disabled={busy || referenceUploading}
                          className="min-h-9 text-left text-[11px] text-[color:var(--suite-slate)] underline underline-offset-4 disabled:opacity-40"
                        >
                          {starter.trim().replace(/:$/, "")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {versions.length > 1 ? (
              <div className="border-b border-[color:var(--suite-steel)] px-4 py-4 sm:px-5">
                <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--suite-slate)]">
                  Versions · {versions.length}
                </p>
                <div className="mt-3 flex gap-px overflow-x-auto bg-[color:var(--suite-steel)]">
                  {versions.map(version => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => chooseVersion(version)}
                      disabled={busy}
                      aria-label={`Use ${version.label}`}
                      className={`relative h-20 w-16 shrink-0 overflow-hidden bg-white ${
                        version.id === activeVersionId
                          ? "outline outline-2 outline-offset-[-2px] outline-[color:var(--suite-accent)]"
                          : "opacity-65 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={version.imageUrl} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[color:var(--suite-steel)] bg-[color:var(--suite-canvas)] p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:p-4">
            {referenceImageUrl ? (
              <div className="mb-2 flex items-center justify-between gap-3 border border-[color:var(--suite-steel)] bg-white p-2">
                <span className="flex min-w-0 items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={referenceImageUrl}
                    alt="Edit reference"
                    className="h-10 w-10 shrink-0 object-cover"
                  />
                  <span className="truncate text-[10px] uppercase tracking-[0.12em] text-[color:var(--suite-slate)]">
                    Reference added
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setReferenceImageUrl(null)}
                  disabled={busy}
                  className="min-h-9 px-2 text-[9px] uppercase tracking-[0.14em] text-[color:var(--suite-slate)]"
                >
                  Remove
                </button>
              </div>
            ) : null}
            <div className="flex min-w-0 gap-2">
              <input
                ref={referenceInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0]
                  if (file) void uploadEditReference(file)
                }}
              />
              <button
                type="button"
                onClick={() => referenceInputRef.current?.click()}
                disabled={busy || referenceUploading}
                aria-label="Add a reference image"
                title="Add a reference image"
                className="h-12 w-12 shrink-0 border border-[color:var(--suite-steel)] bg-white text-[18px] font-light disabled:opacity-40"
              >
                {referenceUploading ? "…" : "+"}
              </button>
              <textarea
                ref={composerRef}
                rows={1}
                value={instruction}
                onChange={event => setInstruction(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    sendEditMessage(instruction)
                  }
                }}
                placeholder="Tell Maya exactly what to change…"
                aria-label="Tell Maya what to change"
                className="max-h-28 min-h-12 min-w-0 flex-1 resize-none border border-[color:var(--suite-steel)] bg-white px-3 py-3 text-[15px] leading-snug outline-none focus:border-[color:var(--suite-night)]"
              />
              <button
                type="button"
                onClick={() => sendEditMessage(instruction)}
                disabled={busy || chatBusy || referenceUploading || instruction.trim().length === 0}
                className="min-h-12 shrink-0 bg-[color:var(--suite-accent)] px-4 text-[9px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[color:var(--suite-night)] disabled:opacity-40 sm:px-5 sm:text-[10px]"
              >
                Apply
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[color:var(--suite-slate)]">
              Add a reference when the exact product, outfit or visual detail matters.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
