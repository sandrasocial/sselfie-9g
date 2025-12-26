"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Send, Plus, Menu, X, Mail, CheckCircle, Image as ImageIcon } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import EmailQuickActions from './email-quick-actions'
import SegmentSelector from './segment-selector'
import EmailPreviewCard from './email-preview-card'
import CampaignStatusCards from './campaign-status-cards'
import { EmailDraftsLibrary } from './email-drafts-library'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { Textarea } from '@/components/ui/textarea'

interface AdminAgentChatProps {
  userId: string
  userName?: string
  userEmail: string
  apiEndpoint?: string
  loadChatEndpoint?: string
  chatsEndpoint?: string
  newChatEndpoint?: string
}

// Helper function to detect and filter Next.js error page HTML
const filterErrorPageHTML = (text: string): string => {
  if (!text || typeof text !== 'string') return text
  
  // Check if this is a Next.js error page HTML
  const hasErrorPage = text.includes('<!DOCTYPE html') && 
                      (text.includes('<title>404: This page could not be found.</title>') ||
                       text.includes('next-error-h1') ||
                       text.includes('/_next/static/chunks'))
  
  if (hasErrorPage) {
    console.error('[v0] ❌ Detected Next.js error page HTML in error message, filtering out')
    return 'The chat API route was not found. Please check that the route exists and refresh the page.'
  }
  
  return text
}

const getMessageContent = (message: any): string => {
  // Defensive check - ensure message exists
  if (!message || typeof message !== 'object') {
    console.warn('[v0] ⚠️ getMessageContent called with invalid message:', message)
    return ""
  }
  
  // Debug logging
  console.log('[v0] 🔍 getMessageContent called with message:', {
    id: message.id,
    role: message.role,
    hasContent: !!message.content,
    contentType: typeof message.content,
    hasParts: !!message.parts,
    partsLength: message.parts?.length,
    contentPreview: typeof message.content === 'string' 
      ? message.content.substring(0, 100) 
      : 'not a string'
  })
  
  // Handle string content
  if (typeof message.content === "string") {
    const content = message.content.trim()
    if (content) {
      console.log('[v0] ✅ Returning string content, length:', content.length)
      return content
    }
  }
  
  // Handle array of parts in content
  if (Array.isArray(message.content)) {
    const textParts = message.content
      .filter((part: any) => part && typeof part === 'object' && part.type === "text" && typeof part.text === 'string')
      .map((part: any) => part.text)
      .filter((text: any) => text != null && text !== '')
    const result = textParts.join("\n").trim()
    if (result) {
      console.log('[v0] ✅ Returning content array, length:', result.length)
      return result
    }
  }
  
  // Handle parts array (alternative format)
  if (message.parts && Array.isArray(message.parts)) {
    const textParts = message.parts
      .filter((part: any) => part && typeof part === 'object' && part.type === "text" && typeof part.text === 'string')
      .map((part: any) => part.text)
      .filter((text: any) => text != null && text !== '')
    const result = textParts.join("\n").trim()
    if (result) {
      console.log('[v0] ✅ Returning parts array, length:', result.length)
      return result
    }
  }

  console.warn('[v0] ⚠️ getMessageContent returning empty string for message:', message.id)
  return ""
}

export default function AdminAgentChatNew({ 
  userId, 
  userName, 
  userEmail,
  apiEndpoint = "/api/admin/agent/chat",
  loadChatEndpoint = "/api/admin/agent/load-chat",
  chatsEndpoint = "/api/admin/agent/chats",
  newChatEndpoint = "/api/admin/agent/new-chat"
}: AdminAgentChatProps) {
  const [chatId, setChatId] = useState<number | null>(null)
  const [chatTitle, setChatTitle] = useState<string>("Admin Agent")
  const [isMounted, setIsMounted] = useState(false)
  
  // Track if component is mounted to prevent state updates after unmount
  // This prevents "Cannot set properties of undefined" errors
  const isMountedRef = useRef(true)
  
  // Ensure component is mounted before applying responsive classes
  useEffect(() => {
    setIsMounted(true)
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])
  const [inputValue, setInputValue] = useState("")
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [chats, setChats] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true) // Track if we should auto-scroll
  const hasLoadedChatRef = useRef(false)
  const lastLoadedChatIdRef = useRef<number | null>(null) // Track last loaded chatId to prevent infinite loops
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  
  // Email UI state
  const [showQuickActions, setShowQuickActions] = useState(true)
  const [showSegmentSelector, setShowSegmentSelector] = useState(false)
  const [emailPreview, setEmailPreview] = useState<any>(null)
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null) // Track current draft ID
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([])
  const [availableSegments, setAvailableSegments] = useState<any[]>([])
  const [showEmailLibrary, setShowEmailLibrary] = useState(false) // Show/hide email library
  
  // Loading and error states
  const [toolLoading, setToolLoading] = useState<string | null>(null) // Track which tool is loading
  const [toolErrors, setToolErrors] = useState<Record<string, string>>({}) // Track tool errors
  const [executingTool, setExecutingTool] = useState<string | null>(null) // Track tool execution from toolInvocations
  
  // Gallery state
  interface GalleryImage {
    id: number
    image_url: string
    prompt: string
    created_at: string
    content_category?: string
  }
  const [showGallery, setShowGallery] = useState(false)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<Set<string>>(new Set())
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryLoadingMore, setGalleryLoadingMore] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [galleryOffset, setGalleryOffset] = useState(0)
  const [hasMoreImages, setHasMoreImages] = useState(true)
  // Use ref to track current offset to avoid stale closures in useCallback
  const galleryOffsetRef = useRef(0)
  
  // Keep ref in sync with state
  useEffect(() => {
    galleryOffsetRef.current = galleryOffset
  }, [galleryOffset])

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

  // Ensure apiEndpoint is set correctly
  const finalApiEndpoint = apiEndpoint || "/api/admin/agent/chat"
  console.log('[v0] 🔗 useChat configured with apiEndpoint:', finalApiEndpoint)

  // Memoize transport to prevent recreation on every render (fixes "Cannot set properties of undefined" error)
  const transportInstance = useMemo(() => {
    try {
      return new DefaultChatTransport({ 
        api: finalApiEndpoint,
      }) as any
    } catch (error) {
      console.error('[v0] ❌ Error creating DefaultChatTransport:', error)
      return null
    }
  }, [finalApiEndpoint])

  // Use DefaultChatTransport with as any to handle AI SDK version mismatches (like Maya chat does)
  // Our route returns custom SSE format compatible with DefaultChatTransport
  // Memoize transport to prevent recreation issues
  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport: transportInstance,
    body: { chatId },
    onResponse: async (response: any) => {
      // Safety check: don't update state if component is unmounted
      if (!isMountedRef.current) {
        console.warn('[v0] ⚠️ Component unmounted, skipping onResponse')
        return
      }
      
      try {
        // DEBUG: Check if body is consumed (should be false!)
        console.log('[v0] 🔍 Response received:', {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          bodyUsed: response.bodyUsed  // Should be false!
        })
        
        // Only read headers, do NOT consume body
        const chatIdHeader = response.headers.get('X-Chat-Id')
        if (chatIdHeader && isMountedRef.current) {
          const newChatId = parseInt(chatIdHeader)
          if (chatId !== newChatId) {
            setChatId(newChatId)
            await loadChats()
          }
        }
        
        // Verify body is still not consumed after header reading
        if (response.bodyUsed) {
          console.error('[v0] ❌ ERROR: Response body was consumed in onResponse!')
        }
      } catch (error: any) {
        console.error('[v0] ❌ Error in onResponse:', error)
        // Don't crash the component if onResponse fails
      }
    },
    onFinish: (message: any) => {
      // Safety check: don't update state if component is unmounted
      if (!isMountedRef.current) {
        console.warn('[v0] ⚠️ Component unmounted, skipping onFinish')
        return
      }
      
      try {
        console.log('[v0] ✅ Message finished:', message)
      } catch (error: any) {
        console.error('[v0] ❌ Error in onFinish:', error)
      }
    },
    onError: (error: any) => {
      // Safety check: don't update state if component is unmounted
      if (!isMountedRef.current) {
        console.warn('[v0] ⚠️ Component unmounted, skipping onError')
        return
      }
      
      try {
        console.error("[v0] ❌ Chat error:", error)
        setToolLoading(null)
        setExecutingTool(null)
        
        // Filter out Next.js error page HTML from error messages
        let errorMessage = error.message || "An error occurred"
        errorMessage = filterErrorPageHTML(errorMessage)
        
        setToolErrors(prev => ({ ...prev, general: errorMessage }))
      } catch (err: any) {
        console.error('[v0] ❌ Error in onError handler:', err)
        // Don't crash the component if error handler fails
      }
    },
  } as any)

  const isLoading = status === "submitted" || status === "streaming"

  // Add status logging
  useEffect(() => {
    console.log('[v0] 🔄 Status changed to:', status, {
      messageCount: messages.length,
      isLoading,
      chatId
    })
  }, [status, isLoading, messages.length, chatId])

  const loadChats = async () => {
    try {
      const response = await fetch(`${chatsEndpoint}?userId=${userId}`)
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
          ? `${loadChatEndpoint}?chatId=${specificChatId}`
          : loadChatEndpoint

        console.log("[v0] Loading chat from URL:", url)

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Loaded chat ID:", data.chatId, "Messages:", data.messages?.length, "Title:", data.chatTitle)

        // Set chatId first
        // Use explicit null/undefined check to handle chatId === 0 correctly
        if (data.chatId !== null && data.chatId !== undefined) {
          setChatId(data.chatId)
        }

        if (data.chatTitle) {
          setChatTitle(data.chatTitle)
        }

        // Wait a tick to ensure chatId state is updated before setting messages
        // CRITICAL: Update the ref IMMEDIATELY to prevent race condition
        // The ref must be updated before setChatId triggers useEffect
        if (data.chatId !== null && data.chatId !== undefined) {
          lastLoadedChatIdRef.current = data.chatId
        }

        // Small delay to prevent useChat from resetting messages when chatId changes
        await new Promise(resolve => setTimeout(resolve, 100))

        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          // Messages from API already have parts format, use them directly
          // Convert to format expected by useChat
          const formattedMessages = data.messages.map((msg: any) => {
            // Ensure message has proper structure for useChat
            if (msg.parts && Array.isArray(msg.parts)) {
              return {
                id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                role: msg.role,
                parts: msg.parts,
                content: msg.content || ''
              }
            } else if (typeof msg.content === 'string') {
              return {
                id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                role: msg.role,
                content: msg.content
              }
            }
            return msg
          })
          console.log("[v0] Setting messages:", formattedMessages.length)
          setMessages(formattedMessages)
        } else {
          console.log("[v0] No messages to load, setting empty array")
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
    [setMessages, toast, loadChatEndpoint],
  )

  // Auto-reload chat when compose_email tool completes to show email preview
  // Similar to how concept cards work - reload after tool completes to get data from database
  const lastStatusRef = useRef(status)
  const lastReloadTimeRef = useRef(0)
  const lastMessageCountRef = useRef(messages.length)
  const reloadScheduledRef = useRef(false)
  const lastComposeEmailHashRef = useRef<string>('')
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]) // Track all timeout IDs for cleanup
  
  useEffect(() => {
    // Detect when streaming completes
    const wasStreaming = lastStatusRef.current === 'streaming' || lastStatusRef.current === 'submitted'
    const isNowIdle = (status === 'awaiting_message' || status === 'ready') && !isLoading
    
    // Check ALL assistant messages for compose_email results (like concept cards check for tool-generateConcepts)
    const assistantMessages = messages.filter(m => m.role === 'assistant')
    
    // Create a hash of all compose_email results to detect changes
    const composeEmailHash = assistantMessages.map(msg => {
      const parts = (msg as any).parts || []
      const toolInvocations = (msg as any).toolInvocations || []
      
      const partsResults = parts
        .filter((p: any) => p.type === 'tool-result' && p.toolName === 'compose_email' && p.result?.html)
        .map((p: any) => `${p.result.html.substring(0, 50)}-${p.result.subjectLine}`)
        .join('|')
      
      const invocationsResults = toolInvocations
        .filter((inv: any) => inv.toolName === 'compose_email' && inv.result?.html)
        .map((inv: any) => `${inv.result.html.substring(0, 50)}-${inv.result.subjectLine}`)
        .join('|')
      
      return partsResults + invocationsResults
    }).join('||')
    
    // Only check if we're transitioning from streaming to idle AND compose_email result exists
    if (wasStreaming && isNowIdle && composeEmailHash && composeEmailHash !== lastComposeEmailHashRef.current) {
      const messageCountIncreased = messages.length > lastMessageCountRef.current
      const now = Date.now()
      const timeSinceLastReload = now - lastReloadTimeRef.current
      
      // Reload if compose_email result exists and we haven't reloaded recently
      if (chatId && timeSinceLastReload > 3000 && !reloadScheduledRef.current) {
        reloadScheduledRef.current = true
        lastReloadTimeRef.current = now
        lastMessageCountRef.current = messages.length
        lastComposeEmailHashRef.current = composeEmailHash
        
        // Capture chatId value at the time of scheduling to prevent stale closure
        const chatIdToReload = chatId
        console.log('[v0] 📧 compose_email completed, reloading chat to show email preview...', {
          chatId: chatIdToReload,
          composeEmailHash: composeEmailHash.substring(0, 100)
        })
        
        // Wait a bit for message to be saved to database, then reload
        const reloadTimeoutId = setTimeout(() => {
          // Use captured chatId value, not the closure variable
          if (chatIdToReload) {
            loadChat(chatIdToReload).finally(() => {
              // Reset the flag after reload completes
              const resetTimeoutId = setTimeout(() => {
                reloadScheduledRef.current = false
                // Remove this timeout ID from tracking array
                timeoutIdsRef.current = timeoutIdsRef.current.filter(id => id !== resetTimeoutId)
              }, 1000)
              // Track the reset timeout ID
              timeoutIdsRef.current.push(resetTimeoutId)
            })
          } else {
            reloadScheduledRef.current = false
          }
          // Remove this timeout ID from tracking array
          timeoutIdsRef.current = timeoutIdsRef.current.filter(id => id !== reloadTimeoutId)
        }, 2500) // 2.5 second delay to ensure message is saved to database
        
        // Track the reload timeout ID
        timeoutIdsRef.current.push(reloadTimeoutId)
      }
    }
    
    lastStatusRef.current = status
    lastMessageCountRef.current = messages.length
    if (composeEmailHash) {
      lastComposeEmailHashRef.current = composeEmailHash
    }
    
    // Cleanup function: clear all scheduled timeouts when effect re-runs or component unmounts
    return () => {
      timeoutIdsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId)
      })
      timeoutIdsRef.current = []
      // CRITICAL: Reset the reload scheduled flag when timeouts are cleared
      // This prevents the flag from blocking future reloads if the effect re-runs
      // before the timeout fires
      if (reloadScheduledRef.current) {
        reloadScheduledRef.current = false
      }
    }
  }, [status, messages, chatId, loadChat, isLoading]) // Watch messages array to catch streaming updates

  useEffect(() => {
    if (!hasLoadedChatRef.current) {
      hasLoadedChatRef.current = true
      loadChat()
      loadChats()
    }
  }, [loadChat])

  // Safety net: Ensure messages are set when chatId changes (if messages were loaded but not set)
  // Use a ref to track messages length to avoid dependency issues
  const messagesLengthRef = useRef(0)
  messagesLengthRef.current = messages.length
  
  useEffect(() => {
    // This effect ensures messages persist when chatId changes
    // It's a safety net in case useChat resets messages
    // Use explicit null/undefined check to handle chatId === 0 correctly
    if (chatId !== null && 
        chatId !== undefined && 
        chatId !== lastLoadedChatIdRef.current && // Only load if chatId actually changed
        messagesLengthRef.current === 0 && // Use ref to check messages length without adding to deps
        !isLoadingChat && 
        hasLoadedChatRef.current) {
      // Only reload if we have a chatId but no messages and we're not currently loading
      // This prevents infinite loops
      lastLoadedChatIdRef.current = chatId
      const timer = setTimeout(() => {
        console.log("[v0] ChatId set but no messages detected, reloading chat...")
        loadChat(chatId)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [chatId, isLoadingChat, loadChat]) // Removed messages.length to prevent infinite loops

  // Smooth scroll to bottom - only if user is already near bottom
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    // Check if user is near the bottom (within 100px)
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100

    // Only auto-scroll if user is near bottom OR if shouldAutoScrollRef is true
    if (shouldAutoScrollRef.current || isNearBottom) {
      // Use requestAnimationFrame + direct scrollTop for smoother scrolling during streaming
      // This prevents the "jumping" effect that scrollIntoView can cause
      requestAnimationFrame(() => {
        if (container) {
          // Direct scrollTop manipulation is smoother than scrollIntoView during rapid updates
          container.scrollTop = container.scrollHeight
        }
      })
    }
  }, [messages])

  // Track scroll position to detect manual scrolling
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const isNearBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 100
      shouldAutoScrollRef.current = isNearBottom
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Track tool loading and errors from messages
  useEffect(() => {
    if (isLoading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      // Check if last message has tool calls
      if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
        const toolCall = lastMessage.parts.find((p: any) => {
          const partType = (p as any)?.type
          return partType === 'tool-call' || (typeof partType === 'string' && partType.startsWith('tool-'))
        })
        if (toolCall) {
          const toolCallAny = toolCall as any
          const toolName = toolCallAny.toolName || (typeof toolCallAny.type === 'string' ? toolCallAny.type.replace('tool-', '') : undefined)
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
          const partAny = part as any
          if (partAny.type === 'tool-result' && partAny.result && typeof partAny.result === 'object') {
            const result = partAny.result as any
            const toolName = partAny.toolName || 'unknown'
            
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

  // Error boundary for tool execution
  useEffect(() => {
    if (error) {
      console.error('[v0] Chat error:', error)
      
      // Filter out Next.js error page HTML from error messages
      let errorMessage = error.message || "Something went wrong"
      errorMessage = filterErrorPageHTML(errorMessage)
      
      toast({
        title: "Chat Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }, [error, toast])

  // Track tool execution from toolInvocations
  useEffect(() => {
    if (!isLoading) {
      setExecutingTool(null)
      return
    }
    
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === 'assistant') {
      const invocations = (lastMsg as any).toolInvocations
      if (invocations && invocations.length > 0) {
        const latest = invocations[invocations.length - 1]
        if (latest.state === 'call') {
          setExecutingTool(latest.toolName)
        }
      }
    }
  }, [messages, isLoading])

  // Parse agent response for UI triggers from tool results (simplified)
  // Check ALL assistant messages to find the most recent compose_email result
  // Use a ref to track the last email preview we found to detect changes
  // This works like concept cards - extracts directly from message parts in real-time
  const lastEmailPreviewHashRef = useRef<string | null>(null)
  
  useEffect(() => {
    // Extract email preview from messages in real-time (like concept cards do)
    // This runs whenever messages change, so it catches streaming updates immediately
    
    if (!messages.length) {
      // Clear email preview if no messages
      if (emailPreview) {
        setEmailPreview(null)
        lastEmailPreviewHashRef.current = null
      }
      return
    }
    
    // Get ALL assistant messages (most recent first)
    const assistantMessages = messages
      .filter(m => m.role === 'assistant')
      .reverse() // Reverse to check most recent first
    
    if (!assistantMessages.length) {
      // Clear email preview if no assistant messages
      if (emailPreview) {
        setEmailPreview(null)
        lastEmailPreviewHashRef.current = null
      }
      return
    }
    
    // Track if we found a valid email preview in this check
    let foundValidEmailPreview = false
    let latestEmailPreview: any = null
    
    // Helper function to extract and validate email preview
    const extractEmailPreview = (result: any, source: string) => {
      // Validate that result is an object with html property (not a string message)
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        return null
      }
      
      // Ensure html is actually HTML (starts with < or <!DOCTYPE), not plain text
      const htmlValue = result.html
      if (!htmlValue || typeof htmlValue !== 'string') {
        console.warn(`[v0] ⚠️ Invalid email preview data in ${source}: html is not a string`, {
          htmlType: typeof htmlValue,
          hasHtml: !!htmlValue
        })
        return null
      }
      
      const trimmedHtml = htmlValue.trim()
      if (!trimmedHtml.startsWith('<') && !trimmedHtml.startsWith('<!DOCTYPE')) {
        console.warn(`[v0] ⚠️ Invalid email preview data in ${source}: html does not start with < or <!DOCTYPE`, {
          htmlStartsWith: trimmedHtml.substring(0, 50),
          htmlLength: trimmedHtml.length,
          isPlainText: !trimmedHtml.includes('<')
        })
        return null
      }
      
      if (!result.subjectLine || typeof result.subjectLine !== 'string') {
        console.warn(`[v0] ⚠️ Invalid email preview data in ${source}: subjectLine is missing or not a string`)
        return null
      }
      
      if (result.error) {
        console.warn(`[v0] ⚠️ Email preview has error in ${source}:`, result.error)
        return null
      }
      
      // Valid email preview data
      return {
        subject: result.subjectLine,
        preview: result.preview || htmlValue.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
        html: htmlValue, // Use validated HTML
        targetSegment: 'All Subscribers',
        targetCount: 2746
      }
    }
    
    // Check ALL assistant messages (most recent first) to find the latest compose_email result
    // This ensures we get the most recent email even if Alex edited it
    for (const assistantMsg of assistantMessages) {
      if (foundValidEmailPreview) break // Stop once we find a valid preview
      
      // AI SDK stores tool results in toolInvocations array or in parts array
      // Check both locations for compatibility
      const toolInvocations = (assistantMsg as any).toolInvocations
      const parts = (assistantMsg as any).parts
      
      // Process toolInvocations (AI SDK format) - PRIORITY 1
      if (toolInvocations && Array.isArray(toolInvocations) && !foundValidEmailPreview) {
        for (const invocation of toolInvocations) {
          // Check for compose_email tool
          if (invocation.toolName === 'compose_email' && invocation.result) {
            const emailPreviewData = extractEmailPreview(invocation.result, 'toolInvocations')
            
            if (emailPreviewData) {
              console.log('[v0] ✅ Email preview found in toolInvocations', {
                htmlLength: emailPreviewData.html.length,
                htmlPreview: emailPreviewData.html.substring(0, 100),
                htmlStartsWith: emailPreviewData.html.substring(0, 20),
                subjectLine: emailPreviewData.subject,
                hasPreview: !!emailPreviewData.preview
              })
              
              console.log('[v0] 📧 Setting email preview with data:', {
                subject: emailPreviewData.subject,
                htmlLength: emailPreviewData.html.length,
                htmlStartsWith: emailPreviewData.html.substring(0, 50),
                previewLength: emailPreviewData.preview.length
              })
              
              latestEmailPreview = emailPreviewData
              foundValidEmailPreview = true
              break // Found valid preview, stop searching
            }
          }
        
          // Check for audience data tool
          if (invocation.toolName === 'get_resend_audience_data' && invocation.result) {
            const result = invocation.result
            if (result.segments && Array.isArray(result.segments)) {
              const formattedSegments = result.segments.map((s: any) => ({
                id: s.id || 'all',
                name: s.name || 'Unknown Segment',
                size: s.size || 0,
                description: s.description
              }))
              setAvailableSegments(formattedSegments)
            }
          }
          
          // Check for campaign status tool
          if (invocation.toolName === 'check_campaign_status' && invocation.result) {
            const result = invocation.result
            if (result.campaigns && Array.isArray(result.campaigns) && result.campaigns.length > 0) {
              const formattedCampaigns = result.campaigns.map((c: any) => ({
                id: c.id,
                name: c.name,
                sentCount: c.stats?.sent || c.stats?.total || 0,
                openedCount: 0,
                openRate: 0,
                date: new Date(c.createdAt).toLocaleDateString(),
                status: c.status || 'sent'
              }))
              setRecentCampaigns(formattedCampaigns)
            }
          }
        }
      }
      
      // Fallback: Check parts array (alternative format) - PRIORITY 2 (only if not found in toolInvocations)
      if (parts && Array.isArray(parts) && !foundValidEmailPreview) {
        for (const part of parts) {
          const partAny = part as any
            
          // Check for compose_email tool result
          if (partAny.type === 'tool-result' && partAny.toolName === 'compose_email' && partAny.result) {
            let result = partAny.result
            
            // Handle stringified JSON
            if (typeof result === 'string') {
              try {
                result = JSON.parse(result)
              } catch (e) {
                console.warn('[v0] ⚠️ Could not parse result as JSON:', e)
                continue
              }
            }
            
            const emailPreviewData = extractEmailPreview(result, 'parts')
            
            if (emailPreviewData) {
              console.log('[v0] ✅ Email preview found in parts', {
                htmlLength: emailPreviewData.html.length,
                htmlPreview: emailPreviewData.html.substring(0, 100),
                htmlStartsWith: emailPreviewData.html.substring(0, 20),
                subjectLine: emailPreviewData.subject,
                hasPreview: !!emailPreviewData.preview
              })
              
              console.log('[v0] 📧 Setting email preview with data:', {
                subject: emailPreviewData.subject,
                htmlLength: emailPreviewData.html.length,
                htmlStartsWith: emailPreviewData.html.substring(0, 50),
                previewLength: emailPreviewData.preview.length
              })
              
              latestEmailPreview = emailPreviewData
              foundValidEmailPreview = true
              break // Found valid preview, stop searching
            }
          }
          
          // Check for get_resend_audience_data tool result
          if (partAny.type === 'tool-result' && partAny.toolName === 'get_resend_audience_data' && partAny.result) {
            const result = partAny.result
            if (result.segments && Array.isArray(result.segments)) {
              const formattedSegments = result.segments.map((s: any) => ({
                id: s.id || 'all',
                name: s.name || 'Unknown Segment',
                size: s.size || 0,
                description: s.description
              }))
              setAvailableSegments(formattedSegments)
            }
          }
          
          // Check for check_campaign_status tool result
          if (partAny.type === 'tool-result' && partAny.toolName === 'check_campaign_status' && partAny.result) {
            const result = partAny.result
            if (result.campaigns && Array.isArray(result.campaigns) && result.campaigns.length > 0) {
              const formattedCampaigns = result.campaigns.map((c: any) => ({
                id: c.id,
                name: c.name,
                sentCount: c.stats?.sent || c.stats?.total || 0,
                openedCount: 0,
                openRate: 0,
                date: new Date(c.createdAt).toLocaleDateString(),
                status: c.status || 'sent'
              }))
              setRecentCampaigns(formattedCampaigns)
            }
          }
        }
      }
    }
    
    // If we found a valid email preview, check if it's different from what we have
    if (foundValidEmailPreview && latestEmailPreview) {
      // Create a hash of the email preview to detect changes
      const previewHash = `${latestEmailPreview.subject}-${latestEmailPreview.html.substring(0, 100)}-${latestEmailPreview.html.length}`
      
      // Only update if the preview has changed
      if (previewHash !== lastEmailPreviewHashRef.current) {
        console.log('[v0] 📧 Email preview changed, updating...', {
          oldHash: lastEmailPreviewHashRef.current,
          newHash: previewHash,
          subject: latestEmailPreview.subject
        })
        setEmailPreview(latestEmailPreview)
        lastEmailPreviewHashRef.current = previewHash
      } else {
        console.log('[v0] 📧 Email preview unchanged, skipping update')
      }
    } else if (!foundValidEmailPreview && emailPreview) {
      // If we didn't find a valid email preview in any message, but we have one set,
      // check if it's still valid (not from an old message)
      // Validate current email preview HTML is still valid
      if (emailPreview.html && typeof emailPreview.html === 'string') {
        const html = emailPreview.html.trim()
        if (!html.startsWith('<') && !html.startsWith('<!DOCTYPE')) {
          console.warn('[v0] ⚠️ Current email preview has invalid HTML, clearing it')
          setEmailPreview(null)
          lastEmailPreviewHashRef.current = null
        }
      } else {
        console.warn('[v0] ⚠️ Current email preview has no HTML, clearing it')
        setEmailPreview(null)
        lastEmailPreviewHashRef.current = null
      }
    }
  }, [messages, status]) // Watch messages array directly to catch changes immediately (like concept cards)

  // Auto-save email draft to database when preview is created/updated
  // FIX: Use ref to capture currentDraftId without causing re-triggers
  const currentDraftIdRef = useRef<number | null>(currentDraftId)
  useEffect(() => {
    currentDraftIdRef.current = currentDraftId
  }, [currentDraftId])

  useEffect(() => {
    if (!emailPreview || !emailPreview.html) return

    const saveEmailDraft = async () => {
      try {
        const response = await fetch('/api/admin/agent/email-drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: chatId || null,
            draftName: emailPreview.subject || 'Untitled Email',
            subjectLine: emailPreview.subject,
            previewText: emailPreview.preview,
            bodyHtml: emailPreview.html,
            emailType: 'newsletter',
            targetSegment: emailPreview.targetSegment || 'All Subscribers',
            imageUrls: [], // TODO: Extract from HTML if needed
            parentDraftId: currentDraftIdRef.current || undefined, // Use ref to avoid dependency
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.draft?.id) {
            setCurrentDraftId(data.draft.id)
            console.log('[EmailDrafts] ✅ Draft saved:', data.draft.id)
          }
        }
      } catch (error) {
        console.error('[EmailDrafts] Error saving draft:', error)
        // Don't show error to user - this is background save
      }
    }

    // Debounce saves to avoid too many requests
    const timeoutId = setTimeout(saveEmailDraft, 1000)
    return () => clearTimeout(timeoutId)
  }, [emailPreview, chatId]) // Removed currentDraftId from dependencies

  const handleNewChat = async () => {
    try {
      // CRITICAL: Clear messages immediately to prevent mixing with previous chat
      setMessages([])
      
      const response = await fetch(newChatEndpoint, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to create new chat")

      const data = await response.json()
      
      // CRITICAL: Set chatId BEFORE loading chat to ensure correct chatId is used
      setChatId(data.chatId)
      setChatTitle("New Chat")
      setShowHistory(false)
      
      // Load the new chat (will load empty messages since it's a new chat)
      await loadChat(data.chatId)
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
    // CRITICAL: Clear messages immediately when switching chats to prevent mixing
    setMessages([])
    setChatId(selectedChatId)
    setChatTitle(selectedChatTitle)
    setShowHistory(false)
    // Load the selected chat's messages
    loadChat(selectedChatId)
  }

  // Load gallery images (initial load or category change)
  const loadGalleryImages = useCallback(async (reset = true) => {
    if (reset) {
      setGalleryLoading(true)
      setGalleryOffset(0)
      galleryOffsetRef.current = 0
      setGalleryImages([])
      setHasMoreImages(true)
    } else {
      setGalleryLoadingMore(true)
    }
    
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory)
      }
      params.append("limit", "50")
      // Use ref to get current offset value (avoids stale closure issues)
      const currentOffset = reset ? 0 : galleryOffsetRef.current
      params.append("offset", String(currentOffset))

      const response = await fetch(`/api/admin/agent/gallery-images?${params}`)
      const data = await response.json()
      
      const fetchedImages = data.images || []
      // Use processedOffset from API (tracks actual database position after filtering)
      // This ensures pagination continues from the correct position even when records are filtered
      const processedOffset = data.processedOffset !== undefined ? data.processedOffset : (data.rawCount !== undefined ? data.rawCount : fetchedImages.length)
      const rawDatabaseCount = data.rawCount !== undefined ? data.rawCount : fetchedImages.length
      
      if (reset) {
        // Reset: start fresh, offset = processed database offset
        setGalleryImages(fetchedImages)
        // Offset tracks the actual database position we've processed (accounts for filtering)
        const newOffset = processedOffset
        setGalleryOffset(newOffset)
        galleryOffsetRef.current = newOffset
      } else {
        // Load more: append to existing, offset = processed database offset
        setGalleryImages(prev => [...prev, ...fetchedImages])
        setGalleryOffset(prev => {
          // Use processedOffset to ensure we continue from the correct database position
          // This prevents skipping records when many are filtered out
          const newOffset = processedOffset
          galleryOffsetRef.current = newOffset
          return newOffset
        })
      }
      
      // If we got fewer database records than the batch size (50), there are no more to load
      // Also check if we got fewer valid images than requested (indicates we've exhausted valid records)
      setHasMoreImages(rawDatabaseCount >= 50 && fetchedImages.length >= 50)
    } catch (error) {
      console.error('[v0] Failed to fetch gallery images:', error)
    } finally {
      setGalleryLoading(false)
      setGalleryLoadingMore(false)
    }
  }, [selectedCategory])

  // Load more images
  const loadMoreImages = useCallback(() => {
    if (!galleryLoadingMore && hasMoreImages) {
      loadGalleryImages(false)
    }
  }, [galleryLoadingMore, hasMoreImages, loadGalleryImages])

  // Load gallery when opened or category changes
  useEffect(() => {
    if (showGallery) {
      loadGalleryImages(true)
    }
  }, [showGallery, selectedCategory, loadGalleryImages])

  const handleGalleryImageClick = (imageUrl: string) => {
    setSelectedGalleryImages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(imageUrl)) {
        newSet.delete(imageUrl)
      } else {
        newSet.add(imageUrl)
      }
      return newSet
    })
  }

  const handleSendMessage = async () => {
    const hasText = inputValue.trim().length > 0
    const hasImages = selectedGalleryImages.size > 0
    
    if ((!hasText && !hasImages) || isLoading) return

    // Reset auto-scroll when sending a new message
    shouldAutoScrollRef.current = true

    // Ensure chat exists
    let currentChatId = chatId
    if (currentChatId === null || currentChatId === undefined) {
      try {
        const response = await fetch(loadChatEndpoint)
          const data = await response.json()
        
          if (data.chatId !== null && data.chatId !== undefined) {
            currentChatId = data.chatId
            setChatId(data.chatId)
          } else {
          // Create new chat
          const newChatResponse = await fetch(newChatEndpoint, { method: "POST" })
              const newChatData = await newChatResponse.json()
                currentChatId = newChatData.chatId
                setChatId(newChatData.chatId)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to initialize chat",
          variant: "destructive"
        })
        return
      }
    }

    // Build message content
    let messageContent: string | Array<{ type: string; text?: string; image?: string }> = inputValue.trim()
    
    if (hasImages) {
      const contentParts: Array<{ type: string; text?: string; image?: string }> = []
      if (hasText) {
        contentParts.push({ type: 'text', text: inputValue.trim() })
      }
      selectedGalleryImages.forEach((imageUrl) => {
        contentParts.push({ type: 'image', image: imageUrl })
        })
      messageContent = contentParts
    }

    // Clear UI
    setInputValue("")
    setSelectedGalleryImages(new Set())
    setShowGallery(false)
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // CRITICAL: Ensure we have a valid chatId before sending
    // Double-check chatId is set (in case state hasn't updated yet)
    if (!currentChatId) {
      toast({
        title: "Error",
        description: "No chat selected. Please try again.",
        variant: "destructive"
      })
      return
    }
    
    // Send message using useChat
    // sendMessage accepts { text: string } or message object with parts
    // CRITICAL: Pass chatId explicitly in the message to ensure it's sent correctly
    // The useChat body parameter might be stale, so we pass it explicitly
    try {
      if (typeof messageContent === 'string') {
        // Use sendMessage with explicit body override to ensure correct chatId
        await sendMessage({ 
          text: messageContent,
          data: { chatId: currentChatId } // Explicitly pass chatId to override stale body
        } as any)
      } else {
        // For multi-part messages, sendMessage expects a message object
        await sendMessage({ 
          role: 'user',
          content: messageContent as any,
          data: { chatId: currentChatId } // Explicitly pass chatId to override stale body
        } as any)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
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
    <div className="flex h-screen bg-stone-50 overflow-hidden relative">
      {/* Mobile Overlay */}
      {showHistory && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`w-80 bg-white border-r border-stone-200 flex flex-col transition-all ${showHistory ? '' : '-ml-80 md:ml-0'} shrink-0 fixed md:relative h-full z-50 md:z-auto`}>
        <div className="p-3 sm:p-4 border-b border-stone-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-stone-900">Chat History</h2>
            <button
              onClick={() => setShowHistory(false)}
              className="md:hidden p-2 hover:bg-stone-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 sm:px-4 py-2 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm sm:text-base"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {Object.entries(groupedChats).map(([groupKey, groupChats]: [string, any]) => (
            <div key={groupKey} className="mb-4 sm:mb-6">
              <h3 className="text-xs uppercase text-stone-500 mb-2 tracking-wider">{groupKey}</h3>
              <div className="space-y-1">
                {(groupChats as any[]).map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id, chat.chat_title)}
                    className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors ${
                      chat.id === chatId
                        ? 'bg-stone-950 text-white'
                        : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <div className="truncate">{chat.chat_title || 'New Chat'}</div>
                    <div className="text-xs opacity-70 mt-0.5 sm:mt-1">
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
      <div className="flex-1 flex flex-col w-full md:w-auto">
        {/* Header */}
        <div className="bg-white border-b border-stone-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => setShowHistory(true)}
                className="md:hidden p-2 hover:bg-stone-100 rounded-lg shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-base sm:text-xl font-semibold text-stone-900 truncate">{chatTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEmailLibrary(!showEmailLibrary)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm shrink-0 ${
                  showEmailLibrary
                    ? 'bg-stone-900 text-white hover:bg-stone-800'
                    : 'bg-stone-100 text-stone-900 hover:bg-stone-200'
                }`}
                title="Email Library"
              >
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Email Library</span>
                <span className="sm:hidden">Library</span>
              </button>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-stone-100 text-stone-900 rounded-lg hover:bg-stone-200 transition-colors text-xs sm:text-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">New Chat</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        </div>

        {/* Email Library */}
        {showEmailLibrary && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            <EmailDraftsLibrary
              onEditDraft={async (draft) => {
                setShowEmailLibrary(false)
                // Load the draft HTML into the chat for editing
                const editPrompt = `Please edit this email. Here's the current version:\n\nSubject: ${draft.subject_line}\n\nHTML:\n${draft.body_html}`
                await sendMessage({ text: editPrompt })
              }}
            />
          </div>
        )}

        {/* Messages */}
        {!showEmailLibrary && (
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6"
          >
            {isLoadingChat ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm sm:text-base text-stone-500">Loading chat...</div>
            </div>
          ) : (
            <>
              {/* Tool Execution Loading Indicator */}
              {executingTool && (
                <div className="max-w-4xl mx-auto mb-3 sm:mb-4">
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin shrink-0"></div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-stone-900 truncate">
                        {executingTool === 'compose_email' && 'Creating your email...'}
                        {executingTool === 'schedule_campaign' && 'Scheduling campaign...'}
                        {executingTool === 'get_resend_audience_data' && 'Fetching audience data...'}
                        {!['compose_email', 'schedule_campaign', 'get_resend_audience_data'].includes(executingTool) && `Executing ${executingTool}...`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-stone-500 px-4">
                <p className="text-base sm:text-lg mb-2">Start a conversation</p>
                <p className="text-xs sm:text-sm">Ask me anything about your business, strategy, or growth!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
              {(() => {
                console.log('[v0] 📋 Rendering messages:', {
                  count: messages.length,
                  messages: messages.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    hasContent: !!m.content,
                    contentType: typeof m.content,
                    hasParts: !!m.parts,
                    contentPreview: typeof m.content === 'string' 
                      ? m.content.substring(0, 50) 
                      : 'not a string'
                  }))
                })
                return null
              })()}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] rounded-xl sm:rounded-2xl px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 ${
                      message.role === "user"
                        ? "bg-stone-950 text-white"
                        : "bg-stone-100 text-stone-900"
                    }`}
                  >
                    <div className="text-xs sm:text-sm leading-relaxed">
                      {message.role === "assistant" ? (
                        (() => {
                          const content = getMessageContent(message)
                          console.log('[v0] 📝 Rendering assistant message content:', {
                            messageId: message.id,
                            contentLength: content.length,
                            contentPreview: content.substring(0, 100),
                            isEmpty: !content.trim()
                          })
                          // Fallback to plain text if content is very short or ReactMarkdown fails
                          if (!content.trim()) {
                            return <div className="text-stone-500 italic">Empty message</div>
                          }
                          return (
                            <div className="prose prose-sm sm:prose-base max-w-none text-stone-900 prose-headings:font-semibold prose-headings:text-stone-900 prose-p:text-stone-700 prose-p:leading-relaxed prose-ul:list-disc prose-ul:pl-4 sm:prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-4 sm:prose-ol:pl-6 prose-li:text-stone-700 prose-strong:text-stone-900 prose-strong:font-semibold prose-a:text-stone-900 prose-a:underline prose-code:text-stone-900 prose-code:bg-stone-100 prose-code:px-1 prose-code:rounded prose-pre:bg-stone-100 prose-pre:border prose-pre:border-stone-200 prose-blockquote:border-l-stone-300 prose-blockquote:text-stone-600">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-3 sm:mb-4 last:mb-0 text-xs sm:text-sm">{children}</p>,
                                  ul: ({ children }) => <ul className="mb-3 sm:mb-4 space-y-1">{children}</ul>,
                                  ol: ({ children }) => <ol className="mb-3 sm:mb-4 space-y-1">{children}</ol>,
                                  li: ({ children }) => <li className="ml-3 sm:ml-4 text-xs sm:text-sm">{children}</li>,
                                  h1: ({ children }) => <h1 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3 mt-4 sm:mt-6 first:mt-0">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 mt-3 sm:mt-5 first:mt-0">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-1.5 sm:mb-2 mt-3 sm:mt-4 first:mt-0">{children}</h3>,
                                  strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
                                  em: ({ children }) => <em className="italic">{children}</em>,
                                  code: ({ children }) => <code className="bg-stone-100 text-stone-900 px-1 sm:px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono break-all">{children}</code>,
                                  blockquote: ({ children }) => <blockquote className="border-l-4 border-stone-300 pl-2 sm:pl-4 italic text-stone-600 my-3 sm:my-4 text-xs sm:text-sm">{children}</blockquote>,
                                }}
                              >
                                {content}
                              </ReactMarkdown>
                            </div>
                          )
                        })()
                      ) : (
                        (() => {
                          const content = getMessageContent(message)
                          console.log('[v0] 📝 Rendering user message content:', {
                            messageId: message.id,
                            contentLength: content.length,
                            contentPreview: content.substring(0, 100)
                          })
                          return <div className="whitespace-pre-wrap">{content || '(empty)'}</div>
                        })()
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4">
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
            </>
          )}

          {/* Tool Loading Indicator */}
          {toolLoading && (
            <div className="max-w-4xl mx-auto mb-3 sm:mb-4 px-3 sm:px-0">
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin shrink-0"></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-stone-900 truncate">
                    {toolLoading === 'compose_email' && 'Creating your email...'}
                    {toolLoading === 'schedule_campaign' && 'Scheduling campaign...'}
                    {toolLoading === 'check_campaign_status' && 'Checking campaign status...'}
                    {toolLoading === 'get_resend_audience_data' && 'Fetching audience data...'}
                    {toolLoading === 'analyze_email_strategy' && 'Analyzing email strategy...'}
                    {!toolLoading.includes('_') && `Running ${toolLoading}...`}
                  </p>
                  <p className="text-xs text-stone-600 hidden sm:block">This may take a few seconds</p>
                </div>
              </div>
            </div>
          )}

          {/* Tool Error Display */}
          {Object.keys(toolErrors).length > 0 && (
            <div className="max-w-4xl mx-auto mb-3 sm:mb-4 px-3 sm:px-0">
              {Object.entries(toolErrors).map(([toolName, error]) => {
                // Filter out Next.js error page HTML from error messages
                const filteredError = filterErrorPageHTML(error)
                return (
                  <div key={toolName} className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-2">
                    <p className="text-xs sm:text-sm font-medium text-red-900 mb-1">
                      {toolName === 'general' ? 'Chat Error' : `${toolName} Error`}
                    </p>
                    <p className="text-xs text-red-700 break-words">{filteredError}</p>
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
                )
              })}
            </div>
          )}

          {/* Quick Actions - Show when chat is empty or suggested by agent */}
          {showQuickActions && messages.length === 0 && !toolLoading && (
            <div className="max-w-4xl mx-auto px-3 sm:px-0">
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
            <div className="max-w-4xl mx-auto px-3 sm:px-0">
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
          {emailPreview && (
            <div className="max-w-4xl mx-auto px-3 sm:px-0">
              <EmailPreviewCard
                subject={emailPreview.subject}
                preview={emailPreview.preview}
                htmlContent={emailPreview.html}
                targetSegment={emailPreview.targetSegment}
                targetCount={emailPreview.targetCount}
                onEdit={async () => {
                  // Don't clear preview - keep it visible so Alex can see the current version
                  // Pass the FULL email HTML to Alex so he can edit it properly
                  // Use previousVersion parameter in compose_email tool
                  // CRITICAL: Make it very explicit that Alex must use the compose_email tool with previousVersion
                  const editPrompt = `I want to edit this email. Please use the compose_email tool with the previousVersion parameter.

CRITICAL INSTRUCTIONS:
1. You MUST call the compose_email tool (do not just describe changes)
2. Use the previousVersion parameter and pass the HTML below
3. Make the specific changes I request while keeping the overall structure and style

Current email HTML to use as previousVersion:
${emailPreview.html}

Current subject: ${emailPreview.subject}

Please make the edits I request using the compose_email tool.`
                  
                  await sendMessage({ 
                    text: editPrompt
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
                onSendTest={async (testEmail?: string) => {
                  try {
                    const response = await fetch('/api/admin/agent/send-test-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        subject: emailPreview.subject,
                        html: emailPreview.html,
                        testEmail: testEmail
                      })
                    })
                    const result = await response.json()
                    if (result.success) {
                      toast({
                        title: "Test Email Sent!",
                        description: result.message || `Test email sent to ${testEmail || 'your admin email'}`,
                      })
                    } else {
                      toast({
                        title: "Error",
                        description: result.error || "Failed to send test email",
                        variant: "destructive"
                      })
                    }
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to send test email",
                      variant: "destructive"
                    })
                  }
                }}
              />
            </div>
          )}

          {/* Recent Campaigns - Show when agent provides status */}
          {recentCampaigns.length > 0 && (
            <div className="max-w-4xl mx-auto mb-3 sm:mb-4 px-3 sm:px-0">
              <h3 className="text-xs sm:text-sm font-semibold text-stone-900 mb-2 sm:mb-3">
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
        )}

        {/* Gallery Selector */}
        {showGallery && (
          <div className="bg-stone-50 border-t border-stone-200 p-3 sm:p-4 md:p-6 max-h-96 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm uppercase tracking-wider text-stone-900 font-serif">
                  Select Images from Gallery
                </h3>
                <button
                  onClick={() => {
                    setShowGallery(false)
                    setSelectedGalleryImages(new Set())
                  }}
                  className="text-stone-500 hover:text-stone-700 p-1"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Category Filter */}
              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                {["all", "lifestyle", "product", "portrait", "fashion", "editorial"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs uppercase tracking-wider transition-colors rounded-lg ${
                      selectedCategory === cat
                        ? "bg-stone-900 text-stone-50"
                        : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Selected Count */}
              {selectedGalleryImages.size > 0 && (
                <div className="text-xs sm:text-sm text-stone-600">
                  {selectedGalleryImages.size} image{selectedGalleryImages.size > 1 ? 's' : ''} selected
                </div>
              )}

              {/* Gallery Grid */}
              {galleryLoading ? (
                <div className="text-center py-6 sm:py-8 text-stone-500 text-xs sm:text-sm">Loading images...</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2 md:gap-4">
                  {galleryImages.map((image) => {
                    const isSelected = selectedGalleryImages.has(image.image_url)
                    return (
                      <div
                        key={image.id}
                        onClick={() => handleGalleryImageClick(image.image_url)}
                        className={`relative aspect-square bg-stone-200 cursor-pointer transition-all group rounded-lg overflow-hidden ${
                          isSelected ? 'ring-2 sm:ring-4 ring-stone-900' : 'hover:ring-2 hover:ring-stone-400'
                        }`}
                      >
                        {image.image_url && typeof image.image_url === 'string' && image.image_url.startsWith('http') ? (
                          <Image
                            src={image.image_url}
                            alt={image.prompt || "Gallery image"}
                            fill
                            className="object-cover"
                            unoptimized
                            onError={(e) => {
                              console.error('[v0] Image load error:', {
                                id: image.id,
                                url: image.image_url?.substring(0, 100),
                                error: e
                              })
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                            No image
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-stone-900 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs sm:text-sm font-bold">✓</span>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/20 transition-colors flex items-center justify-center">
                          <span className="text-white text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                            {isSelected ? 'SELECTED' : 'SELECT'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {!galleryLoading && galleryImages.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-stone-500 text-xs sm:text-sm">No images found in this category</div>
              )}

              {/* Load More Button */}
              {!galleryLoading && galleryImages.length > 0 && hasMoreImages && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={loadMoreImages}
                    disabled={galleryLoadingMore}
                    className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
                  >
                    {galleryLoadingMore ? (
                      <>
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Loading...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Load More ({galleryImages.length} shown)</span>
                        <span className="sm:hidden">More ({galleryImages.length})</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {!galleryLoading && galleryImages.length > 0 && !hasMoreImages && (
                <div className="text-center py-2 text-stone-500 text-xs sm:text-sm">
                  All {galleryImages.length} images loaded
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Images Preview */}
        {selectedGalleryImages.size > 0 && !showGallery && (
          <div className="bg-stone-50 border-t border-stone-200 p-3 sm:p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-stone-600">
                  {selectedGalleryImages.size} image{selectedGalleryImages.size > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedGalleryImages(new Set())}
                  className="text-xs text-stone-500 hover:text-stone-700"
                >
                  Clear all
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {Array.from(selectedGalleryImages).map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-stone-200">
                      <Image
                        src={imageUrl}
                        alt={`Selected ${index + 1}`}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </div>
                    <button
                      onClick={() => {
                        setSelectedGalleryImages((prev) => {
                          const newSet = new Set(prev)
                          newSet.delete(imageUrl)
                          return newSet
                        })
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-stone-200 p-3 sm:p-4">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex gap-2 sm:gap-3"
            >
              <button
                type="button"
                onClick={() => setShowGallery(!showGallery)}
                disabled={isLoading}
                className={`px-2 sm:px-4 py-2 sm:py-3 border rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 shrink-0 text-xs sm:text-sm ${
                  showGallery
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Select images from gallery"
              >
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Gallery</span>
              </button>
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  // Auto-resize on change
                  const textarea = e.target
                  textarea.style.height = 'auto'
                  textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
                }}
                onKeyDown={(e) => {
                  // Submit on Enter (without Shift), prevent default to avoid new line
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (inputValue.trim() || selectedGalleryImages.size > 0) {
                      handleSendMessage()
                    }
                  }
                  // Shift+Enter allows new line (default behavior)
                }}
                placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950 text-sm sm:text-base resize-none min-h-[44px] max-h-[200px] overflow-y-auto"
                disabled={isLoading}
                rows={1}
              />
              <button
                type="submit"
                disabled={(!inputValue.trim() && selectedGalleryImages.size === 0) || isLoading}
                className="px-3 sm:px-6 py-2 sm:py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 shrink-0 text-xs sm:text-sm"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

