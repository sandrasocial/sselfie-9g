"use client"

import { MessageSquare, Clock, ChevronRight, Aperture } from "lucide-react"
import useSWR from "swr"
import UnifiedLoading from "./unified-loading"

interface MayaChat {
  id: number
  chat_title: string | null
  chat_summary: string | null
  chat_category: string | null
  last_activity: string
  message_count: number
  first_message?: string
}

interface MayaChatHistoryProps {
  currentChatId: number | null
  onSelectChat: (chatId: number) => void
  onNewChat: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MayaChatHistory({ currentChatId, onSelectChat, onNewChat }: MayaChatHistoryProps) {
  const { data, error, isLoading } = useSWR<{ chats: MayaChat[] }>("/api/maya/chats", fetcher, {
    refreshInterval: 30000,
  })

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

  const getDisplayTitle = (chat: MayaChat) => {
    if (chat.chat_title) return chat.chat_title
    if (chat.first_message) {
      const truncated = chat.first_message.slice(0, 50)
      return truncated.length < chat.first_message.length ? `${truncated}...` : truncated
    }
    return "New Conversation"
  }

  const getPreviewText = (chat: MayaChat) => {
    if (chat.chat_summary) return chat.chat_summary
    if (chat.first_message && chat.first_message.length > 50) {
      return chat.first_message.slice(0, 80) + "..."
    }
    return null
  }

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null

    const categoryColors: Record<string, string> = {
      portrait: "bg-purple-100 text-purple-700 border-purple-200",
      lifestyle: "bg-blue-100 text-blue-700 border-blue-200",
      editorial: "bg-pink-100 text-pink-700 border-pink-200",
      creative: "bg-amber-100 text-amber-700 border-amber-200",
      default: "bg-stone-100 text-stone-700 border-stone-200",
    }

    const colorClass = categoryColors[category.toLowerCase()] || categoryColors.default

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-light border ${colorClass}`}
      >
        <Aperture size={10} strokeWidth={1.5} />
        {category}
      </span>
    )
  }

  if (isLoading) {
    return <UnifiedLoading message="Loading chat history..." />
  }

  if (error) {
    return (
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl p-4 text-center">
        <p className="text-xs font-light text-stone-500">Failed to load chat history</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-xs tracking-[0.1em] uppercase font-light text-stone-600 hover:text-stone-900 transition-colors duration-300"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200/50">
        <div>
          <h3 className="text-xs tracking-[0.15em] uppercase font-light text-stone-600 mb-1">Chat History</h3>
          <p className="text-[10px] font-light text-stone-400">{chats.length} conversations with Maya</p>
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
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl p-8 text-center">
          <MessageSquare size={32} className="text-stone-400 mx-auto mb-4" strokeWidth={1.5} />
          <h4 className="text-sm font-light text-stone-900 mb-2">No conversations yet</h4>
          <p className="text-xs font-light text-stone-500 mb-4 max-w-[200px] mx-auto">
            Start chatting with Maya to create your first photo concepts
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
            const previewText = getPreviewText(chat)

            return (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group w-full text-left p-4 rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${
                  isActive
                    ? "bg-stone-900 text-white shadow-xl shadow-stone-900/30 ring-2 ring-stone-900 ring-offset-2"
                    : "bg-white/40 backdrop-blur-2xl border border-white/60 hover:bg-white/60 hover:border-white/80 hover:shadow-lg shadow-stone-900/5"
                }`}
                aria-label={`Load chat: ${displayTitle}`}
                aria-current={isActive ? "true" : undefined}
              >
                {chat.chat_category && (
                  <div className="mb-2">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase font-light border bg-white/20 text-white border-white/30">
                        <Aperture size={10} strokeWidth={1.5} />
                        {chat.chat_category}
                      </span>
                    ) : (
                      getCategoryBadge(chat.chat_category)
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

                {previewText && (
                  <p
                    className={`text-xs font-light leading-relaxed mb-3 line-clamp-2 ${
                      isActive ? "text-white/80" : "text-stone-600"
                    }`}
                  >
                    {previewText}
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
