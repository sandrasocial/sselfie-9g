"use client"

import { MessageSquare, Clock, ChevronRight, Aperture, Trash2, MoreVertical, X } from "lucide-react"
import useSWR from "swr"
import { useState, useEffect, useRef } from "react"
import UnifiedLoading from "./unified-loading"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  isOpen: boolean
  onClose: () => void
  currentChatId: number | null
  onSelectChat: (chatId: number, title?: string) => void
  onNewChat: () => void
  onDeleteChat?: (chatId: number) => void
  chatType?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MayaChatHistory({
  isOpen,
  onClose,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  chatType,
}: MayaChatHistoryProps) {
  const apiUrl = chatType ? `/api/maya/chats?chatType=${chatType}` : "/api/maya/chats?chatType=maya"

  const { data, error, isLoading, mutate } = useSWR<{ chats: MayaChat[] }>(
    isOpen ? apiUrl : null,
    fetcher,
    {
      refreshInterval: 30000,
    }
  )

  const chats = data?.chats || []
  const [showMenuForChat, setShowMenuForChat] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Debug: Log if onDeleteChat is available
  useEffect(() => {
    console.log("[MayaChatHistory] Component mounted", { onDeleteChat: !!onDeleteChat, chatsCount: chats.length })
    if (onDeleteChat) {
      console.log("[MayaChatHistory] ✅ Delete functionality ENABLED - button should be visible")
    } else {
      console.warn("[MayaChatHistory] ❌ Delete functionality NOT available - onDeleteChat prop missing")
    }
  }, [onDeleteChat, chats.length])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuForChat(null)
      }
    }

    if (showMenuForChat !== null) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMenuForChat])

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

  const handleDeleteClick = (e: React.MouseEvent, chatId: number) => {
    e.stopPropagation()
    setShowMenuForChat(null)
    setShowDeleteConfirm(chatId)
  }

  const handleDeleteConfirm = async (chatId: number) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/maya/delete-chat?chatId=${chatId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete chat")
      }

      // Optimistic UI update - remove from list immediately
      await mutate()
      setShowDeleteConfirm(null)

      // Call parent handler if provided
      if (onDeleteChat) {
        onDeleteChat(chatId)
      }
    } catch (error) {
      console.error("[v0] Error deleting chat:", error)
      alert("Failed to delete chat. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMenuClick = (e: React.MouseEvent, chatId: number) => {
    e.stopPropagation()
    setShowMenuForChat(showMenuForChat === chatId ? null : chatId)
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-hidden mx-2 sm:mx-4 p-0 flex flex-col bg-white border-stone-200"
      >
        <DialogHeader className="px-6 py-4 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-serif font-normal text-stone-950 uppercase tracking-wide">
              Project History
            </DialogTitle>
            <div className="flex items-center gap-3">
              <button
                onClick={onNewChat}
                className="touch-manipulation active:scale-95 px-3 py-1.5 bg-stone-900 text-white text-[10px] tracking-[0.1em] uppercase font-light rounded-lg hover:bg-stone-800 transition-all duration-300"
                aria-label="Start new project"
              >
                New Project
              </button>
              <button
                onClick={onClose}
                className="touch-manipulation active:scale-95 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close"
              >
                <X size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>
          </div>
          {chats.length > 0 && (
            <p className="text-xs font-light text-stone-500 mt-2">
              {chats.length} project{chats.length !== 1 ? 's' : ''}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm font-light text-stone-500">Loading chat history...</p>
            </div>
          ) : error ? (
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl p-4 text-center">
              <p className="text-xs font-light text-stone-500">Failed to load chat history</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-xs tracking-[0.1em] uppercase font-light text-stone-600 hover:text-stone-900 transition-colors duration-300"
              >
                Retry
              </button>
            </div>
          ) : chats.length === 0 ? (
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
            <div className="space-y-2">
          {chats.map((chat) => {
            const isActive = chat.id === currentChatId
            const displayTitle = getDisplayTitle(chat)
            const previewText = getPreviewText(chat)

            return (
              <div key={chat.id} className="relative group">
                <div
                  onClick={() => onSelectChat(chat.id, displayTitle)}
                  className={`group w-full text-left p-4 rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                    isActive
                      ? "bg-stone-900 text-white shadow-xl shadow-stone-900/30 ring-2 ring-stone-900 ring-offset-2"
                      : "bg-white/40 backdrop-blur-2xl border border-white/60 hover:bg-white/60 hover:border-white/80 hover:shadow-lg shadow-stone-900/5"
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelectChat(chat.id, displayTitle)
                    }
                  }}
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
                    <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: "60px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          console.log("[MayaChatHistory] Menu button clicked for chat:", chat.id, "onDeleteChat:", !!onDeleteChat)
                          if (onDeleteChat) {
                            handleMenuClick(e, chat.id)
                          } else {
                            console.warn("[MayaChatHistory] Delete handler not available!")
                          }
                        }}
                        className={`p-2 rounded-lg transition-all relative z-10 ${
                          isActive
                            ? "hover:bg-white/20 text-white hover:text-white bg-white/10"
                            : "text-stone-700 hover:bg-stone-200 hover:text-stone-900 bg-stone-100"
                        }`}
                        aria-label="Chat options"
                        title={onDeleteChat ? "Delete chat" : "Chat options (delete not available)"}
                        type="button"
                        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <MoreVertical size={18} strokeWidth={2.5} />
                      </button>
                      <ChevronRight
                        size={16}
                        className={`flex-shrink-0 transition-transform duration-300 ${
                          isActive ? "text-white translate-x-0.5" : "text-stone-400 group-hover:translate-x-0.5"
                        }`}
                        strokeWidth={1.5}
                      />
                    </div>
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
                </div>

                {/* Menu Dropdown */}
                {showMenuForChat === chat.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-2 top-12 bg-white rounded-xl shadow-2xl border border-stone-200 py-2 w-48 z-20"
                  >
                    {onDeleteChat ? (
                      <button
                        onClick={(e) => handleDeleteClick(e, chat.id)}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                        Delete Chat
                      </button>
                    ) : (
                      <div className="px-4 py-2.5 text-sm text-stone-500">
                        Delete not available
                      </div>
                    )}
                  </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm === chat.id && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 max-w-md w-full">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-stone-950">Delete Conversation?</h3>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
                          aria-label="Close"
                        >
                          <X size={20} className="text-stone-600" strokeWidth={1.5} />
                        </button>
                      </div>
                      <p className="text-sm text-stone-600 mb-6">
                        Are you sure you want to delete this conversation? This action cannot be undone.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="flex-1 px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-sm font-medium"
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(chat.id)}
                          disabled={isDeleting}
                          className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
