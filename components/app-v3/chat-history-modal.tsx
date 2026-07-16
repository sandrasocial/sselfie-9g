"use client"

// SSELFIE Studio 3.0 - chat history (MAYA-REBUILD-05 Phase C).
// Lists the admin's saved conversations, with select + soft-delete. New Chat lives in the
// concierge header. Loads from /api/app-v3/maya/chats.

import { useEffect, useState } from "react"
import { useAccessibleModal } from "./use-accessible-modal"

const CHAT_PAGE_SIZE = 20

interface ChatListItem {
  id: string
  title: string | null
  updatedAt: string
}

interface ChatHistoryModalProps {
  open: boolean
  currentChatId: string
  onClose: () => void
  onSelect: (id: string) => void
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

  useEffect(() => {
    if (!open) return
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
  }, [open])

  async function remove(id: string) {
    setBusyId(id)
    setError(null)
    try {
      const response = await fetch(`/api/app-v3/maya/chats/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error(`Delete returned ${response.status}`)
      setChats(c => (c ? c.filter(x => x.id !== id) : c))
      setPendingDeleteId(null)
    } catch {
      setError("Couldn't delete that chat. Please try again.")
    } finally {
      setBusyId(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0D0E10]/40 p-3 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-history-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[10px] bg-[#F8FAFA] p-4 shadow-xl animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none sm:p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">History</p>
            <h3 id="chat-history-title" className="mt-2 font-serif text-[22px] font-light leading-tight text-[#0D0E10]">
              Your chats
            </h3>
            <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-[#818283]">
              Opening a past chat restores the conversation. Finished files stay in Photos.
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
          {chats === null && !error && <p className="text-[13px] text-[#818283]">Loading…</p>}
          {error && <p role="alert" className="mb-3 text-[13px] text-[#282728]">{error}</p>}
          {chats && chats.length === 0 && (
            <p className="text-[13px] text-[#818283]">
              No saved chats yet. Start one and it&apos;ll show up here.
            </p>
          )}
          {chats && chats.length > 0 && (
            <ul className="max-h-[55vh] divide-y divide-[#C5C6C8]/40 overflow-y-auto">
              {chats.slice(0, visibleChatCount).map(c => {
                const isCurrent = c.id === currentChatId
                const title = c.title?.trim() || "Untitled chat"
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      aria-current={isCurrent ? "true" : undefined}
                      className="min-h-11 min-w-0 flex-1 text-left"
                    >
                      <p
                        className={`truncate text-[14px] ${isCurrent ? "text-[#0D0E10]" : "text-[#282728]"}`}
                      >
                        {title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#818283]">
                        {formatWhen(c.updatedAt)}
                        {isCurrent ? " · current" : ""}
                      </p>
                    </button>
                    {pendingDeleteId === c.id ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => void remove(c.id)}
                          aria-label={`Confirm delete ${title}`}
                          className="inline-flex min-h-11 items-center px-2 text-[10px] uppercase tracking-[0.12em] text-[#0D0E10] disabled:opacity-40"
                        >
                          {busyId === c.id ? "Deleting…" : "Confirm delete"}
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
                        aria-label={`Delete ${title}`}
                        className="inline-flex min-h-11 shrink-0 items-center px-2 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:text-[#282728] disabled:opacity-40"
                      >
                        Delete
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
              Show older chats
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
