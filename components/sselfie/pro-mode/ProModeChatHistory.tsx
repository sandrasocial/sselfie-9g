"use client"

import useSWR from "swr"
import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Typography, Colors, BorderRadius, Spacing, UILabels, ButtonLabels } from '@/lib/maya/pro/design-system'
import { X } from 'lucide-react'

/**
 * ProModeChatHistory Component
 * 
 * Professional chat history for Studio Pro Mode.
 * NO icons or emojis - clean, editorial design.
 * 
 * Design principles:
 * - NO emojis in UI elements
 * - Professional typography (Hatton, Inter)
 * - Stone palette colors
 * - Minimal, editorial design
 */

interface MayaChat {
  id: number
  chat_title: string | null
  chat_summary: string | null
  chat_category: string | null
  last_activity: string
  message_count: number
  first_message?: string
}

interface ProModeChatHistoryProps {
  isOpen: boolean
  onClose: () => void
  currentChatId: number | null
  onSelectChat: (chatId: number, title?: string) => void
  onNewChat: () => void
  onDeleteChat?: (chatId: number) => void
  chatType?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ProModeChatHistory({
  isOpen,
  onClose,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  chatType,
}: ProModeChatHistoryProps) {
  const apiUrl = chatType ? `/api/maya/chats?chatType=${chatType}` : "/api/maya/chats?chatType=pro"

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
    return "New Project"
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

      await mutate()
      setShowDeleteConfirm(null)

      if (onDeleteChat) {
        onDeleteChat(chatId)
      }
    } catch (error) {
      console.error("[ProModeChatHistory] Error deleting chat:", error)
      alert("Failed to delete project. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMenuClick = (e: React.MouseEvent, chatId: number) => {
    e.stopPropagation()
    setShowMenuForChat(showMenuForChat === chatId ? null : chatId)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-hidden mx-2 sm:mx-4 p-0 flex flex-col"
          style={{
            backgroundColor: Colors.surface,
            borderColor: Colors.border,
          }}
        >
          <DialogHeader
            className="px-6 py-4 border-b"
            style={{
              borderColor: Colors.border,
            }}
          >
            <div className="flex items-center justify-between">
              <DialogTitle
                style={{
                  fontFamily: Typography.headers.fontFamily,
                  fontSize: Typography.headers.sizes.lg,
                  fontWeight: Typography.headers.weights.medium,
                  color: Colors.textPrimary,
                }}
              >
                Project History
              </DialogTitle>
              <div className="flex items-center gap-3">
                <button
                  onClick={onNewChat}
                  className="touch-manipulation active:scale-95"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.surface,
                    backgroundColor: Colors.primary,
                    padding: '8px 16px',
                    minHeight: '36px',
                    borderRadius: BorderRadius.buttonSm,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = Colors.accent
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = Colors.primary
                  }}
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
              <p
                style={{
                  fontFamily: Typography.body.fontFamily,
                  fontSize: Typography.body.sizes.sm,
                  fontWeight: Typography.body.weights.light,
                  color: Colors.textSecondary,
                  marginTop: Spacing.element,
                }}
              >
                {chats.length} project{chats.length !== 1 ? 's' : ''}
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: Typography.body.sizes.md,
                    color: Colors.textTertiary,
                  }}
                >
                  Loading project history...
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: Typography.body.sizes.md,
                    color: Colors.error || '#dc2626',
                  }}
                >
                  Failed to load project history
                </p>
                <button
                  onClick={() => mutate()}
                  className="touch-manipulation active:scale-95 mt-4"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.primary,
                    backgroundColor: 'transparent',
                    border: `1px solid ${Colors.border}`,
                    padding: '8px 16px',
                    borderRadius: BorderRadius.buttonSm,
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-12">
                <p
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: Typography.body.sizes.md,
                    fontWeight: Typography.body.weights.light,
                    color: Colors.textTertiary,
                    marginBottom: Spacing.section,
                  }}
                >
                  No projects yet
                </p>
                <button
                  onClick={onNewChat}
                  className="touch-manipulation active:scale-95"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.md,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.surface,
                    backgroundColor: Colors.primary,
                    padding: '12px 24px',
                    borderRadius: BorderRadius.button,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = Colors.accent
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = Colors.primary
                  }}
                >
                  Start New Project
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {chats.map((chat) => {
                  const isActive = chat.id === currentChatId
                  const displayTitle = getDisplayTitle(chat)
                  const previewText = getPreviewText(chat)

                  return (
                    <div key={chat.id} className="relative">
                      <div
                        onClick={() => {
                          onSelectChat(chat.id, displayTitle)
                          onClose()
                        }}
                        className="touch-manipulation active:scale-[0.98] cursor-pointer"
                        style={{
                          padding: Spacing.card,
                          borderRadius: BorderRadius.card,
                          border: `1px solid ${isActive ? Colors.primary : Colors.border}`,
                          backgroundColor: isActive ? Colors.backgroundAlt : Colors.surface,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.borderColor = Colors.primary
                            e.currentTarget.style.backgroundColor = Colors.hover
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.borderColor = Colors.border
                            e.currentTarget.style.backgroundColor = Colors.surface
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4
                            style={{
                              fontFamily: Typography.subheaders.fontFamily,
                              fontSize: Typography.subheaders.sizes.md,
                              fontWeight: Typography.subheaders.weights.regular,
                              color: Colors.textPrimary,
                              lineHeight: Typography.subheaders.lineHeight,
                              flex: 1,
                            }}
                          >
                            {displayTitle}
                          </h4>
                          {onDeleteChat && (
                            <button
                              onClick={(e) => handleMenuClick(e, chat.id)}
                              className="touch-manipulation active:scale-95 p-2 rounded-lg transition-colors hover:bg-stone-100"
                              style={{
                                color: Colors.textSecondary,
                                minWidth: '32px',
                                minHeight: '32px',
                              }}
                              aria-label="Project options"
                            >
                              <span style={{ fontSize: '12px' }}>⋯</span>
                            </button>
                          )}
                        </div>

                        {previewText && (
                          <p
                            style={{
                              fontFamily: Typography.body.fontFamily,
                              fontSize: Typography.body.sizes.sm,
                              fontWeight: Typography.body.weights.light,
                              color: Colors.textSecondary,
                              lineHeight: Typography.body.lineHeight,
                              marginBottom: Spacing.element,
                            }}
                          >
                            {previewText}
                          </p>
                        )}

                        <div className="flex items-center gap-4">
                          <span
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.xs,
                              color: Colors.textTertiary,
                            }}
                          >
                            {formatTimeAgo(chat.last_activity)}
                          </span>
                          {chat.message_count > 0 && (
                            <span
                              style={{
                                fontFamily: Typography.ui.fontFamily,
                                fontSize: Typography.ui.sizes.xs,
                                color: Colors.textTertiary,
                              }}
                            >
                              {chat.message_count} message{chat.message_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu Dropdown */}
                      {showMenuForChat === chat.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-2xl border z-20 min-w-[160px]"
                          style={{
                            borderColor: Colors.border,
                            padding: '4px',
                          }}
                        >
                          {onDeleteChat && (
                            <button
                              onClick={(e) => handleDeleteClick(e, chat.id)}
                              className="touch-manipulation active:scale-95 w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-red-50 rounded"
                              style={{
                                fontFamily: Typography.ui.fontFamily,
                                fontSize: Typography.ui.sizes.sm,
                                color: '#dc2626',
                              }}
                            >
                              Delete Project
                            </button>
                          )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent
            className="max-w-md"
            style={{
              backgroundColor: Colors.surface,
              borderColor: Colors.border,
            }}
          >
            <DialogHeader>
              <DialogTitle
                style={{
                  fontFamily: Typography.headers.fontFamily,
                  fontSize: Typography.headers.sizes.md,
                  fontWeight: Typography.headers.weights.medium,
                  color: Colors.textPrimary,
                }}
              >
                Delete Project?
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p
                style={{
                  fontFamily: Typography.body.fontFamily,
                  fontSize: Typography.body.sizes.md,
                  fontWeight: Typography.body.weights.regular,
                  color: Colors.textSecondary,
                  lineHeight: Typography.body.lineHeight,
                }}
              >
                Are you sure you want to delete this project? This action cannot be undone.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="touch-manipulation active:scale-95"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.primary,
                    backgroundColor: 'transparent',
                    padding: '10px 20px',
                    minHeight: '44px',
                    borderRadius: BorderRadius.button,
                    border: `1px solid ${Colors.border}`,
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => showDeleteConfirm && handleDeleteConfirm(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="touch-manipulation active:scale-95 disabled:active:scale-100"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.sm,
                    fontWeight: Typography.ui.weights.medium,
                    color: Colors.surface,
                    backgroundColor: isDeleting ? Colors.border : '#dc2626',
                    padding: '10px 20px',
                    minHeight: '44px',
                    borderRadius: BorderRadius.button,
                    border: 'none',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    flex: 1,
                    opacity: isDeleting ? 0.7 : 1,
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
