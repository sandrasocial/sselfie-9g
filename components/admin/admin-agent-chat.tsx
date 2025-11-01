"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { AdminAnalyticsPanel } from "./admin-analytics-panel"
import { ContentCalendarExport } from "./content-calendar-export"
import { CompetitorTracker } from "./competitor-tracker"
import { EmailTemplateLibrary } from "./email-template-library"
import { SemanticSearchPanel } from "./semantic-search-panel"
import { GalleryImageSelector } from "./gallery-image-selector"
import { EmailCampaignManager } from "./email-campaign-manager"
import { PerformanceTracker } from "./performance-tracker"
import { parseContentCalendar } from "@/lib/admin/parse-content-calendar"

interface AdminAgentChatProps {
  userId: string
  userName?: string
  userEmail: string
}

type AgentMode = "content" | "email" | "research"

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
  const [mode, setMode] = useState<AgentMode>("content")
  const [chatId, setChatId] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showCompetitors, setShowCompetitors] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSemanticSearch, setShowSemanticSearch] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [showEmailCampaigns, setShowEmailCampaigns] = useState(false)
  const [showPerformance, setShowPerformance] = useState(false)
  const [parsedContent, setParsedContent] = useState<any[]>([])

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
    const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop()
    if (lastAssistantMessage && mode === "content") {
      const parsed = parseContentCalendar(lastAssistantMessage.content)
      if (parsed.length > 0) {
        setParsedContent(parsed)
      }
    }
  }, [messages, mode])

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

  const handleSelectTemplate = (template: any) => {
    const templateMessage = `I'd like to use the "${template.name}" template. Here are the details:\n\nSubject: ${template.subject_line}\nCategory: ${template.category}\n\nPlease help me customize this template for my audience.`
    setInputValue(templateMessage)
    setShowTemplates(false)
  }

  const handleInsertSearchResult = (text: string) => {
    setInputValue((prev) => prev + "\n\n" + text)
    setShowSemanticSearch(false)
  }

  const handleSelectImage = (imageUrl: string, imageId: number) => {
    setInputValue((prev) => prev + `\n\nSelected image: ${imageUrl} (ID: ${imageId})`)
    setShowGallery(false)
  }

  const toggleSidebar = (
    sidebar: "analytics" | "export" | "competitors" | "templates" | "search" | "gallery" | "campaigns" | "performance",
  ) => {
    setShowAnalytics(sidebar === "analytics" ? !showAnalytics : false)
    setShowExport(sidebar === "export" ? !showExport : false)
    setShowCompetitors(sidebar === "competitors" ? !showCompetitors : false)
    setShowTemplates(sidebar === "templates" ? !showTemplates : false)
    setShowSemanticSearch(sidebar === "search" ? !showSemanticSearch : false)
    setShowGallery(sidebar === "gallery" ? !showGallery : false)
    setShowEmailCampaigns(sidebar === "campaigns" ? !showEmailCampaigns : false)
    setShowPerformance(sidebar === "performance" ? !showPerformance : false)
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
          <div className="flex items-center justify-between mb-4">
            <div>
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
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => toggleSidebar("search")}
                className={`px-3 py-2 text-xs uppercase rounded-lg transition-colors ${
                  showSemanticSearch
                    ? "bg-stone-950 text-white"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                Search
              </button>
              <button
                onClick={() => toggleSidebar("gallery")}
                className={`px-3 py-2 text-xs uppercase rounded-lg transition-colors ${
                  showGallery
                    ? "bg-stone-950 text-white"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                Gallery
              </button>
              <button
                onClick={() => toggleSidebar("analytics")}
                className={`px-3 py-2 text-xs uppercase rounded-lg transition-colors ${
                  showAnalytics
                    ? "bg-stone-950 text-white"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                Analytics
              </button>
              <button
                onClick={() => toggleSidebar("performance")}
                className={`px-3 py-2 text-xs uppercase rounded-lg transition-colors ${
                  showPerformance
                    ? "bg-stone-950 text-white"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                Performance
              </button>
              {parsedContent.length > 0 && (
                <button
                  onClick={() => toggleSidebar("export")}
                  className={`px-3 py-2 text-xs uppercase rounded-lg transition-colors ${
                    showExport
                      ? "bg-stone-950 text-white"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                  style={{ letterSpacing: "0.1em" }}
                >
                  Export
                </button>
              )}
              <button
                onClick={() => toggleSidebar("competitors")}
                className={`px-3 py-2 text-xs uppercase rounded-lg transition-colors ${
                  showCompetitors
                    ? "bg-stone-950 text-white"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                Competitors
              </button>
              <button
                onClick={() => toggleSidebar("templates")}
                className={`px-3 py-2 text-xs uppercase rounded-lg transition-colors ${
                  showTemplates
                    ? "bg-stone-950 text-white"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                Templates
              </button>
              <button
                onClick={() => toggleSidebar("campaigns")}
                className={`px-3 py-2 text-xs uppercase rounded-lg transition-colors ${
                  showEmailCampaigns
                    ? "bg-stone-950 text-white"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                Campaigns
              </button>
            </div>
          </div>
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

        {(showAnalytics ||
          showExport ||
          showCompetitors ||
          showTemplates ||
          showSemanticSearch ||
          showGallery ||
          showEmailCampaigns ||
          showPerformance) && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-lg mb-6 max-h-[600px] overflow-y-auto">
            {showSemanticSearch && <SemanticSearchPanel onInsertResult={handleInsertSearchResult} />}
            {showGallery && <GalleryImageSelector onSelectImage={handleSelectImage} />}
            {showAnalytics && <AdminAnalyticsPanel userId={userId} />}
            {showPerformance && <PerformanceTracker userId={userId} />}
            {showExport && parsedContent.length > 0 && <ContentCalendarExport content={parsedContent} />}
            {showCompetitors && <CompetitorTracker userId={userId} />}
            {showTemplates && <EmailTemplateLibrary userId={userId} onSelectTemplate={handleSelectTemplate} />}
            {showEmailCampaigns && <EmailCampaignManager />}
          </div>
        )}

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
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{getMessageContent(message)}</div>
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
