"use client"

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Sparkles, Mail, Instagram, BarChart3, Calendar, Send } from 'lucide-react'

interface AlexChatProps {
  userId: string
  userName?: string
  userEmail: string
}

export default function AlexChat({ userId, userName, userEmail }: AlexChatProps) {
  const [view, setView] = useState<'chat' | 'analytics' | 'calendar'>('chat')
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/admin/alex/chat' }),
    initialMessages: [],
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return
    sendMessage({ text: inputValue })
    setInputValue('')
  }

  return (
    <div className="h-screen flex bg-stone-50">
      {/* Sidebar - Quick Navigation */}
      <div className="w-64 bg-white border-r border-stone-200 p-4 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-serif tracking-wide text-stone-900">
            Alex
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Your AI Business Partner
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 mb-6 flex-1">
          <button
            onClick={() => setView('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              view === 'chat' ? 'bg-stone-900 text-white' : 'hover:bg-stone-100 text-stone-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">Chat with Alex</span>
          </button>
          
          <button
            onClick={() => {
              sendMessage({ text: 'Write an email for Studio members' })
              setView('chat')
            }}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" />
            <span className="text-sm">Write Email</span>
          </button>
          
          <button
            onClick={() => {
              sendMessage({ text: 'Write an Instagram caption' })
              setView('chat')
            }}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Instagram className="w-4 h-4" />
            <span className="text-sm">Write Instagram Post</span>
          </button>
          
          <button
            onClick={() => {
              sendMessage({ text: 'Show me email performance analytics' })
              setView('chat')
            }}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Check Analytics</span>
          </button>
          
          <button
            onClick={() => {
              sendMessage({ text: 'What should I send this week?' })
              setView('chat')
            }}
            disabled={isLoading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Plan Strategy</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-stone-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-stone-900">
            {view === 'chat' ? 'Chat with Alex' : view === 'analytics' ? 'Analytics' : 'Calendar'}
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Your unified business intelligence partner
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Sparkles className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-stone-900 mb-2">
                  Hey Sandra! I'm Alex
                </h3>
                <p className="text-stone-600 mb-6">
                  I write all your content in YOUR voice - emails, Instagram, landing pages. 
                  I also handle analytics, strategy, and execution. What would you like to create today?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => sendMessage({ text: 'Create a newsletter about Maya Pro Mode' })}
                    disabled={isLoading}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Write Newsletter
                  </button>
                  <button
                    onClick={() => sendMessage({ text: 'What should I email this week?' })}
                    disabled={isLoading}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Get Strategy
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => {
                // Extract text content from message
                let content = ''
                if (typeof message.content === 'string') {
                  content = message.content
                } else if (Array.isArray(message.content)) {
                  content = message.content
                    .filter((part: any) => part.type === 'text')
                    .map((part: any) => part.text || '')
                    .join('\n')
                } else if (message.parts && Array.isArray(message.parts)) {
                  content = message.parts
                    .filter((part: any) => part.type === 'text')
                    .map((part: any) => part.text || '')
                    .join('\n')
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                        message.role === 'user'
                          ? 'bg-stone-900 text-white'
                          : 'bg-white border border-stone-200 text-stone-900'
                      }`}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {content || 'No content'}
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-stone-200 rounded-2xl px-6 py-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-stone-700 animate-bounce"></div>
                      <div
                        className="w-2 h-2 rounded-full bg-stone-700 animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-stone-700 animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-stone-200 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask Alex anything..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

