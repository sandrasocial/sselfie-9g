"use client"

import { useEffect, useMemo, useState } from "react"

type Conversation = {
  id: number
  ig_user_id: string
  username: string | null
  full_name: string | null
  profile_pic_url: string | null
  is_icelandic: boolean
  is_verified_friend: boolean
  tags: string[] | null
  notes: string | null
  status: string
  flag_reason: string | null
  agent_confidence: string | number | null
  draft_response: string | null
  latest_message: string | null
  latest_from_type: string | null
  last_message_at: string | null
}

type Message = {
  id: number
  from_type: string
  content: string
  ai_generated: boolean
  ai_confidence: string | number | null
  ai_intent: string | null
  growth_tags: string[] | null
  send_status: string
  sent_at: string
}

type InboxPayload = {
  conversations: Conversation[]
  selectedConversationId: number | null
  messages: Message[]
  ingestion?: {
    bridgeConfigured: boolean
    totalConversations: number
    manychatConversations: number
    latestReceivedAt: string | null
    latestManychatReceivedAt: string | null
  }
}

function formatTime(value?: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function IgInboxClient({ mobile = false }: { mobile?: boolean }) {
  const [status, setStatus] = useState(mobile ? "flagged" : "flagged")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [data, setData] = useState<InboxPayload>({ conversations: [], selectedConversationId: null, messages: [] })
  const [reply, setReply] = useState("")
  const [loading, setLoading] = useState(true)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function load(conversationId = selectedId) {
    setLoading(true)
    const params = new URLSearchParams({ status, limit: mobile ? "20" : "40" })
    if (conversationId) params.set("conversation", String(conversationId))
    const response = await fetch(`/api/admin/ig-inbox?${params.toString()}`)
    if (response.ok) {
      const payload = await response.json()
      setData(payload)
      setSelectedId(payload.selectedConversationId)
    }
    setLoading(false)
  }

  useEffect(() => {
    load(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const selected = useMemo(
    () => data.conversations.find((conversation) => conversation.id === selectedId) || data.conversations[0] || null,
    [data.conversations, selectedId],
  )

  async function action(actionName: string, extra: Record<string, unknown> = {}) {
    if (!selectedId) return
    await fetch("/api/admin/ig-inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selectedId, action: actionName, ...extra }),
    })
    await load(selectedId)
  }

  async function sendReply() {
    if (!selectedId || !reply.trim()) return
    setSending(true)
    setSendError(null)
    try {
      const response = await fetch(`/api/admin/ig-inbox/${selectedId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      })
      const payload = await response.json().catch(() => null) as {
        success?: boolean
        error?: string | null
        result?: { reason?: string }
      } | null

      if (!response.ok || !payload?.success) {
        setSendError(payload?.error || payload?.result?.reason || "Reply was not sent.")
        await load(selectedId)
        return
      }

      setReply("")
      await load(selectedId)
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Reply was not sent.")
    } finally {
      setSending(false)
    }
  }

  const shell = mobile
    ? "min-h-screen bg-[#F5F5F5] text-[#0A0A0A]"
    : "min-h-screen bg-[#F8FAFA] text-[#0D0E10]"
  const panel = mobile
    ? "border border-[#E5E5E5] bg-white"
    : "border border-[#C5C6C8]/40 bg-white"

  return (
    <main className={shell}>
      <div className={mobile ? "mx-auto max-w-xl px-4 py-6" : "mx-auto max-w-7xl px-6 py-8"}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.28em] opacity-60">SSELFIE IG Agent</p>
            <h1 className="font-serif text-4xl font-light uppercase leading-none">{mobile ? "My Inbox" : "Instagram Inbox"}</h1>
          </div>
          <div className="flex gap-2">
            {["flagged", "pending", "auto_handled", "all"].map((item) => (
              <button
                key={item}
                onClick={() => setStatus(item)}
                className={`min-h-10 border px-3 text-[10px] uppercase tracking-[0.18em] ${
                  status === item
                    ? mobile ? "border-[#0A0A0A] bg-[#0A0A0A] text-white" : "border-[#0D0E10] bg-[#0D0E10] text-white"
                    : mobile ? "border-[#E5E5E5] text-[#666666]" : "border-[#C5C6C8]/50 text-[#4F5052]"
                }`}
              >
                {item === "auto_handled" ? "handled" : item}
              </button>
            ))}
          </div>
        </div>

        <div className={`${panel} mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs`}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">DM bridge</p>
            <p className="mt-1">
              {data.ingestion?.bridgeConfigured ? "ManyChat bridge is configured" : "ManyChat bridge secret is missing"}
              {" · "}
              {data.ingestion?.manychatConversations || 0} ManyChat conversations stored
            </p>
          </div>
          <p className="opacity-60">
            Last inbound: {formatTime(data.ingestion?.latestManychatReceivedAt || data.ingestion?.latestReceivedAt) || "waiting for live DM"}
          </p>
        </div>

        {loading ? (
          <div className={`${panel} p-8 text-sm opacity-70`}>Loading inbox...</div>
        ) : data.conversations.length === 0 ? (
          <div className={`${panel} p-8`}>
            <p className="font-serif text-3xl font-light">No live DMs in the inbox yet</p>
            <p className="mt-3 text-sm opacity-70">
              The inbox only fills when ManyChat sends a real inbound message to the bridge. If your test DM does not appear after refresh,
              check the ManyChat Default Reply external request.
            </p>
          </div>
        ) : (
          <div className={mobile ? "space-y-4" : "grid grid-cols-[320px_minmax(0,1fr)_300px] gap-4"}>
            <section className={`${panel} ${mobile ? "divide-y divide-[#E5E5E5]" : "divide-y divide-[#C5C6C8]/30"}`}>
              {data.conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => {
                    setSelectedId(conversation.id)
                    load(conversation.id)
                  }}
                  className={`block w-full p-4 text-left ${selectedId === conversation.id ? mobile ? "bg-[#F5F5F5]" : "bg-[#F8FAFA]" : ""}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-medium">@{conversation.username || conversation.ig_user_id || "unknown"}</span>
                    <span className="text-[10px] uppercase tracking-[0.14em] opacity-60">{conversation.status}</span>
                  </div>
                  <p className="line-clamp-2 text-sm opacity-70">{conversation.latest_message}</p>
                  <p className="mt-2 text-xs opacity-50">{conversation.is_icelandic ? "Icelandic contact · " : ""}{formatTime(conversation.last_message_at)}</p>
                </button>
              ))}
            </section>

            <section className={`${panel} p-4`}>
              {selected ? (
                <>
                  <div className="mb-4 border-b border-current/10 pb-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">{selected.flag_reason || selected.status}</p>
                    <h2 className="mt-2 font-serif text-3xl font-light">@{selected.username || "unknown"}</h2>
                  </div>
                  <div className="max-h-[58vh] space-y-3 overflow-auto pr-1">
                    {data.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[88%] p-3 text-sm leading-relaxed ${
                          message.from_type === "contact"
                            ? mobile ? "bg-[#F5F5F5]" : "bg-[#F8FAFA]"
                            : "ml-auto bg-[#282728] text-white"
                        }`}
                      >
                        <p className="mb-2 text-[10px] uppercase tracking-[0.16em] opacity-60">{message.from_type}{message.send_status === "draft" ? " draft" : ""}</p>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder={process.env.NEXT_PUBLIC_IG_AGENT_AUTO_SEND_ENABLED === "true" ? "Reply as Sandra..." : "Draft a reply... auto-send is off"}
                      className={`min-h-28 w-full resize-none border bg-transparent p-3 text-sm outline-none ${mobile ? "border-[#E5E5E5]" : "border-[#C5C6C8]/50"}`}
                    />
                    {sendError ? (
                      <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
                        Reply not sent: {sendError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                      type="button"
                      onClick={() => {
                        const draft = [...data.messages].reverse().find((m) => m.send_status === "draft" && m.ai_generated)
                        if (draft) setReply(draft.content)
                      }}
                      className="min-h-11 border border-[#C5C6C8] px-4 text-[11px] uppercase tracking-[0.18em]"
                    >Use AI draft</button>
                    <button
                      onClick={sendReply}
                      disabled={sending}
                      className="min-h-11 bg-[#0D0E10] px-4 text-[11px] uppercase tracking-[0.18em] text-white disabled:opacity-50"
                    >
                      {sending ? "Sending..." : "Send reply"}
                    </button>
                      <button onClick={() => action("mark_handled")} className="min-h-11 border border-current/20 px-4 text-[11px] uppercase tracking-[0.18em]">Handled</button>
                      <button onClick={() => action("snooze")} className="min-h-11 border border-current/20 px-4 text-[11px] uppercase tracking-[0.18em]">Snooze</button>
                    </div>
                  </div>
                </>
              ) : null}
            </section>

            {!mobile && selected ? (
              <aside className={`${panel} p-4`}>
                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] opacity-60">Contact</p>
                <p className="font-medium">@{selected.username || "unknown"}</p>
                <p className="mt-1 text-sm opacity-70">{selected.full_name || "No name yet"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(selected.tags || []).map((tag) => (
                    <span key={tag} className="border border-current/15 px-2 py-1 text-[10px] uppercase tracking-[0.14em]">{tag}</span>
                  ))}
                </div>
                <div className="mt-5 space-y-2">
                  {["friend", "family", "vip", "blocked"].map((tag) => (
                    <button key={tag} onClick={() => action("tag_contact", { tag })} className="mr-2 border border-current/20 px-3 py-2 text-[10px] uppercase tracking-[0.14em]">
                      Add {tag}
                    </button>
                  ))}
                </div>
                <p className="mt-5 text-sm leading-relaxed opacity-70">{selected.notes || "No private notes yet."}</p>
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </main>
  )
}
