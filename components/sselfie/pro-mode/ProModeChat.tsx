"use client"

import { useState, useRef, useEffect } from 'react'
import ProModeHeader from './ProModeHeader'
import ProModeInput from './ProModeInput'
import ConceptCardPro from './ConceptCardPro'
import { Colors, Typography, Spacing } from '@/lib/maya/pro/design-system'
import { useProModeChat } from './hooks/useProModeChat'
import { useConceptGeneration } from './hooks/useConceptGeneration'
import type { ImageLibrary } from '@/lib/maya/pro/category-system'

/**
 * ProModeChat Component
 * 
 * Main creative workspace for Studio Pro Mode.
 * Integrates header, concept cards, messages, and input.
 * 
 * Design principles:
 * - NO emojis in UI elements (except Maya's chat messages)
 * - Professional typography (Canela, Hatton, Inter)
 * - Stone palette colors
 * - Editorial, luxury, creative studio feel
 */

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  concepts?: ConceptData[]
}

interface ConceptData {
  id: string
  title: string
  description: string
  category?: string
  aesthetic?: string
  linkedImages?: string[]
  fullPrompt?: string
}


interface ProModeChatProps {
  library?: ImageLibrary
  credits?: number
  onManageLibrary?: () => void
  onAddImages?: () => void
  onStartFresh?: () => void
  onEditIntent?: () => void
  onImageGenerated?: () => void
}

export default function ProModeChat({
  library = {
    selfies: [],
    products: [],
    people: [],
    vibes: [],
    intent: '',
  },
  credits,
  onManageLibrary,
  onAddImages,
  onStartFresh,
  onEditIntent,
  onImageGenerated,
}: ProModeChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Use Pro Mode chat hook
  const {
    messages: chatMessages,
    isLoading: isChatLoading,
    error: chatError,
    sendMessage: sendChatMessage,
    lastTrigger,
    resetTrigger,
  } = useProModeChat(library)

  // Use concept generation hook
  const {
    concepts: generatedConcepts,
    isLoading: isGeneratingConcepts,
    error: conceptError,
    generateConcepts,
  } = useConceptGeneration()

  // Convert ProModeMessage to Message format for display
  const [displayMessages, setDisplayMessages] = useState<Message[]>([])
  const [concepts, setConcepts] = useState<ConceptData[]>([])

  // Calculate total library count
  const libraryCount =
    library.selfies.length +
    library.products.length +
    library.people.length +
    library.vibes.length

  // Convert chat messages to display format
  useEffect(() => {
    const converted: Message[] = chatMessages.map((msg) => ({
      id: msg.id,
      role: msg.role === 'maya' ? 'assistant' : 'user',
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    }))
    setDisplayMessages(converted)
  }, [chatMessages])

  // Convert generated concepts to display format
  useEffect(() => {
    const converted: ConceptData[] = generatedConcepts.map((concept) => ({
      id: concept.id,
      title: concept.title,
      description: concept.description,
      category: concept.category,
      aesthetic: concept.aesthetic,
      linkedImages: concept.linkedImages,
      fullPrompt: concept.fullPrompt || concept.prompt,
    }))
    setConcepts(converted)
  }, [generatedConcepts])

  // Auto-scroll to bottom when messages or concepts change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [displayMessages, concepts])

  // Detect [GENERATE_CONCEPTS] trigger and generate concepts
  useEffect(() => {
    if (lastTrigger?.detected && lastTrigger.messageId) {
      console.log('[ProModeChat] [GENERATE_CONCEPTS] trigger detected, generating concepts...')
      // Generate concepts using the user's request and library
      const lastUserMessage = chatMessages
        .filter((msg) => msg.role === 'user')
        .pop()
      const userRequest = lastUserMessage?.content || library.intent || 'Create concepts for me'
      
      generateConcepts(userRequest, library, lastTrigger.essenceWords)
      resetTrigger()
    }
  }, [lastTrigger, chatMessages, library, generateConcepts, resetTrigger])

  const handleSendMessage = async (message: string, imageUrl?: string) => {
    if (!message.trim() && !imageUrl) return

    try {
      await sendChatMessage(message, imageUrl)
    } catch (error) {
      console.error('[ProModeChat] Error sending message:', error)
    }
  }

  const handleImageUpload = () => {
    // Open image upload flow
    if (onAddImages) {
      onAddImages()
    } else {
      console.warn('[ProModeChat] onAddImages callback not provided')
    }
  }

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{
        backgroundColor: Colors.background,
      }}
    >
      {/* Header */}
      <ProModeHeader
        libraryCount={libraryCount}
        credits={credits}
        onManageLibrary={onManageLibrary}
        onAddImages={onAddImages}
        onStartFresh={onStartFresh}
        onEditIntent={onEditIntent}
      />

      {/* Main content area - scrollable */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        style={{
          backgroundColor: Colors.background,
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          {/* Error display */}
          {(chatError || conceptError) && (
            <div
              className="mb-8 p-4 rounded-lg"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <p
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  color: '#DC2626',
                }}
              >
                {chatError || conceptError}
              </p>
            </div>
          )}

          {/* Messages */}
          {displayMessages.length > 0 && (
            <div className="space-y-6 mb-8">
              {displayMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                      message.role === 'user'
                        ? 'bg-stone-950 text-white'
                        : 'bg-stone-100 text-stone-900'
                    }`}
                    style={{
                      borderRadius: '16px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: Typography.body.fontFamily,
                        fontSize: Typography.body.sizes.md,
                        fontWeight: Typography.body.weights.regular,
                        lineHeight: Typography.body.lineHeight,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Concept Cards */}
          {concepts.length > 0 && (
            <div className="space-y-6 mb-8">
              <h2
                style={{
                  fontFamily: Typography.headers.fontFamily,
                  fontSize: Typography.headers.sizes.md,
                  fontWeight: Typography.headers.weights.medium,
                  color: Colors.textPrimary,
                  marginBottom: Spacing.section,
                }}
              >
                Concepts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {concepts.map((concept) => (
                  <ConceptCardPro
                    key={concept.id}
                    concept={concept}
                    onGenerate={() => {
                      // TODO: Handle concept generation
                      if (onImageGenerated) {
                        onImageGenerated()
                      }
                    }}
                    onViewPrompt={() => {
                      // TODO: Show full prompt modal
                      console.log('View prompt:', concept.fullPrompt)
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start mb-8">
              <div
                className="bg-stone-100 rounded-2xl px-6 py-4"
                style={{
                  borderRadius: '16px',
                }}
              >
                <div
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: Typography.body.sizes.sm,
                    color: Colors.textTertiary,
                    fontStyle: 'italic',
                  }}
                >
                  Maya is thinking...
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {displayMessages.length === 0 && concepts.length === 0 && !isChatLoading && !isGeneratingConcepts && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="max-w-md">
                <h2
                  style={{
                    fontFamily: Typography.headers.fontFamily,
                    fontSize: Typography.headers.sizes.lg,
                    fontWeight: Typography.headers.weights.medium,
                    color: Colors.textPrimary,
                    marginBottom: Spacing.element,
                  }}
                >
                  Studio Pro Mode
                </h2>
                <p
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: Typography.body.sizes.md,
                    fontWeight: Typography.body.weights.light,
                    color: Colors.textSecondary,
                    lineHeight: Typography.body.lineHeight,
                    marginBottom: Spacing.section,
                  }}
                >
                  Describe what you'd like to create, and Maya will generate professional concepts for you.
                </p>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ProModeInput
        onSend={handleSendMessage}
        onImageUpload={handleImageUpload}
        onManageLibrary={onManageLibrary}
        isLoading={isChatLoading || isGeneratingConcepts}
      />
    </div>
  )
}
