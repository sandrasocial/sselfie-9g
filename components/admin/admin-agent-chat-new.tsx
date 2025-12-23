"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Send, Plus, Menu, X, Mail, CheckCircle } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import EmailQuickActions from './email-quick-actions'
import SegmentSelector from './segment-selector'
import EmailPreviewCard from './email-preview-card'
import CampaignStatusCards from './campaign-status-cards'

interface AdminAgentChatProps {
  userId: string
  userName?: string
  userEmail: string
}

const getMessageContent = (message: any): string => {
  // Handle string content
  if (typeof message.content === "string") {
    return message.content
  }

  // Handle array of parts in content
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part: any) => part.type === "text" && part.text)
      .map((part: any) => part.text)
      .join("\n")
      .trim()
  }

  // Handle parts array (alternative format)
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((part: any) => part.type === "text" && part.text)
      .map((part: any) => part.text)
      .join("\n")
      .trim()
  }

  return ""
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
  
  // Email UI state
  const [showQuickActions, setShowQuickActions] = useState(true)
  const [showSegmentSelector, setShowSegmentSelector] = useState(false)
  const [emailPreview, setEmailPreview] = useState<any>(null)
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([])
  const [availableSegments, setAvailableSegments] = useState<any[]>([])
  
  // Loading and error states
  const [toolLoading, setToolLoading] = useState<string | null>(null) // Track which tool is loading
  const [toolErrors, setToolErrors] = useState<Record<string, string>>({}) // Track tool errors

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
      setToolLoading(null)
      setToolErrors(prev => ({ ...prev, general: error.message || "An error occurred" }))
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

  // Track tool loading and errors from messages
  useEffect(() => {
    if (isLoading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      // Check if last message has tool calls
      if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
        const toolCall = lastMessage.parts.find((p: any) => p.type === 'tool-call' || p.type?.startsWith('tool-'))
        if (toolCall) {
          const toolName = toolCall.toolName || toolCall.type?.replace('tool-', '')
          if (toolName) {
            setToolLoading(toolName)
          }
        }
      }
    } else if (!isLoading) {
      // Clear loading when not loading
      setToolLoading(null)
    }
    
    // Check for tool errors in messages
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
        for (const part of lastMessage.parts) {
          if (part.type === 'tool-result' && part.result && typeof part.result === 'object') {
            const result = part.result as any
            const toolName = part.toolName || 'unknown'
            
            if ('error' in result) {
              setToolErrors(prev => ({ ...prev, [toolName]: result.error }))
              toast({
                title: `${toolName} Error`,
                description: result.error || "Tool execution failed",
                variant: "destructive"
              })
            } else {
              // Clear error on success
              setToolErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[toolName]
                return newErrors
              })
              
              // Show success toast for important actions
              if (toolName === 'schedule_campaign' && result.success) {
                toast({
                  title: "Campaign Scheduled!",
                  description: result.message || "Your email campaign has been scheduled successfully.",
                })
              }
            }
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, messages])

  // Parse agent response for UI triggers (both from text markers and tool results)
  useEffect(() => {
    if (!messages.length) return
    
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return
    
    const content = getMessageContent(lastMessage)
    
    // First, check for explicit UI markers in text
    // Check for segment selector trigger
    if (content.includes('[SHOW_SEGMENT_SELECTOR]')) {
      // Parse segments from response
      const segmentsMatch = content.match(/\[SEGMENTS:(.*?)\]/s)
      if (segmentsMatch) {
        try {
          const segments = JSON.parse(segmentsMatch[1])
          setAvailableSegments(segments)
          setShowSegmentSelector(true)
          return // Don't check tool results if explicit marker found
        } catch (error) {
          console.error('[v0] Error parsing segments:', error)
        }
      }
    }
    
    // Check for email preview trigger
    if (content.includes('[SHOW_EMAIL_PREVIEW]')) {
      const previewMatch = content.match(/\[EMAIL_PREVIEW:(.*?)\]/s)
      if (previewMatch) {
        try {
          const preview = JSON.parse(previewMatch[1])
          setEmailPreview(preview)
          return // Don't check tool results if explicit marker found
        } catch (error) {
          console.error('[v0] Error parsing email preview:', error)
        }
      }
    }
    
    // Check for campaign status trigger
    if (content.includes('[SHOW_CAMPAIGNS]')) {
      const campaignsMatch = content.match(/\[CAMPAIGNS:(.*?)\]/s)
      if (campaignsMatch) {
        try {
          const campaigns = JSON.parse(campaignsMatch[1])
          setRecentCampaigns(campaigns)
          return // Don't check tool results if explicit marker found
        } catch (error) {
          console.error('[v0] Error parsing campaigns:', error)
        }
      }
    }
    
    // Automatic UI triggers from tool results
    // Check if message contains tool calls/results
    if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
      for (const part of lastMessage.parts) {
        // Check for compose_email tool result
        if (part.type === 'tool-call' && part.toolName === 'compose_email') {
          // Wait for tool result in next message or check if result is already here
          continue
        }
        
        // Check for tool result
        if (part.type === 'tool-result' && part.toolName === 'compose_email' && part.result) {
          const result = part.result
          if (result.html && result.subjectLine && !result.error) {
            setEmailPreview({
              subject: result.subjectLine,
              preview: result.preview || result.html.substring(0, 500) + '...',
              html: result.html,
              targetSegment: 'All Subscribers', // Default, can be updated
              targetCount: 2746 // Default, can be updated from audience data
            })
            return
          }
        }
        
        // Check for get_resend_audience_data tool result
        if (part.type === 'tool-result' && part.toolName === 'get_resend_audience_data' && part.result) {
          const result = part.result
          if (result.segments && Array.isArray(result.segments) && result.segments.length > 0) {
            // Format segments for selector
            const formattedSegments = result.segments.map((s: any) => ({
              id: s.id || 'all',
              name: s.name || 'Unknown Segment',
              size: s.size || 0,
              description: s.description
            }))
            setAvailableSegments(formattedSegments)
            // Don't auto-show selector, wait for agent to ask
          }
        }
        
        // Check for check_campaign_status tool result
        if (part.type === 'tool-result' && part.toolName === 'check_campaign_status' && part.result) {
          const result = part.result
          if (result.campaigns && Array.isArray(result.campaigns) && result.campaigns.length > 0) {
            // Format campaigns for status cards
            const formattedCampaigns = result.campaigns.map((c: any) => ({
              id: c.id,
              name: c.name,
              sentCount: c.stats?.sent || c.stats?.total || 0,
              openedCount: 0, // Resend doesn't provide this via API
              openRate: 0, // Would need webhook data
              date: new Date(c.createdAt).toLocaleDateString(),
              status: c.status || 'sent'
            }))
            setRecentCampaigns(formattedCampaigns)
            return
          }
        }
      }
    }
    
    // Also check message content for tool results (fallback)
    // Some implementations might include tool results in content
    if (typeof lastMessage.content === 'string' && lastMessage.content.includes('"toolName"')) {
      try {
        const toolResultMatch = lastMessage.content.match(/"toolName":"compose_email"[^}]*"result":({[^}]+})/s)
        if (toolResultMatch) {
          const toolResult = JSON.parse(toolResultMatch[1])
          if (toolResult.html && toolResult.subjectLine) {
            setEmailPreview({
              subject: toolResult.subjectLine,
              preview: toolResult.preview || toolResult.html.substring(0, 500) + '...',
              html: toolResult.html,
              targetSegment: 'All Subscribers',
              targetCount: 2746
            })
          }
        }
      } catch (error) {
        // Silently fail - this is a fallback method
      }
    }
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

          {/* Tool Loading Indicator */}
          {toolLoading && (
            <div className="max-w-4xl mx-auto mb-4">
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <p className="text-sm font-medium text-stone-900">
                    {toolLoading === 'compose_email' && 'Creating your email...'}
                    {toolLoading === 'schedule_campaign' && 'Scheduling campaign...'}
                    {toolLoading === 'check_campaign_status' && 'Checking campaign status...'}
                    {toolLoading === 'get_resend_audience_data' && 'Fetching audience data...'}
                    {toolLoading === 'analyze_email_strategy' && 'Analyzing email strategy...'}
                    {!toolLoading.includes('_') && `Running ${toolLoading}...`}
                  </p>
                  <p className="text-xs text-stone-600">This may take a few seconds</p>
                </div>
              </div>
            </div>
          )}

          {/* Tool Error Display */}
          {Object.keys(toolErrors).length > 0 && (
            <div className="max-w-4xl mx-auto mb-4">
              {Object.entries(toolErrors).map(([toolName, error]) => (
                <div key={toolName} className="bg-red-50 border border-red-200 rounded-lg p-4 mb-2">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    {toolName} Error
                  </p>
                  <p className="text-xs text-red-700">{error}</p>
                  <button
                    onClick={() => setToolErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors[toolName]
                      return newErrors
                    })}
                    className="mt-2 text-xs text-red-700 hover:text-red-900 underline"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions - Show when chat is empty or suggested by agent */}
          {showQuickActions && messages.length === 0 && !toolLoading && (
            <div className="max-w-4xl mx-auto">
              <EmailQuickActions
                onAction={async (category, prompt) => {
                  setShowQuickActions(false)
                  await sendMessage({ text: prompt })
                }}
                disabled={isLoading || !!toolLoading}
              />
            </div>
          )}

          {/* Segment Selector - Show when agent requests segment selection */}
          {showSegmentSelector && (
            <div className="max-w-4xl mx-auto">
              <SegmentSelector
                segments={availableSegments}
                onSelect={async (segmentId, segmentName) => {
                  setShowSegmentSelector(false)
                  await sendMessage({ 
                    text: `Send to ${segmentName} segment (ID: ${segmentId})` 
                  })
                }}
                onCancel={() => setShowSegmentSelector(false)}
              />
            </div>
          )}

          {/* Email Preview - Show when agent creates email */}
          {emailPreview && !toolLoading && (
            <div className="max-w-4xl mx-auto">
              <EmailPreviewCard
                subject={emailPreview.subject}
                preview={emailPreview.preview}
                htmlContent={emailPreview.html}
                targetSegment={emailPreview.targetSegment}
                targetCount={emailPreview.targetCount}
                onEdit={async () => {
                  setEmailPreview(null)
                  await sendMessage({ 
                    text: 'Make changes to this email' 
                  })
                }}
                onApprove={async () => {
                  setEmailPreview(null)
                  await sendMessage({ 
                    text: 'Approve and send this email now' 
                  })
                }}
                onSchedule={async () => {
                  setEmailPreview(null)
                  await sendMessage({ 
                    text: 'Schedule this email for later' 
                  })
                }}
              />
            </div>
          )}

          {/* Recent Campaigns - Show when agent provides status */}
          {recentCampaigns.length > 0 && (
            <div className="max-w-4xl mx-auto mb-4">
              <h3 className="text-sm font-semibold text-stone-900 mb-3">
                Recent Campaigns
              </h3>
              <CampaignStatusCards
                campaigns={recentCampaigns}
                onViewDetails={async (id) => {
                  await sendMessage({ 
                    text: `Show details for campaign ${id}` 
                  })
                }}
                onSendAgain={async (id) => {
                  await sendMessage({ 
                    text: `Send campaign ${id} again` 
                  })
                }}
              />
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

