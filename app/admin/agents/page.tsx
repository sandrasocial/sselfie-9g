"use client"

import { useState } from "react"
import { Send, Bot, TrendingUp, Mail, Users, BarChart3, MessageSquare, Zap } from "lucide-react"

// Your Gumloop agents
const AGENTS = [
  {
    id: "content-writer",
    name: "Content Writer",
    description: "Writes captions, stories, carousel copy",
    type: "conversational",
    icon: "✍️",
    color: "emerald"
  },
  {
    id: "competitor-research",
    name: "Competitor Research",
    description: "Monitors creators, finds content gaps",
    type: "conversational",
    icon: "🔍",
    color: "blue"
  },
  {
    id: "audience-analyst",
    name: "Audience Analyst",
    description: "Studies followers, tracks preferences",
    type: "conversational",
    icon: "👥",
    color: "purple"
  },
  {
    id: "content-strategist",
    name: "Content Strategist",
    description: "Analyzes performance, recommends content",
    type: "conversational",
    icon: "📊",
    color: "orange"
  },
  {
    id: "email-campaign",
    name: "Email Campaign Automation",
    description: "Auto-writes weekly newsletters",
    type: "automated",
    icon: "📧",
    color: "pink",
    status: "Not yet built in Gumloop"
  },
  {
    id: "lead-qualification",
    name: "Lead Qualification",
    description: "Scores leads, writes personalized DMs",
    type: "automated",
    icon: "🎯",
    color: "red",
    status: "Not yet built in Gumloop"
  },
  {
    id: "analytics-reporter",
    name: "Analytics Reporter",
    description: "Daily/weekly business metrics reports",
    type: "automated",
    icon: "📈",
    color: "indigo",
    status: "Not yet built in Gumloop"
  },
  {
    id: "dm-responder",
    name: "DM Auto-Responder",
    description: "Handles Instagram DMs automatically",
    type: "automated",
    icon: "💬",
    color: "cyan",
    status: "Not yet built in Gumloop"
  },
  {
    id: "customer-success",
    name: "Customer Success",
    description: "Onboarding emails, testimonial requests",
    type: "automated",
    icon: "🎓",
    color: "green",
    status: "Not yet built in Gumloop"
  },
  {
    id: "mission-control",
    name: "Mission Control",
    description: "Daily health checks, task generation",
    type: "automated",
    icon: "🎯",
    color: "yellow",
    status: "Not yet built in Gumloop"
  }
]

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0])
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
      // TODO: Replace with actual Gumloop API call
      const response = await fetch("/api/admin/chat-with-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          message: input
        })
      })

      const data = await response.json()

      setMessages([
        ...messages,
        userMessage,
        { role: "agent", content: data.response || "Agent response will appear here once Gumloop API is connected." }
      ])
    } catch (error) {
      setMessages([
        ...messages,
        userMessage,
        { role: "agent", content: "⚠️ Connect Gumloop API to enable agent responses. See CLEAN_ADMIN_ARCHITECTURE.md for setup." }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-8 py-6">
        <h1 className="text-2xl font-['Times_New_Roman'] tracking-[0.2em] uppercase text-stone-950">
          Agent Control Center
        </h1>
        <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mt-1">
          Your Gumloop AI Agents
        </p>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Agent List Sidebar */}
        <div className="w-80 bg-white border-r border-stone-200 overflow-y-auto">
          <div className="p-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-4">
              Conversational Agents
            </p>
            {AGENTS.filter(a => a.type === "conversational").map(agent => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent)
                  setMessages([])
                }}
                className={`w-full text-left p-4 mb-2 border transition-all ${
                  selectedAgent.id === agent.id
                    ? "border-stone-950 bg-stone-50"
                    : "border-stone-200 hover:border-stone-400"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{agent.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-xs tracking-[0.15em] uppercase text-stone-950 mb-1">
                      {agent.name}
                    </h3>
                    <p className="text-[10px] text-stone-500">
                      {agent.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-4 mt-8">
              Automated Agents
            </p>
            {AGENTS.filter(a => a.type === "automated").map(agent => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent)
                  setMessages([])
                }}
                className={`w-full text-left p-4 mb-2 border transition-all ${
                  selectedAgent.id === agent.id
                    ? "border-stone-950 bg-stone-50"
                    : "border-stone-200 hover:border-stone-400"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{agent.icon}</span>
                  <div className="flex-1">
                    <h3 className="text-xs tracking-[0.15em] uppercase text-stone-950 mb-1">
                      {agent.name}
                    </h3>
                    <p className="text-[10px] text-stone-500">
                      {agent.description}
                    </p>
                    {agent.status && (
                      <p className="text-[9px] text-orange-600 mt-1 italic">
                        {agent.status}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Agent Header */}
          <div className="bg-white border-b border-stone-200 px-8 py-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedAgent.icon}</span>
              <div>
                <h2 className="text-lg font-['Times_New_Roman'] tracking-[0.15em] uppercase text-stone-950">
                  {selectedAgent.name}
                </h2>
                <p className="text-[10px] tracking-[0.1em] uppercase text-stone-400">
                  {selectedAgent.type === "conversational" ? "Chat with this agent" : "View reports and results"}
                </p>
              </div>
            </div>
          </div>

          {selectedAgent.type === "conversational" ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-8 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-16">
                    <Bot className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <p className="text-sm tracking-[0.1em] uppercase text-stone-400">
                      Start a conversation
                    </p>
                    <p className="text-xs text-stone-400 mt-2">
                      Ask {selectedAgent.name} anything
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

              {/* Input */}
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
                  💡 Tip: Connect Gumloop API to enable live agent responses
                </p>
              </div>
            </>
          ) : (
            // Automated Agent View
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white border border-stone-200 p-8 text-center">
                  <span className="text-6xl mb-4 block">{selectedAgent.icon}</span>
                  <h3 className="text-lg font-['Times_New_Roman'] tracking-[0.15em] uppercase text-stone-950 mb-2">
                    {selectedAgent.name}
                  </h3>
                  <p className="text-sm text-stone-600 mb-6">
                    {selectedAgent.description}
                  </p>

                  {selectedAgent.status ? (
                    <div className="bg-orange-50 border border-orange-200 p-4 mb-6">
                      <p className="text-xs text-orange-800">
                        ⚠️ {selectedAgent.status}
                      </p>
                      <p className="text-xs text-orange-600 mt-2">
                        Build this agent in Gumloop first, then it will appear here with live data.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 mb-6">
                      <p className="text-xs text-emerald-800">
                        ✅ Agent is running
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 text-left">
                    <div className="border border-stone-200 p-4">
                      <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Last Run</p>
                      <p className="text-sm text-stone-950">Not yet configured</p>
                    </div>
                    <div className="border border-stone-200 p-4">
                      <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Next Scheduled Run</p>
                      <p className="text-sm text-stone-950">Set up in Gumloop</p>
                    </div>
                    <div className="border border-stone-200 p-4">
                      <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Status</p>
                      <p className="text-sm text-stone-950">{selectedAgent.status || "Ready"}</p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-stone-200">
                    <p className="text-xs text-stone-500 mb-4">
                      Configure this agent in your Gumloop dashboard, then connect via API.
                    </p>
                    <a
                      href="https://gumloop.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-6 py-3 border border-stone-950 text-xs tracking-[0.2em] uppercase text-stone-950 hover:bg-stone-950 hover:text-white transition-colors"
                    >
                      Open Gumloop Dashboard →
                    </a>
                  </div>
                </div>

                {/* Setup Instructions */}
                <div className="mt-8 bg-blue-50 border border-blue-200 p-6">
                  <h4 className="text-xs tracking-[0.15em] uppercase text-blue-950 mb-3">
                    🚀 How to Connect This Agent
                  </h4>
                  <ol className="text-xs text-blue-900 space-y-2 list-decimal list-inside">
                    <li>Build the agent in Gumloop (see GUMLOOP_AGENT_SETUP_GUIDE.md)</li>
                    <li>Get your Gumloop API key</li>
                    <li>Add to .env: GUMLOOP_API_KEY=xxx</li>
                    <li>Create API route: /api/admin/agents/{selectedAgent.id}</li>
                    <li>This page will automatically show live data</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
