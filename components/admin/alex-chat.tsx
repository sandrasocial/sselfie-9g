"use client"

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Sparkles, Mail, Instagram, BarChart3, Calendar, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface AlexChatProps {
  userId: string
  userName?: string
  userEmail: string
}

export default function AlexChat({ userId, userName, userEmail }: AlexChatProps) {
  const [view, setView] = useState<'chat' | 'analytics' | 'calendar'>('chat')
  const [inputValue, setInputValue] = useState('')
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [pendingMessages, setPendingMessages] = useState<any[] | null>(null)
  const [isLoadingInitialChat, setIsLoadingInitialChat] = useState(true) // Prevent messages until chat is loaded
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasLoadedInitialChat = useRef(false)
  const currentChatIdRef = useRef<number | null>(null) // Track current chat ID to avoid race conditions
  
  const { messages, sendMessage, status, setMessages } = useChat({
    id: currentChatId ? String(currentChatId) : undefined,
    transport: new DefaultChatTransport({ api: '/api/admin/alex/chat' }) as any,
    body: {
      chatId: currentChatId,
      userId,
    } as any,
    onResponse: async (response: Response) => {
      console.log('[Alex] 📥 Response received, status:', response.status)
      const chatIdHeader = response.headers.get('X-Chat-Id')
      if (chatIdHeader) {
        const newChatId = parseInt(chatIdHeader)
        if (!currentChatIdRef.current || currentChatIdRef.current !== newChatId) {
          console.log('[Alex] 🔄 Setting chat ID to:', newChatId)
          currentChatIdRef.current = newChatId
          setCurrentChatId(newChatId)
        }
      }
    },
    onError: (error: any) => {
      console.error('[Alex] ❌ Chat error:', error)
    },
    onFinish: (message: any) => {
      console.log('[Alex] ✅ Message finished:', message.content?.substring(0, 50))
    },
    initialMessages: [],
  } as any)

  const isLoading = status === 'submitted' || status === 'streaming' || isLoadingInitialChat

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load existing chat on mount (only once)
  useEffect(() => {
    if (hasLoadedInitialChat.current) return
    hasLoadedInitialChat.current = true
    
    const loadChat = async () => {
      try {
        // Endpoint expects chatId (optional) - if not provided, it gets/creates active chat for authenticated user
        const response = await fetch(`/api/admin/agent/load-chat`)
        if (response.ok) {
          const data = await response.json()
          // Endpoint returns { chatId, chatTitle, messages } with messages having parts arrays
          if (data.chatId) {
            if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
              // Convert database messages from parts format to useChat format
              const formattedMessages = data.messages.map((msg: any) => {
                // Extract content from parts array or use direct content
                let content = ''
                if (msg.parts && Array.isArray(msg.parts)) {
                  // Extract text from parts array
                  content = msg.parts
                    .filter((part: any) => part.type === 'text' && part.text)
                    .map((part: any) => part.text)
                    .join('\n')
                } else if (msg.content) {
                  content = msg.content
                }
                
                return {
                  id: msg.id.toString(),
                  role: msg.role,
                  content: content || '',
                }
              })
              
              // CRITICAL: Check current chat ID before setting to prevent race condition
              // Since we prevent messages until loadChat completes, existingChatId should always be null here
              // But we check anyway as a safety measure
              const existingChatId = currentChatIdRef.current
              
              if (existingChatId !== null) {
                // Chat ID already set (shouldn't happen due to isLoadingInitialChat, but handle it anyway)
                // Only load messages if it's the same chat
                if (existingChatId === data.chatId) {
                  console.log('[Alex] ⚠️ Chat ID already set, loading messages for existing chat:', data.chatId)
                  setPendingMessages(formattedMessages)
                } else {
                  console.log('[Alex] ⚠️ Chat ID already set to different chat, skipping load:', { current: existingChatId, loaded: data.chatId })
                }
              } else {
                // No chat ID set yet, safe to set it from loaded chat
                console.log('[Alex] ✅ Setting chat ID from loaded chat:', data.chatId)
                currentChatIdRef.current = data.chatId
                setCurrentChatId(data.chatId)
                setPendingMessages(formattedMessages)
              }
            } else {
              // Chat exists but no messages yet - still set the chat ID
              console.log('[Alex] ✅ Setting chat ID from loaded chat (no messages yet):', data.chatId)
              currentChatIdRef.current = data.chatId
              setCurrentChatId(data.chatId)
            }
          } else {
            // No chat exists yet - will be created on first message
            console.log('[Alex] ℹ️ No existing chat found, will create on first message')
          }
        } else {
          console.warn('[Alex] ⚠️ Failed to load chat, status:', response.status)
        }
      } catch (error) {
        console.error('[Alex] Error loading chat:', error)
      } finally {
        // CRITICAL: Always mark loading as complete, even on error
        // This allows users to send messages even if chat loading failed
        setIsLoadingInitialChat(false)
        console.log('[Alex] ✅ Initial chat load complete')
      }
    }
    loadChat()
  }, [])

  // Set messages after chatId is set and hook has re-initialized
  useEffect(() => {
    if (currentChatId && pendingMessages && pendingMessages.length > 0) {
      // Use setTimeout to ensure useChat has finished re-initializing with the new id
      const timer = setTimeout(() => {
        // Double-check that chat ID hasn't changed before setting messages
        if (currentChatIdRef.current === currentChatId) {
          setMessages(pendingMessages)
          setPendingMessages(null)
          console.log('[Alex] ✅ Set', pendingMessages.length, 'messages after chat ID initialization')
        } else {
          console.log('[Alex] ⚠️ Chat ID changed during message loading, skipping:', { expected: currentChatId, actual: currentChatIdRef.current })
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [currentChatId, pendingMessages, setMessages])

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
              {messages.map((message: any) => {
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
                      <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="ml-2">{children}</li>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                            code: ({ children }) => <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                            pre: ({ children }) => <pre className="bg-stone-100 p-3 rounded-lg overflow-x-auto mb-3">{children}</pre>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-stone-300 pl-3 italic my-2">{children}</blockquote>,
                          }}
                        >
                          {content || 'No content'}
                        </ReactMarkdown>
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

