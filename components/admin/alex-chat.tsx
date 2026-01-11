"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Mail, Instagram, BarChart3, Calendar, Send, Image as ImageIcon, X, MessageCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'
import { AlexSuggestionCard, AlexSuggestion } from './alex-suggestion-card'

interface AlexChatProps {
  userId: string
  userName?: string
  userEmail: string
}

interface GalleryImage {
  id: number
  image_url: string
  prompt: string
  created_at: string
  content_category?: string
}

export default function AlexChat({ userId, userName, userEmail }: AlexChatProps) {
  const [view, setView] = useState<'chat' | 'analytics' | 'calendar'>('chat')
  const [inputValue, setInputValue] = useState('')
  const [chatId, setChatId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Gallery state
  const [showGallery, setShowGallery] = useState(false)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<Set<string>>(new Set())
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryLoadingMore, setGalleryLoadingMore] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [galleryOffset, setGalleryOffset] = useState(0)
  const [hasMoreImages, setHasMoreImages] = useState(true)
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<AlexSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)
  
  const { messages, sendMessage, status, setMessages, isLoading: useChatIsLoading } = useChat({
    id: chatId ? String(chatId) : undefined,
    transport: new DefaultChatTransport({ api: '/api/admin/alex/chat' }) as any,
    body: { chatId, userId },
    onResponse: async (response: Response) => {
      console.log('[Alex] 📥 Response received, status:', response.status)
      const chatIdHeader = response.headers.get('X-Chat-Id')
      if (chatIdHeader) {
        const newChatId = parseInt(chatIdHeader)
        // ✅ Always update if we get a chat ID
        console.log('[Alex] 🔄 Setting chat ID to:', newChatId)
        setChatId(newChatId)
      }
    },
    onError: (error: any) => {
      console.error('[Alex] ❌ Chat error:', error)
      console.error('[Alex] ❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        type: error?.constructor?.name,
        name: error?.name,
        cause: error?.cause,
      })
      // Don't crash the UI - let the user see partial messages
    },
    onFinish: (message: any) => {
      console.log('[Alex] ✅ Message finished:', message.content?.substring(0, 50))
    },
    initialMessages: [],
  } as any)

  const isLoading = status === 'submitted' || status === 'streaming' || useChatIsLoading

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Log status changes for debugging
  useEffect(() => {
    console.log('[Alex] 🔄 Status changed to:', status, {
      messageCount: messages.length,
      isLoading,
      chatId,
      useChatIsLoading,
    })
  }, [status, isLoading, messages.length, chatId, useChatIsLoading])

  // Load proactive suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await fetch('/api/admin/alex/suggestions')
        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error('[Alex] Error loading suggestions:', error)
      } finally {
        setSuggestionsLoading(false)
      }
    }
    
    loadSuggestions()
  }, [])

  // Dismiss suggestion
  const handleDismissSuggestion = async (suggestionId: number) => {
    try {
      const response = await fetch('/api/admin/alex/suggestions/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId })
      })
      
      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      }
    } catch (error) {
      console.error('[Alex] Error dismissing suggestion:', error)
      throw error
    }
  }

  // Mark suggestion as acted upon
  const handleActUponSuggestion = async (suggestionId: number) => {
    try {
      const response = await fetch('/api/admin/alex/suggestions/act-upon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId })
      })
      
      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      }
    } catch (error) {
      console.error('[Alex] Error marking suggestion acted upon:', error)
      throw error
    }
  }

  // Handle action click - send message to Alex
  const handleSuggestionAction = (suggestion: AlexSuggestion) => {
    // Extract the action text and send as a message to Alex
    if (suggestion.action) {
      sendMessage({ 
        role: "user",
        content: suggestion.action 
      } as any)
    }
  }

  // Load existing chat on mount
  useEffect(() => {
    const loadInitialChat = async () => {
      console.log('[Alex] 🔍 Loading initial chat...')
      try {
        const response = await fetch(`/api/admin/agent/load-chat`, {
          credentials: 'include', // Include cookies for authentication
        })
        console.log('[Alex] 📥 Load chat response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('[Alex] 📊 Chat data received:', {
            chatId: data.chatId,
            messageCount: data.messages?.length || 0,
            chatTitle: data.chatTitle
          })
          
          // ✅ Set chat ID FIRST
          // Use explicit null/undefined check to handle chatId === 0 correctly
          if (data.chatId !== null && data.chatId !== undefined) {
            console.log('[Alex] 🆔 Setting initial chat ID:', data.chatId)
            setChatId(data.chatId)
          }
          
          // ✅ Then load messages
          if (data.messages && data.messages.length > 0) {
            console.log('[Alex] 💬 Loading', data.messages.length, 'messages')
            // Convert database messages from parts format to useChat format
            const formattedMessages = data.messages.map((msg: any) => {
              // Extract content from parts array or use direct content
              let content = ''
              if (msg.parts && Array.isArray(msg.parts)) {
                // Extract text from parts array
                content = msg.parts
                  .filter((part: any) => part.type === 'text' && part.text)
                  .map((part: any) => part.text)
                  .join('\n')
              } else if (msg.content) {
                content = msg.content
              }
              
              return {
                id: msg.id.toString(),
                role: msg.role,
                content: content || '',
              }
            })
            
            // Use setTimeout to ensure useChat has re-initialized with the new chatId
            setTimeout(() => {
              setMessages(formattedMessages)
              console.log('[Alex] ✅ Messages loaded into chat')
            }, 100)
          } else {
            console.log('[Alex] 📝 No existing messages, starting fresh')
          }
        } else {
          console.warn('[Alex] ⚠️ Failed to load chat, status:', response.status)
        }
      } catch (error) {
        console.error('[Alex] ❌ Error loading chat:', error)
        // ✅ Still allow chat to work even if load fails
      }
    }
    
    loadInitialChat()
  }, [setMessages]) // Runs once on mount


  // Load gallery images (initial load or category change)
  const loadGalleryImages = async (reset = true) => {
    if (reset) {
      setGalleryLoading(true)
      setGalleryOffset(0)
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
      params.append("limit", "50") // Load 50 at a time
      params.append("offset", reset ? "0" : String(galleryOffset))

      const response = await fetch(`/api/admin/agent/gallery-images?${params}`)
      const data = await response.json()
      console.log('[Alex] Gallery images response:', {
        count: data.images?.length || 0,
        offset: reset ? 0 : galleryOffset,
        sample: data.images?.[0]
      })
      
      if (reset) {
        setGalleryImages(data.images || [])
        setGalleryOffset((data.images || []).length)
      } else {
        setGalleryImages(prev => [...prev, ...(data.images || [])])
        setGalleryOffset(prev => prev + (data.images || []).length)
      }
      
      // Check if there are more images
      setHasMoreImages((data.images || []).length === 50)
    } catch (error) {
      console.error('[Alex] Failed to fetch gallery images:', error)
    } finally {
      setGalleryLoading(false)
      setGalleryLoadingMore(false)
    }
  }

  // Load more images
  const loadMoreImages = () => {
    if (!galleryLoadingMore && hasMoreImages) {
      loadGalleryImages(false)
    }
  }

  // Load gallery when opened or category changes
  useEffect(() => {
    if (showGallery) {
      loadGalleryImages(true)
    }
  }, [showGallery, selectedCategory])

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

  const handleSend = () => {
    const hasText = inputValue.trim().length > 0
    const hasImages = selectedGalleryImages.size > 0
    
    if ((!hasText && !hasImages) || isLoading) return
    
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
    
    sendMessage({ 
      role: "user",
      content: messageContent 
    } as any)
    
    setInputValue('')
    setSelectedGalleryImages(new Set())
    setShowGallery(false)
  }

  return (
    <div className="h-screen flex bg-stone-50">
      {/* Sidebar - Quick Navigation */}
      <div className="w-64 bg-white border-r border-stone-200 p-4 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-serif tracking-wide text-stone-900">
            Alex
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Your AI Business Partner
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 mb-6 flex-1">
          <button
            onClick={() => setView('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              view === 'chat' ? 'bg-stone-900 text-white' : 'hover:bg-stone-100 text-stone-700'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">Chat with Alex</span>
          </button>
          
          <button
            onClick={() => {
              sendMessage({ text: 'Write an email for Studio members' })
              setView('chat')
            }}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" />
            <span className="text-sm">Write Email</span>
          </button>
          
          <button
            onClick={() => {
              sendMessage({ text: 'Write an Instagram caption' })
              setView('chat')
            }}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Instagram className="w-4 h-4" />
            <span className="text-sm">Write Instagram Post</span>
          </button>
          
          <button
            onClick={() => {
              sendMessage({ text: 'Show me email performance analytics' })
              setView('chat')
            }}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Check Analytics</span>
          </button>
          
          <button
            onClick={() => {
              sendMessage({ text: 'What should I send this week?' })
              setView('chat')
            }}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Plan Strategy</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-stone-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-stone-900">
            {view === 'chat' ? 'Chat with Alex' : view === 'analytics' ? 'Analytics' : 'Calendar'}
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Your unified business intelligence partner
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Proactive Suggestions */}
          {!suggestionsLoading && suggestions.length > 0 && (
            <div className="max-w-4xl mx-auto mb-6 space-y-4">
              {suggestions.map((suggestion) => (
                <AlexSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onDismiss={handleDismissSuggestion}
                  onActUpon={handleActUponSuggestion}
                  onActionClick={handleSuggestionAction}
                />
              ))}
            </div>
          )}
          
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full -mt-20">
              <div className="text-center max-w-md mb-12">
                <h3 className="text-2xl font-semibold text-stone-900 mb-3">
                  Start a conversation
                </h3>
                <p className="text-stone-600 text-base">
                  Ask me anything about your business, strategy, or growth!
                </p>
              </div>
              
              {/* Quick Actions - Inside Chat Area */}
              <div className="w-full max-w-4xl mx-auto px-6">
                <div className="mb-4">
                  <h4 className="text-xs uppercase tracking-wider text-stone-900 font-semibold mb-1">
                    QUICK ACTIONS
                  </h4>
                  <p className="text-xs text-stone-500">
                    Start with a common task
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => sendMessage({ text: 'Create a welcome email for new Studio members' })}
                    disabled={isLoading}
                    className="px-4 py-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-900 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Welcome Email
                  </button>
                  <button
                    onClick={() => sendMessage({ text: 'Create a newsletter about recent updates' })}
                    disabled={isLoading}
                    className="px-4 py-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-900 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Newsletter
                  </button>
                  <button
                    onClick={() => sendMessage({ text: 'Create a promotional email for a new feature' })}
                    disabled={isLoading}
                    className="px-4 py-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-900 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Promotional
                  </button>
                  <button
                    onClick={() => sendMessage({ text: 'Check email campaign status and performance' })}
                    disabled={isLoading}
                    className="px-4 py-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-900 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Check Status
                  </button>
                  <button
                    onClick={() => sendMessage({ text: 'Show me my email audience segments and data' })}
                    disabled={isLoading}
                    className="px-4 py-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-900 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    View Audience
                  </button>
                  <button
                    onClick={() => sendMessage({ text: 'What should I email this week? Analyze my email strategy' })}
                    disabled={isLoading}
                    className="px-4 py-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-900 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Email Strategy
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message: any) => {
                // Extract content from message (text and images)
                let textContent = ''
                let imageUrls: string[] = []
                let emailPreview: any = null
                
                if (typeof message.content === 'string') {
                  textContent = message.content
                } else if (Array.isArray(message.content)) {
                  message.content.forEach((part: any) => {
                    if (part.type === 'text') {
                      textContent += (textContent ? '\n' : '') + (part.text || '')
                    } else if (part.type === 'image') {
                      imageUrls.push(part.image || part.url || '')
                    } else if (part.type === 'tool-result' && part.content) {
                      // Check for email preview data in tool results
                      try {
                        const toolContent = typeof part.content === 'string' ? JSON.parse(part.content) : part.content
                        if (toolContent.email_preview_data) {
                          emailPreview = toolContent.email_preview_data
                        }
                      } catch (e) {
                        // Not JSON, ignore
                      }
                    }
                  })
                } else if (message.parts && Array.isArray(message.parts)) {
                  message.parts.forEach((part: any) => {
                    if (part.type === 'text') {
                      textContent += (textContent ? '\n' : '') + (part.text || '')
                    } else if (part.type === 'image') {
                      imageUrls.push(part.image || part.url || '')
                    } else if (part.type === 'tool-result' && part.result) {
                      // Check for email preview data in tool results
                      if (part.result.email_preview_data) {
                        emailPreview = part.result.email_preview_data
                      }
                    }
                  })
                }
                
                // Also check message.data for email preview (from database)
                if (!emailPreview && message.data?.email_preview_data) {
                  emailPreview = typeof message.data.email_preview_data === 'string' 
                    ? JSON.parse(message.data.email_preview_data)
                    : message.data.email_preview_data
                }
                
                // Check for caption cards
                let captionCard: any = null
                if (message.role === 'assistant') {
                  // Helper to extract tool result from part
                  const extractToolResult = (part: any) => {
                    // Check if already parsed in part.result
                    if (part.result && typeof part.result === 'object') {
                      return part.result
                    }
                    // Try parsing from part.content (string)
                    if (part.content) {
                      try {
                        const content = typeof part.content === 'string' ? JSON.parse(part.content) : part.content
                        return content
                      } catch (e) {
                        // Not JSON, ignore
                      }
                    }
                    return null
                  }
                  
                  // Check tool results in parts array
                  if (message.parts && Array.isArray(message.parts)) {
                    for (const part of message.parts) {
                      if (part.type === 'tool-result') {
                        const toolResult = extractToolResult(part)
                        if (toolResult?.type === 'instagram_caption' && toolResult?.data) {
                          captionCard = toolResult.data
                          break
                        }
                      }
                    }
                  }
                  // Also check message.content array format
                  if (!captionCard && Array.isArray(message.content)) {
                    for (const part of message.content) {
                      if (part.type === 'tool-result') {
                        const toolResult = extractToolResult(part)
                        if (toolResult?.type === 'instagram_caption' && toolResult?.data) {
                          captionCard = toolResult.data
                          break
                        }
                      }
                    }
                  }
                }

                // Check for prompt cards
                let promptCards: any[] = []
                if (message.role === 'assistant') {
                  // Helper to extract tool result from part
                  const extractToolResult = (part: any) => {
                    // Check if already parsed in part.result
                    if (part.result && typeof part.result === 'object') {
                      return part.result
                    }
                    // Try parsing from part.content (string)
                    if (part.content) {
                      try {
                        const content = typeof part.content === 'string' ? JSON.parse(part.content) : part.content
                        return content
                      } catch (e) {
                        // Not JSON, ignore
                      }
                    }
                    return null
                  }
                  
                  if (message.parts && Array.isArray(message.parts)) {
                    for (const part of message.parts) {
                      if (part.type === 'tool-result') {
                        const toolResult = extractToolResult(part)
                        if (toolResult?.type === 'maya_prompts' && toolResult?.data?.prompts) {
                          promptCards = toolResult.data.prompts
                          break
                        }
                      }
                    }
                  }
                  // Also check message.content array format
                  if (promptCards.length === 0 && Array.isArray(message.content)) {
                    for (const part of message.content) {
                      if (part.type === 'tool-result') {
                        const toolResult = extractToolResult(part)
                        if (toolResult?.type === 'maya_prompts' && toolResult?.data?.prompts) {
                          promptCards = toolResult.data.prompts
                          break
                        }
                      }
                    }
                  }
                }

                return (
                  <div key={message.id} className="space-y-4">
                    <div
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                          message.role === 'user'
                            ? 'bg-stone-900 text-white'
                            : 'bg-white border border-stone-200 text-stone-900'
                        }`}
                      >
                        {/* Display images if present */}
                        {imageUrls.length > 0 && (
                          <div className="mb-3 grid grid-cols-2 gap-2">
                            {imageUrls.map((url, idx) => (
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
                        )}
                        
                        {/* Display text content */}
                        {textContent && (
                          <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="ml-2">{children}</li>,
                                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                                code: ({ children }) => <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                                pre: ({ children }) => <pre className="bg-stone-100 p-3 rounded-lg overflow-x-auto mb-3">{children}</pre>,
                                blockquote: ({ children }) => <blockquote className="border-l-4 border-stone-300 pl-3 italic my-2">{children}</blockquote>,
                              }}
                            >
                              {textContent}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Email Preview Card */}
                    {emailPreview && message.role === 'assistant' && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] border border-stone-200 rounded-lg overflow-hidden bg-white">
                          {/* Email Header */}
                          <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs tracking-[0.2em] uppercase text-stone-400">
                                Email Preview
                              </span>
                              {emailPreview.purpose && (
                                <span className="text-xs text-stone-500">
                                  {emailPreview.purpose}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="text-stone-500">From:</span>{' '}
                                <span className="text-stone-950">{emailPreview.from || emailPreview.from_name}</span>
                              </div>
                              <div>
                                <span className="text-stone-500">To:</span>{' '}
                                <span className="text-stone-950">{emailPreview.to || emailPreview.to_description}</span>
                              </div>
                              <div>
                                <span className="text-stone-500">Subject:</span>{' '}
                                <span className="text-stone-950 font-semibold">{emailPreview.subject || emailPreview.subjectLine}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Email Preview */}
                          <div className="p-6">
                            <div 
                              className="prose prose-stone max-w-none text-sm"
                              dangerouslySetInnerHTML={{ __html: emailPreview.html || emailPreview.html_preview || emailPreview.content }}
                            />
                          </div>
                          
                          {/* Actions */}
                          <div className="bg-stone-50 px-6 py-4 border-t border-stone-200">
                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(emailPreview.html || emailPreview.html_preview || emailPreview.content)
                                }}
                                className="px-4 py-2 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
                              >
                                Copy HTML
                              </button>
                              <button
                                onClick={() => {
                                  const win = window.open('', '_blank')
                                  if (win) {
                                    win.document.write(emailPreview.html || emailPreview.html_preview || emailPreview.content)
                                  }
                                }}
                                className="px-4 py-2 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
                              >
                                Open Preview
                              </button>
                            </div>
                            <p className="text-xs text-stone-500 mt-3">
                              This is a preview only. No email has been sent.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Caption Card */}
                    {captionCard && message.role === 'assistant' && (
                      <div className="flex justify-start mt-4">
                        <div className="max-w-[85%] border border-stone-200 rounded-lg overflow-hidden bg-white">
                          <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
                            <h3 className="text-sm font-semibold text-stone-900">
                              📸 {captionCard.captionType?.charAt(0).toUpperCase() + captionCard.captionType?.slice(1)} Caption
                            </h3>
                            <p className="text-xs text-stone-600 mt-1">
                              {captionCard.wordCount} words · {captionCard.hook}
                            </p>
                          </div>
                          <div className="p-6">
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown>{captionCard.fullCaption || captionCard.captionText}</ReactMarkdown>
                            </div>
                          </div>
                          <div className="bg-stone-50 border-t border-stone-200 px-6 py-4">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(captionCard.fullCaption || captionCard.captionText)
                              }}
                              className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm"
                            >
                              Copy Caption
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Prompt Cards */}
                    {promptCards.length > 0 && message.role === 'assistant' && (
                      <div className="flex justify-start mt-4 flex-col gap-4">
                        {promptCards.map((prompt: any) => (
                          <div key={prompt.id} className="max-w-[85%] border border-stone-200 rounded-lg overflow-hidden bg-white">
                            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
                              <h3 className="text-sm font-semibold text-stone-900">
                                {prompt.title || prompt.prompt_title}
                              </h3>
                              <div className="flex gap-2 mt-2">
                                {prompt.tags?.map((tag: string) => (
                                  <span key={tag} className="text-xs bg-stone-200 text-stone-700 px-2 py-1 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="p-6">
                              <p className="text-sm text-stone-600 mb-4">{prompt.useCase || prompt.use_case}</p>
                              <div className="bg-stone-50 p-4 rounded-lg">
                                <p className="text-xs font-mono text-stone-900">{prompt.promptText || prompt.prompt_text}</p>
                              </div>
                            </div>
                            <div className="bg-stone-50 border-t border-stone-200 px-6 py-4">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(prompt.promptText || prompt.prompt_text)
                                }}
                                className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm"
                              >
                                Copy Prompt
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-stone-200 rounded-2xl px-6 py-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-stone-700 animate-bounce"></div>
                      <div
                        className="w-2 h-2 rounded-full bg-stone-700 animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-stone-700 animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Gallery Selector */}
        {showGallery && (
          <div className="bg-stone-50 border-t border-stone-200 p-6 max-h-96 overflow-y-auto">
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
                  className="text-stone-500 hover:text-stone-700"
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
                    className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors rounded-lg ${
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
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                  {galleryImages.map((image) => {
                    const isSelected = selectedGalleryImages.has(image.image_url)
                    return (
                      <div
                        key={image.id}
                        onClick={() => handleGalleryImageClick(image.image_url)}
                        className={`relative aspect-square bg-stone-200 cursor-pointer transition-all group rounded-lg overflow-hidden ${
                          isSelected ? 'ring-4 ring-stone-900' : 'hover:ring-2 hover:ring-stone-400'
                        }`}
                      >
                        {image.image_url ? (
                          <Image
                            src={image.image_url}
                            alt={image.prompt || "Gallery image"}
                            fill
                            className="object-cover"
                            unoptimized
                            onError={(e) => {
                              console.error('[Alex] Image load error:', image.image_url, e)
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                            No image
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                            <div className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">✓</span>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/20 transition-colors flex items-center justify-center">
                          <span className="text-white text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
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
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMoreImages}
                    disabled={galleryLoadingMore}
                    className="px-6 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {galleryLoadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                        Loading...
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
                <div className="text-center py-4 text-stone-500 text-sm">
                  All {galleryImages.length} images loaded
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Images Preview */}
        {selectedGalleryImages.size > 0 && !showGallery && (
          <div className="bg-stone-50 border-t border-stone-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-stone-600">
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
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-200">
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
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="bg-white border-t border-stone-200 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <button
                onClick={() => setShowGallery(!showGallery)}
                disabled={isLoading}
                className={`px-4 py-3 border rounded-lg transition-colors flex items-center gap-2 ${
                  showGallery
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Select images from gallery"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Gallery</span>
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask Alex anything..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={(!inputValue.trim() && selectedGalleryImages.size === 0) || isLoading}
                className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

