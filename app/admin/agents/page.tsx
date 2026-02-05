"use client"

import { useState } from "react"
import { Send, Bot } from "lucide-react"

const STELLA_MODES = [
  {
    id: "vision",
    name: "Vision + Strategy",
    description: "Long-range direction, positioning, and clarity",
    icon: "✨"
  },
  {
    id: "growth",
    name: "Growth + Revenue",
    description: "Offers, funnels, pricing, LTV, conversion",
    icon: "📈"
  },
  {
    id: "content",
    name: "Content + Voice",
    description: "Story, brand voice, content calendar, offers",
    icon: "✍️"
  },
  {
    id: "systems",
    name: "Systems + Automations",
    description: "Ops, systems, low-cost execution, stability",
    icon: "⚙️"
  },
  {
    id: "product",
    name: "Product + Delivery",
    description: "Product ladder, curriculum, transformation",
    icon: "🧭"
  }
]

export default function AgentsPage() {
  const [selectedMode, setSelectedMode] = useState(STELLA_MODES[0])
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = { role: "user", content: input }
    setMessages([...messages, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/admin/chat-with-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode.id,
          message: input
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessages([
          ...messages,
          userMessage,
          {
            role: "agent",
            content: `⚠️ Error: ${data.error || data.message || "Failed to get response from Stella"}\n\nCheck the browser console (F12) for more details.`
          }
        ])
      } else {
        setMessages([
          ...messages,
          userMessage,
          { role: "agent", content: data.response || "Stella responded, but the message was empty." }
        ])
      }
    } catch (error) {
      console.error("Error calling Stella:", error)
      setMessages([
        ...messages,
        userMessage,
        {
          role: "agent",
          content: `⚠️ Network error: ${error instanceof Error ? error.message : "Unknown error"}\n\nMake sure your dev server is running and Stella is configured.`
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200 px-8 py-6">
        <h1 className="text-2xl font-['Times_New_Roman'] tracking-[0.2em] uppercase text-stone-950">
          Stella Command Center
        </h1>
        <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mt-1">
          Your strategic partner for growth, truth, and freedom
        </p>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        <div className="w-80 bg-white border-r border-stone-200 overflow-y-auto">
          <div className="p-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-4">
              Stella Focus Modes
            </p>
            {STELLA_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => {
                  setSelectedMode(mode)
                  setMessages([])
                }}
                className={`w-full text-left p-4 mb-2 border transition-all ${
                  selectedMode.id === mode.id
                    ? "border-stone-950 bg-stone-50"
                    : "border-stone-200 hover:border-stone-400"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{mode.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-xs tracking-[0.15em] uppercase text-stone-950 mb-1">
                      {mode.name}
                    </h3>
                    <p className="text-[10px] text-stone-500">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-stone-200 px-8 py-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedMode.icon}</span>
              <div>
                <h2 className="text-lg font-['Times_New_Roman'] tracking-[0.15em] uppercase text-stone-950">
                  {selectedMode.name}
                </h2>
                <p className="text-[10px] tracking-[0.1em] uppercase text-stone-400">
                  Chat with Stella in this focus mode
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <Bot className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <p className="text-sm tracking-[0.1em] uppercase text-stone-400">
                  Start a conversation
                </p>
                <p className="text-xs text-stone-400 mt-2">
                  Ask Stella anything
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl px-6 py-4 ${
                      msg.role === "user"
                        ? "bg-stone-950 text-white"
                        : "bg-white border border-stone-200 text-stone-950"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-2xl px-6 py-4 bg-white border border-stone-200">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border-t border-stone-200 p-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !loading && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-stone-200 text-sm focus:outline-none focus:border-stone-950"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-stone-950 text-white text-xs tracking-[0.2em] uppercase hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
            <p className="text-[9px] text-stone-400 mt-3 tracking-[0.1em] uppercase">
              Stella is live inside SSELFIE. Telegram connection coming next.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
