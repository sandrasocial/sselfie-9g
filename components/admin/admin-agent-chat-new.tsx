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
import CaptionCard from '@/components/admin/caption-card'
import CalendarCard from '@/components/admin/calendar-card'
import PromptCard from '@/components/admin/prompt-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    console.error('[Alex] ❌ Detected Next.js error page HTML in error message, filtering out')
    return 'The chat API route was not found. Please check that the route exists and refresh the page.'
  }
  
  return text
}

const getMessageContent = (message: any): string => {
  // Defensive check - ensure message exists
  if (!message || typeof message !== 'object') {
    console.warn('[Alex] ⚠️ getMessageContent called with invalid message:', message)
    return ""
  }
  
  // Debug logging
  console.log('[Alex] 🔍 getMessageContent called with message:', {
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
      console.log('[Alex] ✅ Returning string content, length:', content.length)
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
      console.log('[Alex] ✅ Returning content array, length:', result.length)
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
      console.log('[Alex] ✅ Returning parts array, length:', result.length)
      return result
    }
  }

  console.warn('[Alex] ⚠️ getMessageContent returning empty string for message:', message.id)
  return ""
}

// Helper function to extract email preview data from a message (similar to extractEmailPreview in useEffect)
const getEmailPreviewFromMessage = (message: any): any | null => {
  if (!message || message.role !== 'assistant') return null
  
  const extractEmailPreview = (result: any): any | null => {
    if (!result || typeof result !== 'object' || Array.isArray(result)) return null
    
    const htmlValue = result.html
    if (!htmlValue || typeof htmlValue !== 'string') return null
    
    const trimmedHtml = htmlValue.trim()
    if (!trimmedHtml.startsWith('<') && !trimmedHtml.startsWith('<!DOCTYPE')) return null
    if (!result.subjectLine || typeof result.subjectLine !== 'string') return null
    if (result.error) return null
    
    return {
      subject: result.subjectLine,
      preview: result.preview || htmlValue.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
      html: htmlValue,
      targetSegment: result.data?.targetSegment || result.targetSegment || 'All Subscribers',
      targetCount: result.data?.targetCount || result.targetCount || 2746,
      campaignType: result.type || 'resend', // 'loops_campaign' or 'resend'
      campaignData: result.data || null, // Store full campaign data for Loops campaigns
      // Flodesk workflow fields
      status: result.status || result.emailPreview?.status || 'draft',
      sentDate: result.sentDate || result.emailPreview?.sentDate || null,
      flodeskCampaignName: result.flodeskCampaignName || result.emailPreview?.flodeskCampaignName || null,
      analytics: result.analytics || result.emailPreview?.analytics || null
    }
  }
  
  // Check toolInvocations first
  const toolInvocations = (message as any).toolInvocations
  if (toolInvocations && Array.isArray(toolInvocations)) {
    for (const invocation of toolInvocations) {
      if (invocation.toolName === 'compose_email' && invocation.result) {
        const emailPreview = extractEmailPreview(invocation.result)
        if (emailPreview) return emailPreview
      }
      
      if (invocation.toolName === 'compose_email_draft' && invocation.result) {
        const emailPreview = extractEmailPreview(invocation.result)
        if (emailPreview) return emailPreview
      }
      
      if (invocation.toolName === 'create_email_sequence' && invocation.result) {
        const result = invocation.result
        if (result.emails && Array.isArray(result.emails) && result.emails.length > 0) {
          const lastSuccessfulEmail = [...result.emails].reverse().find((e: any) => e.readyToSend && e.html && e.subjectLine)
          if (lastSuccessfulEmail) {
            const emailPreview = extractEmailPreview(lastSuccessfulEmail)
            if (emailPreview) {
              emailPreview.sequenceName = result.sequenceName
              emailPreview.sequenceEmails = result.emails
              emailPreview.isSequence = true
              emailPreview.sequenceIndex = result.emails.indexOf(lastSuccessfulEmail)
              emailPreview.sequenceTotal = result.emails.length
              return emailPreview
            }
          }
        }
      }
    }
  }
  
  // Check parts array
  const parts = (message as any).parts
  if (parts && Array.isArray(parts)) {
    for (const part of parts) {
      const partAny = part as any
      
      if (partAny.type === 'tool-result' && partAny.toolName === 'compose_email' && partAny.result) {
        let result = partAny.result
        if (typeof result === 'string') {
          try {
            result = JSON.parse(result)
          } catch (e) {
            continue
          }
        }
        const emailPreview = extractEmailPreview(result)
        if (emailPreview) return emailPreview
      }
      
      if (partAny.type === 'tool-result' && partAny.toolName === 'compose_email_draft' && partAny.result) {
        let result = partAny.result
        if (typeof result === 'string') {
          try {
            result = JSON.parse(result)
          } catch (e) {
            continue
          }
        }
        const emailPreview = extractEmailPreview(result)
        if (emailPreview) return emailPreview
      }
      
      if (partAny.type === 'tool-result' && partAny.toolName === 'create_email_sequence' && partAny.result) {
        let result = partAny.result
        if (typeof result === 'string') {
          try {
            result = JSON.parse(result)
          } catch (e) {
            continue
          }
        }
        if (result.emails && Array.isArray(result.emails) && result.emails.length > 0) {
          const lastSuccessfulEmail = [...result.emails].reverse().find((e: any) => e.readyToSend && e.html && e.subjectLine)
          if (lastSuccessfulEmail) {
            const emailPreview = extractEmailPreview(lastSuccessfulEmail)
            if (emailPreview) {
              emailPreview.sequenceName = result.sequenceName
              emailPreview.sequenceEmails = result.emails
              emailPreview.isSequence = true
              emailPreview.sequenceIndex = result.emails.indexOf(lastSuccessfulEmail)
              emailPreview.sequenceTotal = result.emails.length
              return emailPreview
            }
          }
        }
      }
    }
  }
  
  return null
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
  const [manualEdits, setManualEdits] = useState<Record<string, string>>({}) // Track manual HTML edits per message ID
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([])
  const [availableSegments, setAvailableSegments] = useState<any[]>([])
  const [showEmailLibrary, setShowEmailLibrary] = useState(false) // Show/hide email library
  const [activeTab, setActiveTab] = useState<'chat' | 'email-drafts' | 'captions' | 'calendars' | 'prompts'>('chat')
  
  // Creative content library state
  const [captions, setCaptions] = useState<any[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  const [prompts, setPrompts] = useState<any[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  
  // Loading and error states
  const [toolLoading, setToolLoading] = useState<string | null>(null) // Track which tool is loading
  const [toolErrors, setToolErrors] = useState<Record<string, string>>({}) // Track tool errors
  const [executingTool, setExecutingTool] = useState<string | null>(null) // Track tool execution from toolInvocations
  
  // Fetch functions for creative content library
  const fetchCaptions = async () => {
    try {
      setLoadingLibrary(true)
      const res = await fetch('/api/admin/creative-content/captions')
      const data = await res.json()
      setCaptions(data.captions || [])
    } catch (error) {
      console.error('Error fetching captions:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }

  const fetchCalendars = async () => {
    try {
      setLoadingLibrary(true)
      const res = await fetch('/api/admin/creative-content/calendars')
      const data = await res.json()
      setCalendars(data.calendars || [])
    } catch (error) {
      console.error('Error fetching calendars:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }

  const fetchPrompts = async () => {
    try {
      setLoadingLibrary(true)
      const res = await fetch('/api/admin/creative-content/prompts')
      const data = await res.json()
      setPrompts(data.prompts || [])
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }

  // Fetch library data when activeTab changes
  useEffect(() => {
    if (activeTab === 'email-drafts') {
      // Email library handles its own fetching
    } else if (activeTab === 'captions') {
      fetchCaptions()
    } else if (activeTab === 'calendars') {
      fetchCalendars()
    } else if (activeTab === 'prompts') {
      fetchPrompts()
    }
  }, [activeTab])

  // Also fetch on initial mount to populate counts in tab badges
  useEffect(() => {
    fetchCaptions()
    fetchCalendars()
    fetchPrompts()
  }, [])
  
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
  console.log('[Alex] 🔗 useChat configured with apiEndpoint:', finalApiEndpoint)

  // Memoize transport to prevent recreation on every render (fixes "Cannot set properties of undefined" error)
  const transportInstance = useMemo(() => {
    try {
      return new DefaultChatTransport({ 
        api: finalApiEndpoint,
      }) as any
    } catch (error) {
      console.error('[Alex] ❌ Error creating DefaultChatTransport:', error)
      return null
    }
  }, [finalApiEndpoint])

  // Use DefaultChatTransport with as any to handle AI SDK version mismatches (like Maya chat does)
  // Our route returns custom SSE format compatible with DefaultChatTransport
  // Memoize transport to prevent recreation issues
  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport: transportInstance,
    body: { chatId },
    onToolCall: async (toolCall: any) => {
      // Log when tool is called
      console.log('[Alex] 🔧 Tool call started:', toolCall.toolName)
      setExecutingTool(toolCall.toolName)
      setToolLoading(toolCall.toolName)
    },
    onToolResult: async (toolResult: any) => {
      // Log when tool result arrives
      console.log('[Alex] 🎯 Tool result received:', {
        toolName: toolResult.toolName,
        hasResult: !!toolResult.result,
        hasEmailPreview: !!toolResult.result?.email_preview_data,
        hasCaptionData: !!toolResult.result?.data?.captionText,
        hasSequenceData: !!toolResult.result?.emails,
        resultKeys: toolResult.result ? Object.keys(toolResult.result) : []
      })

      // Auto-refresh libraries when relevant tools complete
      if (toolResult.toolName === 'create_instagram_caption') {
        // Refresh captions library if on captions tab, or always update count
        fetchCaptions()
      } else if (toolResult.toolName === 'create_content_calendar') {
        // Refresh calendars library
        fetchCalendars()
      } else if (toolResult.toolName === 'suggest_maya_prompts') {
        // Refresh prompts library
        fetchPrompts()
      } else if (toolResult.toolName === 'compose_email_draft') {
        // Email library handles its own refresh, but we could trigger it here if needed
        // The EmailDraftsLibrary component has its own refresh mechanism
      }
      
      // Update streaming message with tool result for immediate card rendering
      setStreamingMessage((prev: any) => {
        if (!prev) {
          // Create new streaming message if none exists
          return {
            id: `streaming-${Date.now()}`,
            role: 'assistant',
            content: '',
            toolInvocations: [{
              toolName: toolResult.toolName,
              result: toolResult.result
            }]
          }
        }
        
        // Add tool result to existing streaming message
        const existingInvocation = prev.toolInvocations?.find((inv: any) => inv.toolName === toolResult.toolName)
        if (existingInvocation) {
          // Update existing invocation
          return {
            ...prev,
            toolInvocations: prev.toolInvocations.map((inv: any) =>
              inv.toolName === toolResult.toolName
                ? { ...inv, result: toolResult.result }
                : inv
            )
          }
        } else {
          // Add new invocation
          return {
            ...prev,
            toolInvocations: [...(prev.toolInvocations || []), {
              toolName: toolResult.toolName,
              result: toolResult.result
            }]
          }
        }
      })
      
      // Clear loading state
      setExecutingTool(null)
      setToolLoading(null)
      
      // Auto-refresh libraries when relevant tools complete
      if (toolResult.toolName === 'create_instagram_caption') {
        // Refresh captions library to show new caption
        fetchCaptions()
      } else if (toolResult.toolName === 'create_content_calendar') {
        // Refresh calendars library to show new calendar
        fetchCalendars()
      } else if (toolResult.toolName === 'suggest_maya_prompts') {
        // Refresh prompts library to show new prompts
        fetchPrompts()
      } else if (toolResult.toolName === 'compose_email_draft') {
        // Email library handles its own refresh via its component
        // The EmailDraftsLibrary component has its own refresh mechanism
      }
      
      // Force immediate re-render by updating toolResultsVersion
      // This ensures cards appear as soon as tool results arrive
      setToolResultsVersion(prev => {
        const newVersion = prev + 1
        console.log('[Alex] 🔄 Forcing immediate re-render for tool result (version:', newVersion, ')')
        return newVersion
      })
    },
    onResponse: async (response: any) => {
      // Safety check: don't update state if component is unmounted
      if (!isMountedRef.current) {
        console.warn('[Alex] ⚠️ Component unmounted, skipping onResponse')
        return
      }
      
      try {
        // DEBUG: Check if body is consumed (should be false!)
        console.log('[Alex] 🔍 Response received:', {
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
          console.error('[Alex] ❌ ERROR: Response body was consumed in onResponse!')
        }
      } catch (error: any) {
        console.error('[Alex] ❌ Error in onResponse:', error)
        // Don't crash the component if onResponse fails
      }
    },
    onFinish: (message: any) => {
      // Safety check: don't update state if component is unmounted
      if (!isMountedRef.current) {
        console.warn('[Alex] ⚠️ Component unmounted, skipping onFinish')
        return
      }
      
      try {
        console.log('[Alex] ✅ Message finished:', message)
        // Clear streaming message when message is finished
        // The completed message will be in the messages array
        setStreamingMessage(null)
      } catch (error: any) {
        console.error('[Alex] ❌ Error in onFinish:', error)
      }
    },
    onError: (error: any) => {
      // Safety check: don't update state if component is unmounted
      if (!isMountedRef.current) {
        console.warn('[Alex] ⚠️ Component unmounted, skipping onError')
        return
      }
      
      try {
        console.error("[Alex] ❌ Chat error:", error)
        setToolLoading(null)
        setExecutingTool(null)
        
        // Filter out Next.js error page HTML from error messages
        let errorMessage = error.message || "An error occurred"
        errorMessage = filterErrorPageHTML(errorMessage)
        
        setToolErrors(prev => ({ ...prev, general: errorMessage }))
      } catch (err: any) {
        console.error('[Alex] ❌ Error in onError handler:', err)
        // Don't crash the component if error handler fails
      }
    },
  } as any)

  const isLoading = status === "submitted" || status === "streaming"

  // Debug: Log tool invocations in messages
  useEffect(() => {
    messages.forEach((msg: any) => {
      if (msg.role === 'assistant' && msg.toolInvocations) {
        msg.toolInvocations.forEach((inv: any) => {
          if (inv.toolName === 'create_instagram_caption' || inv.toolName === 'suggest_maya_prompts') {
            console.log('[Alex] 🔍 Tool invocation in message:', {
              toolName: inv.toolName,
              hasResult: !!inv.result,
              resultType: typeof inv.result,
              resultIsString: typeof inv.result === 'string',
              resultKeys: inv.result && typeof inv.result === 'object' ? Object.keys(inv.result) : [],
              fullInvocation: inv
            })
          }
        })
      }
    })
  }, [messages])

  // Track streaming message with tool results for real-time card rendering
  const [streamingMessage, setStreamingMessage] = useState<any>(null)
  
  // Combine completed messages + streaming message for real-time card rendering
  const displayMessages = useMemo(() => {
    if (streamingMessage && status === 'streaming') {
      // Check if streaming message is already in messages (to avoid duplicates)
      const isInMessages = messages.some((m: any) => 
        m.id === streamingMessage.id || 
        (m.role === 'assistant' && m.toolInvocations?.some((inv: any) => 
          streamingMessage.toolInvocations?.some((sInv: any) => 
            inv.toolName === sInv.toolName && inv.result === sInv.result
          )
        ))
      )
      
      if (!isInMessages) {
        return [...messages, streamingMessage]
      }
    }
    return messages
  }, [messages, streamingMessage, status])
  
  // Force re-render when tool invocations complete to show preview cards immediately
  // This ensures cards appear as soon as tool results arrive, not waiting for message completion
  const [toolResultsVersion, setToolResultsVersion] = useState(0)
  const lastToolResultsHash = useRef<string>('')
  
  useEffect(() => {
    // Create a hash of all tool results to detect changes
    const toolResultsHash = messages
      .filter((msg: any) => msg.role === 'assistant' && msg.toolInvocations)
      .map((msg: any) => {
        const invocations = msg.toolInvocations || []
        return invocations
          .filter((inv: any) => inv.result)
          .map((inv: any) => {
            // Create a stable hash of the tool result
            const resultStr = typeof inv.result === 'string' 
              ? inv.result.substring(0, 200)
              : JSON.stringify(inv.result).substring(0, 200)
            return `${inv.toolName}-${resultStr.length}-${resultStr.slice(0, 50)}`
          })
          .join('|')
      })
      .join('||')
    
    // Only update if hash changed (new tool results arrived)
    if (toolResultsHash !== lastToolResultsHash.current && toolResultsHash.length > 0) {
      const previousHash = lastToolResultsHash.current
      lastToolResultsHash.current = toolResultsHash
      
      // Log tool result arrival for debugging
      messages.forEach((msg: any) => {
        if (msg.role === 'assistant' && msg.toolInvocations) {
          msg.toolInvocations.forEach((inv: any) => {
            if (inv.result) {
              console.log('[Alex] 🎯 Tool result detected:', {
                toolName: inv.toolName,
                hasResult: !!inv.result,
                resultType: typeof inv.result,
                messageId: msg.id,
                resultPreview: typeof inv.result === 'object' 
                  ? Object.keys(inv.result).join(', ')
                  : String(inv.result).substring(0, 50)
              })
            }
          })
        }
      })
      
      // Increment version to force re-render
      setToolResultsVersion(prev => {
        const newVersion = prev + 1
        console.log('[Alex] 🔄 Forcing re-render for tool results (version:', newVersion, ')')
        return newVersion
      })
    }
  }, [messages]) // Only depend on messages, not toolResultsVersion

  // Add status logging
  useEffect(() => {
    console.log('[Alex] 🔄 Status changed to:', status, {
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

        console.log("[Alex] Loading chat from URL:", url)

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.status}`)
        }

        const data = await response.json()
        console.log("[Alex] Loaded chat ID:", data.chatId, "Messages:", data.messages?.length, "Title:", data.chatTitle)

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
          console.log("[Alex] Setting messages:", formattedMessages.length)
          setMessages(formattedMessages)
        } else {
          console.log("[Alex] No messages to load, setting empty array")
          setMessages([])
        }

        setShowHistory(false)
      } catch (error) {
        console.error("[Alex] Error loading chat:", error)
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

  // Email preview comes directly from useChat's tool results
  // No reload needed - tool results are available in real-time via toolInvocations
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
        console.log("[Alex] ChatId set but no messages detected, reloading chat...")
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
      console.error('[Alex] Chat error:', error)
      
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
        console.warn(`[Alex] ⚠️ Invalid email preview data in ${source}: html is not a string`, {
          htmlType: typeof htmlValue,
          hasHtml: !!htmlValue
        })
        return null
      }
      
      const trimmedHtml = htmlValue.trim()
      if (!trimmedHtml.startsWith('<') && !trimmedHtml.startsWith('<!DOCTYPE')) {
        console.warn(`[Alex] ⚠️ Invalid email preview data in ${source}: html does not start with < or <!DOCTYPE`, {
          htmlStartsWith: trimmedHtml.substring(0, 50),
          htmlLength: trimmedHtml.length,
          isPlainText: !trimmedHtml.includes('<')
        })
        return null
      }
      
      if (!result.subjectLine || typeof result.subjectLine !== 'string') {
        console.warn(`[Alex] ⚠️ Invalid email preview data in ${source}: subjectLine is missing or not a string`)
        return null
      }
      
      if (result.error) {
        console.warn(`[Alex] ⚠️ Email preview has error in ${source}:`, result.error)
        return null
      }
      
      // Valid email preview data
      return {
        subject: result.subjectLine,
        preview: result.preview || htmlValue.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
        html: htmlValue, // Use validated HTML
        targetSegment: result.data?.targetSegment || result.targetSegment || 'All Subscribers',
        targetCount: result.data?.targetCount || result.targetCount || 2746,
        campaignType: result.type || 'resend', // 'loops_campaign' or 'resend'
        campaignData: result.data || null, // Store full campaign data for Loops campaigns
        // Flodesk workflow fields
        status: result.status || result.emailPreview?.status || 'draft',
        sentDate: result.sentDate || result.emailPreview?.sentDate || null,
        flodeskCampaignName: result.flodeskCampaignName || result.emailPreview?.flodeskCampaignName || null,
        analytics: result.analytics || result.emailPreview?.analytics || null
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
              console.log('[Alex] ✅ Email preview found in toolInvocations', {
                htmlLength: emailPreviewData.html.length,
                htmlPreview: emailPreviewData.html.substring(0, 100),
                htmlStartsWith: emailPreviewData.html.substring(0, 20),
                subjectLine: emailPreviewData.subject,
                hasPreview: !!emailPreviewData.preview
              })
              
              console.log('[Alex] 📧 Setting email preview with data:', {
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
          
          // Check for compose_email_draft tool
          if (invocation.toolName === 'compose_email_draft' && invocation.result) {
            const emailPreviewData = extractEmailPreview(invocation.result, 'toolInvocations')
            
            if (emailPreviewData) {
              console.log('[Alex] ✅ Email draft preview found in toolInvocations', {
                htmlLength: emailPreviewData.html.length,
                htmlPreview: emailPreviewData.html.substring(0, 100),
                htmlStartsWith: emailPreviewData.html.substring(0, 20),
                subjectLine: emailPreviewData.subject,
                hasPreview: !!emailPreviewData.preview
              })
              
              latestEmailPreview = emailPreviewData
              foundValidEmailPreview = true
              break // Found valid preview, stop searching
            }
          }
          
          // Check for create_email_sequence tool
          if (invocation.toolName === 'create_email_sequence' && invocation.result) {
            const result = invocation.result
            // Sequence tool returns an array of emails - show the last successful one
            if (result.emails && Array.isArray(result.emails) && result.emails.length > 0) {
              // Find the last successful email (most recent in sequence)
              const lastSuccessfulEmail = [...result.emails].reverse().find((e: any) => e.readyToSend && e.html && e.subjectLine)
              
              if (lastSuccessfulEmail) {
                const emailPreviewData = extractEmailPreview(lastSuccessfulEmail, 'create_email_sequence')
                
                if (emailPreviewData) {
                  // Add sequence metadata
                  emailPreviewData.sequenceName = result.sequenceName
                  emailPreviewData.sequenceEmails = result.emails
                  emailPreviewData.isSequence = true
                  emailPreviewData.sequenceIndex = result.emails.indexOf(lastSuccessfulEmail)
                  emailPreviewData.sequenceTotal = result.emails.length
                  
                  console.log('[Alex] ✅ Email sequence preview found in toolInvocations', {
                    sequenceName: result.sequenceName,
                    totalEmails: result.emails.length,
                    showingEmail: emailPreviewData.sequenceIndex + 1,
                    htmlLength: emailPreviewData.html.length,
                    subjectLine: emailPreviewData.subject
                  })
                  
                  latestEmailPreview = emailPreviewData
                  foundValidEmailPreview = true
                  break // Found valid preview, stop searching
                }
              }
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
                console.warn('[Alex] ⚠️ Could not parse result as JSON:', e)
                continue
              }
            }
            
            const emailPreviewData = extractEmailPreview(result, 'parts')
            
            if (emailPreviewData) {
              console.log('[Alex] ✅ Email preview found in parts', {
                htmlLength: emailPreviewData.html.length,
                htmlPreview: emailPreviewData.html.substring(0, 100),
                htmlStartsWith: emailPreviewData.html.substring(0, 20),
                subjectLine: emailPreviewData.subject,
                hasPreview: !!emailPreviewData.preview
              })
              
              console.log('[Alex] 📧 Setting email preview with data:', {
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
          
          // Check for compose_email_draft tool result
          if (partAny.type === 'tool-result' && partAny.toolName === 'compose_email_draft' && partAny.result) {
            let result = partAny.result
            
            // Handle stringified JSON
            if (typeof result === 'string') {
              try {
                result = JSON.parse(result)
              } catch (e) {
                console.warn('[Alex] ⚠️ Could not parse draft result as JSON:', e)
                continue
              }
            }
            
            const emailPreviewData = extractEmailPreview(result, 'parts')
            
            if (emailPreviewData) {
              console.log('[Alex] ✅ Email draft preview found in parts', {
                htmlLength: emailPreviewData.html.length,
                htmlPreview: emailPreviewData.html.substring(0, 100),
                htmlStartsWith: emailPreviewData.html.substring(0, 20),
                subjectLine: emailPreviewData.subject,
                hasPreview: !!emailPreviewData.preview
              })
              
              latestEmailPreview = emailPreviewData
              foundValidEmailPreview = true
              break // Found valid preview, stop searching
            }
          }
          
          // Check for create_email_sequence tool result
          if (partAny.type === 'tool-result' && partAny.toolName === 'create_email_sequence' && partAny.result) {
            let result = partAny.result
            
            // Handle stringified JSON
            if (typeof result === 'string') {
              try {
                result = JSON.parse(result)
              } catch (e) {
                console.warn('[Alex] ⚠️ Could not parse sequence result as JSON:', e)
                continue
              }
            }
            
            // Sequence tool returns an array of emails - show the last successful one
            if (result.emails && Array.isArray(result.emails) && result.emails.length > 0) {
              // Find the last successful email (most recent in sequence)
              const lastSuccessfulEmail = [...result.emails].reverse().find((e: any) => e.readyToSend && e.html && e.subjectLine)
              
              if (lastSuccessfulEmail) {
                const emailPreviewData = extractEmailPreview(lastSuccessfulEmail, 'create_email_sequence')
                
                if (emailPreviewData) {
                  // Add sequence metadata
                  emailPreviewData.sequenceName = result.sequenceName
                  emailPreviewData.sequenceEmails = result.emails
                  emailPreviewData.isSequence = true
                  emailPreviewData.sequenceIndex = result.emails.indexOf(lastSuccessfulEmail)
                  emailPreviewData.sequenceTotal = result.emails.length
                  
                  console.log('[Alex] ✅ Email sequence preview found in parts', {
                    sequenceName: result.sequenceName,
                    totalEmails: result.emails.length,
                    showingEmail: emailPreviewData.sequenceIndex + 1,
                    htmlLength: emailPreviewData.html.length,
                    subjectLine: emailPreviewData.subject
                  })
                  
                  latestEmailPreview = emailPreviewData
                  foundValidEmailPreview = true
                  break // Found valid preview, stop searching
                }
              }
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
      // Create a more robust hash that includes more of the HTML to detect edits
      // Use first 200 chars + middle 200 chars + last 200 chars + length for better change detection
      const htmlStart = latestEmailPreview.html.substring(0, 200)
      const htmlMiddle = latestEmailPreview.html.substring(
        Math.floor(latestEmailPreview.html.length / 2) - 100,
        Math.floor(latestEmailPreview.html.length / 2) + 100
      )
      const htmlEnd = latestEmailPreview.html.substring(Math.max(0, latestEmailPreview.html.length - 200))
      const previewHash = `${latestEmailPreview.subject}-${htmlStart}-${htmlMiddle}-${htmlEnd}-${latestEmailPreview.html.length}`
      
      // Only update if the preview has changed
      if (previewHash !== lastEmailPreviewHashRef.current) {
        console.log('[Alex] 📧 Email preview changed, updating...', {
          oldHash: lastEmailPreviewHashRef.current?.substring(0, 50),
          newHash: previewHash.substring(0, 50),
          subject: latestEmailPreview.subject,
          htmlLength: latestEmailPreview.html.length,
          htmlStart: latestEmailPreview.html.substring(0, 50)
        })
        setEmailPreview(latestEmailPreview)
        lastEmailPreviewHashRef.current = previewHash
      } else {
        console.log('[Alex] 📧 Email preview hash unchanged, but checking if it\'s from a different message...')
        // Even if hash is same, if HTML content differs, we should still update
        // This handles the case where Alex makes a small edit that doesn't change the hash
        // but we still want to show the latest version
        if (emailPreview && emailPreview.html !== latestEmailPreview.html) {
          console.log('[Alex] 📧 HTML content differs even though hash is same - updating anyway')
          setEmailPreview(latestEmailPreview)
          lastEmailPreviewHashRef.current = previewHash
        } else {
          console.log('[Alex] 📧 Email preview unchanged, skipping update')
        }
      }
    } else if (!foundValidEmailPreview && emailPreview) {
      // If we didn't find a valid email preview in any message, but we have one set,
      // check if it's still valid (not from an old message)
      // Validate current email preview HTML is still valid
      if (emailPreview.html && typeof emailPreview.html === 'string') {
        const html = emailPreview.html.trim()
        if (!html.startsWith('<') && !html.startsWith('<!DOCTYPE')) {
          console.warn('[Alex] ⚠️ Current email preview has invalid HTML, clearing it')
          setEmailPreview(null)
          lastEmailPreviewHashRef.current = null
        }
      } else {
        console.warn('[Alex] ⚠️ Current email preview has no HTML, clearing it')
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
      
      // Use /chats POST endpoint for consistency (will default to "New Chat" since no firstMessage)
      const response = await fetch(chatsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mode: null
          // No firstMessage - will default to "New Chat"
        })
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

      console.log("[Alex] New chat created:", data.chatId)
    } catch (error) {
      console.error("[Alex] Error creating new chat:", error)
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
      console.error('[Alex] Failed to fetch gallery images:', error)
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
          // Create new chat with title generated from first message
          // Use /chats POST endpoint which generates titles from firstMessage
          const firstMessageText = inputValue.trim()
          const newChatResponse = await fetch(chatsEndpoint, { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              mode: null,
              firstMessage: firstMessageText
            })
          })
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
    // CRITICAL: Pass chatId explicitly in the options body to ensure it's sent correctly
    // The useChat body parameter might be stale, so we override it per-call
    try {
      if (typeof messageContent === 'string') {
        // Use sendMessage with explicit body override in options (second parameter)
        // This overrides the stale body from useChat hook
        await sendMessage(
          { text: messageContent },
          { body: { chatId: currentChatId } } // Pass chatId in options.body to override stale useChat body
        )
      } else {
        // For multi-part messages, sendMessage expects a message object
        await sendMessage(
          { 
            role: 'user',
            content: messageContent as any
          },
          { body: { chatId: currentChatId } } // Pass chatId in options.body to override stale useChat body
        )
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

        {/* Tabs for Chat and Libraries */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col min-h-0 gap-0">
          <div className="border-b border-stone-200 bg-white shrink-0">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="chat" 
                className="px-4 py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-stone-900 rounded-none"
              >
                Chat
              </TabsTrigger>
              <TabsTrigger 
                value="email-drafts" 
                className="px-4 py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-stone-900 rounded-none"
              >
                Email Drafts
              </TabsTrigger>
              <TabsTrigger 
                value="captions" 
                className="px-4 py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-stone-900 rounded-none"
              >
                Captions ({captions.length})
              </TabsTrigger>
              <TabsTrigger 
                value="calendars" 
                className="px-4 py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-stone-900 rounded-none"
              >
                Calendars ({calendars.length})
              </TabsTrigger>
              <TabsTrigger 
                value="prompts" 
                className="px-4 py-3 text-sm data-[state=active]:border-b-2 data-[state=active]:border-stone-900 rounded-none"
              >
                Prompts ({prompts.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 min-h-0"
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
                <div className="flex flex-col items-center justify-center h-full -mt-20">
                  <div className="text-center text-stone-900 px-4 mb-12">
                    <p className="text-2xl font-semibold mb-3">Start a conversation</p>
                    <p className="text-base text-stone-600">Ask me anything about your business, strategy, or growth!</p>
                  </div>
                  
                  {/* Quick Actions - Inside Chat Area */}
                  {showQuickActions && !toolLoading && (
                    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6">
                      <EmailQuickActions
                        onAction={async (category, prompt) => {
                          setShowQuickActions(false)
                          await sendMessage({ text: prompt })
                        }}
                        disabled={isLoading || !!toolLoading}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
                  {(() => {
                    // Only log on client to avoid hydration mismatches
                    if (typeof window !== 'undefined') {
                      console.log('[Alex] 📋 Rendering messages:', {
                        count: messages.length,
                        toolResultsVersion,
                        messages: messages.map((m: any) => ({
                          id: m.id,
                          role: m.role,
                          hasContent: !!m.content,
                          contentType: typeof m.content,
                          hasParts: !!m.parts,
                          hasToolInvocations: !!(m as any).toolInvocations,
                          toolInvocationsCount: (m as any).toolInvocations?.length || 0,
                          toolInvocationsWithResults: (m as any).toolInvocations?.filter((inv: any) => inv.result)?.length || 0,
                          contentPreview: typeof m.content === 'string' 
                            ? m.content.substring(0, 50) 
                            : 'not a string'
                        }))
                      })
                    }
                    return null
                  })()}
                  {displayMessages.map((message) => (
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
                              let messageEmailPreview = getEmailPreviewFromMessage(message)
                              
                              // Merge manual edits if they exist for this message
                              if (messageEmailPreview && manualEdits[message.id]) {
                                messageEmailPreview = {
                                  ...messageEmailPreview,
                                  html: manualEdits[message.id],
                                  preview: manualEdits[message.id].replace(/<[^>]*>/g, '').substring(0, 200) + '...'
                                }
                              }
                              
                              console.log('[Alex] 📝 Rendering assistant message content:', {
                                messageId: message.id,
                                contentLength: content.length,
                                contentPreview: content.substring(0, 100),
                                isEmpty: !content.trim(),
                                hasEmailPreview: !!messageEmailPreview,
                                hasManualEdit: !!manualEdits[message.id],
                                hasToolInvocations: !!(message as any).toolInvocations,
                                toolInvocationsCount: (message as any).toolInvocations?.length || 0,
                                toolNames: (message as any).toolInvocations?.map((inv: any) => inv.toolName) || [],
                                emailPreviewSubject: messageEmailPreview?.subject,
                                emailPreviewHtmlLength: messageEmailPreview?.html?.length
                              })
                              // Fallback to plain text if content is very short or ReactMarkdown fails
                              if (!content.trim() && !messageEmailPreview) {
                                return <div className="text-stone-500 italic">Empty message</div>
                              }
                              return (
                                <>
                                  {content.trim() && (
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
                                  )}
                                  {messageEmailPreview && (
                                    <div className="mt-4" key={`email-preview-${message.id}`}>
                                      <EmailPreviewCard
                                        key={`email-card-${message.id}-${messageEmailPreview.html.substring(0, 50)}`}
                                        subject={messageEmailPreview.subject}
                                        preview={messageEmailPreview.preview}
                                        htmlContent={messageEmailPreview.html}
                                        targetSegment={messageEmailPreview.targetSegment || 'All Subscribers'}
                                        targetCount={messageEmailPreview.targetCount || 2746}
                                        campaignType={messageEmailPreview.campaignType || 'resend'}
                                        isSequence={messageEmailPreview.isSequence || false}
                                        sequenceName={messageEmailPreview.sequenceName}
                                        sequenceEmails={messageEmailPreview.sequenceEmails}
                                        sequenceIndex={messageEmailPreview.sequenceIndex}
                                        sequenceTotal={messageEmailPreview.sequenceTotal}
                                        status={messageEmailPreview.status || 'draft'}
                                        sentDate={messageEmailPreview.sentDate}
                                        flodeskCampaignName={messageEmailPreview.flodeskCampaignName}
                                        analytics={messageEmailPreview.analytics}
                                        createdAt={message.createdAt}
                                        onEdit={async () => {
                                          if (!messageEmailPreview) {
                                            toast({
                                              title: "Error",
                                              description: "Email preview is no longer available",
                                              variant: "destructive"
                                            })
                                            return
                                          }
                                          // Always use compose_email tool
                                          const toolName = 'compose_email'
                                          const editPrompt = `I want to edit this email. Please use the ${toolName} tool with the previousVersion parameter.

CRITICAL INSTRUCTIONS:
1. You MUST call the ${toolName} tool (do not just describe changes)
2. Use the previousVersion parameter and pass the HTML below
3. Make the specific changes I request while keeping the overall structure and style

Current email HTML to use as previousVersion:
${messageEmailPreview.html || ''}

Current subject: ${messageEmailPreview.subject || ''}

Please make the edits I request using the ${toolName} tool.`
                                          await sendMessage({ text: editPrompt })
                                        }}
                                        onManualEdit={async (editedHtml: string) => {
                                          if (!messageEmailPreview) {
                                            toast({
                                              title: "Error",
                                              description: "Email preview is no longer available",
                                              variant: "destructive"
                                            })
                                            return
                                          }
                                          // Update the manual edit state immediately for UI feedback
                                          setManualEdits(prev => ({
                                            ...prev,
                                            [message.id]: editedHtml
                                          }))
                                          
                                          const manualEditPrompt = `I've manually edited the email HTML. Please use this edited version as the previousVersion and apply any additional refinements I request.

Here's the manually edited email HTML to use as previousVersion:
${editedHtml}

Current subject: ${messageEmailPreview.subject || ''}

Please acknowledge you've received the edited HTML and are ready to make further refinements if needed.`
                                          await sendMessage({ text: manualEditPrompt })
                                        }}
                                        onApprove={async () => {
                                          await sendMessage({ text: 'Approve and send this email now' })
                                        }}
                                        onSchedule={async () => {
                                          await sendMessage({ text: 'Schedule this email for later' })
                                        }}
                                        onSendTest={async (testEmail?: string) => {
                                          if (!messageEmailPreview) {
                                            toast({
                                              title: "Error",
                                              description: "Email preview is no longer available",
                                              variant: "destructive"
                                            })
                                            return
                                          }
                                          // Use manually edited HTML if available, otherwise use original
                                          const htmlToSend = manualEdits[message.id] || messageEmailPreview.html
                                          try {
                                            const response = await fetch('/api/admin/agent/send-test-email', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                subject: messageEmailPreview.subject || '',
                                                html: htmlToSend || '',
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
                                  {/* Creative Content Cards */}
                                  {/* Check toolInvocations (live streaming) */}
                                  {(message as any).toolInvocations && Array.isArray((message as any).toolInvocations) && (
                                    <div className="mt-4 space-y-4">
                                      {(message as any).toolInvocations.map((inv: any) => {
                                        // Debug logging
                                        if (inv.toolName === 'create_instagram_caption' || inv.toolName === 'suggest_maya_prompts') {
                                          console.log('[Alex] 🔍 Tool invocation found:', {
                                            toolName: inv.toolName,
                                            hasResult: !!inv.result,
                                            resultType: typeof inv.result,
                                            resultKeys: inv.result ? Object.keys(inv.result) : [],
                                            resultData: inv.result?.data ? Object.keys(inv.result.data) : [],
                                            fullResult: inv.result
                                          })
                                        }
                                        
                                        // Instagram Caption cards
                                        if (inv.toolName === 'create_instagram_caption') {
                                          // Handle both string and object results
                                          let result = inv.result
                                          if (typeof result === 'string') {
                                            try {
                                              result = JSON.parse(result)
                                            } catch (e) {
                                              console.warn('[Alex] ⚠️ Could not parse caption result as JSON:', e)
                                            }
                                          }
                                          
                                          // Check for caption data in various formats
                                          let captionData = null
                                          if (result?.type === 'instagram_caption' && result?.data) {
                                            captionData = result.data
                                          } else if (result?.data) {
                                            captionData = result.data
                                          } else if (result?.caption_data) {
                                            captionData = result.caption_data
                                          } else if (result?.success && result?.data) {
                                            captionData = result.data
                                          } else if (result && !result.error) {
                                            // Fallback: use result directly if it has caption-like structure
                                            captionData = result
                                          }
                                          
                                          if (captionData && (captionData.captionText || captionData.caption || captionData.fullCaption)) {
                                            // Map the data structure to what CaptionCard expects
                                            const mappedCaption = {
                                              id: captionData.id || 0,
                                              captionText: captionData.captionText || captionData.body || captionData.caption || '',
                                              captionType: captionData.captionType || 'storytelling',
                                              hashtags: captionData.hashtags || [],
                                              hook: captionData.hook || '',
                                              imageDescription: captionData.imageDescription || captionData.photoDescription || '',
                                              tone: captionData.tone || 'warm',
                                              wordCount: captionData.wordCount || 0,
                                              cta: captionData.cta || null,
                                              createdAt: captionData.createdAt || new Date().toISOString(),
                                              fullCaption: captionData.fullCaption || captionData.caption || captionData.captionText || ''
                                            }
                                            
                                            return (
                                              <div key={inv.toolCallId || `caption-${message.id}`} className="mt-4">
                                                <CaptionCard caption={mappedCaption} />
                                              </div>
                                            )
                                          }
                                        }
                                        
                                        // Content Calendar cards
                                        if (inv.toolName === 'create_content_calendar') {
                                          let result = inv.result
                                          if (typeof result === 'string') {
                                            try {
                                              result = JSON.parse(result)
                                            } catch (e) {
                                              console.warn('[Alex] ⚠️ Could not parse calendar result as JSON:', e)
                                            }
                                          }
                                          
                                          if (result?.data || result?.success) {
                                            const calendarData = result.data || result
                                            return (
                                              <div key={inv.toolCallId || `calendar-${message.id}`}>
                                                <CalendarCard calendar={calendarData} />
                                              </div>
                                            )
                                          }
                                        }
                                        
                                        // Maya Prompts cards
                                        if (inv.toolName === 'suggest_maya_prompts') {
                                          // Handle both string and object results
                                          let result = inv.result
                                          if (typeof result === 'string') {
                                            try {
                                              result = JSON.parse(result)
                                            } catch (e) {
                                              console.warn('[Alex] ⚠️ Could not parse prompt result as JSON:', e)
                                            }
                                          }
                                          
                                          const prompts = result?.data?.prompts || result?.prompts || (result?.success && result?.data?.prompts ? result.data.prompts : null)
                                          if (prompts && Array.isArray(prompts) && prompts.length > 0) {
                                            return (
                                              <div key={inv.toolCallId || `prompts-${message.id}`} className="space-y-4">
                                                {prompts.map((prompt: any) => (
                                                  <PromptCard key={prompt.id || Math.random()} prompt={prompt} />
                                                ))}
                                              </div>
                                            )
                                          }
                                        }
                                        
                                        return null
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* Check message.parts and message.content for caption data (from streaming responses) */}
                                  {(() => {
                                    // Check message.parts array
                                    const parts = (message as any).parts
                                    if (parts && Array.isArray(parts)) {
                                      for (const part of parts) {
                                        if (part.type === 'tool-result' && part.result) {
                                          let result = part.result
                                          if (typeof result === 'string') {
                                            try {
                                              result = JSON.parse(result)
                                            } catch (e) {
                                              continue
                                            }
                                          }
                                          
                                          // Check for caption data
                                          if (result?.type === 'instagram_caption' || 
                                              (result?.data && (result.data.captionText || result.data.caption || result.data.fullCaption)) ||
                                              result?.caption_data) {
                                            let captionData = null
                                            if (result?.type === 'instagram_caption' && result?.data) {
                                              captionData = result.data
                                            } else if (result?.data) {
                                              captionData = result.data
                                            } else if (result?.caption_data) {
                                              captionData = result.caption_data
                                            }
                                            
                                            if (captionData) {
                                              const mappedCaption = {
                                                id: captionData.id || 0,
                                                captionText: captionData.captionText || captionData.body || captionData.caption || '',
                                                captionType: captionData.captionType || 'storytelling',
                                                hashtags: captionData.hashtags || [],
                                                hook: captionData.hook || '',
                                                imageDescription: captionData.imageDescription || captionData.photoDescription || '',
                                                tone: captionData.tone || 'warm',
                                                wordCount: captionData.wordCount || 0,
                                                cta: captionData.cta || null,
                                                createdAt: captionData.createdAt || new Date().toISOString(),
                                                fullCaption: captionData.fullCaption || captionData.caption || captionData.captionText || ''
                                              }
                                              
                                              return (
                                                <div key={`parts-caption-${message.id}`} className="mt-4">
                                                  <CaptionCard caption={mappedCaption} />
                                                </div>
                                              )
                                            }
                                          }
                                        }
                                      }
                                    }
                                    
                                    // Check message.content array
                                    if (Array.isArray(message.content)) {
                                      for (const part of message.content) {
                                        if (part.type === 'tool-result' && part.content) {
                                          let result = part.content
                                          if (typeof result === 'string') {
                                            try {
                                              result = JSON.parse(result)
                                            } catch (e) {
                                              continue
                                            }
                                          }
                                          
                                          // Check for caption data
                                          if (result?.type === 'instagram_caption' || 
                                              (result?.data && (result.data.captionText || result.data.caption || result.data.fullCaption)) ||
                                              result?.caption_data) {
                                            let captionData = null
                                            if (result?.type === 'instagram_caption' && result?.data) {
                                              captionData = result.data
                                            } else if (result?.data) {
                                              captionData = result.data
                                            } else if (result?.caption_data) {
                                              captionData = result.caption_data
                                            }
                                            
                                            if (captionData) {
                                              const mappedCaption = {
                                                id: captionData.id || 0,
                                                captionText: captionData.captionText || captionData.body || captionData.caption || '',
                                                captionType: captionData.captionType || 'storytelling',
                                                hashtags: captionData.hashtags || [],
                                                hook: captionData.hook || '',
                                                imageDescription: captionData.imageDescription || captionData.photoDescription || '',
                                                tone: captionData.tone || 'warm',
                                                wordCount: captionData.wordCount || 0,
                                                cta: captionData.cta || null,
                                                createdAt: captionData.createdAt || new Date().toISOString(),
                                                fullCaption: captionData.fullCaption || captionData.caption || captionData.captionText || ''
                                              }
                                              
                                              return (
                                                <div key={`content-caption-${message.id}`} className="mt-4">
                                                  <CaptionCard caption={mappedCaption} />
                                                </div>
                                              )
                                            }
                                          }
                                        }
                                      }
                                    }
                                    
                                    return null
                                  })()}
                                  
                                  {/* Email Sequence Preview Card */}
                                  {(() => {
                                    // Check toolInvocations for sequence data
                                    const toolInvocations = (message as any).toolInvocations
                                    if (toolInvocations && Array.isArray(toolInvocations)) {
                                      for (const inv of toolInvocations) {
                                        if (inv.toolName === 'create_email_sequence' && inv.result) {
                                          let result = inv.result
                                          if (typeof result === 'string') {
                                            try {
                                              result = JSON.parse(result)
                                            } catch (e) {
                                              continue
                                            }
                                          }
                                          
                                          // Check for sequence data
                                          const sequenceData = result.data || result
                                          const emails = sequenceData?.emails || result?.emails || []
                                          
                                          if (emails && Array.isArray(emails) && emails.length > 0) {
                                            return (
                                              <div key={`sequence-${message.id}`} className="mt-4 space-y-4">
                                                <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
                                                  {/* Sequence Header */}
                                                  <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
                                                    <div className="flex items-center justify-between mb-2">
                                                      <span className="text-xs tracking-[0.2em] uppercase text-stone-400">
                                                        Email Sequence
                                                      </span>
                                                      <span className="text-xs text-stone-500">
                                                        {emails.length} {emails.length === 1 ? 'Email' : 'Emails'}
                                                      </span>
                                                    </div>
                                                    <h3 className="font-serif text-lg text-stone-950">
                                                      {sequenceData.sequence_name || sequenceData.sequenceName || 'Untitled Sequence'}
                                                    </h3>
                                                    {sequenceData.trigger && (
                                                      <p className="text-sm text-stone-600 mt-1">
                                                        Trigger: {sequenceData.trigger}
                                                      </p>
                                                    )}
                                                  </div>
                                                  
                                                  {/* Email List */}
                                                  <div className="divide-y divide-stone-200">
                                                    {emails.map((email: any, emailIdx: number) => {
                                                      // Handle different email data formats
                                                      const emailContent = email.content || email.html || ''
                                                      const emailSubject = email.subject || email.subjectLine || 'Untitled'
                                                      const dayOffset = email.day_offset || email.day || emailIdx + 1
                                                      
                                                      return (
                                                        <div key={emailIdx} className="p-6">
                                                          {/* Email Header */}
                                                          <div className="flex items-start justify-between mb-4">
                                                            <div>
                                                              <div className="flex items-center gap-3 mb-2">
                                                                <span className="text-xs tracking-[0.2em] uppercase text-stone-400">
                                                                  Email {emailIdx + 1}
                                                                </span>
                                                                <span className="text-xs text-stone-500">
                                                                  Day {dayOffset}
                                                                </span>
                                                              </div>
                                                              <h4 className="font-semibold text-stone-950">
                                                                {emailSubject}
                                                              </h4>
                                                            </div>
                                                            <button
                                                              onClick={() => {
                                                                if (!emailContent) return
                                                                const win = window.open('', '_blank')
                                                                if (win) {
                                                                  // Wrap email HTML in a proper HTML document structure
                                                                  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Preview - ${emailSubject}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #fafaf9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .email-container {
      max-width: 600px;
      width: 100%;
      background-color: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${emailContent}
  </div>
</body>
</html>`
                                                                  win.document.write(fullHtml)
                                                                  win.document.close()
                                                                }
                                                              }}
                                                              className="px-3 py-1 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
                                                              disabled={!emailContent}
                                                            >
                                                              Preview
                                                            </button>
                                                          </div>
                                                          
                                                          {/* Email Preview (collapsed) */}
                                                          {emailContent && (
                                                            <details className="group" open={false}>
                                                              <summary className="cursor-pointer text-sm text-stone-600 hover:text-stone-950 transition-colors">
                                                                Show content
                                                              </summary>
                                                              <div className="mt-3 p-4 bg-stone-50 rounded border border-stone-200">
                                                                <div 
                                                                  className="prose prose-sm prose-stone max-w-none"
                                                                  dangerouslySetInnerHTML={{ __html: emailContent }}
                                                                />
                                                              </div>
                                                            </details>
                                                          )}
                                                          
                                                          {/* Email Actions */}
                                                          <div className="flex gap-2 mt-4">
                                                            <button
                                                              onClick={() => {
                                                                navigator.clipboard.writeText(emailContent)
                                                              }}
                                                              className="px-3 py-1 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
                                                              disabled={!emailContent}
                                                            >
                                                              Copy HTML
                                                            </button>
                                                            <button
                                                              onClick={() => {
                                                                // Copy subject and content as text
                                                                const text = `Subject: ${emailSubject}\n\n${emailContent.replace(/<[^>]*>/g, '')}`
                                                                navigator.clipboard.writeText(text)
                                                              }}
                                                              className="px-3 py-1 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
                                                              disabled={!emailContent}
                                                            >
                                                              Copy as Text
                                                            </button>
                                                          </div>
                                                        </div>
                                                      )
                                                    })}
                                                  </div>
                                                  
                                                  {/* Sequence Actions */}
                                                  <div className="bg-stone-50 px-6 py-4 border-t border-stone-200">
                                                    <div className="flex items-center justify-between">
                                                      <p className="text-xs text-stone-600">
                                                        Review each email before proceeding
                                                      </p>
                                                      <div className="flex gap-3">
                                                        <button
                                                          onClick={() => {
                                                            // Copy entire sequence as JSON for automation
                                                            navigator.clipboard.writeText(JSON.stringify(sequenceData, null, 2))
                                                          }}
                                                          className="px-4 py-2 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
                                                        >
                                                          Copy Sequence Data
                                                        </button>
                                                      </div>
                                                    </div>
                                                    <p className="text-xs text-stone-500 mt-3">
                                                      💡 Once approved, ask Alex to "create the automation code for this sequence"
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          }
                                        }
                                      }
                                    }
                                    
                                    // Check message.parts for sequence data
                                    const parts = (message as any).parts
                                    if (parts && Array.isArray(parts)) {
                                      for (const part of parts) {
                                        if (part.type === 'tool-result' && part.result) {
                                          let result = part.result
                                          if (typeof result === 'string') {
                                            try {
                                              result = JSON.parse(result)
                                            } catch (e) {
                                              continue
                                            }
                                          }
                                          
                                          if (result?.data?.emails || result?.emails) {
                                            const sequenceData = result.data || result
                                            const emails = sequenceData.emails || result.emails || []
                                            
                                            if (emails && Array.isArray(emails) && emails.length > 0) {
                                              return (
                                                <div key={`parts-sequence-${message.id}`} className="mt-4 space-y-4">
                                                  <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
                                                    {/* Sequence Header */}
                                                    <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
                                                      <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs tracking-[0.2em] uppercase text-stone-400">
                                                          Email Sequence
                                                        </span>
                                                        <span className="text-xs text-stone-500">
                                                          {emails.length} {emails.length === 1 ? 'Email' : 'Emails'}
                                                        </span>
                                                      </div>
                                                      <h3 className="font-serif text-lg text-stone-950">
                                                        {sequenceData.sequence_name || sequenceData.sequenceName || 'Untitled Sequence'}
                                                      </h3>
                                                      {sequenceData.trigger && (
                                                        <p className="text-sm text-stone-600 mt-1">
                                                          Trigger: {sequenceData.trigger}
                                                        </p>
                                                      )}
                                                    </div>
                                                    
                                                    {/* Email List */}
                                                    <div className="divide-y divide-stone-200">
                                                      {emails.map((email: any, emailIdx: number) => {
                                                        const emailContent = email.content || email.html || ''
                                                        const emailSubject = email.subject || email.subjectLine || 'Untitled'
                                                        const dayOffset = email.day_offset || email.day || emailIdx + 1
                                                        
                                                        return (
                                                          <div key={emailIdx} className="p-6">
                                                            <div className="flex items-start justify-between mb-4">
                                                              <div>
                                                                <div className="flex items-center gap-3 mb-2">
                                                                  <span className="text-xs tracking-[0.2em] uppercase text-stone-400">
                                                                    Email {emailIdx + 1}
                                                                  </span>
                                                                  <span className="text-xs text-stone-500">
                                                                    Day {dayOffset}
                                                                  </span>
                                                                </div>
                                                                <h4 className="font-semibold text-stone-950">
                                                                  {emailSubject}
                                                                </h4>
                                                              </div>
                                                              <button
                                                                onClick={() => {
                                                                  const win = window.open('', '_blank')
                                                                  if (win && emailContent) {
                                                                    win.document.write(emailContent)
                                                                    win.document.close()
                                                                  }
                                                                }}
                                                                className="px-3 py-1 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
                                                                disabled={!emailContent}
                                                              >
                                                                Preview
                                                              </button>
                                                            </div>
                                                            
                                                            {emailContent && (
                                                              <details className="group" open={false}>
                                                                <summary className="cursor-pointer text-sm text-stone-600 hover:text-stone-950 transition-colors">
                                                                  Show content
                                                                </summary>
                                                                <div className="mt-3 p-4 bg-stone-50 rounded border border-stone-200">
                                                                  <div 
                                                                    className="prose prose-sm prose-stone max-w-none"
                                                                    dangerouslySetInnerHTML={{ __html: emailContent }}
                                                                  />
                                                                </div>
                                                              </details>
                                                            )}
                                                            
                                                            <div className="flex gap-2 mt-4">
                                                              <button
                                                                onClick={() => {
                                                                  navigator.clipboard.writeText(emailContent)
                                                                }}
                                                                className="px-3 py-1 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
                                                                disabled={!emailContent}
                                                              >
                                                                Copy HTML
                                                              </button>
                                                              <button
                                                                onClick={() => {
                                                                  const text = `Subject: ${emailSubject}\n\n${emailContent.replace(/<[^>]*>/g, '')}`
                                                                  navigator.clipboard.writeText(text)
                                                                }}
                                                                className="px-3 py-1 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
                                                                disabled={!emailContent}
                                                              >
                                                                Copy as Text
                                                              </button>
                                                            </div>
                                                          </div>
                                                        )
                                                      })}
                                                    </div>
                                                    
                                                    <div className="bg-stone-50 px-6 py-4 border-t border-stone-200">
                                                      <div className="flex items-center justify-between">
                                                        <p className="text-xs text-stone-600">
                                                          Review each email before proceeding
                                                        </p>
                                                        <div className="flex gap-3">
                                                          <button
                                                            onClick={() => {
                                                              navigator.clipboard.writeText(JSON.stringify(sequenceData, null, 2))
                                                            }}
                                                            className="px-4 py-2 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
                                                          >
                                                            Copy Sequence Data
                                                          </button>
                                                        </div>
                                                      </div>
                                                      <p className="text-xs text-stone-500 mt-3">
                                                        💡 Once approved, ask Alex to "create the automation code for this sequence"
                                                      </p>
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            }
                                          }
                                        }
                                      }
                                    }
                                    
                                    return null
                                  })()}
                                  
                                  {/* Check email_preview_data for saved caption/prompt data (loaded from database) */}
                                  {(() => {
                                    const emailPreviewData = (message as any).email_preview_data
                                    if (emailPreviewData && typeof emailPreviewData === 'object') {
                                      // Debug logging (outside JSX)
                                      if (emailPreviewData.type === 'caption' || emailPreviewData.type === 'prompts') {
                                        console.log('[Alex] 🔍 Found saved content data:', {
                                          type: emailPreviewData.type,
                                          hasCaptionData: !!emailPreviewData.captionData,
                                          hasPromptData: !!emailPreviewData.promptData,
                                          promptCount: emailPreviewData.promptData?.prompts?.length || 0
                                        })
                                      }
                                      
                                      return (
                                        <div className="mt-4 space-y-4">
                                          {/* Caption data from saved message */}
                                          {emailPreviewData.type === 'caption' && emailPreviewData.captionData && (
                                            <div key={`saved-caption-${message.id}`}>
                                              <CaptionCard caption={emailPreviewData.captionData} />
                                            </div>
                                          )}
                                          
                                          {/* Prompt data from saved message */}
                                          {emailPreviewData.type === 'prompts' && emailPreviewData.promptData?.prompts && (
                                            <div key={`saved-prompts-${message.id}`} className="space-y-4">
                                              {emailPreviewData.promptData.prompts.map((prompt: any) => (
                                                <PromptCard key={prompt.id || Math.random()} prompt={prompt} />
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    }
                                    return null
                                  })()}
                                </>
                              )
                            })()
                          ) : (
                            (() => {
                              const content = getMessageContent(message)
                              console.log('[Alex] 📝 Rendering user message content:', {
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
            </div>

            {/* Gallery Selector - Inside chat tab */}
            {showGallery && (
              <div className="bg-stone-50 border-t border-stone-200 p-3 sm:p-4 md:p-6 max-h-96 overflow-y-auto shrink-0">
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
                                  console.error('[Alex] Image load error:', {
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

            {/* Selected Images Preview - Inside chat tab */}
            {selectedGalleryImages.size > 0 && !showGallery && (
              <div className="bg-stone-50 border-t border-stone-200 p-3 sm:p-4 shrink-0">
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

          </TabsContent>

          {/* Email Drafts Tab */}
          <TabsContent value="email-drafts" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 min-h-0">
              <EmailDraftsLibrary
                onEditDraft={async (draft) => {
                  setActiveTab('chat')
                  // Load the draft HTML into the chat for editing
                  const editPrompt = `Please edit this email. Here's the current version:\n\nSubject: ${draft.subject_line}\n\nHTML:\n${draft.body_html}`
                  await sendMessage({ text: editPrompt })
                }}
              />
            </div>
          </TabsContent>

          {/* Captions Library Tab */}
          <TabsContent value="captions" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 min-h-0">
              <div className="mb-6">
                <h2 className="text-2xl font-serif font-light tracking-wider text-stone-900 mb-2">
                  Instagram Captions
                </h2>
                <p className="text-sm text-stone-600">
                  All your saved Instagram captions
                </p>
              </div>
              
              {loadingLibrary ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
                </div>
              ) : captions.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  No captions yet. Ask Alex to create one!
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {captions.map((caption: any) => (
                    <CaptionCard 
                      key={caption.id} 
                      caption={caption}
                      onDelete={async (id) => {
                        await fetch(`/api/admin/creative-content/captions/${id}`, { method: 'DELETE' })
                        fetchCaptions()
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Calendars Library Tab */}
          <TabsContent value="calendars" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 min-h-0">
              <div className="mb-6">
                <h2 className="text-2xl font-serif font-light tracking-wider text-stone-900 mb-2">
                  Content Calendars
                </h2>
                <p className="text-sm text-stone-600">
                  All your content planning calendars
                </p>
              </div>
              
              {loadingLibrary ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
                </div>
              ) : calendars.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  No calendars yet. Ask Alex to create one!
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {calendars.map((calendar: any) => (
                    <CalendarCard 
                      key={calendar.id} 
                      calendar={calendar}
                      onDelete={async (id) => {
                        await fetch(`/api/admin/creative-content/calendars/${id}`, { method: 'DELETE' })
                        fetchCalendars()
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Prompts Library Tab */}
          <TabsContent value="prompts" className="flex-1 flex flex-col m-0 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 min-h-0">
              <div className="mb-6">
                <h2 className="text-2xl font-serif font-light tracking-wider text-stone-900 mb-2">
                  Maya Prompt Ideas
                </h2>
                <p className="text-sm text-stone-600">
                  Professional photography prompts for Maya
                </p>
              </div>
              
              {loadingLibrary ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
                </div>
              ) : prompts.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  No prompts yet. Ask Alex to suggest some!
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {prompts.map((prompt: any) => (
                    <PromptCard 
                      key={prompt.id} 
                      prompt={prompt}
                      onDelete={async (id) => {
                        await fetch(`/api/admin/creative-content/prompts/${id}`, { method: 'DELETE' })
                        fetchPrompts()
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Chat Input - Always visible when chat tab is active */}
        {isMounted && activeTab === 'chat' && (
          <div className="bg-white border-t border-stone-200 p-2 sm:p-4 pb-safe shrink-0">
            <div className="max-w-4xl mx-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-end gap-2 sm:gap-3"
              >
                <button
                  type="button"
                  onClick={() => setShowGallery(!showGallery)}
                  disabled={isLoading}
                  className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 px-2.5 sm:px-4 py-2.5 sm:py-3 border rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 text-xs sm:text-sm ${
                    showGallery
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-700 border-stone-300 active:bg-stone-100 sm:hover:bg-stone-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Select images from gallery"
                >
                  <ImageIcon className="w-5 h-5 sm:w-4 sm:h-4" />
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
                  placeholder="Ask me anything..."
                  className="flex-1 px-3 sm:px-4 py-3 sm:py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950 text-base sm:text-base resize-none min-h-[44px] sm:min-h-[44px] max-h-[200px] overflow-y-auto leading-relaxed"
                  disabled={isLoading}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={(!inputValue.trim() && selectedGalleryImages.size === 0) || isLoading}
                  className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 px-3 sm:px-6 py-2.5 sm:py-3 bg-stone-950 text-white rounded-lg active:bg-stone-800 sm:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 text-xs sm:text-sm"
                >
                  <Send className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tool Loading Indicator */}
        {toolLoading && (
            <div className="max-w-4xl mx-auto mb-3 sm:mb-4 px-3 sm:px-0">
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin shrink-0"></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-stone-900 truncate">
                    {toolLoading === 'compose_email' && 'Creating your email...'}
                    {toolLoading === 'create_email_sequence' && 'Creating email sequence...'}
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

        {/* Gallery Selector - Removed, now inside chat TabsContent */}
        {false && showGallery && (
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
                              console.error('[Alex] Image load error:', {
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

        {/* Selected Images Preview - Removed, now inside chat TabsContent */}
        {false && selectedGalleryImages.size > 0 && !showGallery && (
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

      </div>
    </div>
  )
}

