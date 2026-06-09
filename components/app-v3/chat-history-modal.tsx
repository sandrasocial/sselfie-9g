"use client"

// SSELFIE Studio 3.0 — chat history (MAYA-REBUILD-05 Phase C).
// Lists the admin's saved conversations, with select + soft-delete. New Chat lives in the
// concierge header. Loads from /api/app-v3/maya/chats.

import { useEffect, useState } from "react"

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

export function ChatHistoryModal({ open, currentChatId, onClose, onSelect }: ChatHistoryModalProps) {
  const [chats, setChats] = useState<ChatListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setChats(null)
    setError(null)
    fetch("/api/app-v3/maya/chats")
      .then((r) => r.json())
      .then((d) => setChats(Array.isArray(d?.chats) ? d.chats : []))
      .catch(() => setError("Couldn't load your chats."))
  }, [open])

  async function remove(id: string) {
    setBusy(true)
    try {
      await fetch(`/api/app-v3/maya/chats/${id}`, { method: "DELETE" })
      setChats((c) => (c ? c.filter((x) => x.id !== id) : c))
    } catch {
      /* leave the row; user can retry */
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0D0E10]/40 p-6 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none">
      <div className="w-full max-w-md rounded-[10px] bg-[#F8FAFA] p-6 shadow-xl animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">History</p>
            <h3 className="mt-2 font-serif text-[22px] font-light leading-tight text-[#0D0E10]">Your chats</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Close
          </button>
        </div>

        <div className="mt-5">
          {chats === null && !error && <p className="text-[13px] text-[#818283]">Loading…</p>}
          {error && <p className="text-[13px] text-[#282728]">{error}</p>}
          {chats && chats.length === 0 && (
            <p className="text-[13px] text-[#818283]">No saved chats yet. Start one and it'll show up here.</p>
          )}
          {chats && chats.length > 0 && (
            <ul className="max-h-[55vh] divide-y divide-[#C5C6C8]/40 overflow-y-auto">
              {chats.map((c) => {
                const isCurrent = c.id === currentChatId
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <button type="button" onClick={() => onSelect(c.id)} className="min-w-0 flex-1 text-left">
                      <p className={`truncate text-[14px] ${isCurrent ? "text-[#0D0E10]" : "text-[#282728]"}`}>
                        {c.title?.trim() || "Untitled chat"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#818283]">
                        {formatWhen(c.updatedAt)}
                        {isCurrent ? " · current" : ""}
                      </p>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(c.id)}
                      className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[#818283] hover:text-[#282728] disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
