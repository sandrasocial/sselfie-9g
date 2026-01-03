"use client"

import type React from "react"
import { useEffect, useRef, useCallback } from "react"
import MayaChatInterface from "./maya-chat-interface"
import MayaQuickPrompts from "./maya-quick-prompts"
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
  status: "idle" | "streaming" | "submitted" | "ready" // Chat status from useChat hook
  isGeneratingConcepts: boolean
  isGeneratingStudioPro: boolean
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
  status,
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
  
  // Clear processed messages ref when chatId changes (new chat created)
  useEffect(() => {
    processedFeedMessagesRef.current.clear()
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
        setMessages((prevMessages: any[]) => {
          const updatedMessages = [...prevMessages]

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

              // Store strategy data in message part (not saved to DB yet)
              const updatedParts = [
                ...(lastAssistant.parts || []),
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
                    studioProMode,
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

              console.log("[FEED] ✅ Feed card part added to message:", {
                messageId: lastAssistant.id,
                partsCount: updatedParts.length,
                feedCardPart: updatedParts.find((p: any) => p.type === "tool-generateFeed"),
                hasStrategy: !!strategy,
                postsCount: strategy.posts?.length || 0,
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

        // Notify parent callback (for any additional state management)
        await onCreateFeed(strategy)
      } catch (error) {
        console.error("[FEED] ❌ Error storing feed strategy:", error)
        alert("Failed to create feed strategy. Please try again.")
      } finally {
        setIsCreatingFeed(false)
      }
    },
    [
      messages,
      setMessages,
      onCreateFeed,
      setIsCreatingFeed,
      studioProMode,
      styleStrength,
      promptAccuracy,
      aspectRatio,
      realismStrength,
    ]
  )

  const handleGenerateCaptions = useCallback(async () => {
    // Extract feedId from the latest feed card in messages
    let feedId: string | undefined
    
    // Find the most recent feed card in messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === "assistant" && msg.parts) {
        const feedCardPart = msg.parts.find((p: any) => p.type === "tool-generateFeed")
        if (feedCardPart?.output?.feedId) {
          feedId = String(feedCardPart.output.feedId)
          break
        }
      }
    }
    
    if (!feedId) {
      console.error("[FEED-CAPTIONS] ❌ No feed ID found in messages")
      alert("Please create a feed first before generating captions.")
      return
    }
    
    console.log("[FEED-CAPTIONS] Generating captions for feed:", feedId)
    const result = await generateCaptionsHandler(feedId)

    if (!result.success || !result.captions) {
      console.error("[FEED-CAPTIONS] Failed to generate captions:", result.error)
      alert(result.error || "Failed to generate captions. Please try again.")
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
  }, [messages, setMessages, onGenerateCaptions])

  const handleGenerateStrategy = useCallback(async () => {
    // Extract feedId from the latest feed card in messages
    let feedId: string | undefined
    
    // Find the most recent feed card in messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === "assistant" && msg.parts) {
        const feedCardPart = msg.parts.find((p: any) => p.type === "tool-generateFeed")
        if (feedCardPart?.output?.feedId) {
          feedId = String(feedCardPart.output.feedId)
          break
        }
      }
    }
    
    if (!feedId) {
      console.error("[FEED-STRATEGY] ❌ No feed ID found in messages")
      alert("Please create a feed first before generating strategy.")
      return
    }
    
    console.log("[FEED-STRATEGY] Generating strategy for feed:", feedId)
    const result = await generateStrategyHandler(feedId)

    if (!result.success || !result.strategy) {
      console.error("[FEED-STRATEGY] Failed to generate strategy:", result.error)
      alert(result.error || "Failed to generate strategy. Please try again.")
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
  }, [messages, setMessages, onGenerateStrategy])

  // Detect feed triggers in messages
  useEffect(() => {
    console.log("[FEED] 🔍 Trigger detection useEffect fired:", {
      messagesCount: messages.length,
      status,
      isCreatingFeed,
    })
    
    // Allow processing when ready OR when messages change (to catch newly saved messages)
    if (messages.length === 0) return
    
    // 🔴 CRITICAL: Don't process while actively streaming OR creating feed
    // Once status is NOT "streaming" or "submitted", the message is complete and safe to process
    // Also skip if isCreatingFeed is true to prevent race conditions
    if (status === "streaming" || status === "submitted" || isCreatingFeed) {
      console.log("[FEED] ⏳ Skipping trigger detection - status:", status, "isCreatingFeed:", isCreatingFeed)
      return
    }

    const lastAssistantMessage = messages
      .filter((m: any) => m.role === "assistant")
      .slice(-1)[0]

    if (!lastAssistantMessage) {
      console.log("[FEED] ⏸️ No assistant messages found")
      return
    }

    const messageId = lastAssistantMessage.id
    
    // Create a tracking key: use messageId if available, otherwise use content hash
    // This allows trigger detection even during streaming when messages don't have IDs yet
    let messageKey: string
    if (messageId) {
      messageKey = messageId
    } else {
      // Generate a key from message content for tracking during streaming
      // Extract text content first (simplified version for key generation)
      const textContentForKey = lastAssistantMessage.parts?.find((p: any) => p?.type === "text")?.text || lastAssistantMessage.content || ""
      if (!textContentForKey) {
        console.log("[FEED] ⏸️ Last assistant message has no ID and no content")
        return
      }
      // Use a hash of the content for collision-resistant key generation
      // Simple hash function: convert string to numeric hash, then to base36 string
      let hash = 0
      for (let i = 0; i < textContentForKey.length; i++) {
        const char = textContentForKey.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      const contentHash = Math.abs(hash).toString(36)
      messageKey = `streaming-${contentHash}`
    }

    // Skip if already processed (using messageKey instead of just messageId)
    if (processedFeedMessagesRef.current.has(messageKey)) {
      console.log("[FEED] ⏸️ Message already processed:", messageKey)
      return
    }

    // Extract text content from message
    let textContent = ""
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      const textParts = lastAssistantMessage.parts.filter((p: any) => p && p.type === "text")
      textContent = textParts.map((p: any) => p.text || "").join("\n")
      console.log("[FEED] 🔍 Checking message for trigger (from parts):", {
        messageId,
        textLength: textContent.length,
        hasCreateFeedTrigger: textContent.includes("[CREATE_FEED_STRATEGY"),
        textPreview: textContent.substring(0, 200),
      })
    } else if (typeof lastAssistantMessage.content === "string") {
      textContent = lastAssistantMessage.content
      console.log("[FEED] 🔍 Checking message for trigger (from content):", {
        messageKey: messageId || "streaming (no ID yet)",
        textLength: textContent.length,
        hasCreateFeedTrigger: textContent.includes("[CREATE_FEED_STRATEGY"),
        textPreview: textContent.substring(0, 200),
      })
    } else {
      console.log("[FEED] ⚠️ Message has no text content (parts or content):", {
        messageKey: messageId || "streaming (no ID yet)",
        hasParts: !!lastAssistantMessage.parts,
        hasContent: !!lastAssistantMessage.content,
      })
      return
    }

    // Check for [CREATE_FEED_STRATEGY] trigger
    // PRODUCTION DEBUG: Log what we're searching for
    console.log("[FEED] 🔍 PRODUCTION DEBUG - Checking for feed trigger:", {
      messageId: lastAssistantMessage?.id,
      textContentLength: textContent.length,
      textContentPreview: textContent.substring(0, 200),
      hasCreateFeedStrategy: textContent.includes("[CREATE_FEED_STRATEGY"),
      environment: typeof window !== 'undefined' ? window.location.hostname : 'server',
    })
    
    const feedStrategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i)

    if (feedStrategyMatch) {
      // CRITICAL: Check if message already has feed card FIRST (prevent duplicate creation on page refresh)
      // This is essential because on page reload, messages are loaded from DB and triggers are re-evaluated
      const alreadyHasFeedCard = lastAssistantMessage.parts?.some(
        (p: any) => p.type === "tool-generateFeed"
      )
      if (alreadyHasFeedCard) {
        console.log("[FEED] ⚠️ Message already has feed card, skipping trigger (likely from page refresh):", messageKey)
        processedFeedMessagesRef.current.add(messageKey)
        return
      }
      
      // Also check if feed marker exists in content (another indicator feed was already created)
      const hasFeedMarker = lastAssistantMessage.content?.includes('[FEED_CARD:')
      if (hasFeedMarker) {
        console.log("[FEED] ⚠️ Message already has feed marker, skipping trigger (likely from page refresh):", messageKey)
        processedFeedMessagesRef.current.add(messageKey)
        return
      }

      processedFeedMessagesRef.current.add(messageKey)

      const strategyJson = feedStrategyMatch[1]
      console.log("[FEED] ✅ Detected feed creation trigger:", {
        messageKey,
        messageId: messageId || "streaming (no ID yet)",
        strategyLength: strategyJson.length,
      })

      // CRITICAL: Set loading state IMMEDIATELY when trigger is detected
      // This shows the loading indicator right away, before parsing JSON
      setIsCreatingFeed(true)
      console.log("[FEED] 🚀 Setting isCreatingFeed=true - showing loading indicator")

      // Create async function to handle feed creation (useEffect callbacks can't be async)
      const processFeedCreation = async () => {
        try {
          const strategy = JSON.parse(strategyJson) as FeedStrategy
          // handleCreateFeed will be called, which will eventually set isCreatingFeed(false) in its finally block
          await handleCreateFeed(strategy)
        } catch (error) {
          console.error("[FEED] ❌ Failed to parse strategy JSON:", error)
          processedFeedMessagesRef.current.delete(messageKey)
          // Reset loading state on error
          setIsCreatingFeed(false)
        }
      }

      processFeedCreation()
      return
    }

    // Check for [GENERATE_CAPTIONS] trigger
    const generateCaptionsMatch = textContent.match(/\[GENERATE_CAPTIONS\]/i)
    if (generateCaptionsMatch) {
      console.log("[FEED-CAPTIONS] ✅ Detected caption generation trigger")
      handleGenerateCaptions()
      processedFeedMessagesRef.current.add(messageKey)
      return
    }

    // Check for [GENERATE_STRATEGY] trigger
    const generateStrategyMatch = textContent.match(/\[GENERATE_STRATEGY\]/i)
    if (generateStrategyMatch) {
      console.log("[FEED-STRATEGY] ✅ Detected strategy generation trigger")
      handleGenerateStrategy()
      processedFeedMessagesRef.current.add(messageKey)
      return
    }
  }, [messages, status, isCreatingFeed, handleCreateFeed, handleGenerateCaptions, handleGenerateStrategy])

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

