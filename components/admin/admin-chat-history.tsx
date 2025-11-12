"use client"

import { MessageSquare, Clock, ChevronRight, Briefcase } from "lucide-react"
import useSWR from "swr"

interface AdminChat {
  id: number
  chat_title: string | null
  chat_summary: string | null
  agent_mode: string | null
  last_activity: string
  message_count: number
}

interface AdminChatHistoryProps {
  currentChatId: number | null
  onSelectChat: (chatId: number) => void
  onNewChat: () => void
  userId: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminChatHistory({ currentChatId, onSelectChat, onNewChat, userId }: AdminChatHistoryProps) {
  const { data, error, isLoading } = useSWR<{ chats: AdminChat[] }>(
    `/api/admin/agent/chats?userId=${userId}`,
    fetcher,
    {
      refreshInterval: 30000,
    },
  )

  const chats = data?.chats || []

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getDisplayTitle = (chat: AdminChat) => {
    if (chat.chat_title) return chat.chat_title
    return "New Conversation"
  }

  const getModeBadge = (mode: string | null) => {
    if (!mode) return null

    const modeColors: Record<string, string> = {
      content: "bg-purple-100 text-purple-700 border-purple-200",
      email: "bg-blue-100 text-blue-700 border-blue-200",
      research: "bg-amber-100 text-amber-700 border-amber-200",
    }

    const modeLabels: Record<string, string> = {
      content: "Content",
      email: "Email",
      research: "Research",
    }

    const colorClass = modeColors[mode.toLowerCase()] || "bg-stone-100 text-stone-700 border-stone-200"
    const label = modeLabels[mode.toLowerCase()] || mode

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-light border ${colorClass}`}
      >
        <Briefcase size={10} strokeWidth={1.5} />
        {label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-4 text-center border border-stone-200">
        <p className="text-xs font-light text-stone-500">Loading chat history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-4 text-center border border-stone-200">
        <p className="text-xs font-light text-stone-500">Failed to load chat history</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-xs tracking-[0.1em] uppercase font-light text-stone-600 hover:text-stone-900 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200">
        <div>
          <h3 className="text-xs tracking-[0.15em] uppercase font-light text-stone-600 mb-1">Chat History</h3>
          <p className="text-[10px] font-light text-stone-400">{chats.length} admin conversations</p>
        </div>
        <button
          onClick={onNewChat}
          className="px-3 py-1.5 bg-stone-900 text-white text-[10px] tracking-[0.1em] uppercase font-light rounded-lg hover:bg-stone-800 transition-all duration-300 hover:scale-105 active:scale-95"
          aria-label="Start new conversation"
        >
          New Chat
        </button>
      </div>

      {chats.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-stone-200">
          <MessageSquare size={32} className="text-stone-400 mx-auto mb-4" strokeWidth={1.5} />
          <h4 className="text-sm font-light text-stone-900 mb-2">No conversations yet</h4>
          <p className="text-xs font-light text-stone-500 mb-4 max-w-[200px] mx-auto">
            Start chatting with your admin agents to manage content, emails, and research
          </p>
          <button
            onClick={onNewChat}
            className="px-4 py-2 bg-stone-900 text-white text-xs tracking-[0.1em] uppercase font-light rounded-lg hover:bg-stone-800 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Start Conversation
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent">
          {chats.map((chat) => {
            const isActive = chat.id === currentChatId
            const displayTitle = getDisplayTitle(chat)

            return (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group w-full text-left p-4 rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${
                  isActive
                    ? "bg-stone-900 text-white shadow-xl shadow-stone-900/30 ring-2 ring-stone-900 ring-offset-2"
                    : "bg-white border border-stone-200 hover:bg-stone-50 hover:border-stone-300 hover:shadow-lg shadow-stone-900/5"
                }`}
                aria-label={`Load chat: ${displayTitle}`}
                aria-current={isActive ? "true" : undefined}
              >
                {chat.agent_mode && (
                  <div className="mb-2">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-light border bg-white/20 text-white border-white/30">
                        <Briefcase size={10} strokeWidth={1.5} />
                        {chat.agent_mode}
                      </span>
                    ) : (
                      getModeBadge(chat.agent_mode)
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4
                    className={`text-sm font-normal leading-snug flex-1 min-w-0 ${
                      isActive ? "text-white" : "text-stone-900"
                    }`}
                  >
                    {displayTitle}
                  </h4>
                  <ChevronRight
                    size={16}
                    className={`flex-shrink-0 transition-transform duration-300 ${
                      isActive ? "text-white translate-x-0.5" : "text-stone-400 group-hover:translate-x-0.5"
                    }`}
                    strokeWidth={1.5}
                  />
                </div>

                {chat.chat_summary && (
                  <p
                    className={`text-xs font-light leading-relaxed mb-3 line-clamp-2 ${
                      isActive ? "text-white/80" : "text-stone-600"
                    }`}
                  >
                    {chat.chat_summary}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs font-light">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className={isActive ? "text-white/70" : "text-stone-400"} strokeWidth={1.5} />
                    <span className={isActive ? "text-white/70" : "text-stone-500"}>
                      {formatTimeAgo(chat.last_activity)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare
                      size={12}
                      className={isActive ? "text-white/70" : "text-stone-400"}
                      strokeWidth={1.5}
                    />
                    <span className={isActive ? "text-white/70" : "text-stone-500"}>{chat.message_count || 0}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
