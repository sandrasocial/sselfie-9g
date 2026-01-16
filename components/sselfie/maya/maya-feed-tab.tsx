"use client"

import type React from "react"
import { useEffect, useRef, useCallback, useState } from "react"
import MayaChatInterface from "./maya-chat-interface"
import MayaQuickPrompts from "./maya-quick-prompts"
import {
  createFeedFromStrategyHandler,
  saveFeedMarkerToMessage,
  type FeedStrategy,
  type CreateFeedOptions,
} from "@/lib/maya/feed-generation-handler"

interface MayaFeedTabProps {
  messages: any[]
  filteredMessages: any[]
  setMessages: (messages: any[] | ((prev: any[]) => any[])) => void
  proMode: boolean
  isTyping: boolean
  status: "idle" | "streaming" | "submitted" | "ready" // Chat status from useChat hook
  isGeneratingConcepts: boolean
  isGeneratingPro: boolean
  isCreatingFeed: boolean
  setIsCreatingFeed: (isCreating: boolean) => void
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
  imageLibrary?: any // Pro Mode: Image library for Pro Mode enhancements
  selectedGuideId: string | null
  selectedGuideCategory: string | null
  onSaveToGuide: (guideId: string, category: string, prompt: string, title: string) => Promise<void>
  userId: string
  user: any
  promptSuggestions: any[]
  // Feed-specific props
  styleStrength: number
  promptAccuracy: number
  aspectRatio: string
  realismStrength: number
  onCreateFeed: (strategy: any) => Promise<void>
  currentPrompts: Array<{ label: string; prompt: string }>
  handleSendMessage: (message: any) => void
  isEmpty: boolean
}

/**
 * Maya Feed Tab Component
 * 
 * Extracted from maya-chat-screen.tsx to work as a separate tab component.
 * Handles feed creation with captions included in strategy.
 * 
 * **Architecture (Refactored - Phase 1-4):**
 * - Simple trigger detection: Single pattern `[CREATE_FEED_STRATEGY: {...}]`
 * - Split detection and processing: Two separate useEffects (like concept cards)
 * - API validation: Calls `/api/maya/generate-feed` (Classic) or `/api/maya/pro/generate-feed` (Pro)
 * - Database: Saves to `feed_cards` column (matches `concept_cards` pattern)
 * 
 * **Features:**
 * - Feed strategy creation via [CREATE_FEED_STRATEGY] trigger (includes captions)
 * - Feed-specific quick prompts
 * - Empty state with feed-specific messaging
 * - Pro Mode support with imageLibrary
 * 
 * **Flow:**
 * 1. Detection: Monitor messages for `[CREATE_FEED_STRATEGY: {...}]` pattern
 * 2. Processing: Call API endpoint to validate strategy JSON
 * 3. Creation: Call handleCreateFeed() with validated strategy
 * 4. Display: Feed card appears in chat
 * 5. Persistence: Feed card saved to `feed_cards` column
 * 
 * **Note:**
 * - Captions are included in the feed strategy JSON (no separate generation needed)
 * - Strategy document generation is available in Feed Planner (optional feature)
 * - Backward compatible: Old feeds in `styling_details` still load correctly
 */
export default function MayaFeedTab({
  messages,
  filteredMessages,
  setMessages,
  proMode,
  isTyping,
  status,
  isGeneratingConcepts,
  isGeneratingPro,
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
  imageLibrary,
  selectedGuideId,
  selectedGuideCategory,
  onSaveToGuide,
  userId,
  user,
  promptSuggestions,
  styleStrength,
  promptAccuracy,
  aspectRatio,
  realismStrength,
  onCreateFeed,
  currentPrompts,
  handleSendMessage,
  isEmpty,
}: MayaFeedTabProps) {
  const processedFeedMessagesRef = useRef<Set<string>>(new Set())
  
  // State for pending feed request (like concept cards use pendingConceptRequest)
  const [pendingFeedRequest, setPendingFeedRequest] = useState<{
    strategyJson: string
    messageId: string
  } | null>(null)
  
  // Clear processed messages ref when chatId changes (new chat created)
  useEffect(() => {
    processedFeedMessagesRef.current.clear()
    setPendingFeedRequest(null) // Clear pending request on chat change
  }, [chatId])

  // Feed Tab Quick Prompts
  const getFeedQuickPrompts = (): Array<{ label: string; prompt: string }> => {
    return [
      { label: "Create Feed Layout", prompt: "Create an Instagram feed layout for my business" },
      { label: "Create Captions", prompt: "Create captions for my feed posts" },
      { label: "Create Strategy", prompt: "Create a strategy document for my feed" },
    ]
  }

  // Wrapper handlers that use the pure functions and update UI state
  const handleCreateFeed = useCallback(
    async (strategy: FeedStrategy) => {
      // NOTE: isCreatingFeed is set to true in trigger detection (before calling this function)
      // This ensures the loading indicator shows immediately when trigger is detected
      try {
        // NEW: Store strategy in message part WITHOUT saving to database
        // User will click "Save Feed" button to save it
        console.log("[FEED] Storing feed strategy in message (not saving to DB yet)")

        // Update messages with feed card (unsaved state - no feedId yet)
        // CRITICAL: Use functional update to ensure we're working with the latest messages
        // The AI SDK might update messages during streaming, so we need to merge, not replace
        let messageIdToSave: string | null = null
        let messageContentToSave: string | null = null
        
        setMessages((prevMessages: any[]) => {
          // CRITICAL: Create a deep copy to avoid mutating the original array
          const updatedMessages = prevMessages.map(msg => ({
            ...msg,
            parts: msg.parts ? [...msg.parts] : undefined,
          }))

          // Find the last assistant message (iterate backwards)
          for (let i = updatedMessages.length - 1; i >= 0; i--) {
            if (updatedMessages[i].role === "assistant") {
              const lastAssistant = updatedMessages[i]

              // Check if feed card already exists (prevent duplicates)
              const hasFeedCard = lastAssistant.parts?.some(
                (p: any) => p.type === "tool-generateFeed"
              )

              if (hasFeedCard) {
                console.log("[FEED] Feed card already exists in message - skipping duplicate")
                break
              }

              // CRITICAL: Preserve existing parts and add feed card
              // This ensures we don't lose parts added by the AI SDK
              const existingParts = lastAssistant.parts ? [...lastAssistant.parts] : []
              
              // Store strategy data in message part (not saved to DB yet)
              const updatedParts = [
                ...existingParts,
                {
                  type: "tool-generateFeed",
                  output: {
                    // No feedId yet - indicates unsaved state
                    strategy: strategy, // Store full strategy for saving later
                    title: strategy.feedTitle || strategy.title || "Instagram Feed",
                    description: strategy.overallVibe || strategy.colorPalette || "",
                    posts: strategy.posts || [],
                    isSaved: false, // Flag to indicate unsaved state
                    // Store settings for saving later
                    proMode,
                    styleStrength,
                    promptAccuracy,
                    aspectRatio,
                    realismStrength,
                  },
                },
              ]

              updatedMessages[i] = {
                ...lastAssistant,
                parts: updatedParts,
              }

              // CRITICAL: Save message ID and content for database persistence
              // Use message ID if available, otherwise use a temporary key
              // The message will get an ID when it's saved to the database
              messageIdToSave = lastAssistant.id || `temp-${Date.now()}`
              messageContentToSave = lastAssistant.content || ""

              // CRITICAL: Log posts structure to verify prompts and captions are present
              const firstPost = strategy.posts?.[0]
              console.log("[FEED] ✅ Feed card part added to message:", {
                messageId: lastAssistant.id,
                partsCount: updatedParts.length,
                feedCardPart: updatedParts.find((p: any) => p.type === "tool-generateFeed"),
                hasStrategy: !!strategy,
                postsCount: strategy.posts?.length || 0,
                firstPostStructure: firstPost ? {
                  position: firstPost.position,
                  hasVisualDirection: !!firstPost.visualDirection,
                  hasPrompt: !!(firstPost as any).prompt,
                  hasCaption: !!firstPost.caption,
                  postType: firstPost.postType,
                  visualDirection: firstPost.visualDirection?.substring(0, 50) + '...',
                  caption: firstPost.caption?.substring(0, 50) + '...',
                } : null,
              })
              
              // CRITICAL: Log to verify parts are actually in the message
              console.log("[FEED] 🔍 VERIFY: Message parts after update:", {
                messageId: lastAssistant.id,
                partsTypes: updatedParts.map((p: any) => p.type),
                hasFeedCard: updatedParts.some((p: any) => p.type === "tool-generateFeed"),
              })
              
              // CRITICAL DEBUG: Log the full message object to verify structure
              console.log("[FEED] 🔍 FULL MESSAGE AFTER UPDATE:", JSON.stringify({
                id: lastAssistant.id,
                role: lastAssistant.role,
                partsCount: updatedParts.length,
                parts: updatedParts.map((p: any) => ({ type: p.type, hasOutput: !!p.output })),
              }, null, 2))

              break
            }
          }

          const updatedMessagesFinal = updatedMessages
          console.log("[FEED] ✅ Message state updated with feed card part")
          
          // CRITICAL DEBUG: Verify the updated messages array
          const feedCardMessages = updatedMessagesFinal.filter((m: any) => 
            m.parts?.some((p: any) => p.type === "tool-generateFeed")
          )
          console.log("[FEED] 🔍 Messages with feed cards after setMessages:", {
            totalMessages: updatedMessagesFinal.length,
            messagesWithFeedCards: feedCardMessages.length,
            feedCardMessageIds: feedCardMessages.map((m: any) => m.id),
          })
          
          return updatedMessagesFinal
        })

        // CRITICAL: Feed card is now in UI state (in message parts)
        // The feed card will be saved to database when the message gets an ID
        // This is handled by the useEffect below that watches for messages with IDs
        // This approach avoids creating duplicate messages during streaming
        console.log("[FEED] ✅ Feed card added to message parts - will be saved when message has ID")

        // Notify parent callback (for any additional state management)
        await onCreateFeed(strategy)
      } catch (error) {
        console.error("[FEED] ❌ Error storing feed strategy:", error)
        // Error will be handled by parent component
      } finally {
        setIsCreatingFeed(false)
      }
    },
    [
      messages,
      setMessages,
      onCreateFeed,
      setIsCreatingFeed,
      proMode,
      styleStrength,
      promptAccuracy,
      aspectRatio,
      realismStrength,
    ]
  )
  

  // CRITICAL FIX: Clear isCreatingFeed when feed card is detected in messages
  // This prevents the loader from getting stuck if feed card is created but isCreatingFeed wasn't cleared
  // Also clears on page refresh when messages are loaded with feed cards
  useEffect(() => {
    const hasFeedCard = messages.some((m: any) => 
      m.parts?.some((p: any) => p.type === "tool-generateFeed")
    )
    
    if (isCreatingFeed && hasFeedCard) {
      console.log("[FEED] ✅ Feed card detected in messages - clearing isCreatingFeed")
      setIsCreatingFeed(false)
    }
  }, [messages, isCreatingFeed, setIsCreatingFeed])

  // REMOVED: Duplicate feed card save logic
  // Feed cards are now saved via useMayaChat.onFinish hook (single save path)
  // This eliminates race conditions and duplicate saves

  // ============================================================================
  // STEP 1: DETECTION - Simple trigger detection (like concept cards)
  // ============================================================================
  // Monitors messages for [CREATE_FEED_STRATEGY: {...}] pattern
  // Sets pendingFeedRequest state when trigger found
  // Matches concept card detection pattern for consistency
  useEffect(() => {
    if (messages.length === 0) return
    if (isCreatingFeed) return
    if (pendingFeedRequest) return // Already have a pending request
    
    // CRITICAL: We can detect triggers during streaming, but only process after streaming completes
    // This allows us to show the loading spinner immediately when trigger is detected
    const lastAssistantMessage = messages
      .filter((m: any) => m.role === "assistant")
      .slice(-1)[0]

    if (!lastAssistantMessage) return

    const messageId = lastAssistantMessage.id
    
    // Use messageId if available, otherwise use content hash for tracking
    // This allows detection even during streaming before message has ID
    let messageKey: string
    if (messageId) {
      messageKey = messageId
    } else {
      // Generate hash from content for messages without ID yet
      let textContent = ""
      if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
        const textParts = lastAssistantMessage.parts.filter((p: any) => p && p.type === "text")
        textContent = textParts.map((p: any) => p.text || "").join("\n")
      } else if (typeof lastAssistantMessage.content === "string") {
        textContent = lastAssistantMessage.content
      }
      
      if (!textContent) return
      
      // Simple hash for tracking
      let hash = 0
      for (let i = 0; i < textContent.length; i++) {
        const char = textContent.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      messageKey = `streaming-${Math.abs(hash).toString(36)}`
    }

    // Skip if already processed
    if (processedFeedMessagesRef.current.has(messageKey)) {
      return
    }

    // Check if message already has feed card (prevent duplicate on page refresh)
    const alreadyHasFeedCard = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateFeed"
    )
    if (alreadyHasFeedCard) {
      processedFeedMessagesRef.current.add(messageKey)
      return
    }

    // Extract text content
    let textContent = ""
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      const textParts = lastAssistantMessage.parts.filter((p: any) => p && p.type === "text")
      textContent = textParts.map((p: any) => p.text || "").join("\n")
    } else if (typeof lastAssistantMessage.content === "string") {
      textContent = lastAssistantMessage.content
    } else {
      return
    }

    // Simple trigger detection (single pattern)
    const feedStrategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i)
    
    if (feedStrategyMatch) {
      const strategyJson = feedStrategyMatch[1]
      if (strategyJson) {
        console.log("[FEED] ✅ Detected feed trigger:", { messageKey, messageId: messageId || "no-id-yet", strategyLength: strategyJson.length })
        processedFeedMessagesRef.current.add(messageKey)
        // CRITICAL: Set loading state immediately (like concept cards)
        setIsCreatingFeed(true)
        setPendingFeedRequest({ strategyJson, messageId: messageId || messageKey })
      }
    }
  }, [messages, status, isCreatingFeed, pendingFeedRequest, setIsCreatingFeed])

  // ============================================================================
  // STEP 2: PROCESSING - Call API and create feed (like concept cards)
  // ============================================================================
  // Calls appropriate API endpoint (Classic or Pro Mode)
  // Validates strategy JSON
  // Calls handleCreateFeed() with validated strategy
  useEffect(() => {
    if (!pendingFeedRequest) return
    
    // CRITICAL: Don't process while actively streaming (like concept cards)
    // Wait for streaming to complete before processing
    if (status === "streaming" || status === "submitted") {
      console.log("[FEED] ⏳ Waiting for streaming to complete before processing - status is:", status)
      return
    }
    
    // If we get here, streaming is complete - safe to process
    // Note: isCreatingFeed is already set to true in detection step

    const processFeed = async () => {
      // Ensure isCreatingFeed is set (should already be set in detection, but double-check)
      if (!isCreatingFeed) {
        setIsCreatingFeed(true)
      }
      try {
        // Determine API endpoint based on mode
        const apiEndpoint = proMode 
          ? '/api/maya/pro/generate-feed'
          : '/api/maya/generate-feed'
        
        // Build request body based on mode
        const requestBody = proMode
          ? {
              strategyJson: pendingFeedRequest.strategyJson,
              chatId,
              imageLibrary, // Pro Mode specific
              conversationContext: undefined, // Can be added later if needed
            }
          : {
              strategyJson: pendingFeedRequest.strategyJson,
              chatId,
              conversationContext: undefined, // Can be added later if needed
            }
        
        console.log("[FEED] 📤 Calling generate-feed API:", {
          endpoint: apiEndpoint,
          proMode,
          hasImageLibrary: !!imageLibrary,
        })
        
        // Call API endpoint to validate and process strategy
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || 'Failed to process feed strategy')
        }

        const data = await response.json()
        if (!data.success || !data.strategy) {
          throw new Error('Invalid response from API')
        }

        const strategy = data.strategy as FeedStrategy
        console.log("[FEED] ✅ Strategy validated by API:", {
          title: strategy.feedTitle || strategy.title,
          postsCount: strategy.posts?.length || 0,
        })

        // Call handleCreateFeed with validated strategy
        await handleCreateFeed(strategy)
      } catch (error) {
        console.error("[FEED] ❌ Error processing feed:", error)
        // Reset state on error
        processedFeedMessagesRef.current.delete(pendingFeedRequest.messageId)
        setIsCreatingFeed(false)
      } finally {
        setPendingFeedRequest(null)
      }
    }

    processFeed()
  }, [pendingFeedRequest, isCreatingFeed, chatId, handleCreateFeed, proMode, imageLibrary, status])

  return (
    <>
      <div
        className="flex-1 min-h-0 flex flex-col"
        style={{
          paddingBottom: "calc(140px + env(safe-area-inset-bottom))", // Space for fixed bottom input + safe area
          paddingTop: "env(safe-area-inset-top)", // Safe area for notch/status bar
        }}
      >
        <MayaChatInterface
          messages={messages}
          filteredMessages={filteredMessages}
          setMessages={setMessages}
          proMode={proMode}
          isTyping={isTyping}
          isGeneratingConcepts={isGeneratingConcepts}
          isGeneratingPro={isGeneratingPro}
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
        />
        {/* Empty State - Feed Tab */}
        {isEmpty && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full px-3 sm:px-4 py-6 sm:py-8 animate-in fade-in duration-500">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-2 border-stone-200/60 overflow-hidden mb-3 sm:mb-4 md:mb-6">
              <img
                src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                alt="Maya"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.2em] sm:tracking-[0.3em] text-stone-950 uppercase mb-2 sm:mb-3 text-center px-4">
              Welcome
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 tracking-wide text-center mb-4 sm:mb-6 max-w-md leading-relaxed px-4">
              Hi, I&apos;m Maya. I&apos;ll help you create Instagram feeds, captions, and strategies.
            </p>
            {/* Feed-specific quick prompts */}
            <MayaQuickPrompts
              prompts={currentPrompts}
              onSelect={handleSendMessage}
              disabled={isTyping}
              variant="empty-state"
              proMode={proMode}
              isEmpty={isEmpty}
            />
          </div>
        )}
      </div>
    </>
  )
}

