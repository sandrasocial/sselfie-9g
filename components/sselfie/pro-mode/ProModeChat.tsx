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
  consistencyMode?: 'variety' | 'consistent' // Consistency mode for concept generation
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
  consistencyMode = 'variety',
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
  const [generatingConceptId, setGeneratingConceptId] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

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
      
      generateConcepts(userRequest, library, lastTrigger.essenceWords, consistencyMode)
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

  const handleGenerateConcept = async (concept: ConceptData): Promise<{ predictionId?: string; generationId?: string } | void> => {
    if (!concept.fullPrompt) {
      setGenerationError('Concept prompt is missing. Please regenerate concepts.')
      return
    }

    setGeneratingConceptId(concept.id)
    setGenerationError(null)

    try {
      console.log('[ProModeChat] Generating image for concept:', concept.id, concept.title)

      const response = await fetch('/api/maya/pro/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fullPrompt: concept.fullPrompt,
          conceptTitle: concept.title,
          conceptDescription: concept.description,
          category: concept.category || 'concept',
          linkedImages: concept.linkedImages || [],
          resolution: '2K', // Default to 2K for Instagram quality
          aspectRatio: '1:1', // Default to square
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402 || data.error === 'Insufficient credits') {
          throw new Error(
            `Need ${data.required || 2} credit${data.required > 1 ? 's' : ''}. ${data.message || 'Please purchase more credits or upgrade your plan.'}`
          )
        }
        throw new Error(data.error || 'Failed to generate image')
      }

      console.log('[ProModeChat] Generation started:', {
        predictionId: data.predictionId,
        generationId: data.generationId,
        status: data.status,
      })

      // If generation completed immediately
      if (data.status === 'succeeded' && data.imageUrl) {
        console.log('[ProModeChat] Image generated successfully:', data.imageUrl)
        if (onImageGenerated) {
          onImageGenerated()
        }
        setGeneratingConceptId(null)
        // Return IDs even for immediate completion (for consistency)
        return { predictionId: data.predictionId, generationId: data.generationId }
      }

      // If generation is in progress, return IDs for ConceptCardPro to handle polling
      // Note: ConceptCardPro handles its own polling, so we don't need to poll here
      if (data.predictionId) {
        setGeneratingConceptId(null) // Clear generating state - ConceptCardPro will handle its own state
        return { predictionId: data.predictionId, generationId: data.generationId }
      } else {
        throw new Error('No prediction ID returned')
      }
    } catch (error) {
      console.error('[ProModeChat] Error generating image:', error)
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate image')
      setGeneratingConceptId(null)
      throw error // Re-throw so ConceptCardPro can handle the error
    }
  }

  const pollGenerationStatus = async (predictionId: string, maxAttempts = 60) => {
    let attempts = 0

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        setGenerationError('Generation is taking longer than expected. Please check your gallery.')
        setGeneratingConceptId(null)
        return
      }

      try {
        const response = await fetch(`/api/maya/pro/check-generation?predictionId=${predictionId}`, {
          method: 'GET',
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to check generation status')
        }

        const data = await response.json()

        if (data.status === 'succeeded' && data.imageUrl) {
          console.log('[ProModeChat] Image generated successfully:', data.imageUrl)
          if (onImageGenerated) {
            onImageGenerated()
          }
          setGeneratingConceptId(null)
          return
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Generation failed')
        } else {
          // Still processing, poll again
          attempts++
          setTimeout(poll, 2000) // Poll every 2 seconds
        }
      } catch (error) {
        console.error('[ProModeChat] Error polling generation status:', error)
        setGenerationError(error instanceof Error ? error.message : 'Failed to check generation status')
        setGeneratingConceptId(null)
      }
    }

    // Start polling after a short delay
    setTimeout(poll, 2000)
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
        <div className="max-w-[1200px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          {/* Error display */}
          {(chatError || conceptError || generationError) && (
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
                {chatError || conceptError || generationError}
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
                    className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 sm:px-6 sm:py-4 ${
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
                        fontSize: 'clamp(14px, 2.5vw, 16px)',
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {concepts.map((concept) => (
                  <ConceptCardPro
                    key={concept.id}
                    concept={concept}
                    onGenerate={() => handleGenerateConcept(concept)}
                    isGenerating={generatingConceptId === concept.id}
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
          {(isChatLoading || isGeneratingConcepts) && (
            <div className="flex justify-start mb-8">
              <div
                className="bg-stone-100 rounded-2xl px-4 py-3 sm:px-6 sm:py-4"
                style={{
                  borderRadius: '16px',
                }}
              >
                <div
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: 'clamp(13px, 2.5vw, 15px)',
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
            <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-12 px-4">
              <div className="max-w-md w-full">
                <h2
                  style={{
                    fontFamily: Typography.headers.fontFamily,
                    fontSize: 'clamp(20px, 5vw, 28px)',
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
                    fontSize: 'clamp(14px, 3vw, 16px)',
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
