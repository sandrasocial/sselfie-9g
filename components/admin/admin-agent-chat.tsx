"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Calendar, Save, Send, Mail, Download } from 'lucide-react'
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
  const [chatId, setChatId] = useState<number | null>(null)
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

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/admin/agent/chat" }),
    initialMessages: [],
    body: {
      chatId,
      userId,
    },
    onFinish: async (message) => {
      const content = getMessageContent(message)
      if (content.includes('Caption:') || content.includes('Post Type:')) {
        setLatestGeneration({ type: 'content', data: parseContentCalendar(content) })
      } else if (content.includes('Subject:') && content.includes('xo Sandra')) {
        setLatestGeneration({ type: 'email', data: content })
      }

      if (!chatId && messages.length === 0) {
        try {
          const firstUserMessage = message.parts?.find((part: any) => part.type === "text")?.text || ""
          const response = await fetch("/api/admin/agent/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              firstMessage: firstUserMessage,
            }),
          })
          const data = await response.json()
          if (data.chatId) {
            setChatId(data.chatId)
          }
        } catch (error) {
          console.error("Error creating chat:", error)
        }
      }
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    
    await sendMessage({ role: "user", content: inputValue })
    setInputValue("")
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
        variant: "destructive",
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
        variant: "destructive",
      })
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
                onClick={() => setShowSemanticSearch(!showSemanticSearch)}
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
                onClick={() => setShowGallery(!showGallery)}
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
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`px-3 py-2 text-xs uppercase rounded-lg transition-colors ${
                  showAnalytics
                    ? "bg-stone-950 text-white"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                }`}
                style={{ letterSpacing: "0.1em" }}
              >
                Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Simplified sidebar panels */}
        {(showAnalytics || showSemanticSearch || showGallery) && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-lg mb-6 max-h-[600px] overflow-y-auto">
            {showSemanticSearch && <SemanticSearchPanel onInsertResult={(text) => setInputValue(prev => prev + "\n\n" + text)} />}
            {showGallery && <GalleryImageSelector onSelectImage={(url) => setInputValue(prev => prev + `\n\nImage URL: ${url}`)} />}
            {showAnalytics && <AdminAnalyticsPanel userId={userId} />}
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
            placeholder="What would you like to create? (content calendar, email, competitor analysis...)"
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
