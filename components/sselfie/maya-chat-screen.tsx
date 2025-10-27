"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Camera, Send, Plus, ArrowDown } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import ConceptCard from "./concept-card"

export default function MayaChatScreen() {
  const [inputValue, setInputValue] = useState("")
  const [chatId, setChatId] = useState<number | null>(null)
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const savedMessageIds = useRef(new Set<string>())
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const lastScrollTop = useRef(0)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/maya/chat" }),
    initialMessages: [], // Removed welcome message from initialMessages
  })

  const isTyping = status === "submitted" || status === "streaming"

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" })
  }

  const handleScroll = () => {
    if (!messagesContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100 // 100px threshold

    setShowScrollButton(!isAtBottom)

    // Detect if user is actively scrolling up
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

  useEffect(() => {
    async function loadChat() {
      try {
        const response = await fetch("/api/maya/load-chat")
        if (response.ok) {
          const data = await response.json()
          setChatId(data.chatId)

          if (data.messages && Array.isArray(data.messages) && data.messages.length > 1) {
            setMessages(data.messages)
          }
        }
      } catch (error) {
        console.error("[v0] Error loading chat:", error)
      } finally {
        setIsLoadingChat(false)
      }
    }

    loadChat()
  }, [setMessages])

  useEffect(() => {
    if (!chatId || isLoadingChat || messages.length <= 1) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.id !== "welcome" && !savedMessageIds.current.has(lastMessage.id)) {
        const conceptCards =
          lastMessage.parts && Array.isArray(lastMessage.parts)
            ? lastMessage.parts
                .filter((part: any) => part.type === "tool-generateConcepts" && part.output?.state === "ready")
                .flatMap((part: any) => part.output.concepts || [])
            : []

        savedMessageIds.current.add(lastMessage.id)

        fetch("/api/maya/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            role: lastMessage.role,
            content: lastMessage.parts?.find((p: any) => p.type === "text")?.text || "",
            conceptCards: conceptCards.length > 0 ? conceptCards : null,
          }),
        }).catch((error) => {
          savedMessageIds.current.delete(lastMessage.id)
          console.error("[v0] Error saving message:", error)
        })
      }
    }, 1000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [messages, chatId, isLoadingChat])

  useEffect(() => {
    console.log("[v0] Maya chat status:", status, "isTyping:", isTyping)
  }, [status, isTyping])

  const handleSendMessage = () => {
    if (inputValue.trim() && !isTyping) {
      sendMessage({ text: inputValue.trim() })
      setInputValue("")
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
        setMessages([]) // Start with empty messages instead of welcome message
        setIsUserScrolling(false)
        setTimeout(() => scrollToBottom("auto"), 100)
      }
    } catch (error) {
      console.error("[v0] Error creating new chat:", error)
    }
  }

  if (isLoadingChat) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-stone-600">
          <div className="w-2 h-2 rounded-full bg-stone-600 animate-pulse"></div>
          <span className="text-sm tracking-[0.15em] uppercase font-light">Loading chat...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-3 sm:space-y-4 pb-24">
      <div className="flex items-center justify-between pt-3 sm:pt-4 pb-2">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full border-2 border-stone-200/60 overflow-hidden flex-shrink-0">
            <img src="https://i.postimg.cc/fTtCnzZv/out-1-22.png" alt="Maya" className="w-full h-full object-cover" />
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
            onClick={handleNewChat}
            className="group relative p-2 sm:p-2.5 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl hover:bg-white/60 hover:border-white/80 transition-all duration-300 hover:scale-105 active:scale-95"
            title="Start new chat"
          >
            <Plus size={16} className="text-stone-600" strokeWidth={2} />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-stone-900 rounded-full"></div>
            <span className="text-xs tracking-[0.15em] font-light text-stone-600">Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto space-y-3 sm:space-y-4 pr-1 scroll-smooth"
          style={{ maxHeight: "calc(100vh - 320px)" }}
        >
          {messages &&
            Array.isArray(messages) &&
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                  {msg.parts &&
                    Array.isArray(msg.parts) &&
                    msg.parts.map((part, partIndex) => {
                      if (part.type === "text") {
                        return (
                          <div
                            key={partIndex}
                            className={`p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[1.75rem] transition-all duration-300 hover:scale-[1.01] ${
                              msg.role === "user"
                                ? "bg-stone-950 text-white shadow-xl shadow-stone-900/30"
                                : "bg-white/50 backdrop-blur-2xl border border-white/70 shadow-xl shadow-stone-900/10 text-stone-950"
                            }`}
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

                        if (output && output.state === "ready" && Array.isArray(output.concepts)) {
                          const concepts = output.concepts

                          return (
                            <div key={partIndex} className="mt-4 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-1 h-1 rounded-full bg-stone-600"></div>
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
                            <div key={partIndex} className="mt-4">
                              <div className="flex items-center gap-3 text-stone-600">
                                <div className="w-2 h-2 rounded-full bg-stone-600 animate-pulse"></div>
                                <span className="text-xs tracking-[0.15em] uppercase font-light">
                                  Creating photo concepts...
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
              <div className="bg-white/50 backdrop-blur-xl border border-white/70 p-4 rounded-2xl max-w-[90%] shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
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
            className="absolute bottom-4 right-4 p-3 bg-stone-950 text-white rounded-full shadow-2xl shadow-stone-900/40 hover:scale-110 active:scale-95 transition-all duration-300 z-10 animate-in fade-in slide-in-from-bottom-2"
          >
            <ArrowDown size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="border-t border-white/30 pt-3 sm:pt-4 mt-auto flex-shrink-0">
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
              placeholder="Message Maya..."
              className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl sm:rounded-[1.5rem] text-stone-950 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/50 focus:border-stone-950/50 focus:bg-white/60 pr-12 sm:pr-14 font-medium text-sm min-h-[48px] sm:min-h-[56px] shadow-lg shadow-stone-900/10 transition-all duration-300"
              disabled={isTyping}
            />
            <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-stone-950 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-stone-900/30 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                <Camera size={14} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            className="group relative px-4 sm:px-5 py-3 sm:py-4 bg-stone-950 text-white rounded-xl sm:rounded-[1.5rem] font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-stone-900/40 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden min-h-[48px] sm:min-h-[56px] min-w-[48px] sm:min-w-[56px] flex items-center justify-center hover:scale-105 active:scale-95"
            disabled={isTyping || !inputValue.trim()}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Send
              size={16}
              strokeWidth={2.5}
              className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </div>
    </div>
  )
}
