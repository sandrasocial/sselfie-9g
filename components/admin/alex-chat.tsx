"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Sparkles, Mail, Instagram, BarChart3, Calendar, Send, Image as ImageIcon, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'

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
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [isLoadingInitialChat, setIsLoadingInitialChat] = useState(true) // Prevent messages until chat is loaded
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasLoadedInitialChat = useRef(false)
  const currentChatIdRef = useRef<number | null>(null) // Track current chat ID to avoid race conditions
  
  // Gallery state
  const [showGallery, setShowGallery] = useState(false)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<Set<string>>(new Set())
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryLoadingMore, setGalleryLoadingMore] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [galleryOffset, setGalleryOffset] = useState(0)
  const [hasMoreImages, setHasMoreImages] = useState(true)
  
  // ✅ Ensure body updates when currentChatId changes
  const chatBody = useMemo(() => ({
    chatId: currentChatId, // ✅ This will be included in all requests when currentChatId is set
    userId,
  }), [currentChatId, userId])
  
  const { messages, sendMessage, status, setMessages, isLoading: useChatIsLoading } = useChat({
    id: currentChatId ? String(currentChatId) : undefined,
    transport: new DefaultChatTransport({ api: '/api/admin/agent/chat' }) as any,
    body: chatBody as any,
    onResponse: async (response: Response) => {
      console.log('[Alex] 📥 Response received, status:', response.status)
      const chatIdHeader = response.headers.get('X-Chat-Id')
      if (chatIdHeader) {
        const newChatId = parseInt(chatIdHeader)
        // ✅ Always update if we get a chat ID
        console.log('[Alex] 🔄 Setting chat ID to:', newChatId)
        currentChatIdRef.current = newChatId
        setCurrentChatId(newChatId)
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

  const isLoading = status === 'submitted' || status === 'streaming' || isLoadingInitialChat || useChatIsLoading

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Log status changes for debugging
  useEffect(() => {
    console.log('[Alex] 🔄 Status changed to:', status, {
      messageCount: messages.length,
      isLoading,
      currentChatId,
      useChatIsLoading,
    })
  }, [status, isLoading, messages.length, currentChatId, useChatIsLoading])

  // Load existing chat on mount (only once)
  useEffect(() => {
    if (hasLoadedInitialChat.current) return
    hasLoadedInitialChat.current = true
    
    const loadChat = async () => {
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
            currentChatIdRef.current = data.chatId
            setCurrentChatId(data.chatId)
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
        setIsLoadingInitialChat(false)
      } finally {
        setIsLoadingInitialChat(false)
      }
    }
    
    loadChat()
  }, [setMessages])


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
            <Sparkles className="w-4 h-4" />
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
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Sparkles className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  Hey Sandra! I'm Alex
                </h3>
                <p className="text-stone-600 mb-6">
                  I write all your content in YOUR voice - emails, Instagram, landing pages. 
                  I also handle analytics, strategy, and execution. What would you like to create today?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => sendMessage({ text: 'Create a newsletter about Maya Pro Mode' })}
                    disabled={isLoading}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Write Newsletter
                  </button>
                  <button
                    onClick={() => sendMessage({ text: 'What should I email this week?' })}
                    disabled={isLoading}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Get Strategy
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
                
                if (typeof message.content === 'string') {
                  textContent = message.content
                } else if (Array.isArray(message.content)) {
                  message.content.forEach((part: any) => {
                    if (part.type === 'text') {
                      textContent += (textContent ? '\n' : '') + (part.text || '')
                    } else if (part.type === 'image') {
                      imageUrls.push(part.image || part.url || '')
                    }
                  })
                } else if (message.parts && Array.isArray(message.parts)) {
                  message.parts.forEach((part: any) => {
                    if (part.type === 'text') {
                      textContent += (textContent ? '\n' : '') + (part.text || '')
                    } else if (part.type === 'image') {
                      imageUrls.push(part.image || part.url || '')
                    }
                  })
                }

                return (
                  <div
                    key={message.id}
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

