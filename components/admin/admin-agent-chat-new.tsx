"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Send, Plus, Menu, X, Mail, CheckCircle } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface AdminAgentChatProps {
  userId: string
  userName?: string
  userEmail: string
}

export default function AdminAgentChat({ userId, userName, userEmail }: AdminAgentChatProps) {
  const [chatId, setChatId] = useState<number | null>(null)
  const [chatTitle, setChatTitle] = useState<string>("Admin Agent")
  const [inputValue, setInputValue] = useState("")
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [chats, setChats] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasLoadedChatRef = useRef(false)
  const { toast } = useToast()

  // Email Campaign Creator Component
  const EmailCampaignCreator = ({ data }: { data: any }) => {
    const [isCreating, setIsCreating] = useState(false)
    const [created, setCreated] = useState(false)
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [summary, setSummary] = useState<any>(null)

    const handleCreate = async () => {
      setIsCreating(true)
      try {
        // Ensure create_for_all_segments is true
        const payload = {
          ...data,
          create_for_all_segments: true,
        }

        const response = await fetch("/api/admin/agent/create-campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        const result = await response.json()

        if (result.success) {
          setCreated(true)
          setCampaigns(result.campaigns || [])
          setSummary(result.summary)
          toast({
            title: "Campaigns Created!",
            description: `Created ${result.summary?.successful || 0} campaign(s) for all segments`,
          })
        } else {
          throw new Error(result.details || result.error || "Failed to create campaigns")
        }
      } catch (error: any) {
        toast({
          title: "Error Creating Campaigns",
          description: error.message || "Failed to create campaigns",
          variant: "destructive",
        })
      } finally {
        setIsCreating(false)
      }
    }

    if (created) {
      const successfulCampaigns = campaigns.filter((c: any) => c.id)
      const failedCampaigns = campaigns.filter((c: any) => c.error)

      return (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">Campaigns Created for All Segments!</span>
          </div>
          
          {summary && (
            <div className="text-sm text-green-800 mb-3">
              <p><strong>{summary.successful}</strong> successful, <strong>{summary.failed}</strong> failed out of {summary.total} segments</p>
            </div>
          )}

          <div className="space-y-2 mb-3">
            {successfulCampaigns.map((campaign: any) => (
              <div key={campaign.id} className="text-xs bg-white p-2 rounded border border-green-200">
                <p className="font-medium text-green-900">✓ {campaign.segment.replace('_', ' ')}</p>
                <p className="text-green-700">Campaign ID: {campaign.id} ({campaign.status})</p>
              </div>
            ))}
            {failedCampaigns.map((campaign: any, idx: number) => (
              <div key={idx} className="text-xs bg-red-50 p-2 rounded border border-red-200">
                <p className="font-medium text-red-900">✗ {campaign.segment.replace('_', ' ')}</p>
                <p className="text-red-700">{campaign.error}</p>
              </div>
            ))}
          </div>

          <a
            href="/admin/test-campaigns"
            className="text-sm text-green-700 hover:underline font-medium"
          >
            View all campaigns →
          </a>
        </div>
      )
    }

    return (
      <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-stone-700" />
          <span className="font-semibold text-stone-900">Email Campaign Ready</span>
        </div>
        <div className="text-xs text-stone-600 mb-3 space-y-1">
          <p><strong>Subject:</strong> {data.subject_line}</p>
          <p><strong>Will create for:</strong> All 4 segments (all_subscribers, beta_users, paid_users, cold_users)</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full px-4 py-2 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Campaigns for All Segments...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Create Campaigns for All Segments
            </>
          )}
        </button>
      </div>
    )
  }

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/admin/agent/chat" }),
    initialMessages: [],
    body: {
      chatId: chatId,
    },
    onResponse: async (response) => {
      const chatIdHeader = response.headers.get('X-Chat-Id')
      if (chatIdHeader) {
        const newChatId = parseInt(chatIdHeader)
        if (!chatId || chatId !== newChatId) {
          setChatId(newChatId)
          await loadChats()
        }
      }
    },
    onError: (error) => {
      console.error("[v0] Admin agent chat error:", error)
      toast({
        title: "Chat Error",
        description: error.message || "An error occurred",
        variant: "destructive"
      })
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  const loadChats = async () => {
    try {
      const response = await fetch(`/api/admin/agent/chats?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setChats(data.chats || [])
      }
    } catch (error) {
      console.error("Error loading chats:", error)
    }
  }

  const loadChat = useCallback(
    async (specificChatId?: number) => {
      try {
        setIsLoadingChat(true)

        const url = specificChatId
          ? `/api/admin/agent/load-chat?chatId=${specificChatId}`
          : `/api/admin/agent/load-chat`

        console.log("[v0] Loading chat from URL:", url)

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Loaded chat ID:", data.chatId, "Messages:", data.messages?.length, "Title:", data.chatTitle)

        if (data.chatId) {
          setChatId(data.chatId)
        }

        if (data.chatTitle) {
          setChatTitle(data.chatTitle)
        }

        if (data.messages && Array.isArray(data.messages)) {
          // Messages from API already have parts format, use them directly
          setMessages(data.messages)
        } else {
          setMessages([])
        }

        setShowHistory(false)
      } catch (error) {
        console.error("[v0] Error loading chat:", error)
        toast({
          title: "Error Loading Chat",
          description: error instanceof Error ? error.message : "Failed to load chat",
          variant: "destructive"
        })
      } finally {
        setIsLoadingChat(false)
      }
    },
    [setMessages, toast],
  )

  useEffect(() => {
    if (!hasLoadedChatRef.current) {
      hasLoadedChatRef.current = true
      loadChat()
      loadChats()
    }
  }, [loadChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleNewChat = async () => {
    try {
      const response = await fetch("/api/admin/agent/new-chat", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to create new chat")

      const data = await response.json()
      setChatId(data.chatId)
      setChatTitle("New Chat")
      setMessages([])
      setShowHistory(false)
      await loadChats()

      console.log("[v0] New chat created:", data.chatId)
    } catch (error) {
      console.error("[v0] Error creating new chat:", error)
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive"
      })
    }
  }

  const handleSelectChat = (selectedChatId: number, selectedChatTitle: string) => {
    loadChat(selectedChatId)
    setChatTitle(selectedChatTitle)
    setShowHistory(false)
  }

  const handleSendMessage = async () => {
    const messageText = inputValue.trim()
    if (!messageText || isLoading) return

    let currentChatId = chatId
    if (!currentChatId) {
      console.log("[v0] No chatId exists, creating new chat before sending message...")
      try {
        const response = await fetch("/api/admin/agent/new-chat", {
          method: "POST",
        })
        if (response.ok) {
          const data = await response.json()
          if (data.chatId) {
            currentChatId = data.chatId
            setChatId(data.chatId)
            setChatTitle("New Chat")
            console.log("[v0] Created new chat with ID:", data.chatId)
          }
        }
      } catch (error) {
        console.error("[v0] Error creating new chat:", error)
      }
    }

    setInputValue("")

    try {
      await sendMessage({
        text: messageText,
      })
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    }
  }

  // Group chats by date
  const groupedChats = chats.reduce((groups: any, chat: any) => {
    const date = new Date(chat.last_activity)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const chatDate = new Date(date)
    chatDate.setHours(0, 0, 0, 0)

    let groupKey = 'Older'
    if (chatDate.getTime() === today.getTime()) {
      groupKey = 'Today'
    } else if (chatDate.getTime() === today.getTime() - 86400000) {
      groupKey = 'Yesterday'
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      groupKey = 'Last Week'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(chat)
    return groups
  }, {})

  return (
    <div className="flex h-screen bg-stone-50">
      {/* Sidebar */}
      <div className={`w-80 bg-white border-r border-stone-200 flex flex-col transition-all ${showHistory ? '' : '-ml-80 md:ml-0'}`}>
        <div className="p-4 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-900">Chat History</h2>
            <button
              onClick={() => setShowHistory(false)}
              className="md:hidden p-2 hover:bg-stone-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(groupedChats).map(([groupKey, groupChats]: [string, any]) => (
            <div key={groupKey} className="mb-6">
              <h3 className="text-xs uppercase text-stone-500 mb-2 tracking-wider">{groupKey}</h3>
              <div className="space-y-1">
                {(groupChats as any[]).map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id, chat.chat_title)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      chat.id === chatId
                        ? 'bg-stone-950 text-white'
                        : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <div className="truncate">{chat.chat_title || 'New Chat'}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(chat.last_activity).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-stone-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(true)}
                className="md:hidden p-2 hover:bg-stone-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-stone-900">{chatTitle}</h1>
            </div>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-900 rounded-lg hover:bg-stone-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingChat ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-stone-500">Loading chat...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-stone-500">
                <p className="text-lg mb-2">Start a conversation</p>
                <p className="text-sm">Ask me anything about your business, strategy, or growth!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                      message.role === "user"
                        ? "bg-stone-950 text-white"
                        : "bg-stone-100 text-stone-900"
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {(() => {
                        // Extract text from parts array if available
                        let content = ""
                        if (message.parts && Array.isArray(message.parts)) {
                          const textParts = message.parts
                            .filter((p: any) => p.type === "text")
                            .map((p: any) => p.text || "")
                          content = textParts.join("\n") || ""
                        } else if (typeof message.content === 'string') {
                          content = message.content
                        } else {
                          content = JSON.stringify(message.content || "")
                        }

                        // Check if content contains JSON email campaign block
                        const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/)
                        if (jsonMatch) {
                          try {
                            const emailData = JSON.parse(jsonMatch[1])
                            // Check for new format (campaign_name, create_for_all_segments) or old format (subject_line, html_content)
                            if ((emailData.campaign_name || emailData.subject_line) && emailData.html_content) {
                              return (
                                <div>
                                  <div className="mb-4">{content.replace(/```json[\s\S]*?```/g, '').trim()}</div>
                                  <EmailCampaignCreator data={emailData} />
                                </div>
                              )
                            }
                          } catch (e) {
                            // Not valid JSON, continue with normal rendering
                          }
                        }

                        return content
                      })()}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 rounded-2xl px-6 py-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-stone-700 animate-bounce"></div>
                      <div
                        className="w-2 h-2 rounded-full bg-stone-700 animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-stone-700 animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-stone-200 p-4">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="px-6 py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

