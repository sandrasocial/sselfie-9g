"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

interface AdminAgentChatProps {
  userId: string
  userName?: string
  userEmail: string
}

type AgentMode = "content" | "email" | "research"

export default function AdminAgentChat({ userId, userName, userEmail }: AdminAgentChatProps) {
  const [mode, setMode] = useState<AgentMode>("content")
  const [chatId, setChatId] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/admin/agent/chat" }),
    initialMessages: [],
    body: {
      chatId,
      mode,
      userId,
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  useEffect(() => {
    // Create or update chat when first message is sent
    if (!chatId && messages.length > 0 && !isLoading) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        fetch("/api/admin/agent/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            mode,
            firstMessage: messages[0]?.content || "",
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.chatId) {
              setChatId(data.chatId)
              console.log("[v0] Created chat:", data.chatId)
            }
          })
          .catch((error) => {
            console.error("[v0] Error creating chat:", error)
          })
      }
    }
  }, [messages, chatId, isLoading, userId, mode])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleModeChange = (newMode: AgentMode) => {
    setMode(newMode)
    setMessages([])
    setChatId(null)
  }

  const getModeDescription = () => {
    switch (mode) {
      case "content":
        return "Create Instagram posts, captions, and content calendars based on your brand voice and analytics"
      case "email":
        return "Write newsletters and email campaigns that match your brand voice and engage your audience"
      case "research":
        return "Audit competitors, analyze trends, and discover content opportunities in your niche"
    }
  }

  const getPlaceholder = () => {
    switch (mode) {
      case "content":
        return "Create a 7-day Instagram content calendar for my business..."
      case "email":
        return "Write a newsletter about my latest product launch..."
      case "research":
        return "Analyze my top 3 competitors and their content strategy..."
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const message = inputValue.trim()

    if (message && !isLoading) {
      sendMessage({ text: message })
      setInputValue("")
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-4xl sm:text-5xl font-extralight uppercase text-stone-950 mb-2"
            style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.3em" }}
          >
            ADMIN AGENT
          </h1>
          <p className="text-xs uppercase font-light text-stone-500" style={{ letterSpacing: "0.15em" }}>
            Your AI Content & Strategy Partner
          </p>
        </div>

        {/* Mode Selector */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-lg mb-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              onClick={() => handleModeChange("content")}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium uppercase transition-all ${
                mode === "content" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
              style={{ letterSpacing: "0.1em" }}
            >
              CONTENT CREATOR
            </button>
            <button
              onClick={() => handleModeChange("email")}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium uppercase transition-all ${
                mode === "email" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
              style={{ letterSpacing: "0.1em" }}
            >
              EMAIL WRITER
            </button>
            <button
              onClick={() => handleModeChange("research")}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium uppercase transition-all ${
                mode === "research" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
              style={{ letterSpacing: "0.1em" }}
            >
              COMPETITOR RESEARCH
            </button>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">{getModeDescription()}</p>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-lg mb-6 min-h-[500px] max-h-[600px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="max-w-md">
                <h3
                  className="text-2xl font-extralight uppercase text-stone-950 mb-4"
                  style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
                >
                  {mode === "content" && "CONTENT CREATOR"}
                  {mode === "email" && "EMAIL WRITER"}
                  {mode === "research" && "COMPETITOR RESEARCH"}
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-6">{getModeDescription()}</p>
                <div className="text-left space-y-3">
                  <p className="text-xs uppercase text-stone-500 mb-2" style={{ letterSpacing: "0.15em" }}>
                    TRY ASKING:
                  </p>
                  {mode === "content" && (
                    <>
                      <p className="text-sm text-stone-700">Create a 7-day content calendar for my business</p>
                      <p className="text-sm text-stone-700">Write 3 Instagram captions about my latest service</p>
                      <p className="text-sm text-stone-700">What content themes should I focus on this month?</p>
                    </>
                  )}
                  {mode === "email" && (
                    <>
                      <p className="text-sm text-stone-700">Write a welcome email for new subscribers</p>
                      <p className="text-sm text-stone-700">Create a newsletter about my latest blog post</p>
                      <p className="text-sm text-stone-700">Draft a product launch email campaign</p>
                    </>
                  )}
                  {mode === "research" && (
                    <>
                      <p className="text-sm text-stone-700">Analyze my top 3 competitors content strategy</p>
                      <p className="text-sm text-stone-700">What content gaps can I fill in my niche?</p>
                      <p className="text-sm text-stone-700">Research trending topics in my industry</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                      message.role === "user" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-900"
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
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
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-lg">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full min-h-[100px] mb-4 px-4 py-3 border border-stone-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-transparent"
            disabled={isLoading}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-stone-950 text-white hover:bg-stone-800 px-8 py-3 rounded-xl text-sm uppercase font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ letterSpacing: "0.1em" }}
            >
              {isLoading ? "SENDING..." : "SEND"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
