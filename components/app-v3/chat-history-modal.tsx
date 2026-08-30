"use client"

// SSELFIE Studio 3.0 - chat history (MAYA-REBUILD-05 Phase C).
// Presents existing saved conversations as resumable post projects. Archive stays the same
// reversible server-side soft delete; no member chat data is migrated or rewritten.

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useAccessibleModal } from "./use-accessible-modal"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

const CHAT_PAGE_SIZE = 20

interface ChatListItem {
  id: string
  title: string | null
  updatedAt: string
  taskStatus?: "planning" | "creating" | "ready"
  thumbnailUrl?: string | null
  outputCount?: number
}

interface ChatHistoryModalProps {
  open: boolean
  currentChatId: string
  onClose: () => void
  onSelect: (id: string) => Promise<void>
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

export function ChatHistoryModal({
  open,
  currentChatId,
  onClose,
  onSelect,
}: ChatHistoryModalProps) {
  const [chats, setChats] = useState<ChatListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [visibleChatCount, setVisibleChatCount] = useState(CHAT_PAGE_SIZE)
  const { dialogRef, initialFocusRef } = useAccessibleModal(open, onClose)

  const loadChats = useCallback(() => {
    setChats(null)
    setError(null)
    setPendingDeleteId(null)
    setVisibleChatCount(CHAT_PAGE_SIZE)
    fetch("/api/app-v3/maya/chats")
      .then(r => {
        if (!r.ok) throw new Error(`Chat history returned ${r.status}`)
        return r.json()
      })
      .then(d => setChats(Array.isArray(d?.chats) ? d.chats : []))
      .catch(() => setError("Couldn't load your chats."))
  }, [])

  useEffect(() => {
    if (!open) return
    loadChats()
    void trackAnalyticsEvent({
      event: "suite_post_project_list_opened",
      properties: { surface: "work" },
    }).catch(() => {})
  }, [loadChats, open])

  async function select(id: string) {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const project = chats?.find(chat => chat.id === id)
      await onSelect(id)
      void trackAnalyticsEvent({
        event: "suite_post_project_resumed",
        properties: {
          status: project?.taskStatus ?? "unknown",
          output_count: project?.outputCount ?? 0,
        },
      }).catch(() => {})
      onClose()
    } catch {
      setError("Couldn't open that chat. Please try again.")
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id: string) {
    setBusyId(id)
    setError(null)
    try {
      const response = await fetch(`/api/app-v3/maya/chats/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error(`Delete returned ${response.status}`)
      const project = chats?.find(chat => chat.id === id)
      setChats(c => (c ? c.filter(x => x.id !== id) : c))
      setPendingDeleteId(null)
      void trackAnalyticsEvent({
        event: "suite_post_project_archived",
        properties: { status: project?.taskStatus ?? "unknown" },
      }).catch(() => {})
    } catch {
      setError("Couldn't archive that project. Please try again.")
    } finally {
      setBusyId(null)
    }
  }

  if (!open) return null

  return (
    <div className="suite-dialog-backdrop pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center p-3 animate-in fade-in duration-200 motion-reduce:animate-none sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-history-title"
        className="suite-dialog flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden p-4 animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none sm:p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#6D6E70]">Work</p>
            <h3
              id="chat-history-title"
              className="mt-2 font-serif text-[22px] font-light leading-tight text-[#0D0E10]"
            >
              Your post projects
            </h3>
            <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-[#6D6E70]">
              Your conversation, directions, and finished versions stay together until you are ready
              to continue.
            </p>
          </div>
          <button
            ref={initialFocusRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 min-h-0 flex-1">
          {chats === null && !error && (
            <p className="suite-state suite-state--loading text-[13px] text-[#6D6E70]">
              Opening projects…
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="suite-state suite-state--error mb-3 p-3 text-[13px] text-[#282728]"
            >
              <p>{error}</p>
              {chats === null && (
                <button
                  type="button"
                  onClick={loadChats}
                  className="mt-2 inline-flex min-h-11 items-center underline underline-offset-2"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          {chats && chats.length === 0 && (
            <p className="suite-state suite-state--empty p-5 text-[13px] text-[#6D6E70]">
              No post projects yet. Start with one idea in Today and it&apos;ll show up here.
            </p>
          )}
          {chats && chats.length > 0 && (
            <ul className="max-h-[55vh] divide-y divide-[#C5C6C8]/40 overflow-y-auto">
              {chats.slice(0, visibleChatCount).map(c => {
                const isCurrent = c.id === currentChatId
                const title = c.title?.trim() || "New post project"
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <button
                      type="button"
                      onClick={() => (isCurrent ? onClose() : void select(c.id))}
                      disabled={busyId !== null}
                      aria-current={isCurrent ? "true" : undefined}
                      aria-label={`${title} · ${
                        c.taskStatus === "ready"
                          ? "Ready to use"
                          : c.taskStatus === "creating"
                            ? "Maya is creating"
                            : "Keep working"
                      }${isCurrent ? " · Open now" : ""}`}
                      className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50"
                    >
                      {c.thumbnailUrl ? (
                        <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[5px] bg-[#E7E8E8]">
                          <Image
                            src={c.thumbnailUrl}
                            alt=""
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        </span>
                      ) : (
                        <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded-[5px] bg-[#E7E8E8] text-[9px] uppercase tracking-[0.1em] text-[#6D6E70]">
                          {c.taskStatus === "ready"
                            ? "Ready"
                            : c.taskStatus === "creating"
                              ? "Making"
                              : "Idea"}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-[14px] ${isCurrent ? "text-[#0D0E10]" : "text-[#282728]"}`}
                        >
                          {title}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[#6D6E70]">
                          {formatWhen(c.updatedAt)}
                          {c.taskStatus === "creating"
                            ? " · Maya is creating"
                            : c.taskStatus === "ready"
                              ? ` · Ready to use${(c.outputCount || 0) > 1 ? ` · ${c.outputCount} versions` : ""}`
                              : " · Keep working"}
                          {isCurrent ? " · Open now" : ""}
                        </span>
                      </span>
                    </button>
                    {isCurrent ? (
                      <span className="inline-flex min-h-11 shrink-0 items-center px-2 text-[10px] uppercase tracking-[0.12em] text-[#6D6E70]">
                        Current
                      </span>
                    ) : pendingDeleteId === c.id ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => void remove(c.id)}
                          aria-label={`Confirm archive ${title}`}
                          className="inline-flex min-h-11 items-center px-2 text-[10px] uppercase tracking-[0.12em] text-[#0D0E10] disabled:opacity-40"
                        >
                          {busyId === c.id ? "Archiving…" : "Confirm archive"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="inline-flex min-h-11 items-center px-2 text-[10px] uppercase tracking-[0.12em] text-[#4F5052]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => setPendingDeleteId(c.id)}
                        aria-label={`Archive ${title}`}
                        className="inline-flex min-h-11 shrink-0 items-center px-2 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:text-[#282728] disabled:opacity-40"
                      >
                        Archive
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {chats && visibleChatCount < chats.length && (
            <button
              type="button"
              onClick={() => setVisibleChatCount(count => count + CHAT_PAGE_SIZE)}
              className="mt-3 min-h-11 w-full text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-4"
            >
              Show older projects
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
