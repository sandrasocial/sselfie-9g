"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import MayaChatInterface from "./maya-chat-interface"
import MayaQuickPrompts from "./maya-quick-prompts"
import InstagramFeedCard, { 
  InstagramFeedCardSkeleton,
  InstagramFeedEmptyState 
} from "@/components/feed/instagram-feed-card"
import {
  createFeedFromStrategyHandler,
  generateCaptionsHandler,
  generateStrategyHandler,
  saveFeedMarkerToMessage,
  type FeedStrategy,
  type CreateFeedOptions,
} from "@/lib/maya/feed-generation-handler"

interface MayaFeedTabProps {
  messages: any[]
  filteredMessages: any[]
  setMessages: (messages: any[] | ((prev: any[]) => any[])) => void
  studioProMode: boolean
  isTyping: boolean
  isGeneratingConcepts: boolean
  isGeneratingStudioPro: boolean
  isCreatingFeed: boolean
  contentFilter: "all" | "photos" | "videos"
  messagesContainerRef: React.RefObject<HTMLDivElement>
  messagesEndRef: React.RefObject<HTMLDivElement>
  showScrollButton: boolean
  isAtBottomRef: React.RefObject<boolean>
  scrollToBottom: () => void
  chatId?: number
  uploadedImages: string[]
  setCreditBalance: (balance: number) => void
  onImageGenerated: () => void
  isAdmin: boolean
  selectedGuideId: string | null
  selectedGuideCategory: string | null
  onSaveToGuide: (guideId: string, category: string, prompt: string, title: string) => Promise<void>
  userId: string
  user: any
  promptSuggestions: any[]
  generateCarouselRef: React.RefObject<((params: { title: string; textOverlay?: string }) => Promise<void>) | null>
  // Feed-specific props
  styleStrength: number
  promptAccuracy: number
  aspectRatio: string
  realismStrength: number
  onCreateFeed: (strategy: any) => Promise<void>
  onGenerateCaptions: () => Promise<void>
  onGenerateStrategy: () => Promise<void>
  currentPrompts: Array<{ label: string; prompt: string }>
  handleSendMessage: (message: any) => void
  isEmpty: boolean
}

/**
 * Maya Feed Tab Component
 * 
 * Extracted from maya-chat-screen.tsx to work as a separate tab component.
 * Handles feed creation, strategy generation, and caption generation.
 * 
 * **Features:**
 * - Feed strategy creation via [CREATE_FEED_STRATEGY] trigger
 * - Caption generation via [GENERATE_CAPTIONS] trigger
 * - Strategy document generation via [GENERATE_STRATEGY] trigger
 * - Feed-specific quick prompts
 * - Feed cards display
 * - Empty state with feed-specific messaging
 * 
 * **Removed Dependencies:**
 * - Feed handlers moved to this component (will be extracted to lib/maya/feed-generation-handler.ts in Phase 2)
 * - Feed trigger detection moved here from parent
 */
export default function MayaFeedTab({
  messages,
  filteredMessages,
  setMessages,
  studioProMode,
  isTyping,
  isGeneratingConcepts,
  isGeneratingStudioPro,
  isCreatingFeed,
  setIsCreatingFeed,
  contentFilter,
  messagesContainerRef,
  messagesEndRef,
  showScrollButton,
  isAtBottomRef,
  scrollToBottom,
  chatId,
  uploadedImages,
  setCreditBalance,
  onImageGenerated,
  isAdmin,
  selectedGuideId,
  selectedGuideCategory,
  onSaveToGuide,
  userId,
  user,
  promptSuggestions,
  generateCarouselRef,
  styleStrength,
  promptAccuracy,
  aspectRatio,
  realismStrength,
  onCreateFeed,
  onGenerateCaptions,
  onGenerateStrategy,
  currentPrompts,
  handleSendMessage,
  isEmpty,
}: MayaFeedTabProps) {
  const processedFeedMessagesRef = useRef<Set<string>>(new Set())
  
  // Feed list state
  const [feeds, setFeeds] = useState<any[]>([])
  const [feedsLoading, setFeedsLoading] = useState(true)
  const [feedsError, setFeedsError] = useState<string | null>(null)

  // Feed Tab Quick Prompts
  const getFeedQuickPrompts = (): Array<{ label: string; prompt: string }> => {
    return [
      { label: "Create Feed Layout", prompt: "Create an Instagram feed layout for my business" },
      { label: "Create Captions", prompt: "Create captions for my feed posts" },
      { label: "Create Strategy", prompt: "Create a strategy document for my feed" },
    ]
  }

  // Fetch feeds from database
  useEffect(() => {
    async function fetchFeeds() {
      try {
        setFeedsLoading(true)
        setFeedsError(null)
        const response = await fetch('/api/maya/feed/list')
        
        if (!response.ok) {
          throw new Error('Failed to fetch feeds')
        }
        
        const data = await response.json()
        setFeeds(data.feeds || [])
      } catch (err) {
        console.error('[FEED-TAB] Error fetching feeds:', err)
        setFeedsError(err instanceof Error ? err.message : 'Failed to load feeds')
      } finally {
        setFeedsLoading(false)
      }
    }

    fetchFeeds()
  }, [])

  // Refresh feeds after creating a new one
  const refreshFeeds = useCallback(async () => {
    try {
      const response = await fetch('/api/maya/feed/list')
      if (response.ok) {
        const data = await response.json()
        setFeeds(data.feeds || [])
      }
    } catch (err) {
      console.error('[FEED-TAB] Error refreshing feeds:', err)
    }
  }, [])

  // Handle feed deletion
  const handleDeleteFeed = useCallback(async (feedId: string | number) => {
    if (!confirm('Are you sure you want to delete this feed?')) {
      return
    }

    try {
      const response = await fetch(`/api/maya/feed/${feedId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete feed')
      }

      // Remove from UI
      setFeeds(prev => prev.filter(f => {
        const id = f.id || f.feedId
        return String(id) !== String(feedId)
      }))
    } catch (err) {
      console.error('[FEED-TAB] Error deleting feed:', err)
      alert('Failed to delete feed. Please try again.')
    }
  }, [])

  // Handle post click (for detail view)
  const handlePostClick = useCallback((post: any) => {
    console.log('[FEED-TAB] Post clicked:', post)
    // TODO: Open modal with post details, caption, prompt, etc.
    // For now, just log
  }, [])

  // Wrapper handlers that use the pure functions and update UI state
  const handleCreateFeed = useCallback(
    async (strategy: FeedStrategy) => {
      setIsCreatingFeed(true)
      try {
        const options: CreateFeedOptions = {
          studioProMode,
          customSettings: {
            styleStrength,
            promptAccuracy,
            aspectRatio,
            realismStrength,
          },
        }

        const result = await createFeedFromStrategyHandler(strategy, options)

        if (!result.success || !result.feedId) {
          alert(result.error || "Failed to create feed")
          return
        }

      // Update messages with feed card
      let lastAssistantMessageId: number | null = null
      setMessages((prevMessages: any[]) => {
        const updatedMessages = [...prevMessages]

        // Find the last assistant message (iterate backwards)
        for (let i = updatedMessages.length - 1; i >= 0; i--) {
          if (updatedMessages[i].role === "assistant") {
            const lastAssistant = updatedMessages[i]

            // Check if feed card already exists (prevent duplicates on refresh)
            const hasFeedCard = lastAssistant.parts?.some(
              (p: any) => p.type === "tool-generateFeed"
            )

            if (hasFeedCard) {
              console.log("[FEED] Feed card already exists in message, skipping")
              break
            }

            // Store message ID for persistence
            lastAssistantMessageId = parseInt(lastAssistant.id)

            const updatedParts = [
              ...(lastAssistant.parts || []),
              {
                type: "tool-generateFeed",
                output: {
                  feedId: result.feedId,
                  title: result.feed?.brand_name || "Instagram Feed",
                  description: result.feed?.description || result.feed?.gridPattern || "",
                  posts: result.posts || [],
                },
              },
            ]

            // Also save feed marker to message content for persistence
            const feedMarker = `[FEED_CARD:${result.feedId}]`
            const contentWithMarker = lastAssistant.content
              ? `${lastAssistant.content}\n\n${feedMarker}`
              : feedMarker

            updatedMessages[i] = {
              ...lastAssistant,
              content: contentWithMarker,
              parts: updatedParts,
            }

            break
          }
        }

        return updatedMessages
      })

        // Save feed marker to database for persistence
        if (lastAssistantMessageId) {
          await saveFeedMarkerToMessage(lastAssistantMessageId, result.feedId)
        }

        // Notify parent callback (for any additional state management)
        await onCreateFeed(strategy)
        
        // Refresh feeds list to show new feed
        await refreshFeeds()
      } catch (error) {
        console.error("[FEED] ❌ Error creating feed:", error)
        alert("Failed to create feed. Please try again.")
      } finally {
        setIsCreatingFeed(false)
      }
    },
    [
      studioProMode,
      styleStrength,
      promptAccuracy,
      aspectRatio,
      realismStrength,
      setMessages,
      onCreateFeed,
      setIsCreatingFeed,
      refreshFeeds,
    ]
  )

  const handleGenerateCaptions = useCallback(async () => {
    const result = await generateCaptionsHandler()

    if (!result.success || !result.captions) {
      console.error("[FEED-CAPTIONS] Failed to generate captions:", result.error)
      return
    }

    // Update messages with caption cards
    setMessages((prevMessages: any[]) => {
      const updatedMessages = [...prevMessages]

      // Find the last assistant message (iterate backwards)
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (updatedMessages[i].role === "assistant") {
          const lastAssistant = updatedMessages[i]
          const existingParts = lastAssistant.parts || []

          // Check if caption cards already exist
          const hasCaptionCards = existingParts.some(
            (p: any) => p.type === "tool-generateCaptions"
          )

          if (!hasCaptionCards) {
            const updatedParts = [
              ...existingParts,
              {
                type: "tool-generateCaptions",
                output: {
                  feedId: result.feedId,
                  captions: result.captions,
                },
              },
            ]

            updatedMessages[i] = {
              ...lastAssistant,
              parts: updatedParts,
            }
          }
          break
        }
      }

      return updatedMessages
    })

    // Call parent callback
    await onGenerateCaptions()
  }, [setMessages, onGenerateCaptions])

  const handleGenerateStrategy = useCallback(async () => {
    const result = await generateStrategyHandler()

    if (!result.success || !result.strategy) {
      console.error("[FEED-STRATEGY] Failed to generate strategy:", result.error)
      return
    }

    // Update messages with strategy card
    setMessages((prevMessages: any[]) => {
      const updatedMessages = [...prevMessages]

      // Find the last assistant message (iterate backwards)
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (updatedMessages[i].role === "assistant") {
          const lastAssistant = updatedMessages[i]
          const existingParts = lastAssistant.parts || []

          // Check if strategy card already exists
          const hasStrategyCard = existingParts.some(
            (p: any) => p.type === "tool-generateStrategy"
          )

          if (!hasStrategyCard) {
            const updatedParts = [
              ...existingParts,
              {
                type: "tool-generateStrategy",
                output: {
                  feedId: result.feedId,
                  strategy: result.strategy,
                },
              },
            ]

            updatedMessages[i] = {
              ...lastAssistant,
              parts: updatedParts,
            }
          }
          break
        }
      }

      return updatedMessages
    })

    // Call parent callback
    await onGenerateStrategy()
  }, [setMessages, onGenerateStrategy])

  // Detect feed triggers in messages
  useEffect(() => {
    if (isCreatingFeed) return

    const lastAssistantMessage = messages
      .filter((m: any) => m.role === "assistant")
      .slice(-1)[0]

    if (!lastAssistantMessage) return

    const messageId = lastAssistantMessage.id
    if (!messageId) return

    // Skip if already processed
    if (processedFeedMessagesRef.current.has(messageId)) {
      return
    }

    // Extract text content from message
    let textContent = ""
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      const textParts = lastAssistantMessage.parts.filter((p: any) => p && p.type === "text")
      textContent = textParts.map((p: any) => p.text || "").join("\n")
    } else if (typeof lastAssistantMessage.content === "string") {
      textContent = lastAssistantMessage.content
    }

    // Check for [CREATE_FEED_STRATEGY] trigger
    const feedStrategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i)

    if (feedStrategyMatch) {
      // CRITICAL: Check if message already has feed card FIRST (like concept cards check)
      const alreadyHasFeedCard = lastAssistantMessage.parts?.some(
        (p: any) => p.type === "tool-generateFeed"
      )
      if (alreadyHasFeedCard) {
        console.log("[FEED] Message already has feed card, skipping:", messageId)
        processedFeedMessagesRef.current.add(messageId)
        return
      }

      processedFeedMessagesRef.current.add(messageId)

      const strategyJson = feedStrategyMatch[1]
      console.log("[FEED] ✅ Detected feed creation trigger:", {
        messageId,
        strategyLength: strategyJson.length,
      })

      try {
        const strategy = JSON.parse(strategyJson) as FeedStrategy
        handleCreateFeed(strategy)
      } catch (error) {
        console.error("[FEED] ❌ Failed to parse strategy JSON:", error)
        processedFeedMessagesRef.current.delete(messageId)
      }
      return
    }

    // Check for [GENERATE_CAPTIONS] trigger
    const generateCaptionsMatch = textContent.match(/\[GENERATE_CAPTIONS\]/i)
    if (generateCaptionsMatch) {
      console.log("[FEED-CAPTIONS] ✅ Detected caption generation trigger")
      handleGenerateCaptions()
      processedFeedMessagesRef.current.add(messageId)
      return
    }

    // Check for [GENERATE_STRATEGY] trigger
    const generateStrategyMatch = textContent.match(/\[GENERATE_STRATEGY\]/i)
    if (generateStrategyMatch) {
      console.log("[FEED-STRATEGY] ✅ Detected strategy generation trigger")
      handleGenerateStrategy()
      processedFeedMessagesRef.current.add(messageId)
      return
    }
  }, [messages, isCreatingFeed, handleCreateFeed, handleGenerateCaptions, handleGenerateStrategy])

  return (
    <>
      <div
        className="flex-1 min-h-0 flex flex-col"
        style={{
          paddingBottom: "140px", // Space for fixed bottom input
        }}
      >
        {/* Feed List Section - Show when there are feeds or when loading */}
        {(feeds.length > 0 || feedsLoading) && (
          <div className="border-b border-stone-200 bg-white px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 
                    className="text-lg font-light tracking-wide text-stone-950"
                    style={{ fontFamily: "'Times New Roman', serif" }}
                  >
                    Your Feeds
                  </h2>
                  <p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">
                    Strategic 9-post Instagram feeds created with Maya
                  </p>
                </div>
              </div>

              {/* Loading state */}
              {feedsLoading && (
                <div className="space-y-4">
                  <InstagramFeedCardSkeleton />
                </div>
              )}

              {/* Error state */}
              {feedsError && !feedsLoading && (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {feedsError}
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 block text-sm text-red-700 underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!feedsLoading && !feedsError && feeds.length === 0 && (
                <InstagramFeedEmptyState />
              )}

              {/* Feed grid */}
              {!feedsLoading && !feedsError && feeds.length > 0 && (
                <div className="space-y-6">
                  {feeds.map((feed) => {
                    // Normalize feed data for InstagramFeedCard
                    const normalizedFeed = {
                      id: feed.id || feed.feedId,
                      title: feed.title || feed.feedTitle || 'Instagram Feed',
                      feedTitle: feed.title || feed.feedTitle || 'Instagram Feed',
                      overallVibe: feed.overallVibe || feed.description || '',
                      aesthetic: feed.aesthetic || '',
                      colorPalette: feed.colorPalette || '',
                      totalCredits: feed.totalCredits || 0,
                      status: feed.status || 'pending',
                      createdAt: feed.createdAt || feed.created_at || new Date(),
                      posts: (feed.posts || []).map((post: any) => ({
                        id: post.id,
                        position: post.position,
                        postType: post.postType || post.post_type || 'user',
                        shotType: post.shotType || post.shot_type || 'portrait',
                        imageUrl: post.imageUrl || post.image_url,
                        image_url: post.image_url || post.imageUrl,
                        caption: post.caption || '',
                        status: post.status || post.generation_status || 'pending',
                        generationStatus: post.generationStatus || post.generation_status || 'pending',
                        prompt: post.prompt || '',
                        error: post.error,
                        predictionId: post.predictionId || post.prediction_id,
                        prediction_id: post.prediction_id || post.predictionId,
                      })),
                    }

                    return (
                      <InstagramFeedCard
                        key={normalizedFeed.id}
                        feed={normalizedFeed}
                        onPostClick={handlePostClick}
                        onDelete={() => handleDeleteFeed(normalizedFeed.id!)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <MayaChatInterface
          messages={messages}
          filteredMessages={filteredMessages}
          setMessages={setMessages}
          studioProMode={studioProMode}
          isTyping={isTyping}
          isGeneratingConcepts={isGeneratingConcepts}
          isGeneratingStudioPro={isGeneratingStudioPro}
          isCreatingFeed={isCreatingFeed}
          contentFilter={contentFilter}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
          showScrollButton={showScrollButton}
          isAtBottomRef={isAtBottomRef}
          scrollToBottom={scrollToBottom}
          chatId={chatId}
          uploadedImages={uploadedImages}
          setCreditBalance={setCreditBalance}
          onImageGenerated={onImageGenerated}
          isAdmin={isAdmin}
          selectedGuideId={selectedGuideId}
          selectedGuideCategory={selectedGuideCategory}
          onSaveToGuide={onSaveToGuide}
          userId={userId}
          user={user}
          promptSuggestions={promptSuggestions}
          generateCarouselRef={generateCarouselRef}
        />
        {/* Empty State - Feed Tab */}
        {isEmpty && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 animate-in fade-in duration-500">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-stone-200/60 overflow-hidden mb-4 sm:mb-6">
              <img
                src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                alt="Maya"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase mb-2 sm:mb-3 text-center">
              Welcome
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 tracking-wide text-center mb-4 sm:mb-6 max-w-md leading-relaxed px-4">
              Hi, I'm Maya. I'll help you create Instagram feeds, captions, and strategies.
            </p>
            {/* Feed-specific quick prompts */}
            <MayaQuickPrompts
              prompts={currentPrompts}
              onSelect={handleSendMessage}
              disabled={isTyping}
              variant="empty-state"
              studioProMode={studioProMode}
              isEmpty={isEmpty}
            />
          </div>
        )}
      </div>
    </>
  )
}

