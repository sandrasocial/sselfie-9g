"use client"

import type React from "react"
import { useEffect, useRef, useCallback } from "react"
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
 * **Features:**
 * - Feed strategy creation via [CREATE_FEED_STRATEGY] trigger (includes captions)
 * - Feed-specific quick prompts
 * - Empty state with feed-specific messaging
 * 
 * **Note:**
 * - Captions are included in the feed strategy JSON (no separate generation needed)
 * - Strategy document generation is available in Feed Planner (optional feature)
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
              messageIdToSave = lastAssistant.id
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

        // CRITICAL: Save feed card to styling_details column in database for persistence
        // This ensures feed cards survive page refreshes and component remounts
        if (messageIdToSave && chatId) {
          // Prepare feed card data for database storage
          const feedCardData = {
            strategy: strategy,
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
          }
          
          // Update message in database with feed card in styling_details column
          fetch('/api/maya/update-message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messageId: messageIdToSave,
              content: messageContentToSave || "", // Preserve existing content
              feedCards: [feedCardData], // Save to styling_details column
              append: false,
            }),
          })
            .then(async response => {
              if (response.ok) {
                console.log("[FEED] ✅ Saved feed card to styling_details column for persistence")
              } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                console.error("[FEED] ⚠️ Failed to save feed card to database:", {
                  status: response.status,
                  error: errorData.error,
                  details: errorData.details,
                  messageId: messageIdToSave,
                })
              }
            })
            .catch(error => {
              console.error("[FEED] ⚠️ Error saving feed card to database:", {
                error: error.message || String(error),
                messageId: messageIdToSave,
              })
              // Non-critical error - feed card will still work, just won't persist on refresh
            })
        } else {
          console.warn("[FEED] ⚠️ Cannot save feed card - missing messageId or chatId:", {
            messageId: messageIdToSave,
            chatId,
          })
        }

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

  // Detect feed triggers in messages
  useEffect(() => {
    console.log("[FEED] 🔍 Trigger detection useEffect fired:", {
      messagesCount: messages.length,
      status,
      isCreatingFeed,
    })
    
    // Allow processing when ready OR when messages change (to catch newly saved messages)
    if (messages.length === 0) return
    
    // 🔴 CRITICAL: Allow trigger detection DURING streaming to set loading state immediately
    // Only skip if we're already processing a feed (to prevent race conditions)
    // During streaming, we can detect partial triggers to show the loader early
    if (isCreatingFeed) {
      console.log("[FEED] ⏳ Skipping trigger detection - already creating feed")
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
    
    // Try multiple patterns to catch different JSON formats
    // Pattern 1: [CREATE_FEED_STRATEGY: {...}]
    let feedStrategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i)
    
    // Pattern 2: [CREATE_FEED_STRATEGY] followed by JSON block (```json or plain JSON)
    if (!feedStrategyMatch && textContent.includes("[CREATE_FEED_STRATEGY]")) {
      // Look for JSON after the trigger (could be in code block or plain)
      const jsonBlockMatch = textContent.match(/\[CREATE_FEED_STRATEGY\][\s\S]*?(```json\s*(\{[\s\S]*?\})\s*```|\{[\s\S]*?"feedStrategy"[\s\S]*?\})/i)
      if (jsonBlockMatch) {
        // Extract JSON from code block or plain format
        const jsonStr = jsonBlockMatch[2] || jsonBlockMatch[1]
        if (jsonStr) {
          feedStrategyMatch = [null, jsonStr] // Create match array in same format
        }
      }
    }
    
    // Pattern 3: Look for standalone JSON with "feedStrategy" key anywhere in text
    if (!feedStrategyMatch) {
      const standaloneJsonMatch = textContent.match(/\{\s*"feedStrategy"[\s\S]*?\}/i)
      if (standaloneJsonMatch) {
        feedStrategyMatch = [null, standaloneJsonMatch[0]]
      }
    }

    // Pattern 4: Check for partial trigger during streaming (just the trigger text, JSON might be incomplete)
    // This allows us to show the loader immediately when Maya starts creating a feed
    const hasPartialTrigger = textContent.includes("[CREATE_FEED_STRATEGY") || 
                             textContent.includes('"feedStrategy"') ||
                             textContent.includes("Aesthetic Choice:") ||
                             textContent.includes("Overall Vibe:") ||
                             textContent.includes("Grid Layout:")

    // If we detect a partial trigger during streaming, set loading state immediately
    // This ensures the loader shows right away, even before JSON is complete
    if (hasPartialTrigger && status === "streaming" && !isCreatingFeed) {
      console.log("[FEED] 🚀 Detected partial feed trigger during streaming - setting loading state immediately")
      setIsCreatingFeed(true)
      // Don't return - continue to check for complete trigger below
    }

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

      // Extract JSON from match array (handle both patterns)
      const strategyJson = Array.isArray(feedStrategyMatch) ? feedStrategyMatch[1] : feedStrategyMatch
      if (!strategyJson) {
        console.error("[FEED] ❌ No JSON found in feed strategy match")
        processedFeedMessagesRef.current.delete(messageKey)
        setIsCreatingFeed(false)
        return
      }
      
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
          const parsed = JSON.parse(strategyJson) as any
          
          // CRITICAL FIX: Maya might output JSON wrapped in "feedStrategy" object
          // Unwrap it if needed: { feedStrategy: { posts: [...] } } -> { posts: [...] }
          let strategy: FeedStrategy
          if (parsed.feedStrategy && typeof parsed.feedStrategy === 'object') {
            // Nested structure: unwrap it
            strategy = parsed.feedStrategy as FeedStrategy
            console.log("[FEED] 🔄 Unwrapped feedStrategy from nested structure")
          } else {
            // Direct structure: use as-is
            strategy = parsed as FeedStrategy
          }
          
          // CRITICAL: Log strategy structure for debugging
          console.log("[FEED] 📋 Parsed strategy structure:", {
            hasPosts: !!strategy.posts,
            postsCount: strategy.posts?.length || 0,
            firstPost: strategy.posts?.[0] ? {
              position: strategy.posts[0].position,
              hasVisualDirection: !!strategy.posts[0].visualDirection,
              hasPrompt: !!(strategy.posts[0] as any).prompt,
              hasCaption: !!strategy.posts[0].caption,
              postType: strategy.posts[0].postType,
            } : null,
            strategyKeys: Object.keys(strategy),
          })
          
          // handleCreateFeed will be called, which will eventually set isCreatingFeed(false) in its finally block
          await handleCreateFeed(strategy)
        } catch (error) {
          console.error("[FEED] ❌ Failed to parse strategy JSON:", error)
          console.error("[FEED] ❌ JSON that failed to parse:", strategyJson.substring(0, 500))
          processedFeedMessagesRef.current.delete(messageKey)
          // Reset loading state on error
          setIsCreatingFeed(false)
        }
      }

      processFeedCreation()
      return
    }
  }, [messages, status, isCreatingFeed, handleCreateFeed])

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
              Hi, I'm Maya. I'll help you create Instagram feeds, captions, and strategies.
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

