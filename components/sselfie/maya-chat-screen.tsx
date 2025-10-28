"use client"

import type React from "react"
import VideoCard from "./video-card"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Camera, Send, Plus, ArrowDown, History, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import ConceptCard from "./concept-card"
import MayaChatHistory from "./maya-chat-history"
import UnifiedLoading from "./unified-loading"

export default function MayaChatScreen() {
  const [inputValue, setInputValue] = useState("")
  const [chatId, setChatId] = useState<number | null>(null)
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const savedMessageIds = useRef(new Set<string>())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const lastScrollTop = useRef(0)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const retryQueue = useRef<Array<{ messageId: string; payload: any }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [contentFilter, setContentFilter] = useState<"all" | "photos" | "videos">("all")
  const [currentPrompts, setCurrentPrompts] = useState<Array<{ label: string; prompt: string }>>([])

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

  const isTyping = status === "submitted" || status === "streaming"

  const promptPool = {
    photoStories: [
      {
        label: "Golden Hour",
        prompt: "Take my photo during golden hour with warm, natural lighting",
      },
      {
        label: "Editorial Style",
        prompt: "Create an editorial-style photo with dramatic lighting and composition",
      },
      {
        label: "Action Shot",
        prompt: "Capture me in motion with natural energy and movement",
      },
      {
        label: "Cinematic Look",
        prompt: "Make a cinematic photo with beautiful scenery in the background",
      },
      {
        label: "Modern Architecture",
        prompt: "Take my photo with modern architecture and clean lines",
      },
      {
        label: "Soft & Dreamy",
        prompt: "Create a soft, dreamy photo with gentle natural light",
      },
    ],
    videoMoments: [
      {
        label: "Bring Photo to Life",
        prompt: "Turn my photo into a video with subtle natural movement",
      },
      {
        label: "Cinematic Video",
        prompt: "Make a cinematic video with smooth, flowing movement",
      },
      {
        label: "Animated Portrait",
        prompt: "Animate my portrait with lifelike, natural motion",
      },
    ],
    storytelling: [
      {
        label: "Tell My Story",
        prompt: "Create photos that tell my story through light and composition",
      },
      {
        label: "Confident Look",
        prompt: "Capture me looking confident and graceful",
      },
      {
        label: "Authentic Moment",
        prompt: "Show who I am in this moment, authentic and real",
      },
      {
        label: "Moody Vibe",
        prompt: "Create a moody photo with soft, contemplative lighting",
      },
    ],
    artistic: [
      {
        label: "Bold & Powerful",
        prompt: "Make me look bold and powerful in a dramatic setting",
      },
      {
        label: "Natural Beauty",
        prompt: "Highlight natural beauty with organic, flowing composition",
      },
      {
        label: "Urban Style",
        prompt: "Capture urban energy with modern, contemporary style",
      },
      {
        label: "Timeless & Elegant",
        prompt: "Create something timeless and elegant, classic but fresh",
      },
    ],
  }

  const getRandomPrompts = () => {
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
    setCurrentPrompts(getRandomPrompts())
  }, [])

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" })
  }

  const handleScroll = () => {
    if (!messagesContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100

    setShowScrollButton(!isAtBottom)

    if (scrollTop < lastScrollTop.current) {
      setIsUserScrolling(true)
    } else if (isAtBottom) {
      setIsUserScrolling(false)
    }

    lastScrollTop.current = scrollTop
  }

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

  useEffect(() => {
    if (!isUserScrolling) {
      scrollToBottom("smooth")
    }
  }, [messages, isTyping])

  useEffect(() => {
    if (!isLoadingChat) {
      setTimeout(() => scrollToBottom("auto"), 100)
    }
  }, [isLoadingChat])

  const loadChat = async (specificChatId?: number) => {
    try {
      setIsLoadingChat(true)
      const url = specificChatId ? `/api/maya/load-chat?chatId=${specificChatId}` : "/api/maya/load-chat"
      console.log("[v0] Loading chat:", specificChatId || "active chat")
      const response = await fetch(url)
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
      }
    } catch (error) {
      console.error("[v0] Error loading chat:", error)
    } finally {
      setIsLoadingChat(false)
    }
  }

  useEffect(() => {
    loadChat()
  }, [])

  useEffect(() => {
    console.log("[v0] Maya chat status:", status, "isTyping:", isTyping)
  }, [status, isTyping])

  useEffect(() => {
    console.log("[v0] 🔍 Assistant save useEffect triggered:", {
      chatId,
      isTyping,
      messagesCount: messages.length,
      lastMessageRole: messages[messages.length - 1]?.role,
      lastMessageId: messages[messages.length - 1]?.id,
    })

    if (!chatId) {
      console.log("[v0] ⏭️ Skipping save - no chatId")
      return
    }

    if (isTyping) {
      console.log("[v0] ⏭️ Skipping save - still typing")
      return
    }

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) {
      console.log("[v0] ⏭️ Skipping save - no messages")
      return
    }

    if (lastMessage.role !== "assistant") {
      console.log("[v0] ⏭️ Skipping save - last message is not assistant, it's:", lastMessage.role)
      return
    }

    if (savedMessageIds.current.has(lastMessage.id)) {
      console.log("[v0] ⏭️ Skipping save - message already saved:", lastMessage.id)
      return
    }

    const parts = lastMessage.parts || []

    // Extract text content from text parts
    const textParts = parts.filter((p: any) => p.type === "text")
    const textContent = textParts
      .map((p: any) => p.text)
      .join("\n")
      .trim()

    // Extract concept cards from tool-generateConcepts parts
    const conceptParts = parts.filter((p: any) => p.type === "tool-generateConcepts")
    const conceptCards: any[] = []

    conceptParts.forEach((part: any) => {
      if (part.output && part.output.state === "ready" && Array.isArray(part.output.concepts)) {
        conceptCards.push(...part.output.concepts)
      }
    })

    const hasContent = textContent.length > 0
    const hasConcepts = conceptCards.length > 0

    console.log("[v0] 📊 Message analysis:", {
      messageId: lastMessage.id,
      hasContent,
      contentLength: textContent.length,
      hasConcepts,
      conceptsCount: conceptCards.length,
      partsCount: parts.length,
      textPartsCount: textParts.length,
      conceptPartsCount: conceptParts.length,
    })

    if (!hasContent && !hasConcepts) {
      console.log("[v0] ⏭️ Skipping save - no content and no concepts")
      return
    }

    console.log("[v0] 💾 Saving assistant message:", {
      messageId: lastMessage.id,
      chatId,
      hasContent,
      conceptCount: conceptCards.length,
      conceptCards: conceptCards.map((c: any) => ({
        title: c.title,
        category: c.category,
        type: c.type,
      })),
    })

    savedMessageIds.current.add(lastMessage.id)

    fetch("/api/maya/save-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        role: lastMessage.role,
        content: textContent || "",
        conceptCards: conceptCards.length > 0 ? conceptCards : null,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log("[v0] ✅ Assistant message saved successfully:", {
            messageId: data.message?.id,
            savedConceptsCount: data.message?.concept_cards?.length || 0,
          })
        } else {
          console.error("[v0] ❌ Failed to save assistant message:", data.error)
          savedMessageIds.current.delete(lastMessage.id)
        }
      })
      .catch((error) => {
        console.error("[v0] ❌ Save error:", error)
        savedMessageIds.current.delete(lastMessage.id)
      })
  }, [messages, chatId, isTyping])

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
      const messageContent = uploadedImage ? `${messageText}\n\n[Reference Image: ${uploadedImage}]` : messageText

      console.log("[v0] 📤 Sending user message:", {
        chatId,
        messageLength: messageContent.length,
        hasImage: !!uploadedImage,
      })

      // Save user message immediately
      if (chatId) {
        console.log("[v0] 💾 Saving user message to database")
        fetch("/api/maya/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            role: "user",
            content: messageContent,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              console.log("[v0] ✅ User message saved successfully")
            } else {
              console.error("[v0] ❌ Failed to save user message:", data.error)
            }
          })
          .catch((error) => {
            console.error("[v0] ❌ Error saving user message:", error)
          })
      } else {
        console.error("[v0] ❌ Cannot save user message - chatId is null")
      }

      sendMessage({ text: messageContent })
      setInputValue("")
      setUploadedImage(null)
      setIsUserScrolling(false)
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
        setIsUserScrolling(false)
        setShowHistory(false)
        setCurrentPrompts(getRandomPrompts()) // Refresh prompts
        setTimeout(() => scrollToBottom("auto"), 100)
      }
    } catch (error) {
      console.error("[v0] Error creating new chat:", error)
    }
  }

  const handleSelectChat = (selectedChatId: number) => {
    console.log("[v0] Chat selected:", selectedChatId, "Current chat:", chatId)
    if (selectedChatId !== chatId) {
      setChatId(selectedChatId)
      setMessages([])
      savedMessageIds.current.clear()
      loadChat(selectedChatId)
    }
  }

  const filteredMessages = messages.filter((msg) => {
    if (contentFilter === "all") return true

    if (contentFilter === "photos") {
      // Show messages with concept cards (photos)
      return msg.parts?.some((inv: any) => inv.toolName === "generateConcepts" && inv.state === "result")
    }

    if (contentFilter === "videos") {
      // Show messages with video cards
      return msg.parts?.some((inv: any) => inv.toolName === "generateVideo")
    }

    return true
  })

  if (isLoadingChat) {
    return <UnifiedLoading message="Loading chat..." />
  }

  const isEmpty = !messages || messages.length === 0

  return (
    <div
      className="h-full flex flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-xl border-2 border-dashed border-stone-400 rounded-3xl p-12 text-center max-w-md mx-4">
            <Camera size={48} className="mx-auto mb-4 text-stone-600" strokeWidth={1.5} />
            <h3 className="text-xl sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              Drop Image Here
            </h3>
            <p className="text-sm text-stone-600 tracking-wide">Upload a reference image for Maya to work with</p>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 flex items-center justify-between pt-3 sm:pt-4 pb-2">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 border-stone-200/60 overflow-hidden flex-shrink-0">
            <img
              src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
              alt="Maya - Your Photo Stylist"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.25em] text-stone-950 uppercase">
              Maya
            </h3>
            <p className="text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light text-stone-500">
              Your Photo Stylist
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 ml-3 sm:ml-4 flex-shrink-0">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`group relative p-3 sm:p-3 backdrop-blur-2xl border rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${
              showHistory
                ? "bg-stone-900 border-stone-900 text-white"
                : "bg-white/40 border-white/60 hover:bg-white/60 hover:border-stone-300 text-stone-600"
            }`}
            title="Chat history"
            aria-label="Toggle chat history"
            aria-expanded={showHistory}
          >
            <History size={18} strokeWidth={2} />
          </button>

          <button
            onClick={handleNewChat}
            className="group relative p-3 sm:p-3 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl hover:bg-white/60 hover:border-stone-300 transition-all duration-300 hover:scale-105 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Start new chat"
            aria-label="Start new chat"
          >
            <Plus size={18} className="text-stone-600" strokeWidth={2} />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-stone-950 rounded-full" aria-hidden="true"></div>
            <span className="text-xs tracking-[0.15em] font-light text-stone-600">Online</span>
          </div>
        </div>
      </div>

      {!isEmpty && (
        <div className="flex-shrink-0 flex items-center gap-2 mb-3 pb-3 border-b border-white/30">
          <button
            onClick={() => setContentFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-300 ${
              contentFilter === "all"
                ? "bg-stone-950 text-white"
                : "bg-white/40 backdrop-blur-xl border border-white/60 text-stone-600 hover:bg-white/60"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setContentFilter("photos")}
            className={`px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-300 ${
              contentFilter === "photos"
                ? "bg-stone-950 text-white"
                : "bg-white/40 backdrop-blur-xl border border-white/60 text-stone-600 hover:bg-white/60"
            }`}
          >
            Photos
          </button>
          <button
            onClick={() => setContentFilter("videos")}
            className={`px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-300 ${
              contentFilter === "videos"
                ? "bg-stone-950 text-white"
                : "bg-white/40 backdrop-blur-xl border border-white/60 text-stone-600 hover:bg-white/60"
            }`}
          >
            Videos
          </button>
        </div>
      )}

      {showHistory && (
        <div className="flex-shrink-0 mb-3 sm:mb-4 bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl p-4 shadow-xl shadow-stone-900/5 animate-in slide-in-from-top-2 duration-300">
          <MayaChatHistory currentChatId={chatId} onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
        </div>
      )}

      <div className="flex-1 relative min-h-0">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto space-y-3 sm:space-y-4 pr-1 scroll-smooth"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {isEmpty && !isTyping && (
            <div className="flex flex-col items-center justify-center h-full px-4 py-8 animate-in fade-in duration-500">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-stone-200/60 overflow-hidden mb-6">
                <img
                  src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                  alt="Maya"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase mb-3 text-center">
                Welcome
              </h2>
              <p className="text-sm sm:text-base text-stone-600 tracking-wide text-center mb-8 max-w-md leading-relaxed">
                Hi, I'm Maya. I'll help you create beautiful photos and videos. Pick a style below or tell me what you'd
                like to make.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {currentPrompts.map((item, index) => {
                  return (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="group p-4 bg-white/50 backdrop-blur-xl border border-white/70 rounded-2xl sm:rounded-[1.5rem] hover:bg-stone-100 hover:border-stone-300 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-left"
                    >
                      <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600 mb-2 block">
                        {item.label}
                      </span>
                      <p className="text-sm text-stone-700 leading-relaxed group-hover:text-stone-950 transition-colors">
                        {item.prompt}
                      </p>
                    </button>
                  )
                })}
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
                            className={`p-4 sm:p-5 md:p-6 rounded-[1.5rem] sm:rounded-[1.75rem] transition-all duration-300 hover:scale-[1.01] ${
                              msg.role === "user"
                                ? "bg-stone-950 text-white shadow-xl shadow-stone-950/30"
                                : "bg-white/50 backdrop-blur-2xl border border-white/70 shadow-xl shadow-stone-950/10 text-stone-950"
                            }`}
                            role={msg.role === "assistant" ? "article" : undefined}
                          >
                            <p className="text-sm sm:text-base leading-relaxed font-medium whitespace-pre-wrap">
                              {part.text}
                            </p>
                          </div>
                        )
                      }

                      if (part.type === "tool-generateConcepts") {
                        const toolPart = part as any
                        const output = toolPart.output

                        console.log("[v0] Rendering concept card part:", {
                          messageId: msg.id,
                          hasOutput: !!output,
                          outputState: output?.state,
                          hasConcepts: Array.isArray(output?.concepts),
                          conceptsLength: output?.concepts?.length || 0,
                        })

                        if (output && output.state === "ready" && Array.isArray(output.concepts)) {
                          const concepts = output.concepts
                          console.log("[v0] Rendering", concepts.length, "concept cards for message", msg.id)

                          return (
                            <div key={partIndex} className="mt-4 space-y-3" role="region" aria-label="Photo concepts">
                              <div className="flex items-center gap-3">
                                <div className="w-1 h-1 rounded-full bg-stone-600" aria-hidden="true"></div>
                                <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600">
                                  Photo Ideas
                                </span>
                              </div>
                              {concepts.map((concept: any, conceptIndex: number) => (
                                <ConceptCard key={conceptIndex} concept={concept} />
                              ))}
                            </div>
                          )
                        } else if (output && output.state === "loading") {
                          return (
                            <div key={partIndex} className="mt-4" role="status" aria-live="polite">
                              <div className="flex items-center gap-3 text-stone-600">
                                <div
                                  className="w-2 h-2 rounded-full bg-stone-600 animate-pulse"
                                  aria-hidden="true"
                                ></div>
                                <span className="text-xs tracking-[0.15em] uppercase font-light">
                                  Creating photo concepts...
                                </span>
                              </div>
                            </div>
                          )
                        } else {
                          console.log("[v0] Concept cards not rendered - conditions not met:", {
                            hasOutput: !!output,
                            state: output?.state,
                            hasConcepts: Array.isArray(output?.concepts),
                            conceptsLength: output?.concepts?.length || 0,
                          })
                        }
                      }

                      if (part.type === "tool-generateVideo") {
                        const toolPart = part as any
                        const output = toolPart.output

                        if (output && output.state === "processing") {
                          return (
                            <div key={partIndex} className="mt-4">
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
                            <div key={partIndex} className="mt-4">
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
                            <div key={partIndex} className="mt-4">
                              <div className="flex items-center gap-3 text-stone-600">
                                <div className="w-2 h-2 rounded-full bg-stone-600 animate-pulse" />
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
            <div className="flex justify-start" role="status" aria-live="polite" aria-label="Maya is typing">
              <div className="bg-white/50 backdrop-blur-xl border border-white/70 p-4 rounded-2xl max-w-[90%] sm:max-w-[85%] shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1" aria-hidden="true">
                    <div className="w-2 h-2 rounded-full animate-bounce bg-stone-700"></div>
                    <div
                      className="w-2 h-2 rounded-full animate-bounce bg-stone-700"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full animate-bounce bg-stone-700"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <span className="text-sm font-light text-stone-600">Maya is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showScrollButton && (
          <button
            onClick={() => {
              setIsUserScrolling(false)
              scrollToBottom("smooth")
            }}
            className="absolute bottom-6 right-6 p-3 bg-stone-950 text-white rounded-full shadow-2xl shadow-stone-900/40 hover:scale-110 active:scale-95 transition-all duration-300 z-10 animate-in fade-in slide-in-from-bottom-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-white/30 pt-3 sm:pt-4 mt-3 sm:mt-4 pb-2">
        {uploadedImage ? (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-1 rounded-full bg-stone-600" aria-hidden="true"></div>
              <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600">Try These</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => handleSendMessage("Create variations of this product with different angles")}
                className="flex-shrink-0 px-4 py-2 bg-white/40 backdrop-blur-xl border border-white/60 rounded-xl hover:bg-white/60 hover:border-stone-300 transition-all text-xs text-stone-700 whitespace-nowrap"
              >
                Product Variations
              </button>
              <button
                onClick={() => handleSendMessage("Use this as inspiration for a lifestyle photo")}
                className="flex-shrink-0 px-4 py-2 bg-white/40 backdrop-blur-xl border border-white/60 rounded-xl hover:bg-white/60 hover:border-stone-300 transition-all text-xs text-stone-700 whitespace-nowrap"
              >
                Lifestyle Shot
              </button>
              <button
                onClick={() => handleSendMessage("Create a flatlay composition with this product")}
                className="flex-shrink-0 px-4 py-2 bg-white/40 backdrop-blur-xl border border-white/60 rounded-xl hover:bg-white/60 hover:border-stone-300 transition-all text-xs text-stone-700 whitespace-nowrap"
              >
                Flatlay Design
              </button>
            </div>
          </div>
        ) : (
          !isEmpty &&
          !uploadedImage && (
            <div className="mb-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {currentPrompts.map((item, index) => {
                  return (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(item.prompt)}
                      disabled={isTyping}
                      className="flex-shrink-0 px-4 py-2.5 bg-white/40 backdrop-blur-xl border border-white/60 rounded-xl hover:bg-white/60 hover:border-stone-300 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-xs tracking-wide font-medium text-stone-700">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        )}

        {uploadedImage && (
          <div className="mb-3 relative inline-block">
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-white/60 shadow-lg">
              <img src={uploadedImage || "/placeholder.svg"} alt="Reference" className="w-full h-full object-cover" />
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute top-1 right-1 w-6 h-6 bg-stone-950 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="Remove image"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-xs text-stone-600 mt-1 tracking-wide">Reference Image</p>
          </div>
        )}

        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 relative group">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder={uploadedImage ? "Describe how to use this image..." : "Message Maya..."}
              className="w-full px-4 sm:px-5 py-4 sm:py-4 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl sm:rounded-[1.5rem] text-stone-950 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-950/50 focus:border-stone-950/50 focus:bg-white/60 pr-14 sm:pr-16 font-medium text-sm min-h-[52px] sm:min-h-[56px] shadow-lg shadow-stone-950/10 transition-all duration-300"
              disabled={isTyping || isUploadingImage}
              aria-label="Message input"
            />
            <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
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
                className="w-10 h-10 sm:w-11 sm:h-11 bg-stone-950 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-stone-950/30 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 min-w-[44px] min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Attach image"
                type="button"
              >
                {isUploadingImage ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={16} className="text-white" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
          <button
            onClick={() => handleSendMessage()}
            className="group relative px-4 sm:px-5 py-4 sm:py-4 bg-stone-950 text-white rounded-xl sm:rounded-[1.5rem] font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-stone-950/40 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden min-h-[52px] sm:min-h-[56px] min-w-[52px] sm:min-w-[56px] flex items-center justify-center hover:scale-105 active:scale-95"
            disabled={isTyping || (!inputValue.trim() && !uploadedImage) || isUploadingImage}
            aria-label="Send message"
          >
            <div
              className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              aria-hidden="true"
            ></div>
            <Send
              size={18}
              strokeWidth={2.5}
              className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </div>
    </div>
  )
}
