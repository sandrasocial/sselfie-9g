"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useMayaSettings } from "@/components/sselfie/maya/hooks/use-maya-settings"
import { useMayaChat } from "@/components/sselfie/maya/hooks/use-maya-chat"
import MayaChatInterface from "../sselfie/maya/maya-chat-interface"
import MayaUnifiedInput from "../sselfie/maya/maya-unified-input"
import StrategyPreview from "./strategy-preview"
import FeedWelcomeScreen from "./feed-welcome-screen"
import MayaQuickPrompts from "../sselfie/maya/maya-quick-prompts"
import { toast } from "@/hooks/use-toast"
import useSWR, { mutate } from "swr"
import UnifiedLoading from "../sselfie/unified-loading"
import InstagramFeedView from "./instagram-feed-view"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function FeedPlannerScreen() {
  const [step, setStep] = useState<"request" | "view">("request")
  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false)
  const [currentFeedId, setCurrentFeedId] = useState<number | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  
  // Use Maya settings hook - unified settings across app
  const { settings } = useMayaSettings()
  
  // Fetch user data for useMayaChat hook
  const { data: userData } = useSWR("/api/user", fetcher)
  
  // Memoize user object to prevent infinite re-renders (user object reference changes on every SWR update)
  const user = useMemo(() => userData?.user || null, [userData?.user?.id, userData?.user?.email])
  
  // Memoize getModeString to prevent infinite re-renders
  const getModeString = useCallback(() => 'maya', [])
  
  // Integrate useMayaChat hook for conversational strategy creation
  const {
    messages,
    sendMessage,
    status,
    setMessages,
    chatId,
    isLoadingChat,
  } = useMayaChat({
    studioProMode: false, // Feed Planner always uses Classic Mode
    user: user,
    getModeString: getModeString, // Use 'maya' chat type for Feed Planner
  })
  
  // Refs for tracking processed messages (prevent duplicate trigger processing)
  const processedStrategyMessagesRef = useRef<Set<string>>(new Set())
  
  // Strategy preview state (shown when trigger is detected)
  const [strategyPreview, setStrategyPreview] = useState<any>(null)
  
  // Refs for MayaChatInterface (needed for scroll handling)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isAtBottomRef = useRef(true)
  
  // Scroll handler for MayaChatInterface
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])
  
  // Handle scroll events for messages container (to show/hide scroll button)
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return
    
    const container = messagesContainerRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight
    
    // Check if user is within 100px of bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    
    // Update refs and state
    isAtBottomRef.current = isNearBottom
    setShowScrollButton(!isNearBottom && scrollHeight > clientHeight)
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    
    container.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])
  
  // Helper function to extract text content from UIMessage (same pattern as Maya chat screen)
  const getMessageText = useCallback((message: any): string => {
    // UIMessage uses parts array, not content property
    if (message.parts && Array.isArray(message.parts)) {
      return message.parts
        .filter((p: any) => p && p.type === "text" && p.text)
        .map((p: any) => p.text)
        .join("") || ""
    }
    // Fallback for legacy format (content property)
    if (typeof message.content === "string") {
      return message.content
    }
    return ""
  }, [])

  const { data: brandData, isLoading: brandLoading } = useSWR("/api/profile/personal-brand", fetcher)
  const { data: feedStatus, error: feedStatusError } = useSWR("/api/feed-planner/status", fetcher)

  // Auto-refresh feed data every 5 seconds when viewing feed to show real-time progress
  const { data: feedData, error: feedError } = useSWR(
    currentFeedId ? `/api/feed/${currentFeedId}` : null,
    fetcher,
    currentFeedId && step === "view"
      ? {
          refreshInterval: 3000, // Poll every 3 seconds for faster updates
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
          onError: (error) => {
            console.error("[v0] Feed data fetch error:", error)
          },
        }
      : {},
  )

  // Handle feed creation (called when user approves strategy preview)
  const handleCreateFeed = useCallback(async (strategyData?: any) => {
    // Use strategyData parameter if provided, otherwise use strategyPreview state
    const dataToUse = strategyData || strategyPreview
    if (!dataToUse) {
      console.error("[FeedPlanner] handleCreateFeed called but no strategy data available")
      return
    }

    console.log("[FeedPlanner] handleCreateFeed called with:", dataToUse)

    setIsCreatingStrategy(true)

    try {
      // Get current settings from Maya settings hook with validation
      // Default to safe values if settings haven't loaded yet
      const customSettings = {
        styleStrength: settings?.styleStrength ?? 1.0,
        promptAccuracy: settings?.promptAccuracy ?? 3.5,
        aspectRatio: settings?.aspectRatio ?? '4:5',
        realismStrength: settings?.realismStrength ?? 0.2,
        extraLoraScale: settings?.realismStrength ?? 0.2, // Map realismStrength to extraLoraScale
      }

      // Extract userRequest from strategy data
      const requestText = dataToUse.userRequest || "Feed strategy"

      const response = await fetch("/api/feed-planner/create-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          request: requestText,
          customSettings, // Pass settings to API
          strategyData: dataToUse, // Pass the full strategy data for potential use
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create strategy")
      }

      const data = await response.json()
      console.log("[v0] Strategy creation response:", data)
      
      if (!data.feedLayoutId) {
        console.error("[v0] No feedLayoutId in response:", data)
        throw new Error("Failed to create feed strategy - no feed ID returned")
      }

      console.log("[v0] Setting currentFeedId to:", data.feedLayoutId)
      setCurrentFeedId(data.feedLayoutId)
      setStep("view")

      // Wait a moment for database to be ready, then fetch feed data
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      await mutate("/api/feed-planner/status")
      await mutate(`/api/feed/${data.feedLayoutId}`)
      
      console.log("[v0] Feed data should now be loading for ID:", data.feedLayoutId)

      toast({
        title: "Feed strategy created!",
        description: "Your 9 images are being generated automatically. This takes about 5-10 minutes.",
      })
    } catch (error) {
      console.error("Error creating strategy:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create feed strategy"
      
      // Provide more helpful error messages
      let userFriendlyMessage = errorMessage
      if (errorMessage.includes("credits")) {
        userFriendlyMessage = "You don't have enough credits. Please purchase more credits to continue."
      } else if (errorMessage.includes("personal brand")) {
        userFriendlyMessage = "Please complete your personal brand profile first in Settings."
      } else if (errorMessage.includes("trained model")) {
        userFriendlyMessage = "You need to train your model first. Go to Training to get started."
      }
      
      toast({
        title: "Failed to create feed",
        description: userFriendlyMessage,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsCreatingStrategy(false)
      setStrategyPreview(null) // Clear preview after creation
    }
  }, [settings, strategyPreview, toast])

  // Detect [CREATE_FEED_STRATEGY] trigger in messages (same pattern as Maya chat screen)
  useEffect(() => {
    // Allow processing when ready OR when messages change (to catch newly saved messages)
    if (messages.length === 0) return
    // 🔴 CRITICAL: Don't process while actively streaming - this is the main check
    // Once status is NOT "streaming" or "submitted", the message is complete and safe to process
    if (status === "streaming" || status === "submitted") {
      console.log("[FeedPlanner] ⏳ Skipping trigger detection - status is:", status)
      return
    }
    
    // If we get here, streaming is complete - safe to process triggers

    // Find the last assistant message
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
    if (!lastAssistantMessage) return

    const messageId = lastAssistantMessage.id?.toString() || `msg-${Date.now()}`
    
    // Check if we've already processed this message (prevent infinite loops)
    if (processedStrategyMessagesRef.current.has(messageId)) {
      return
    }
    
    const textContent = getMessageText(lastAssistantMessage)

    console.log("[FeedPlanner] Checking message for triggers:", {
      messageId,
      hasContent: !!textContent,
      textContentLength: textContent.length,
      textContentPreview: textContent.substring(0, 200),
      status,
    })

    // Check for [CREATE_FEED_STRATEGY] trigger
    // Use brace-counting to extract nested JSON properly (handles posts array with objects)
    const triggerMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{)/i)
    
    if (triggerMatch && !isCreatingStrategy) {
      const jsonStartIndex = triggerMatch.index! + triggerMatch[0].length - 1 // Index of opening brace
      
      // Find matching closing brace by counting nested braces
      let braceCount = 0
      let jsonEndIndex = jsonStartIndex
      
      for (let i = jsonStartIndex; i < textContent.length; i++) {
        if (textContent[i] === '{') {
          braceCount++
        } else if (textContent[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            jsonEndIndex = i + 1 // Include the closing brace
            break
          }
        }
      }
      
      if (braceCount !== 0) {
        console.error("[FeedPlanner] ❌ Could not find matching closing brace for JSON")
        return
      }
      
      const strategyJsonString = textContent.substring(jsonStartIndex, jsonEndIndex).trim()
      
      if (!strategyJsonString || !strategyJsonString.startsWith('{')) {
        console.error("[FeedPlanner] ❌ Trigger found but no valid JSON data")
        return
      }
      
      try {
        const strategyData = JSON.parse(strategyJsonString)
        
        // CRITICAL: Validate strategy structure before setting state
        // StrategyPreview component will crash if posts array is missing or invalid
        if (!strategyData || typeof strategyData !== 'object') {
          console.error("[FeedPlanner] ❌ Invalid strategy data: not an object")
          toast({
            title: "Invalid strategy format",
            description: "Maya's strategy response has invalid format. Please try again.",
            variant: "destructive",
          })
          return
        }
        
        if (!Array.isArray(strategyData.posts) || strategyData.posts.length !== 9) {
          console.error("[FeedPlanner] ❌ Invalid strategy data: posts array missing or incorrect length", {
            hasPosts: !!strategyData.posts,
            postsType: typeof strategyData.posts,
            postsLength: strategyData.posts?.length || 0,
          })
          toast({
            title: "Invalid strategy format",
            description: "Strategy must contain exactly 9 posts. Please try again.",
            variant: "destructive",
          })
          return
        }
        
        // Validate each post has required fields
        const invalidPosts = strategyData.posts.filter((post: any, index: number) => {
          if (!post || typeof post !== 'object') return true
          if (typeof post.position !== 'number' || post.position < 1 || post.position > 9) return true
          if (!post.type && !post.postType) return true
          return false
        })
        
        if (invalidPosts.length > 0) {
          console.error("[FeedPlanner] ❌ Invalid strategy data: some posts are missing required fields", {
            invalidCount: invalidPosts.length,
          })
          toast({
            title: "Invalid strategy format",
            description: "Some posts in the strategy are missing required fields. Please try again.",
            variant: "destructive",
          })
          return
        }
        
        console.log("[FeedPlanner] ✅ Detected feed strategy generation trigger:", {
          messageId,
          strategyPreview: {
            postCount: strategyData.posts.length,
            totalCredits: strategyData.totalCredits,
          },
        })
        
        // Mark as processed to prevent duplicate processing
        processedStrategyMessagesRef.current.add(messageId)
        
        // Set strategy preview instead of directly creating (user must approve)
        console.log("[FeedPlanner] Setting strategy preview for user approval")
        setStrategyPreview(strategyData)
      } catch (error) {
        console.error("[FeedPlanner] ❌ Error parsing strategy JSON:", error)
        toast({
          title: "Failed to parse strategy",
          description: "Maya's strategy response had invalid format. Please try again.",
          variant: "destructive",
        })
      }
    }
  }, [messages, status, isCreatingStrategy, getMessageText, toast])

  useEffect(() => {
    // If feedStatus is undefined and no error, still loading - keep checking status
    if (feedStatus === undefined && !feedStatusError) {
      return // Keep isCheckingStatus as true (default)
    }

    // feedStatus is loaded (not undefined) OR there's an error - process it
    // CRITICAL: Always process feedStatus changes (e.g., after deletion) - don't early return
    // The dependency array ensures this only runs when feedStatus actually changes
    if (feedStatus?.hasStrategy && feedStatus?.feedStrategy) {
      console.log("[v0] Found existing feed strategy:", feedStatus.feedStrategy.id)
      setCurrentFeedId(feedStatus.feedStrategy.id)
      setStep("view")
      setShowWelcome(false) // Don't show welcome if feed exists
      setIsCheckingStatus(false)
    } else {
      // No strategy exists OR error occurred - show welcome screen (or conversation if dismissed)
      console.log("[v0] No existing feed strategy, showing welcome/conversation UI", feedStatusError ? "(error occurred)" : "")
      setCurrentFeedId(null) // Ensure it's null
      setStrategyPreview(null) // Ensure preview is cleared
      setStep("request") // Ensure step is request
      // Keep showWelcome state as-is (user might have dismissed it already)
      setIsCheckingStatus(false)
    }
  }, [feedStatus, feedStatusError])


  const handleDeleteStrategy = async () => {
    if (!confirm("Are you sure you want to delete your current feed strategy? This cannot be undone.")) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch("/api/feed-planner/delete-strategy", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to delete strategy")
      }

      // Reset all state for fresh start
      setCurrentFeedId(null)
      setStep("request")
      setStrategyPreview(null) // Clear any strategy preview
      setShowWelcome(true) // Reset to welcome screen
      
      // Clear chat messages to start fresh conversation
      setMessages([])
      
      // Refresh status to ensure UI updates
      await mutate("/api/feed-planner/status")

      toast({
        title: "Strategy deleted",
        description: "You can now create a new feed strategy",
      })
    } catch (error) {
      console.error("[v0] Delete error:", error)
      toast({
        title: "Delete failed",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // State management for view transitions (must be defined before return)
  // Welcome screen shows first, then conversation, then preview, then feed
  const showWelcomeScreen = showWelcome && !currentFeedId && !strategyPreview
  const showConversation = !showWelcome && step === 'request' && !strategyPreview && !currentFeedId
  const showPreview = strategyPreview && step === 'request' && !currentFeedId
  const showFeed = currentFeedId && step === 'view'

  // Debug logging
  useEffect(() => {
    console.log("[FeedPlanner] View conditions:", {
      step,
      strategyPreview: !!strategyPreview,
      currentFeedId,
      showWelcome,
      showWelcomeScreen,
      showConversation,
      showPreview,
      showFeed,
      isCheckingStatus,
      brandLoading,
      user: !!user,
    })
  }, [step, strategyPreview, currentFeedId, showWelcome, showWelcomeScreen, showConversation, showPreview, showFeed, isCheckingStatus, brandLoading, user])

  if (isCheckingStatus || brandLoading) {
    return <UnifiedLoading message="Loading feed planner..." />
  }

  // Wait for user to load before showing conversational UI
  if (!user && !userData) {
    return <UnifiedLoading message="Loading..." />
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Title Section - Match Gallery style (sselfie-app.tsx provides the unified header) - Hide on welcome screen */}
      {!showWelcomeScreen && (
        <div className="pt-6 pb-4 px-3 sm:px-4 md:px-6">
          <h1
            style={{
              fontFamily: 'Hatton, Georgia, serif',
              fontSize: '28px',
              fontWeight: 300,
              letterSpacing: '0.3em',
              color: '#1C1917',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            FEED PLANNER
          </h1>
        </div>
      )}

      {/* Welcome Screen */}
      {showWelcomeScreen && (
        <FeedWelcomeScreen onStart={() => setShowWelcome(false)} />
      )}

      {/* Conversation View */}
      {showConversation && (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto pr-1 scroll-smooth min-h-0"
            style={{ paddingBottom: '140px' }}
          >
            {/* Show starter prompts when conversation is empty */}
            {messages.length === 0 && (
              <div className="px-4 sm:px-6 pt-6 pb-4">
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Welcome message from Maya */}
                  <div className="flex gap-4 items-start bg-white/50 backdrop-blur-xl border border-white/70 rounded-2xl p-4 shadow-lg shadow-stone-950/5">
                    <div className="flex-shrink-0 w-10 h-10 bg-stone-950 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">M</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-950 mb-2">Hi! I'm Maya 👋</p>
                      <p className="text-sm text-stone-700 leading-relaxed">
                        I'll help you create a strategic 9-post Instagram feed that tells your story and drives growth. 
                        Let's start by understanding your goals!
                      </p>
                    </div>
                  </div>
                  
                  {/* Starter prompts */}
                  <div className="space-y-3">
                    <p className="text-xs text-stone-500 font-medium tracking-wide uppercase text-center">
                      Get Started
                    </p>
                    <MayaQuickPrompts
                      prompts={[
                        {
                          label: "Create a feed for my business",
                          prompt: "I want to create an Instagram feed for my business. Can you help me plan a strategic 9-post grid?"
                        },
                        {
                          label: "Plan my content strategy",
                          prompt: "I need help planning my Instagram content strategy. What should I post about?"
                        },
                        {
                          label: "Design a cohesive feed",
                          prompt: "I want to design a cohesive Instagram feed that looks professional and tells my brand story."
                        },
                        {
                          label: "Mix of content types",
                          prompt: "I want a mix of different content types in my feed - portraits, quotes, and lifestyle shots. Can you help me plan this?"
                        }
                      ]}
                      onSelect={(prompt) => sendMessage({ content: prompt })}
                      disabled={status === 'streaming' || isCreatingStrategy}
                      variant="empty-state"
                      studioProMode={false}
                      isEmpty={true}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <MayaChatInterface
              messages={messages}
              filteredMessages={messages}
              setMessages={setMessages}
              studioProMode={false}
              isTyping={status === 'streaming'}
              isGeneratingConcepts={false}
              isGeneratingStudioPro={false}
              contentFilter="all"
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              showScrollButton={showScrollButton}
              isAtBottomRef={isAtBottomRef}
              scrollToBottom={scrollToBottom}
              chatId={chatId}
              uploadedImages={[]}
              setCreditBalance={() => {}}
              isAdmin={false}
              selectedGuideId={null}
              selectedGuideCategory={null}
              onSaveToGuide={() => {}}
              userId={user?.id}
              user={user}
              promptSuggestions={[]}
              generateCarouselRef={{ current: null }}
            />
            <div ref={messagesEndRef} />
          </div>

          <div 
            className="border-t border-stone-200 bg-white/60 backdrop-blur-md fixed left-0 right-0 z-[65] safe-bottom flex flex-col"
            style={{
              bottom: '80px', // Position above bottom navigation (nav is ~70px tall)
              paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
            }}
          >
            <div className="px-3 sm:px-4 py-2.5 sm:py-3">
              <MayaUnifiedInput
                onSend={(message) => sendMessage({ content: message })}
                disabled={status === 'streaming' || isCreatingStrategy}
                placeholder="Tell Maya about your Instagram feed..."
                studioProMode={false}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Strategy Preview View */}
      {showPreview && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Show conversation history above preview */}
          <div className="p-6 space-y-4">
            <MayaChatInterface
              messages={messages}
              filteredMessages={messages}
              setMessages={setMessages}
              studioProMode={false}
              isTyping={false}
              isGeneratingConcepts={false}
              isGeneratingStudioPro={false}
              contentFilter="all"
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              showScrollButton={false}
              isAtBottomRef={isAtBottomRef}
              scrollToBottom={scrollToBottom}
              chatId={chatId}
              uploadedImages={[]}
              setCreditBalance={() => {}}
              isAdmin={false}
              selectedGuideId={null}
              selectedGuideCategory={null}
              onSaveToGuide={() => {}}
              userId={user?.id}
              user={user}
              promptSuggestions={[]}
              generateCarouselRef={{ current: null }}
            />
          </div>

          {/* Strategy Preview */}
          <div className="px-4 sm:px-6 pb-6">
            <StrategyPreview
              strategy={strategyPreview}
              onApprove={() => handleCreateFeed()}
              onAdjust={() => {
                // Continue conversation to adjust
                setStrategyPreview(null)
                sendMessage({ content: "Can we adjust the strategy?" })
              }}
            />
          </div>
        </div>
      )}

      {/* Feed View (reuse existing) */}
      {showFeed && (
        <div className="space-y-4 sm:space-y-6">
          {feedError ? (
            <div className="flex items-center justify-center min-h-[400px] p-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-stone-600">Failed to load feed. Please try again.</p>
                <button
                  onClick={() => {
                    setStep("request")
                    setCurrentFeedId(null)
                  }}
                  className="text-sm text-stone-500 hover:text-stone-900 underline"
                >
                  Go back
                </button>
              </div>
            </div>
          ) : !feedData ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <UnifiedLoading message="Loading your feed..." />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 sm:px-0">
                <button
                  onClick={() => {
                    setStep("request")
                    setCurrentFeedId(null)
                  }}
                  className="text-sm font-light text-stone-500 hover:text-stone-900 transition-colors"
                >
                  ← Back to Request
                </button>

                <button
                  onClick={handleDeleteStrategy}
                  disabled={isDeleting}
                  className="text-sm font-light text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Delete Strategy"}
                </button>
              </div>

              <InstagramFeedView
                feedId={currentFeedId!}
                onBack={() => {
                  setStep("request")
                  setCurrentFeedId(null)
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Fallback: If no view is active, show conversation (default state) */}
      {!showConversation && !showPreview && !showFeed && (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto pr-1 scroll-smooth min-h-0"
            style={{ paddingBottom: '140px' }}
          >
            <MayaChatInterface
              messages={messages}
              filteredMessages={messages}
              setMessages={setMessages}
              studioProMode={false}
              isTyping={status === 'streaming'}
              isGeneratingConcepts={false}
              isGeneratingStudioPro={false}
              contentFilter="all"
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              showScrollButton={showScrollButton}
              isAtBottomRef={isAtBottomRef}
              scrollToBottom={scrollToBottom}
              chatId={chatId}
              uploadedImages={[]}
              setCreditBalance={() => {}}
              isAdmin={false}
              selectedGuideId={null}
              selectedGuideCategory={null}
              onSaveToGuide={() => {}}
              userId={user?.id}
              user={user}
              promptSuggestions={[]}
              generateCarouselRef={{ current: null }}
            />
            <div ref={messagesEndRef} />
          </div>
          
          <div 
            className="border-t border-stone-200 bg-white/60 backdrop-blur-md fixed left-0 right-0 z-[65] safe-bottom flex flex-col"
            style={{
              bottom: '80px', // Position above bottom navigation (nav is ~70px tall)
              paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
            }}
          >
            <div className="px-3 sm:px-4 py-2.5 sm:py-3">
              <MayaUnifiedInput
                onSend={(message) => sendMessage({ content: message })}
                disabled={status === 'streaming' || isCreatingStrategy}
                placeholder="Tell Maya about your Instagram feed..."
                studioProMode={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
