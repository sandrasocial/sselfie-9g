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
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'

interface AdminAgentChatProps {
  userId: string
  userName?: string
  userEmail: string
  apiEndpoint?: string
  loadChatEndpoint?: string
  chatsEndpoint?: string
  newChatEndpoint?: string
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

export default function AdminAgentChat({ 
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
  
  // Ensure component is mounted before applying responsive classes
  useEffect(() => {
    setIsMounted(true)
  }, [])
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

  // Use useMemo to make body reactive to chatId changes
  // Only include chatId in body if it exists (don't send undefined/null)
  // Use explicit null/undefined check to handle chatId === 0 correctly
  const chatBody = useMemo(() => {
    if (chatId !== null && chatId !== undefined) {
      return { chatId }
    }
    return {} // Empty object if no chatId
  }, [chatId])

  const { messages, sendMessage, status, setMessages, isLoading: useChatIsLoading } = useChat({
    transport: new DefaultChatTransport({ api: apiEndpoint }),
    initialMessages: [],
    body: chatBody,
    // Let useChat manage messages automatically
    // Only use setMessages when loading existing chats from database
    keepLastMessageOnError: true,
    onRequest: async (request) => {
      console.log('[v0] 📤 Sending request with chatId:', chatBody.chatId)
    },
    onResponse: async (response) => {
      console.log('[v0] 📥 Response received, status:', response.status)
      const chatIdHeader = response.headers.get('X-Chat-Id')
      if (chatIdHeader) {
        const newChatId = parseInt(chatIdHeader)
        console.log('[v0] 🆔 Chat ID from header:', newChatId)
        // Use explicit null/undefined check to handle chatId === 0 correctly
        if (chatId === null || chatId === undefined || chatId !== newChatId) {
          setChatId(newChatId)
          await loadChats()
        }
      }
    },
    onError: (error) => {
      console.error("[v0] ❌ Admin agent chat error:", error)
      console.error("[v0] ❌ Error stack:", error.stack)
      setToolLoading(null)
      setToolErrors(prev => ({ ...prev, general: error.message || "An error occurred" }))
      toast({
        title: "Chat Error",
        description: error.message || "An error occurred",
        variant: "destructive"
      })
    },
    onFinish: (message) => {
      console.log('[v0] ✅ Message finished streaming:', message.content?.substring(0, 50))
    },
  })

  const isLoading = status === "submitted" || status === "streaming" || useChatIsLoading

  // Add status logging
  useEffect(() => {
    console.log('[v0] 🔄 Status changed to:', status, {
      messageCount: messages.length,
      isLoading,
      useChatIsLoading,
      chatId
    })
  }, [status, isLoading, useChatIsLoading, messages.length, chatId])

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
        // This prevents useChat from resetting messages when chatId changes
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

  useEffect(() => {
    if (!hasLoadedChatRef.current) {
      hasLoadedChatRef.current = true
      loadChat()
      loadChats()
    }
  }, [loadChat])

  // Safety net: Ensure messages are set when chatId changes (if messages were loaded but not set)
  useEffect(() => {
    // This effect ensures messages persist when chatId changes
    // It's a safety net in case useChat resets messages
    // Use explicit null/undefined check to handle chatId === 0 correctly
    if (chatId !== null && chatId !== undefined && messages.length === 0 && !isLoadingChat && hasLoadedChatRef.current) {
      // Only reload if we have a chatId but no messages and we're not currently loading
      // This prevents infinite loops
      const timer = setTimeout(() => {
        console.log("[v0] ChatId set but no messages detected, reloading chat...")
        loadChat(chatId)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [chatId, messages.length, isLoadingChat, loadChat])

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
    
    console.log('[v0] 🔍 Checking messages for email preview triggers, total messages:', messages.length)
    
    // Check ALL assistant messages (not just the last one) for tool results
    // Tool results might be in a previous message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if (message.role !== 'assistant') continue
      
      const content = getMessageContent(message)
      
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
        // Use a more robust regex that handles multiline JSON
        // Match [EMAIL_PREVIEW:...] where ... can span multiple lines until we find a closing bracket
        // The pattern should match until ] that's not part of the JSON content
        const previewMatch = content.match(/\[EMAIL_PREVIEW:([\s\S]*?)\](?=\n|$|\[|```)/)
        if (previewMatch) {
          try {
            let previewJson = previewMatch[1].trim()
            
            // Handle case where JSON might have escaped quotes or newlines
            // Remove any leading/trailing whitespace
            previewJson = previewJson.trim()
            
            const preview = JSON.parse(previewJson)
            
            // Validate required fields
            if (preview.subject && preview.html) {
              console.log('[v0] ✅ Setting email preview from explicit marker')
              setEmailPreview(preview)
              return // Don't check tool results if explicit marker found
            } else {
              console.error('[v0] Email preview missing required fields:', preview)
            }
          } catch (error) {
            console.error('[v0] Error parsing email preview:', error)
            console.error('[v0] Preview JSON (first 500 chars):', previewMatch[1].substring(0, 500))
            // Try to extract just the JSON part if it's wrapped in extra text
            try {
              const jsonMatch = previewMatch[1].match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const preview = JSON.parse(jsonMatch[0])
                if (preview.subject && preview.html) {
                  console.log('[v0] ✅ Setting email preview from explicit marker (retry)')
                  setEmailPreview(preview)
                  return
                }
              }
            } catch (retryError) {
              console.error('[v0] Retry parse also failed:', retryError)
            }
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
      if (message.parts && Array.isArray(message.parts)) {
        console.log('[v0] 🔍 Checking message parts for tool results, parts count:', message.parts.length)
        for (const part of message.parts) {
          console.log('[v0] 🔍 Part type:', part.type, 'toolName:', part.toolName)
          
          // Check for compose_email tool result
          if (part.type === 'tool-result' && part.toolName === 'compose_email' && part.result) {
            const result = part.result
            console.log('[v0] 📧 compose_email tool result found in parts:', {
              hasHtml: !!result.html,
              hasSubjectLine: !!result.subjectLine,
              hasError: !!result.error,
              resultKeys: Object.keys(result || {}),
              resultType: typeof result,
              resultString: typeof result === 'string' ? result.substring(0, 100) : 'not a string'
            })
            
            // Handle case where result might be a stringified JSON
            let parsedResult = result
            if (typeof result === 'string') {
              try {
                parsedResult = JSON.parse(result)
              } catch (e) {
                console.warn('[v0] ⚠️ Could not parse result as JSON:', e)
              }
            }
            
            if (parsedResult && parsedResult.html && parsedResult.subjectLine && !parsedResult.error) {
              // Ensure HTML is a string and not escaped
              let emailHtml = parsedResult.html
              if (typeof emailHtml === 'string') {
                // Check if HTML is escaped (contains &lt; instead of <)
                if (emailHtml.includes('&lt;') || emailHtml.includes('&gt;')) {
                  console.log('[v0] 🔧 HTML appears to be escaped, unescaping...')
                  // Unescape HTML entities
                  const tempDiv = document.createElement('div')
                  tempDiv.innerHTML = emailHtml
                  emailHtml = tempDiv.textContent || tempDiv.innerText || emailHtml
                  // If that didn't work, try manual replacement
                  if (emailHtml.includes('&lt;')) {
                    emailHtml = emailHtml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
                  }
                }
                
                // Ensure HTML is valid (starts with < or <!DOCTYPE)
                if (!emailHtml.trim().startsWith('<') && !emailHtml.trim().startsWith('<!DOCTYPE')) {
                  console.warn('[v0] ⚠️ HTML does not appear to be valid HTML')
                  // Try to extract HTML from the string
                  const htmlMatch = emailHtml.match(/(<!DOCTYPE\s+html[\s\S]*?<\/html>|<html[\s\S]*?<\/html>)/i)
                  if (htmlMatch) {
                    emailHtml = htmlMatch[1]
                    console.log('[v0] ✅ Extracted HTML from string')
                  }
                }
              }
              
              console.log('[v0] ✅ Setting email preview from tool result in parts')
              console.log('[v0] 📧 Email HTML length:', emailHtml.length)
              console.log('[v0] 📧 Email HTML preview (first 200 chars):', emailHtml.substring(0, 200))
              setEmailPreview({
                subject: parsedResult.subjectLine,
                preview: parsedResult.preview || emailHtml.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
                html: emailHtml, // Use the processed HTML
                targetSegment: 'All Subscribers', // Default, can be updated
                targetCount: 2746 // Default, can be updated from audience data
              })
              return
            } else {
              console.warn('[v0] ⚠️ compose_email result missing required fields:', {
                html: !!parsedResult?.html,
                subjectLine: !!parsedResult?.subjectLine,
                error: parsedResult?.error,
                parsedResultKeys: parsedResult ? Object.keys(parsedResult) : []
              })
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
      if (typeof message.content === 'string') {
        const contentStr = message.content
        
        // Check if content contains HTML email structure (indicates compose_email was used)
        // Look for common email HTML patterns
        const hasEmailHtml = contentStr.includes('<!DOCTYPE html') || 
                            contentStr.includes('<html') || 
                            (contentStr.includes('<table') && contentStr.includes('role="presentation"'))
        
        // Check if content mentions email creation or contains email-related keywords
        const hasEmailKeywords = contentStr.includes('email') || 
                                contentStr.includes('campaign') || 
                                contentStr.includes('subject') ||
                                contentStr.includes('compose_email')
        
        if (hasEmailHtml || hasEmailKeywords) {
          console.log('[v0] 🔍 Checking message content for email data')
          console.log('[v0] 🔍 Content length:', contentStr.length)
          console.log('[v0] 🔍 Content preview (first 500 chars):', contentStr.substring(0, 500))
          
          // Try to extract HTML email from content
          // Look for HTML block (might be wrapped in markdown or plain text)
          const htmlMatch = contentStr.match(/(<!DOCTYPE\s+html[\s\S]*?<\/html>|<html[\s\S]*?<\/html>)/i)
          if (htmlMatch) {
            const emailHtml = htmlMatch[1]
            
            // Try to extract subject line from content (look for patterns like "Subject:" or in HTML title)
            let subjectLine = ''
            const subjectMatch = contentStr.match(/(?:subject|Subject)[\s:]+([^\n<]+)/i)
            if (subjectMatch) {
              subjectLine = subjectMatch[1].trim()
            } else {
              // Try to extract from HTML title tag
              const titleMatch = emailHtml.match(/<title[^>]*>([^<]+)<\/title>/i)
              if (titleMatch) {
                subjectLine = titleMatch[1].trim()
              } else {
                // Fallback: use first heading or first line
                const headingMatch = emailHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i)
                if (headingMatch) {
                  subjectLine = headingMatch[1].trim()
                } else {
                  subjectLine = 'Email Campaign'
                }
              }
            }
            
            if (emailHtml && subjectLine) {
              console.log('[v0] ✅ Setting email preview from extracted HTML in content')
              setEmailPreview({
                subject: subjectLine,
                preview: emailHtml.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
                html: emailHtml,
                targetSegment: 'All Subscribers',
                targetCount: 2746
              })
              return
            }
          }
          
          // Try to find JSON object with html and subjectLine
          try {
            // Look for JSON objects that might contain email data (more flexible pattern)
            const jsonPattern = /\{[^{}]*(?:"html"|"subjectLine"|"subject")[^{}]*\}/g
            const jsonMatches = contentStr.match(jsonPattern)
            if (jsonMatches) {
              for (const jsonStr of jsonMatches) {
                try {
                  // Try to parse as complete JSON
                  const parsed = JSON.parse(jsonStr)
                  if (parsed.html && (parsed.subjectLine || parsed.subject)) {
                    console.log('[v0] ✅ Setting email preview from content JSON match')
                    setEmailPreview({
                      subject: parsed.subjectLine || parsed.subject || 'Email Campaign',
                      preview: parsed.preview || parsed.html.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
                      html: parsed.html,
                      targetSegment: 'All Subscribers',
                      targetCount: 2746
                    })
                    return
                  }
                } catch (e) {
                  // Try to extract just the html and subjectLine fields
                  const htmlMatch = jsonStr.match(/"html"\s*:\s*"([^"]+)"/)
                  const subjectMatch = jsonStr.match(/"subjectLine"\s*:\s*"([^"]+)"|"subject"\s*:\s*"([^"]+)"/)
                  if (htmlMatch && subjectMatch) {
                    console.log('[v0] ✅ Setting email preview from content JSON field extraction')
                    setEmailPreview({
                      subject: subjectMatch[1] || subjectMatch[2] || 'Email Campaign',
                      preview: htmlMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) + '...',
                      html: htmlMatch[1],
                      targetSegment: 'All Subscribers',
                      targetCount: 2746
                    })
                    return
                  }
                }
              }
            }
            
            // Also try the original regex pattern for tool results
            const toolResultMatch = contentStr.match(/"toolName"\s*:\s*"compose_email"[^}]*"result"\s*:\s*({[^}]+})/s)
            if (toolResultMatch) {
              try {
                const toolResult = JSON.parse(toolResultMatch[1])
                if (toolResult.html && toolResult.subjectLine) {
                  console.log('[v0] ✅ Setting email preview from content tool result match')
                  setEmailPreview({
                    subject: toolResult.subjectLine,
                    preview: toolResult.preview || toolResult.html.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
                    html: toolResult.html,
                    targetSegment: 'All Subscribers',
                    targetCount: 2746
                  })
                  return
                }
              } catch (e) {
                console.warn('[v0] ⚠️ Could not parse tool result JSON:', e)
              }
            }
          } catch (error) {
            console.warn('[v0] ⚠️ Error parsing tool result from content:', error)
          }
        }
      }
    }
    
    console.log('[v0] ⚠️ No email preview found in any messages')
  }, [messages])

  const handleNewChat = async () => {
    try {
      const response = await fetch(newChatEndpoint, {
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

    // Wait for chat to finish loading if it's still loading
    if (isLoadingChat) {
      console.log("[v0] Chat is still loading, waiting...")
      toast({
        title: "Please wait",
        description: "Chat is loading. Please wait a moment before sending.",
        variant: "default"
      })
      return
    }

    let currentChatId = chatId
    
    // If no chatId exists, try to load the most recent chat first (don't create new one immediately)
    // Use explicit null/undefined check to handle chatId === 0 correctly
    if (currentChatId === null || currentChatId === undefined) {
      console.log("[v0] No chatId exists, attempting to load most recent chat...")
      try {
        // Try to load the most recent chat (this will use getOrCreateActiveChat on backend)
        const response = await fetch(loadChatEndpoint)
        if (response.ok) {
          const data = await response.json()
          // Use explicit null/undefined check to handle chatId === 0 correctly
          if (data.chatId !== null && data.chatId !== undefined) {
            currentChatId = data.chatId
            setChatId(data.chatId)
            if (data.chatTitle) {
              setChatTitle(data.chatTitle)
            }
            console.log("[v0] Loaded existing chat with ID:", data.chatId)
            
            // If there are messages, set them (only when loading existing chat)
            // When sending new messages, useChat will handle it automatically
            if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
              const formattedMessages = data.messages.map((msg: any) => ({
                id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                role: msg.role,
                parts: msg.parts || [],
                content: msg.content || ''
              }))
              setMessages(formattedMessages)
            }
          } else {
            // No existing chat found, create a new one
            console.log("[v0] No existing chat found, creating new chat...")
            const newChatResponse = await fetch(newChatEndpoint, {
              method: "POST",
            })
            if (newChatResponse.ok) {
              const newChatData = await newChatResponse.json()
              // Use explicit null/undefined check to handle chatId === 0 correctly
              if (newChatData.chatId !== null && newChatData.chatId !== undefined) {
                currentChatId = newChatData.chatId
                setChatId(newChatData.chatId)
                setChatTitle("New Chat")
                console.log("[v0] Created new chat with ID:", newChatData.chatId)
              } else {
                throw new Error("No chatId in new chat response")
              }
            } else {
              throw new Error(`Failed to create new chat: ${newChatResponse.status}`)
            }
          }
        } else {
          // Load failed, try creating new chat
          console.log("[v0] Load chat failed, creating new chat...")
          const newChatResponse = await fetch(newChatEndpoint, {
            method: "POST",
          })
          if (newChatResponse.ok) {
            const newChatData = await newChatResponse.json()
            // Use explicit null/undefined check to handle chatId === 0 correctly
            if (newChatData.chatId !== null && newChatData.chatId !== undefined) {
              currentChatId = newChatData.chatId
              setChatId(newChatData.chatId)
              setChatTitle("New Chat")
              console.log("[v0] Created new chat with ID:", newChatData.chatId)
            } else {
              throw new Error("No chatId in new chat response")
            }
          } else {
            throw new Error(`Failed to create new chat: ${newChatResponse.status}`)
          }
        }
      } catch (error) {
        console.error("[v0] Error loading/creating chat:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load or create chat. Please try again.",
          variant: "destructive"
        })
        return // Don't proceed with sending message
      }
    }

    // Validate that we have a chatId before sending
    // Use explicit null/undefined check to handle chatId === 0 correctly
    if (currentChatId === null || currentChatId === undefined) {
      console.error("[v0] Cannot send message: No chatId available")
      toast({
        title: "Error",
        description: "Unable to send message. Please try creating a new chat first.",
        variant: "destructive"
      })
      return
    }

    // Build message content with images
    let messageContent: string | Array<{ type: string; text?: string; image?: string }> = inputValue.trim()
    
    if (selectedGalleryImages.size > 0) {
      const contentParts: Array<{ type: string; text?: string; image?: string }> = []
      
      if (hasText) {
        contentParts.push({
          type: 'text',
          text: inputValue.trim()
        })
      }
      
      // Add all selected images
      selectedGalleryImages.forEach((imageUrl) => {
        contentParts.push({
          type: 'image',
          image: imageUrl
        })
      })
      
      messageContent = contentParts
    }

    // Store current values before clearing (for error recovery)
    const originalInputValue = inputValue
    const originalSelectedImages = new Set(selectedGalleryImages)

    // Clear UI state optimistically
    setInputValue("")
    setSelectedGalleryImages(new Set())
    setShowGallery(false)

    try {
      // sendMessage automatically adds the user message to the messages array
      // useChat expects either a string, { text: string }, or { content: array } format
      // It automatically sets role to "user", so we don't need to specify it
      if (Array.isArray(messageContent)) {
        // Multi-part message with images: pass content array directly
        await sendMessage({ content: messageContent })
      } else {
        // Text-only message: use { text: ... } format
        await sendMessage({ text: messageContent })
      }
      console.log('[v0] ✅ Message sent successfully, useChat will handle adding it to messages')
      // Success - state already cleared, no need to restore
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      // Restore user input and selected images on error
      setInputValue(originalInputValue)
      setSelectedGalleryImages(originalSelectedImages)
      toast({
        title: "Error",
        description: "Failed to send message. Your input has been restored.",
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
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar */}
      <div className={`w-80 bg-white border-r border-stone-200 flex flex-col transition-all ${showHistory ? '' : '-ml-80 md:ml-0'} flex-shrink-0`}>
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
                        // Extract images and text from parts array if available
                        let content = ""
                        let imageUrls: string[] = []
                        
                        if (message.parts && Array.isArray(message.parts)) {
                          message.parts.forEach((p: any) => {
                            if (p.type === "text") {
                              content += (content ? '\n' : '') + (p.text || "")
                            } else if (p.type === "image") {
                              const imageUrl = p.image || p.url
                              // Only push if we have a valid URL (not empty string)
                              if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
                                imageUrls.push(imageUrl)
                              }
                            }
                          })
                        } else if (Array.isArray(message.content)) {
                          message.content.forEach((p: any) => {
                            if (p.type === "text") {
                              content += (content ? '\n' : '') + (p.text || "")
                            } else if (p.type === "image") {
                              const imageUrl = p.image || p.url
                              // Only push if we have a valid URL (not empty string)
                              if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0) {
                                imageUrls.push(imageUrl)
                              }
                            }
                          })
                        } else if (typeof message.content === 'string') {
                          content = message.content
                        } else {
                          content = JSON.stringify(message.content || "")
                        }
                        
                        // Filter out empty or invalid URLs before rendering
                        const validImageUrls = imageUrls.filter((url) => 
                          url && typeof url === 'string' && url.trim().length > 0
                        )
                        
                        // Display images if present
                        const imageSection = validImageUrls.length > 0 ? (
                          <div className="mb-3 grid grid-cols-2 gap-2">
                            {validImageUrls.map((url, idx) => (
                              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100">
                                <Image
                                  src={url}
                                  alt={`Image ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ))}
                          </div>
                        ) : null

                        // Check if content contains JSON email campaign block
                        const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/)
                        if (jsonMatch) {
                          try {
                            const emailData = JSON.parse(jsonMatch[1])
                            // Check for new format (campaign_name, create_for_all_segments) or old format (subject_line, html_content)
                            if ((emailData.campaign_name || emailData.subject_line) && emailData.html_content) {
                              return (
                                <div>
                                  {imageSection}
                                  <div className="mb-4">{content.replace(/```json[\s\S]*?```/g, '').trim()}</div>
                                  <EmailCampaignCreator data={emailData} />
                                </div>
                              )
                            }
                          } catch (e) {
                            // Not valid JSON, continue with normal rendering
                          }
                        }

                        // Filter out UI trigger markers from displayed content
                        let displayContent = content
                        
                        // Remove email preview markers (handle multiline JSON)
                        displayContent = displayContent.replace(/\[SHOW_EMAIL_PREVIEW\]/g, '')
                        displayContent = displayContent.replace(/\[EMAIL_PREVIEW:[\s\S]*?\]/g, '')
                        
                        // Remove segment selector markers
                        displayContent = displayContent.replace(/\[SHOW_SEGMENT_SELECTOR\]/g, '')
                        displayContent = displayContent.replace(/\[SEGMENTS:[\s\S]*?\]/g, '')
                        
                        // Remove campaign status markers
                        displayContent = displayContent.replace(/\[SHOW_CAMPAIGNS\]/g, '')
                        displayContent = displayContent.replace(/\[CAMPAIGNS:[\s\S]*?\]/g, '')
                        
                        // Clean up extra whitespace/newlines left by marker removal
                        displayContent = displayContent.replace(/\n{3,}/g, '\n\n').trim()

                        // Render markdown for assistant messages, plain text for user messages
                        const textContent = displayContent.trim()
                        if (message.role === "assistant" && textContent) {
                          return (
                            <>
                              {imageSection}
                              <div className="prose prose-sm max-w-none text-stone-900">
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => <p className="mb-3 last:mb-0 text-stone-900">{children}</p>,
                                    strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
                                    em: ({ children }) => <em className="italic">{children}</em>,
                                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-stone-900">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-stone-900">{children}</ol>,
                                    li: ({ children }) => <li className="ml-2 text-stone-900">{children}</li>,
                                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0 text-stone-900">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-stone-900">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0 text-stone-900">{children}</h3>,
                                    code: ({ children }) => <code className="bg-stone-200 px-1.5 py-0.5 rounded text-xs font-mono text-stone-900">{children}</code>,
                                    pre: ({ children }) => <pre className="bg-stone-200 p-3 rounded-lg overflow-x-auto mb-3 text-stone-900">{children}</pre>,
                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-stone-400 pl-3 italic my-2 text-stone-700">{children}</blockquote>,
                                  }}
                                >
                                  {textContent}
                                </ReactMarkdown>
                              </div>
                            </>
                          )
                        }
                        
                        // Plain text for user messages
                        return (
                          <>
                            {imageSection}
                            {textContent}
                          </>
                        )
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
          {emailPreview && (
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

        {/* Gallery Selector */}
        {showGallery && (
          <div className="bg-stone-50 border-t border-stone-200 p-4 sm:p-6 max-h-96 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm uppercase tracking-wider text-stone-900 font-serif">
                  Select Images from Gallery
                </h3>
                <button
                  onClick={() => {
                    setShowGallery(false)
                    setSelectedGalleryImages(new Set())
                  }}
                  className="text-stone-500 hover:text-stone-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                {["all", "lifestyle", "product", "portrait", "fashion", "editorial"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 sm:px-4 py-2 text-xs uppercase tracking-wider transition-colors rounded-lg ${
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
                <div className="text-sm text-stone-600">
                  {selectedGalleryImages.size} image{selectedGalleryImages.size > 1 ? 's' : ''} selected
                </div>
              )}

              {/* Gallery Grid */}
              {galleryLoading ? (
                <div className="text-center py-8 text-stone-500 text-sm">Loading images...</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-4">
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
                <div className="text-center py-8 text-stone-500 text-sm">No images found in this category</div>
              )}

              {/* Load More Button */}
              {!galleryLoading && galleryImages.length > 0 && hasMoreImages && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={loadMoreImages}
                    disabled={galleryLoadingMore}
                    className="px-4 sm:px-6 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {galleryLoadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Loading...</span>
                      </>
                    ) : (
                      <>
                        Load More ({galleryImages.length} shown)
                      </>
                    )}
                  </button>
                </div>
              )}

              {!galleryLoading && galleryImages.length > 0 && !hasMoreImages && (
                <div className="text-center py-2 text-stone-500 text-sm">
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
        <div className="bg-white border-t border-stone-200 p-4">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex gap-3"
            >
              <button
                type="button"
                onClick={() => setShowGallery(!showGallery)}
                disabled={isLoading}
                className={`px-4 py-3 border rounded-lg transition-colors flex items-center gap-2 flex-shrink-0 ${
                  showGallery
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Select images from gallery"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Gallery</span>
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950 text-base"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={(!inputValue.trim() && selectedGalleryImages.size === 0) || isLoading}
                className="px-6 py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

