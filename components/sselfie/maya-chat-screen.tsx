"use client"

import type React from "react"

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
    if (!chatId || isTyping) return

    // Debounce the save operation
    const timeoutId = setTimeout(() => {
      // Find unsaved assistant messages that have content or concept cards
      const unsavedMessages = messages.filter((msg) => {
        if (msg.role !== "assistant") return false
        if (savedMessageIds.current.has(msg.id)) return false

        // Only save if message has content or concept cards
        const hasContent = msg.content && msg.content.trim().length > 0
        const hasConcepts =
          msg.toolInvocations &&
          Array.isArray(msg.toolInvocations) &&
          msg.toolInvocations.some(
            (inv: any) =>
              inv.toolName === "generateConcepts" &&
              inv.state === "result" &&
              Array.isArray(inv.result?.concepts) &&
              inv.result.concepts.length > 0,
          )

        return hasContent || hasConcepts
      })

      if (unsavedMessages.length === 0) return

      unsavedMessages.forEach(async (message) => {
        console.log("[v0] ========== Auto-saving message ==========")
        console.log("[v0] Message ID:", message.id)
        console.log("[v0] Chat ID:", chatId)

        // Extract concept cards from toolInvocations
        const conceptCards =
          message.toolInvocations && Array.isArray(message.toolInvocations)
            ? message.toolInvocations
                .filter((invocation: any) => {
                  const isConceptTool = invocation.toolName === "generateConcepts"
                  const hasResult = invocation.state === "result"
                  const hasConcepts = Array.isArray(invocation.result?.concepts)

                  return isConceptTool && hasResult && hasConcepts
                })
                .flatMap((invocation: any) => invocation.result.concepts || [])
            : []

        console.log("[v0] Extracted concept cards:", {
          count: conceptCards.length,
        })

        // Mark as saved before making the request
        savedMessageIds.current.add(message.id)

        try {
          const payload = {
            chatId,
            role: message.role,
            content: message.content || "",
            conceptCards: conceptCards.length > 0 ? conceptCards : null,
          }

          const response = await fetch("/api/maya/save-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

          const responseData = await response.json()

          if (response.ok) {
            console.log("[v0] ✅ Message saved successfully with", conceptCards.length, "concept cards")
          } else {
            console.error("[v0] ❌ Failed to save message:", response.status, responseData)
            // Remove from saved set so it can be retried
            savedMessageIds.current.delete(message.id)

            // If unauthorized, the session might have expired
            if (response.status === 401) {
              console.error("[v0] Session expired - user needs to re-authenticate")
            }
          }
        } catch (error) {
          console.error("[v0] ❌ Error saving message:", error)
          savedMessageIds.current.delete(message.id)
        }

        console.log("[v0] ========== Auto-save END ==========")
      })
    }, 1000) // Debounce for 1 second

    return () => clearTimeout(timeoutId)
  }, [messages, chatId, isTyping])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB")
      return
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setIsUploadingImage(true)

    try {
      // Upload to Vercel Blob
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

  const handleSendMessage = () => {
    if ((inputValue.trim() || uploadedImage) && !isTyping) {
      const messageContent = uploadedImage
        ? `${inputValue.trim()}\n\n[Reference Image: ${uploadedImage}]`
        : inputValue.trim()

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

  if (isLoadingChat) {
    return <UnifiedLoading message="Loading chat..." />
  }

  return (
    <div className="h-full flex flex-col">
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
                : "bg-white/40 border-white/60 hover:bg-white/60 hover:border-white/80 text-stone-600"
            }`}
            title="Chat history"
            aria-label="Toggle chat history"
            aria-expanded={showHistory}
          >
            <History size={18} strokeWidth={2} />
          </button>

          <button
            onClick={handleNewChat}
            className="group relative p-3 sm:p-3 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl hover:bg-white/60 hover:border-white/80 transition-all duration-300 hover:scale-105 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Start new chat"
            aria-label="Start new chat"
          >
            <Plus size={18} className="text-stone-600" strokeWidth={2} />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-stone-900 rounded-full" aria-hidden="true"></div>
            <span className="text-xs tracking-[0.15em] font-light text-stone-600">Online</span>
          </div>
        </div>
      </div>

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
          {messages &&
            Array.isArray(messages) &&
            messages.map((msg) => (
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
                                ? "bg-stone-950 text-white shadow-xl shadow-stone-900/30"
                                : "bg-white/50 backdrop-blur-2xl border border-white/70 shadow-xl shadow-stone-900/10 text-stone-950"
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
              className="w-full px-4 sm:px-5 py-4 sm:py-4 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl sm:rounded-[1.5rem] text-stone-950 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-950/50 focus:border-stone-950/50 focus:bg-white/60 pr-14 sm:pr-16 font-medium text-sm min-h-[52px] sm:min-h-[56px] shadow-lg shadow-stone-900/10 transition-all duration-300"
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
                className="w-10 h-10 sm:w-11 sm:h-11 bg-stone-950 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-stone-900/30 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 min-w-[44px] min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
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
            onClick={handleSendMessage}
            className="group relative px-4 sm:px-5 py-4 sm:py-4 bg-stone-950 text-white rounded-xl sm:rounded-[1.5rem] font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-stone-900/40 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden min-h-[52px] sm:min-h-[56px] min-w-[52px] sm:min-w-[56px] flex items-center justify-center hover:scale-105 active:scale-95"
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
