"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Calendar, Save, Send, Mail, Download, Instagram, Sparkles, MessageSquare, Plus, Search, ChevronLeft, ChevronRight, Menu, X, BarChart3, Image, BookOpen, Zap } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { AdminAnalyticsPanel } from "./admin-analytics-panel"
import { ContentCalendarExport } from "./content-calendar-export"
import { CompetitorTracker } from "./competitor-tracker"
import { EmailTemplateLibrary } from "./email-template-library"
import { SemanticSearchPanel } from "./semantic-search-panel"
import { GalleryImageSelector } from "./gallery-image-selector"
import { EmailCampaignManager } from "./email-campaign-manager"
import { PerformanceTracker } from "./performance-tracker"
import { parseContentCalendar } from "@/lib/admin/parse-content-calendar"
import { PersonalKnowledgeManager } from "./personal-knowledge-manager"
import { AdminKnowledgeManager } from "./admin-knowledge-manager"
import { InstagramConnectionManager } from "./instagram-connection-manager"
import { InstagramGraphApiTester } from "./instagram-graph-api-tester"
import { ContentAnalyzer } from "./content-analyzer"

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
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [currentMode, setCurrentMode] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [showSemanticSearch, setShowSemanticSearch] = useState(false)
  const [parsedContent, setParsedContent] = useState<any[]>([])
  const [latestGeneration, setLatestGeneration] = useState<{
    type: 'content' | 'email' | 'research'
    data: any
  } | null>(null)
  const [showPersonalKnowledge, setShowPersonalKnowledge] = useState(false)
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false)
  const [showInstagram, setShowInstagram] = useState(false)
  const [showContentAnalyzer, setShowContentAnalyzer] = useState(false)
  const [researchStatus, setResearchStatus] = useState<string | null>(null)
  
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; name: string }>>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [chats, setChats] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const { messages, sendMessage, status, setMessages } = useChat({
    id: currentChatId ? String(currentChatId) : undefined, // This ensures chat continuity
    transport: new DefaultChatTransport({ api: "/api/admin/agent/chat" }),
    initialMessages: [],
    body: {
      chatId: currentChatId, // Keep this for backend compatibility
      userId,
    },
    experimental_onToolCall: async (toolCall) => {
      if (toolCall.toolName === 'web_search') {
        setResearchStatus('Searching web and social media...')
      } else if (toolCall.toolName === 'instagram_research') {
        setResearchStatus('Analyzing Instagram content and trends...')
      }
      return undefined
    },
    onFinish: async (message) => {
      setResearchStatus(null)
      
      const content = getMessageContent(message)
      if (content.includes('Caption:') || content.includes('Post Type:')) {
        setLatestGeneration({ type: 'content', data: parseContentCalendar(content) })
      } else if (content.includes('Subject:') && content.includes('xo Sandra')) {
        setLatestGeneration({ type: 'email', data: content })
      }

      await loadChats()
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  const loadChats = async () => {
    setIsLoadingChats(true)
    try {
      const response = await fetch(`/api/admin/agent/chats?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setChats(data.chats || [])
      }
    } catch (error) {
      console.error("Error loading chats:", error)
    } finally {
      setIsLoadingChats(false)
    }
  }

  useEffect(() => {
    loadChats()
  }, [userId])

  const loadChat = async (chatIdToLoad: number) => {
    try {
      console.log("[v0] Loading chat:", chatIdToLoad)
      
      setCurrentChatId(chatIdToLoad)
      
      const response = await fetch(`/api/admin/agent/chat?chatId=${chatIdToLoad}`)
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text()
        console.error('[v0] Non-JSON response:', textResponse.substring(0, 200))
        throw new Error(`Server returned non-JSON response. This usually means rate limiting or API error.`)
      }
      
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Loaded chat messages:", data.messages?.length || 0)
        
        setMessages(data.messages || [])
        
        const chatInfo = chats.find(c => c.id === chatIdToLoad)
        setCurrentMode(chatInfo?.agent_mode || null)
        
        setSidebarOpen(false)
        
        toast({
          title: "Chat Loaded",
          description: `Loaded ${data.messages?.length || 0} messages`,
        })
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error("[v0] Failed to load chat:", response.status, errorData)
        throw new Error(errorData.error || `Failed to load chat (${response.status})`)
      }
    } catch (error: any) {
      console.error("[v0] Error loading chat:", error.message || error)
      toast({
        title: "Failed to load chat",
        description: error.message || "Please try again",
        variant: "destructive"
      })
      setCurrentChatId(null)
    }
  }

  const startNewChat = () => {
    setCurrentChatId(null)
    setCurrentMode(null)
    setMessages([])
    setLatestGeneration(null)
    setSidebarOpen(false)
    setUploadedImages([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!inputValue.trim() && uploadedImages.length === 0) || isLoading) return
    
    const messageToSend = inputValue
    const imagesToSend = uploadedImages
    
    setInputValue("")
    setUploadedImages([])
    
    let messageContent: string | Array<{ type: string; text?: string; image?: string }> = messageToSend

    if (imagesToSend.length > 0) {
      const contentParts: Array<{ type: string; text?: string; image?: string }> = []
      
      if (messageToSend.trim()) {
        contentParts.push({
          type: 'text',
          text: messageToSend
        })
      }
      
      imagesToSend.forEach((img) => {
        contentParts.push({
          type: 'image',
          image: img.url
        })
      })
      
      if (!messageToSend.trim()) {
        contentParts.push({
          type: 'text',
          text: 'Please analyze these images and provide strategic insights based on what you see.'
        })
      }
      
      messageContent = contentParts
      
      console.log('[v0] Sending multimodal message:', contentParts.length, 'parts')
    }
    
    await sendMessage({ role: "user", content: messageContent })
    
    if (!currentChatId) {
      console.log('[v0] Waiting for new chat to be created...')
      setTimeout(async () => {
        const response = await fetch(`/api/admin/agent/chats?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.chats && data.chats.length > 0) {
            const newestChat = data.chats[0]
            console.log('[v0] New chat created with ID:', newestChat.id)
            setCurrentChatId(newestChat.id)
            setCurrentMode(newestChat.agent_mode)
          }
        }
        await loadChats()
      }, 1500)
    }
  }

  const handleSaveToCalendar = async () => {
    if (!latestGeneration || latestGeneration.type !== 'content') return
    
    try {
      const posts = latestGeneration.data
      let successCount = 0
      
      for (const post of posts) {
        const response = await fetch("/api/admin/agent/create-calendar-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...post,
            target_user_id: userId,
          }),
        })
        
        if (response.ok) successCount++
      }
      
      toast({
        title: "Saved to Calendar",
        description: `${successCount} post(s) saved successfully`,
      })
      
      setLatestGeneration(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save to calendar",
        variant: "destructive"
      })
    }
  }

  const handleSaveEmail = async () => {
    if (!latestGeneration || latestGeneration.type !== 'email') return
    
    try {
      const emailContent = latestGeneration.data
      const subjectMatch = emailContent.match(/Subject:\s*(.+?)(?:\n|$)/i)
      const subject = subjectMatch ? subjectMatch[1].trim() : "Generated Email"
      
      const bodyStart = emailContent.indexOf('\n\n')
      const emailBody = bodyStart > -1 ? emailContent.substring(bodyStart).trim() : emailContent
      
      const response = await fetch("/api/admin/agent/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_name: subject,
          subject_line: subject,
          email_body: emailBody,
          campaign_type: "newsletter",
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Email Created in Resend!",
          description: "Visit resend.com/broadcasts to review and send",
        })
        setLatestGeneration(null)
      } else {
        throw new Error(data.error || "Failed to create email")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create email",
        variant: "destructive"
      })
    }
  }

  const filteredChats = chats.filter(chat => 
    chat.chat_title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedChats = filteredChats.reduce((groups: any, chat) => {
    const date = new Date(chat.last_activity)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    let groupKey = ''
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday'
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      groupKey = 'Last Week'
    } else {
      groupKey = 'Older'
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(chat)
    return groups
  }, {})

  const MODE_LABELS: Record<string, { label: string; icon: any }> = {
    instagram: { label: 'Instagram', icon: Instagram },
    email: { label: 'Email', icon: Mail },
    content: { label: 'Content', icon: Calendar },
    analytics: { label: 'Analytics', icon: BarChart3 },
    competitor: { label: 'Competitor', icon: Search },
    research: { label: 'Research', icon: BookOpen }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingImage(true)

    try {
      const uploadedUrls: Array<{ url: string; name: string }> = []

      for (let i = 0; i < Math.min(files.length, 5); i++) {
        const file = files[i]

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 10MB limit`,
            variant: "destructive"
          })
          continue
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an image`,
            variant: "destructive"
          })
          continue
        }

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const result = await response.json()
          uploadedUrls.push({ url: result.url, name: file.name })
        } else {
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive"
          })
        }
      }

      if (uploadedUrls.length > 0) {
        setUploadedImages([...uploadedImages, ...uploadedUrls])
        toast({
          title: "Images uploaded",
          description: `${uploadedUrls.length} image(s) ready for analysis`,
        })
      }
    } catch (error) {
      console.error('[v0] Image upload error:', error)
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  return (
    <div className="flex h-screen bg-stone-50">
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 fixed md:relative z-40 w-80 h-full bg-white border-r border-stone-200 transition-transform duration-300 ease-in-out flex flex-col`}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm uppercase font-semibold text-stone-950" style={{ letterSpacing: "0.1em" }}>
              Chat History
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-stone-500 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-transparent"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingChats ? (
            <div className="flex justify-center py-8">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-stone-700 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-stone-700 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 rounded-full bg-stone-700 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          ) : filteredChats.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-8">
              {searchQuery ? 'No chats found' : 'No chat history yet'}
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedChats).map(([group, groupChats]: [string, any]) => (
                <div key={group}>
                  <p className="text-xs uppercase text-stone-400 mb-2 px-2" style={{ letterSpacing: "0.1em" }}>
                    {group}
                  </p>
                  <div className="space-y-1">
                    {groupChats.map((chat: any) => (
                      <button
                        key={chat.id}
                        onClick={() => loadChat(chat.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          currentChatId === chat.id
                            ? "bg-stone-950 text-white"
                            : "bg-stone-50 text-stone-900 hover:bg-stone-100"
                        }`}
                      >
                        <p className="font-medium text-sm mb-1 truncate">{chat.chat_title}</p>
                        <div className="flex items-center justify-between text-xs opacity-70">
                          <span>
                            {new Date(chat.last_activity).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>{chat.message_count || 0} messages</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New chat button */}
        <div className="p-4 border-t border-stone-200">
          <button
            onClick={startNewChat}
            className="w-full px-4 py-3 bg-stone-950 text-white rounded-lg text-sm uppercase hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
            style={{ letterSpacing: "0.1em" }}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-stone-200 p-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors md:hidden"
                >
                  <Menu className="w-5 h-5 text-stone-700" />
                </button>
                <div>
                  <h1
                    className="text-2xl sm:text-3xl font-extralight uppercase text-stone-950"
                    style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.3em" }}
                  >
                    ADMIN AGENT
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase font-light text-stone-500" style={{ letterSpacing: "0.15em" }}>
                      AI Content & Strategy Partner
                    </p>
                    {currentMode && MODE_LABELS[currentMode] && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-950 text-white text-xs uppercase rounded-full" style={{ letterSpacing: "0.1em" }}>
                        {React.createElement(MODE_LABELS[currentMode].icon, { className: "w-3 h-3" })}
                        {MODE_LABELS[currentMode].label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {/* Tools group */}
              <button
                onClick={() => setShowContentAnalyzer(!showContentAnalyzer)}
                className={`px-4 py-2.5 text-xs uppercase rounded-lg transition-colors flex items-center gap-2 ${
                  showContentAnalyzer
                    ? "bg-stone-950 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Analyze</span>
              </button>
              
              <button
                onClick={() => setShowGallery(!showGallery)}
                className={`px-4 py-2.5 text-xs uppercase rounded-lg transition-colors flex items-center gap-2 ${
                  showGallery
                    ? "bg-stone-950 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                <Image className="w-4 h-4" />
                <span className="hidden sm:inline">Gallery</span>
              </button>

              {/* Knowledge group */}
              <button
                onClick={() => setShowSemanticSearch(!showSemanticSearch)}
                className={`px-4 py-2.5 text-xs uppercase rounded-lg transition-colors flex items-center gap-2 ${
                  showSemanticSearch
                    ? "bg-stone-950 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
              </button>
              
              <button
                onClick={() => setShowPersonalKnowledge(!showPersonalKnowledge)}
                className={`px-4 py-2.5 text-xs uppercase rounded-lg transition-colors flex items-center gap-2 ${
                  showPersonalKnowledge
                    ? "bg-stone-950 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Knowledge</span>
              </button>

              {/* Integrations group */}
              <button
                onClick={() => setShowInstagram(!showInstagram)}
                className={`px-4 py-2.5 text-xs uppercase rounded-lg transition-colors flex items-center gap-2 ${
                  showInstagram
                    ? "bg-stone-950 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                <Instagram className="w-4 h-4" />
                <span className="hidden sm:inline">Instagram</span>
              </button>
              
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`px-4 py-2.5 text-xs uppercase rounded-lg transition-colors flex items-center gap-2 ${
                  showAnalytics
                    ? "bg-stone-950 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tool panels */}
        {(showContentAnalyzer || showPersonalKnowledge || showKnowledgeBase || showAnalytics || showSemanticSearch || showGallery || showInstagram) && (
          <div className="bg-white border-b border-stone-200 p-4 max-h-[400px] overflow-y-auto">
            <div className="max-w-5xl mx-auto">
              {showContentAnalyzer && (
                <ContentAnalyzer 
                  onAnalyzed={(analysis) => {
                    setInputValue(analysis)
                    setShowContentAnalyzer(false)
                  }} 
                />
              )}
              {showPersonalKnowledge && <PersonalKnowledgeManager />}
              {showKnowledgeBase && <AdminKnowledgeManager />}
              {showSemanticSearch && <SemanticSearchPanel onInsertResult={(text) => setInputValue(prev => prev + "\n\n" + text)} />}
              {showGallery && <GalleryImageSelector onSelectImage={(url) => setInputValue(prev => prev + `\n\nImage URL: ${url}`)} />}
              {showAnalytics && <AdminAnalyticsPanel />}
              {showInstagram && <InstagramConnectionManager />}
              {showInstagram && (
                <div className="mt-6 pt-6 border-t border-stone-200">
                  <h3 className="text-lg font-semibold mb-4 uppercase text-stone-950" style={{ letterSpacing: "0.1em" }}>
                    Developer Tools
                  </h3>
                  <InstagramGraphApiTester />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Messages - scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-5xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="max-w-md">
                  <h3
                    className="text-2xl font-extralight uppercase text-stone-950 mb-4"
                    style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
                  >
                    ADMIN AGENT
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed mb-6">
                    Create content calendars, write emails, research competitors, and manage your business with AI assistance
                  </p>
                  <div className="text-left space-y-3">
                    <p className="text-xs uppercase text-stone-500 mb-2" style={{ letterSpacing: "0.15em" }}>
                      TRY ASKING:
                    </p>
                    <p className="text-sm text-stone-700">Create a 7-day content calendar</p>
                    <p className="text-sm text-stone-700">Write a welcome email for new subscribers</p>
                    <p className="text-sm text-stone-700">Analyze my competitor's content strategy</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                        message.role === "user" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-900"
                      }`}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{getMessageContent(message)}</div>
                    </div>
                  </div>
                ))}
                
                {latestGeneration && !isLoading && (
                  <div className="flex justify-center gap-3 mt-4">
                    {latestGeneration.type === 'content' && (
                      <button
                        onClick={handleSaveToCalendar}
                        className="flex items-center gap-2 px-6 py-3 bg-stone-950 text-white rounded-xl text-sm uppercase hover:bg-stone-800 transition-colors"
                        style={{ letterSpacing: "0.1em" }}
                      >
                        <Calendar className="w-4 h-4" />
                        Save to Calendar
                      </button>
                    )}
                    {latestGeneration.type === 'email' && (
                      <button
                        onClick={handleSaveEmail}
                        className="flex items-center gap-2 px-6 py-3 bg-stone-950 text-white rounded-xl text-sm uppercase hover:bg-stone-800 transition-colors"
                        style={{ letterSpacing: "0.1em" }}
                      >
                        <Mail className="w-4 h-4" />
                        Save Email Draft
                      </button>
                    )}
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-stone-100 rounded-2xl px-6 py-4">
                      {researchStatus ? (
                        <div className="flex items-center gap-3">
                          <Search className="w-4 h-4 text-stone-700 animate-pulse" />
                          <span className="text-sm text-stone-700">{researchStatus}</span>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-t border-stone-200 p-4">
          <div className="max-w-5xl mx-auto">
            {uploadedImages.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {uploadedImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img.url || "/placeholder.svg"}
                      alt={img.name}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-stone-200"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder="What would you like to create? (Cmd/Ctrl + Enter to send)"
                className="w-full min-h-[100px] md:min-h-[120px] mb-3 px-4 py-3 border border-stone-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingImage || isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage || isLoading}
                    className="flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Image className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {isUploadingImage ? "Uploading..." : "Add Photos"}
                    </span>
                  </button>
                  
                  {uploadedImages.length > 0 && (
                    <span className="text-xs text-stone-500">
                      {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} attached
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || (!inputValue.trim() && uploadedImages.length === 0) || isUploadingImage}
                  className="bg-stone-950 text-white hover:bg-stone-800 px-6 md:px-8 py-2.5 md:py-3 rounded-xl text-sm uppercase font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  style={{ letterSpacing: "0.1em" }}
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{isLoading ? "SENDING..." : "SEND"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
