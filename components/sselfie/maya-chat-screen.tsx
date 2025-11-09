"use client"

import type React from "react"
import VideoCard from "./video-card"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Camera, Send, Plus, ArrowDown, History, X, Settings } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import ConceptCard from "./concept-card"
import MayaChatHistory from "./maya-chat-history"
import UnifiedLoading from "./unified-loading"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"

interface MayaChatScreenProps {
  onImageGenerated?: () => void
}

export default function MayaChatScreen({ onImageGenerated }: MayaChatScreenProps) {
  const [inputValue, setInputValue] = useState("")
  const [chatId, setChatId] = useState<number | null>(null)
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const savedMessageIds = useRef(new Set<string>())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isAtBottomRef = useRef(true)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const retryQueue = useRef<Array<{ messageId: string; payload: any }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [contentFilter, setContentFilter] = useState<"all" | "photos" | "videos">("all")
  const [currentPrompts, setCurrentPrompts] = useState<Array<{ label: string; prompt: string }>>([])
  const [userGender, setUserGender] = useState<string | null>(null)
  const [showHeader, setShowHeader] = useState(true)

  const [styleStrength, setStyleStrength] = useState(1.0) // LoRA scale: 0.9-1.2
  const [promptAccuracy, setPromptAccuracy] = useState(3.5) // Guidance scale: 2.5-5.0
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [showSettings, setShowSettings] = useState(false)

  const settingsSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const messageSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef(0)
  const isSavingMessageRef = useRef(false)

  useEffect(() => {
    const settingsStr = localStorage.getItem("mayaGenerationSettings")
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr)
        console.log("[v0] 📊 Loaded saved settings from localStorage:", settings)
        setStyleStrength(settings.styleStrength || 1.0)
        setPromptAccuracy(settings.promptAccuracy || 3.5)
        setAspectRatio(settings.aspectRatio || "1:1")
      } catch (error) {
        console.error("[v0] ❌ Error loading settings:", error)
      }
    } else {
      console.log("[v0] 📊 No saved settings found, using defaults")
    }
  }, []) // Empty dependency array - only run once on mount

  useEffect(() => {
    // Clear any existing timer
    if (settingsSaveTimerRef.current) {
      clearTimeout(settingsSaveTimerRef.current)
    }

    // Set new timer to save after 500ms of no changes
    settingsSaveTimerRef.current = setTimeout(() => {
      const settings = {
        styleStrength,
        promptAccuracy,
        aspectRatio,
      }
      console.log("[v0] 💾 Saving settings to localStorage:", settings)
      localStorage.setItem("mayaGenerationSettings", JSON.stringify(settings))
    }, 500)

    // Cleanup timer on unmount
    return () => {
      if (settingsSaveTimerRef.current) {
        clearTimeout(settingsSaveTimerRef.current)
      }
    }
  }, [styleStrength, promptAccuracy, aspectRatio]) // Removed enableRealismBoost from dependencies

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/maya/chat" }),
    initialMessages: [],
    body: {
      chatId: chatId,
    },
    onError: (error) => {
      console.error("[v0] Maya chat error:", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
    },
  })

  useEffect(() => {
    if (status !== "ready" || !chatId || messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== "assistant") return

    // Skip if already saved
    if (savedMessageIds.current.has(lastMessage.id)) return

    // Extract text content from parts
    let textContent = ""
    if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
      const textParts = lastMessage.parts.filter((p: any) => p.type === "text")
      textContent = textParts
        .map((p: any) => p.text)
        .join("\n")
        .trim()
    }

    // Extract concept cards from parts (matching the rendering logic)
    const conceptCards: any[] = []
    if (lastMessage.parts && Array.isArray(lastMessage.parts)) {
      for (const part of lastMessage.parts) {
        if (part.type === "tool-generateConcepts") {
          const toolPart = part as any
          const output = toolPart.output
          if (output && output.state === "ready" && Array.isArray(output.concepts)) {
            conceptCards.push(...output.concepts)
          }
        }
      }
    }

    // Only save if we have content or concepts AND they're from streaming (not loaded from DB)
    // Messages loaded from DB won't have the tool output structure
    const hasStreamingData = lastMessage.parts?.some(
      (p: any) => p.type === "tool-generateConcepts" && p.output?.state === "ready",
    )

    if (!hasStreamingData && !textContent) {
      return
    }

    // Mark as saved immediately to prevent duplicate saves
    savedMessageIds.current.add(lastMessage.id)

    // Save to database
    fetch("/api/maya/save-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        role: "assistant",
        content: textContent || "",
        conceptCards: conceptCards.length > 0 ? conceptCards : null,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log("[v0] ✅ Assistant message saved successfully")
        } else {
          console.error("[v0] ❌ Failed to save message:", data.error)
          savedMessageIds.current.delete(lastMessage.id)
        }
      })
      .catch((error) => {
        console.error("[v0] ❌ Save error:", error)
        savedMessageIds.current.delete(lastMessage.id)
      })
  }, [status, chatId]) // Updated dependency to messages

  const isTyping = status === "submitted" || status === "streaming"

  const promptPoolWoman = {
    photoStories: [
      {
        label: "Golden Hour",
        prompt: "Take my photo during golden hour with warm natural lighting",
      },
      {
        label: "Editorial Style",
        prompt: "Create an editorial photo with dramatic lighting",
      },
      {
        label: "In Motion",
        prompt: "Capture me in motion with natural energy",
      },
      {
        label: "Cinematic",
        prompt: "Make a cinematic photo with beautiful scenery",
      },
      {
        label: "Soft & Dreamy",
        prompt: "Create a soft dreamy photo with gentle lighting",
      },
      {
        label: "Confident",
        prompt: "Show me looking confident with elegant posing",
      },
    ],
    storytelling: [
      {
        label: "Tell My Story",
        prompt: "Create photos that tell my story",
      },
      {
        label: "Authentic",
        prompt: "Show who I am, authentic and real",
      },
      {
        label: "Moody",
        prompt: "Create a moody photo with soft lighting",
      },
      {
        label: "Natural Beauty",
        prompt: "Highlight natural beauty with flowing composition",
      },
    ],
    artistic: [
      {
        label: "Bold & Powerful",
        prompt: "Make me look bold and powerful",
      },
      {
        label: "Timeless",
        prompt: "Create something timeless and elegant",
      },
      {
        label: "Modern",
        prompt: "Capture modern style with clean lines",
      },
      {
        label: "Romantic",
        prompt: "Create a romantic atmosphere with soft lighting",
      },
    ],
  }

  const promptPoolMan = {
    photoStories: [
      {
        label: "Golden Hour",
        prompt: "Take my photo during golden hour with strong natural lighting",
      },
      {
        label: "Editorial Style",
        prompt: "Create an editorial photo with dramatic lighting",
      },
      {
        label: "Action Shot",
        prompt: "Capture me in motion with natural energy",
      },
      {
        label: "Cinematic",
        prompt: "Make a cinematic photo with striking scenery",
      },
      {
        label: "Sharp & Modern",
        prompt: "Create a sharp modern photo with clean lines",
      },
      {
        label: "Confident",
        prompt: "Show me looking confident with powerful posing",
      },
    ],
    storytelling: [
      {
        label: "Tell My Story",
        prompt: "Create photos that tell my story",
      },
      {
        label: "Authentic",
        prompt: "Show who I am, authentic and real",
      },
      {
        label: "Moody",
        prompt: "Create a moody photo with dramatic lighting",
      },
      {
        label: "Natural Strength",
        prompt: "Highlight natural strength with bold composition",
      },
    ],
    artistic: [
      {
        label: "Bold & Powerful",
        prompt: "Make me look bold and powerful",
      },
      {
        label: "Timeless",
        prompt: "Create something timeless and classic",
      },
      {
        label: "Urban",
        prompt: "Capture urban energy with modern style",
      },
      {
        label: "Rugged",
        prompt: "Create a rugged natural look with outdoor energy",
      },
    ],
  }

  const getRandomPrompts = (gender: string | null) => {
    const promptPool = gender === "woman" ? promptPoolWoman : promptPoolMan
    const allCategories = Object.values(promptPool)
    const selected: Array<{ label: string; prompt: string }> = []

    // Get 1-2 from each category, shuffled
    allCategories.forEach((category) => {
      const shuffled = [...category].sort(() => Math.random() - 0.5)
      selected.push(...shuffled.slice(0, Math.random() > 0.5 ? 2 : 1))
    })

    // Shuffle all selected and take 4
    return selected.sort(() => Math.random() - 0.5).slice(0, 4)
  }

  useEffect(() => {
    const fetchUserGender = async () => {
      try {
        console.log("[v0] Fetching user gender from /api/user/profile")
        const response = await fetch("/api/user/profile")
        console.log("[v0] Profile API response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Profile API data:", data)
          setUserGender(data.gender || null)
          const prompts = getRandomPrompts(data.gender || null)
          console.log("[v0] Setting prompts for gender:", data.gender, "Prompts:", prompts.length)
          setCurrentPrompts(prompts)
        } else {
          console.error("[v0] Profile API error:", response.status, response.statusText)
          setCurrentPrompts(getRandomPrompts(null))
        }
      } catch (error) {
        console.error("[v0] Error fetching user gender:", error)
        setCurrentPrompts(getRandomPrompts(null))
      }
    }
    fetchUserGender()
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  const retryFailedSaves = async () => {
    if (retryQueue.current.length === 0) return

    console.log("[v0] 🔄 Retrying", retryQueue.current.length, "failed saves")

    const queue = [...retryQueue.current]
    retryQueue.current = []

    for (const item of queue) {
      try {
        const response = await fetch("/api/maya/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        })

        if (response.ok) {
          console.log("[v0] ✅ Retry successful for message:", item.messageId)
          savedMessageIds.current.add(item.messageId)
        } else {
          console.log("[v0] ⚠️ Retry failed, re-queuing:", item.messageId)
          retryQueue.current.push(item)
        }
      } catch (error) {
        console.error("[v0] ❌ Retry error:", error)
        retryQueue.current.push(item)
      }
    }
  }

  useEffect(() => {
    const interval = setInterval(retryFailedSaves, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return

    const container = messagesContainerRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    // Check if user is within 100px of bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

    // Update refs and state
    isAtBottomRef.current = isNearBottom
    setShowScrollButton(!isNearBottom)
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  useEffect(() => {
    // Only auto-scroll if user is at bottom (respects manual scrolling up)
    if (isAtBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth")
      })
    }
  }, [messages.length, scrollToBottom]) // Changed from messages to messages.length to prevent infinite loop

  const loadChat = async (specificChatId?: number) => {
    try {
      setIsLoadingChat(true)
      const url = specificChatId ? `/api/maya/load-chat?chatId=${specificChatId}` : "/api/maya/load-chat"
      console.log("[v0] Loading chat:", specificChatId || "active chat")
      console.log("[v0] Fetching from URL:", url)
      const response = await fetch(url)
      console.log("[v0] Load chat response status:", response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log(
          "[v0] Loaded chat ID:",
          data.chatId,
          "Messages:",
          data.messages?.length || 0,
          "Title:",
          data.chatTitle,
        )

        data.messages?.forEach((msg: any, index: number) => {
          const conceptParts = msg.parts?.filter((p: any) => p.type === "tool-generateConcepts")
          if (conceptParts && conceptParts.length > 0) {
            console.log(`[v0] Message ${index + 1} has concept cards:`, {
              messageId: msg.id,
              conceptParts: conceptParts.length,
              concepts: conceptParts[0]?.output?.concepts?.length || 0,
              state: conceptParts[0]?.output?.state,
            })
          }
        })

        setChatId(data.chatId)

        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages)
        } else {
          setMessages([])
        }

        setShowHistory(false)
      } else {
        console.error("[v0] ❌ Load chat failed with status:", response.status)
        try {
          const errorData = await response.json()
          console.error("[v0] ❌ Error response:", errorData)
        } catch (e) {
          console.error("[v0] ❌ Could not parse error response")
        }
      }
    } catch (error) {
      console.error("[v0] Error loading chat:", error)
      if (error instanceof Error) {
        console.error("[v0] ❌ Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        })
      }
    } finally {
      setIsLoadingChat(false)
    }
  }

  useEffect(() => {
    console.log("[v0] 🚀 Maya chat screen mounted, calling loadChat()")
    loadChat()
  }, [])

  useEffect(() => {
    console.log("[v0] Maya chat status:", status, "isTyping:", isTyping)
  }, [status, isTyping])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setIsUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await response.json()
      setUploadedImage(url)
      console.log("[v0] Image uploaded:", url)

      // Call the onImageGenerated callback if provided
      if (onImageGenerated) {
        onImageGenerated()
      }
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setIsUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await response.json()
      setUploadedImage(url)
      console.log("[v0] Image uploaded:", url)

      // Call the onImageGenerated callback if provided
      if (onImageGenerated) {
        onImageGenerated()
      }
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSendMessage = (customPrompt?: string) => {
    const messageText = customPrompt || inputValue.trim()
    if ((messageText || uploadedImage) && !isTyping) {
      const messageContent = uploadedImage ? `${messageText}\n\n[Inspiration Image: ${uploadedImage}]` : messageText

      console.log("[v0] 📤 Sending message with settings:", {
        styleStrength,
        promptAccuracy,
        aspectRatio,
      })

      isAtBottomRef.current = true

      if (chatId) {
        fetch("/api/maya/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            role: "user",
            content: messageContent,
          }),
        }).catch((error) => {
          console.error("[v0] ❌ Error saving user message:", error)
        })
      }

      sendMessage({
        text: messageContent,
        experimental_providerMetadata: {
          customSettings: {
            styleStrength,
            promptAccuracy,
            aspectRatio,
          },
        },
      })
      setInputValue("")
      setUploadedImage(null)
    }
  }

  const handleNewChat = async () => {
    try {
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setChatId(data.chatId)
        savedMessageIds.current.clear()
        setMessages([])
        isAtBottomRef.current = true
        setShowHistory(false)
        setCurrentPrompts(getRandomPrompts(userGender))
        setTimeout(() => scrollToBottom("instant"), 100)
      }
    } catch (error) {
      console.error("[v0] Error creating new chat:", error)
    }
  }

  const handleSelectChat = (selectedChatId: number) => {
    if (selectedChatId !== chatId) {
      setChatId(selectedChatId)
      setMessages([])
      savedMessageIds.current.clear()
      isAtBottomRef.current = true
      loadChat(selectedChatId)
    }
  }

  const filteredMessages = messages.filter((msg) => {
    if (contentFilter === "all") return true

    if (contentFilter === "photos") {
      // Show messages with concept cards (photos)
      return msg.parts?.some((inv: any) => inv.type === "tool-generateConcepts" && inv.output?.state === "ready")
    }

    if (contentFilter === "videos") {
      // Show messages with video cards
      return msg.parts?.some((inv: any) => inv.type === "tool-generateVideo")
    }

    return true
  })

  const renderMessageContent = (text: string, isUser: boolean) => {
    // Check if message contains an inspiration image
    const inspirationImageMatch = text.match(/\[Inspiration Image: (https?:\/\/[^\]]+)\]/)

    if (inspirationImageMatch) {
      const imageUrl = inspirationImageMatch[1]
      const textWithoutImage = text.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim()

      return (
        <div className="space-y-3">
          {textWithoutImage && (
            <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{textWithoutImage}</p>
          )}
          <div className="mt-2">
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-white/60 shadow-lg">
              <img src={imageUrl || "/placeholder.svg"} alt="Inspiration" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-stone-500 mt-1.5 tracking-wide">Inspiration Image</p>
          </div>
        </div>
      )
    }

    return <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{text}</p>
  }

  if (isLoadingChat) {
    return <UnifiedLoading message="Loading chat..." />
  }

  const isEmpty = !messages || messages.length === 0

  return (
    <div
      className="flex flex-col h-full bg-gradient-to-b from-stone-50 to-white relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-xl border-2 border-dashed border-stone-400 rounded-3xl p-12 text-center max-w-md mx-4">
            <Camera size={48} className="mx-auto mb-4 text-stone-600" strokeWidth={1.5} />
            <h3 className="text-xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              Drop Image Here
            </h3>
            <p className="text-sm text-stone-600 tracking-wide">Upload a reference image for Maya to work with</p>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-stone-200/50">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-stone-200/60 overflow-hidden flex-shrink-0">
            <img src="https://i.postimg.cc/fTtCnzZv/out-1-22.png" alt="Maya" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">
              Maya
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={handleNewChat}
            className="p-2.5 sm:p-2 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-lg hover:bg-white/60 transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95"
            aria-label="Start new chat"
          >
            <Plus size={18} className="text-stone-600" strokeWidth={2} />
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2.5 sm:p-2 backdrop-blur-2xl border rounded-lg transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95 ${
              showHistory
                ? "bg-stone-900 border-stone-900 text-white"
                : "bg-white/40 border-white/60 hover:bg-white/60 text-stone-600"
            }`}
            aria-label="Toggle chat history"
          >
            <History size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="flex-shrink-0 mx-4 mt-2 mb-2 bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl p-4 shadow-xl shadow-stone-950/5 animate-in slide-in-from-top-2 duration-300">
          <MayaChatHistory currentChatId={chatId} onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
        </div>
      )}

      <div className="flex-1 min-h-0 px-3 sm:px-4">
        <div
          ref={messagesContainerRef}
          className="h-full overflow-y-auto space-y-3 pr-1 scroll-smooth"
          style={{
            paddingBottom: "11rem",
          }}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {isEmpty && !isTyping && (
            <div className="flex flex-col items-center justify-center h-full px-4 py-8 animate-in fade-in duration-500">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-stone-200/60 overflow-hidden mb-4 sm:mb-6">
                <img
                  src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                  alt="Maya"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase mb-2 sm:mb-3 text-center">
                Welcome
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 tracking-wide text-center mb-4 sm:mb-6 max-w-md leading-relaxed px-4">
                Hi, I'm Maya. I'll help you create beautiful photos and videos.
              </p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 w-full max-w-2xl px-2 sm:px-4 -mx-2 sm:-mx-0">
                {currentPrompts.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="flex-shrink-0 px-4 py-2.5 sm:py-3 bg-white/50 backdrop-blur-xl border border-white/70 rounded-xl hover:bg-stone-100 hover:border-stone-300 transition-all duration-300 touch-manipulation active:scale-95 min-h-[44px]"
                  >
                    <span className="text-xs tracking-wide font-medium text-stone-700 whitespace-nowrap">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredMessages &&
            Array.isArray(filteredMessages) &&
            filteredMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] sm:max-w-[85%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                  {msg.parts &&
                    Array.isArray(msg.parts) &&
                    msg.parts.map((part, partIndex) => {
                      if (part.type === "text") {
                        return (
                          <div
                            key={partIndex}
                            className={`p-4 rounded-2xl transition-all duration-300 ${
                              msg.role === "user"
                                ? "bg-stone-950 text-white shadow-lg shadow-stone-950/20"
                                : "bg-white/50 backdrop-blur-xl border border-white/70 shadow-lg shadow-stone-950/5 text-stone-950"
                            }`}
                            role={msg.role === "assistant" ? "article" : undefined}
                          >
                            {renderMessageContent(part.text, msg.role === "user")}
                          </div>
                        )
                      }

                      if (part.type === "tool-generateConcepts") {
                        const toolPart = part as any
                        const output = toolPart.output

                        if (output && output.state === "ready" && Array.isArray(output.concepts)) {
                          const concepts = output.concepts

                          return (
                            <div key={partIndex} className="mt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-stone-600"></div>
                                <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600">
                                  Photo Ideas
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                {concepts.map((concept: any, conceptIndex: number) => (
                                  <ConceptCard key={conceptIndex} concept={concept} />
                                ))}
                              </div>
                            </div>
                          )
                        } else if (output && output.state === "loading") {
                          return (
                            <div key={partIndex} className="mt-3">
                              <div className="flex items-center gap-2 text-stone-600">
                                <div className="w-1.5 h-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs tracking-[0.15em] uppercase font-light">
                                  Creating photo concepts...
                                </span>
                              </div>
                            </div>
                          )
                        }
                      }

                      if (part.type === "tool-generateVideo") {
                        const toolPart = part as any
                        const output = toolPart.output

                        if (output && output.state === "processing") {
                          return (
                            <div key={partIndex} className="mt-3">
                              <VideoCard
                                videoUrl=""
                                status="processing"
                                progress={output.progress}
                                motionPrompt={toolPart.args?.motionPrompt}
                              />
                            </div>
                          )
                        }

                        if (output && output.state === "ready" && output.videoUrl) {
                          return (
                            <div key={partIndex} className="mt-3">
                              <VideoCard
                                videoUrl={output.videoUrl}
                                motionPrompt={toolPart.args?.motionPrompt}
                                imageSource={toolPart.args?.imageUrl}
                              />
                            </div>
                          )
                        }

                        if (output && output.state === "loading") {
                          return (
                            <div key={partIndex} className="mt-3">
                              <div className="flex items-center gap-2 text-stone-600">
                                <div className="w-1.5 h-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs tracking-[0.15em] uppercase font-light">
                                  Starting video generation...
                                </span>
                              </div>
                            </div>
                          )
                        }
                      }

                      return null
                    })}
                </div>
              </div>
            ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/50 backdrop-blur-xl border border-white/70 p-3 rounded-2xl max-w-[85%] shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"></div>
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <span className="text-xs font-light text-stone-600">Maya is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showScrollButton && (
          <button
            onClick={() => {
              isAtBottomRef.current = true
              scrollToBottom("smooth")
            }}
            className="fixed bottom-[11rem] right-4 sm:right-6 p-3 bg-stone-950 text-white rounded-full shadow-2xl shadow-stone-900/40 hover:scale-110 active:scale-95 transition-all duration-300 z-10 animate-in fade-in slide-in-from-bottom-2 min-w-[48px] min-h-[48px] flex items-center justify-center touch-manipulation"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-stone-200/50 px-3 sm:px-4 py-2.5 sm:py-3 z-50 safe-bottom"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)",
        }}
      >
        {!isEmpty && !uploadedImage && (
          <div className="mb-2">
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
              {currentPrompts.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isTyping}
                  className="flex-shrink-0 px-3 py-2 bg-white/40 backdrop-blur-xl border border-white/60 rounded-lg hover:bg-white/60 transition-all duration-300 disabled:opacity-50 touch-manipulation active:scale-95 min-h-[44px]"
                >
                  <span className="text-xs tracking-wide font-medium text-stone-700 whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {uploadedImage && (
          <div className="mb-2 relative inline-block">
            <div className="relative w-20 h-20 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-white/60 shadow-lg">
              <img src={uploadedImage || "/placeholder.svg"} alt="Inspiration" className="w-full h-full object-cover" />
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute top-1 right-1 w-6 h-6 bg-stone-950 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform touch-manipulation"
                aria-label="Remove image"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-xs text-stone-600 mt-1 tracking-wide">Inspiration Image</p>
          </div>
        )}

        <div className="flex gap-1.5 sm:gap-2">
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <button
                className="p-3 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl hover:bg-white/60 transition-all duration-300 min-h-[48px] min-w-[48px] flex items-center justify-center shadow-lg shadow-stone-950/10 touch-manipulation active:scale-95"
                aria-label="Generation settings"
                type="button"
              >
                <Settings size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[calc(100vw-2rem)] sm:w-80 p-4 sm:p-6 bg-white/95 backdrop-blur-xl border border-stone-200 shadow-2xl max-h-[80vh] overflow-y-auto"
              align="start"
              side="top"
            >
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-3 sm:mb-4">
                    Generation Settings
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed mb-4 sm:mb-6">
                    Fine-tune how Maya creates your images
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-stone-700 tracking-wide">Aspect Ratio</label>
                      <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {aspectRatio}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {[
                        { value: "1:1", label: "Square", desc: "1:1" },
                        { value: "4:5", label: "Portrait", desc: "4:5" },
                        { value: "3:4", label: "Portrait", desc: "3:4" },
                        { value: "16:9", label: "Landscape", desc: "16:9" },
                        { value: "9:16", label: "Vertical", desc: "9:16" },
                        { value: "21:9", label: "Cinematic", desc: "21:9" },
                      ].map((ratio) => (
                        <button
                          key={ratio.value}
                          onClick={() => {
                            console.log("[v0] 📐 Aspect Ratio changed to:", ratio.value)
                            setAspectRatio(ratio.value)
                          }}
                          className={`px-2 sm:px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 touch-manipulation active:scale-95 min-h-[44px] ${
                            aspectRatio === ratio.value
                              ? "bg-stone-950 text-white"
                              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-semibold">{ratio.desc}</div>
                            <div className="text-[10px] opacity-70 hidden sm:block">{ratio.label}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                      Choose the image dimensions for your photos
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-stone-700 tracking-wide">Style Strength</label>
                      <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {styleStrength.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[styleStrength]}
                      onValueChange={(value) => {
                        console.log("[v0] 🎚️ Style Strength changed to:", value[0])
                        setStyleStrength(value[0])
                      }}
                      min={0.9}
                      max={1.2}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                      How strongly your trained style is applied
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-stone-700 tracking-wide">Prompt Accuracy</label>
                      <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {promptAccuracy.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[promptAccuracy]}
                      onValueChange={(value) => {
                        console.log("[v0] 🎚️ Prompt Accuracy changed to:", value[0])
                        setPromptAccuracy(value[0])
                      }}
                      min={2.5}
                      max={5.0}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                      How closely the AI follows your description
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    console.log("[v0] 🔄 Resetting settings to defaults")
                    setStyleStrength(1.0)
                    setPromptAccuracy(3.5)
                    setAspectRatio("1:1")
                  }}
                  className="w-full py-2.5 sm:py-2 text-xs text-stone-600 hover:text-stone-950 transition-colors tracking-wide touch-manipulation min-h-[44px]"
                >
                  Reset to defaults
                </button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex-1 relative group">
            <textarea
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                // Auto-resize textarea based on content
                e.target.style.height = "auto"
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px" // Reduced max from 120px to 100px for mobile
              }}
              onKeyDown={(e) => {
                // Enter sends message, Shift+Enter adds new line
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                  // Reset height after sending
                  setTimeout(() => {
                    const textarea = e.target as HTMLTextAreaElement
                    textarea.style.height = "48px"
                  }, 0)
                }
              }}
              placeholder={uploadedImage ? "Describe the style..." : "Message Maya..."}
              className="w-full px-3 sm:px-4 py-3 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl text-stone-950 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-950/50 focus:bg-white/60 pr-11 sm:pr-12 font-medium text-sm min-h-[48px] max-h-[100px] shadow-lg shadow-stone-950/10 transition-all duration-300 resize-none overflow-y-auto leading-relaxed touch-manipulation"
              disabled={isTyping || isUploadingImage}
              aria-label="Message input"
              rows={1}
            />
            <div className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                aria-label="Upload image file"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage || isTyping}
                className="w-10 h-10 bg-stone-950 rounded-lg flex items-center justify-center hover:bg-stone-800 active:scale-95 shadow-lg shadow-stone-950/30 transition-all duration-300 disabled:opacity-50 touch-manipulation"
                aria-label="Attach image"
                type="button"
              >
                {isUploadingImage ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={18} className="text-white" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="w-12 h-12 sm:w-10 sm:h-10 bg-stone-950 text-white rounded-lg flex items-center justify-center hover:bg-stone-800 active:scale-95 shadow-lg shadow-stone-950/30 transition-all duration-300 disabled:opacity-50 touch-manipulation min-h-[48px] min-w-[48px]"
            disabled={isTyping || (!inputValue.trim() && !uploadedImage) || isUploadingImage}
            aria-label="Send message"
          >
            <Send size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
