"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

interface AdminAgentChatProps {
  userId: string
  userName?: string
  userEmail: string
}

type AgentMode = "content" | "email" | "research"

export default function AdminAgentChat({ userId, userName, userEmail }: AdminAgentChatProps) {
  const [mode, setMode] = useState<AgentMode>("content")
  const [chatId, setChatId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: "/api/admin/agent/chat",
    body: {
      chatId,
      mode,
      userId,
    },
    onFinish: async (message) => {
      console.log("[v0] Message finished:", message)

      // Create or update chat if needed
      if (!chatId && messages.length === 0) {
        try {
          const response = await fetch("/api/admin/agent/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              mode,
              firstMessage: messages[0]?.content || input,
            }),
          })

          if (response.ok) {
            const { chatId: newChatId } = await response.json()
            setChatId(newChatId)
          }
        } catch (error) {
          console.error("[v0] Error creating chat:", error)
        }
      }
    },
  })

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

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-['Times_New_Roman'] text-5xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-2">
            ADMIN AGENT
          </h1>
          <p className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">
            Your AI Content & Strategy Partner
          </p>
        </div>

        {/* Mode Selector */}
        <div className="bg-white/50 backdrop-blur-xl rounded-[1.75rem] p-6 border border-white/60 shadow-xl mb-6">
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => handleModeChange("content")}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium uppercase tracking-wider transition-all ${
                mode === "content" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              CONTENT CREATOR
            </button>
            <button
              onClick={() => handleModeChange("email")}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium uppercase tracking-wider transition-all ${
                mode === "email" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              EMAIL WRITER
            </button>
            <button
              onClick={() => handleModeChange("research")}
              className={`flex-1 px-6 py-3 rounded-xl text-sm font-medium uppercase tracking-wider transition-all ${
                mode === "research" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              COMPETITOR RESEARCH
            </button>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">{getModeDescription()}</p>
        </div>

        {/* Chat Messages */}
        <div className="bg-white/50 backdrop-blur-xl rounded-[1.75rem] p-8 border border-white/60 shadow-xl mb-6 min-h-[500px] max-h-[600px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="max-w-md">
                <h3 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
                  {mode === "content" && "CONTENT CREATOR"}
                  {mode === "email" && "EMAIL WRITER"}
                  {mode === "research" && "COMPETITOR RESEARCH"}
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-6">{getModeDescription()}</p>
                <div className="text-left space-y-3">
                  <p className="text-xs tracking-wider uppercase text-stone-500 mb-2">TRY ASKING:</p>
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
                    <Loader2 className="w-5 h-5 animate-spin text-stone-950" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/50 backdrop-blur-xl rounded-[1.75rem] p-6 border border-white/60 shadow-xl"
        >
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder={getPlaceholder()}
            className="min-h-[100px] mb-4 border-stone-300 resize-none"
            disabled={isLoading}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-stone-950 text-white hover:bg-stone-800 px-8 py-3 text-sm uppercase tracking-wider"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "SEND"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
