/**
 * useMayaChat Hook
 * 
 * Manages Maya chat state and operations:
 * - Chat ID and title
 * - Chat loading state
 * - Chat history checking (hasUsedMayaBefore)
 * - Chat loading logic (loadChat)
 * - Chat persistence (localStorage)
 * - Chat operations (new, select, delete)
 * 
 * Note: This hook integrates with useChat from AI SDK, which must be called separately
 * in the component for message management.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const CHAT_ID_STORAGE_KEY_PREFIX = "mayaCurrentChatId"

/**
 * Get localStorage key for chat ID based on chat type
 */
function getChatIdStorageKey(chatType: string): string {
  return `${CHAT_ID_STORAGE_KEY_PREFIX}_${chatType}`
}

export interface UseMayaChatProps {
  initialChatId?: number
  proMode: boolean
  user: any | null
  getModeString: () => "pro" | "maya" | "feed-planner"
  activeTab?: string // Feed tab flag
}

export interface UseMayaChatReturn {
  // Chat state
  chatId: number | null
  chatTitle: string
  isLoadingChat: boolean
  hasUsedMayaBefore: boolean

  // Chat operations
  loadChat: (specificChatId?: number, explicitChatType?: string) => Promise<void>
  handleNewChat: () => Promise<void>
  handleSelectChat: (selectedChatId: number, selectedChatTitle?: string) => Promise<void>
  handleDeleteChat: (deletedChatId: number) => void

  // Setters (exposed for flexibility)
  setChatId: (id: number | null) => void
  setChatTitle: (title: string) => void
  setIsLoadingChat: (loading: boolean) => void

  // Refs (exposed for component use)
  savedMessageIds: React.MutableRefObject<Set<string>>
  hasLoadedChatRef: React.MutableRefObject<boolean>

  // useChat integration (from AI SDK)
  messages: any[]
  sendMessage: any
  status: any
  setMessages: any
}

/**
 * Load chat ID from localStorage (chat-type-specific)
 */
function loadChatIdFromStorage(chatType: string): number | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const storageKey = getChatIdStorageKey(chatType)
    const saved = localStorage.getItem(storageKey)
    return saved ? Number.parseInt(saved, 10) : null
  } catch (error) {
    console.error("[useMayaChat] ❌ Error loading chatId from localStorage:", error)
    return null
  }
}

/**
 * Save chat ID to localStorage (chat-type-specific)
 */
function saveChatIdToStorage(chatId: number | null, chatType: string) {
  if (typeof window === "undefined") {
    return
  }

  try {
    const storageKey = getChatIdStorageKey(chatType)
    if (chatId) {
      localStorage.setItem(storageKey, chatId.toString())
      console.log("[useMayaChat] 💾 Saved chatId to localStorage:", { chatId, chatType, storageKey })
    } else {
      localStorage.removeItem(storageKey)
    }
  } catch (error) {
    console.error("[useMayaChat] ❌ Error saving chatId to localStorage:", error)
  }
}

export function useMayaChat({
  initialChatId,
  proMode,
  user,
  getModeString,
  activeTab,
}: UseMayaChatProps): UseMayaChatReturn {
  // Chat state
  const [chatId, setChatId] = useState<number | null>(initialChatId || null)
  const [chatTitle, setChatTitle] = useState<string>("Chat with Maya")
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [hasUsedMayaBefore, setHasUsedMayaBefore] = useState<boolean>(false)

  // Refs for tracking state
  const hasLoadedChatRef = useRef(false)
  const savedMessageIds = useRef(new Set<string>())
  const lastModeRef = useRef<string | null>(null)
  const hasClearedStateRef = useRef(false)
  // CRITICAL FIX: Track saved feed cards to prevent duplicate saves
  const savedFeedCardMessagesRef = useRef(new Set<string>())
  // CRITICAL FIX: Track history checks to prevent infinite loops
  const checkedHistoryForChatTypeRef = useRef<string | null>(null)
  const isCheckingHistoryRef = useRef(false)
  // CRITICAL FIX: Track loading start time for timeout detection
  const loadingStartTimeRef = useRef<number | null>(null)
  // CRITICAL FIX: Store pending messages to set after useChat resets
  const pendingMessagesRef = useRef<any[] | null>(null)

  // Helper function to get the correct chatType based on activeTab
  // Feed tab uses "feed-planner", otherwise use getModeString() result
  const getChatType = useCallback((): string => {
    if (activeTab === "feed") {
      return "feed-planner"
    }
    return getModeString()
  }, [activeTab, getModeString])

  // Integrate useChat from AI SDK
  // NOTE: Headers are evaluated once when transport is created, so we use useMemo to recreate transport when dependencies change
  // This ensures headers reflect the current activeTab and proMode
  const currentChatType = getChatType()
  const chatTransport = useMemo(() => {
    const headers = {
      "x-studio-pro-mode": proMode ? "true" : "false",
      "x-chat-type": currentChatType,
      ...(activeTab ? { "x-active-tab": activeTab } : {}),
    }
    console.log("[useMayaChat] 🚀 Creating chat transport with headers:", {
      headers,
      activeTab,
      proMode,
      currentChatType,
      // PRODUCTION DEBUG: Confirm headers are being set
      hasActiveTabHeader: !!headers["x-active-tab"],
      environment: process.env.NODE_ENV,
    })
    return new DefaultChatTransport({
      api: "/api/maya/chat",
      headers,
    }) as any
  }, [proMode, currentChatType, activeTab])

  // Create a unique ID for the chat session to force useChat to reset when chatId changes
  // This ensures that when a new chat is created, all previous messages are cleared
  // NOTE: We DON'T include currentChatType here because each tab stores its own chatId
  // Including chatType causes useChat to reset on tab switch, which clears messages
  const chatSessionId = useMemo(() => {
    return `maya-chat-${chatId || 'new'}`
  }, [chatId])

  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatSessionId, // Force reset when chatId or chatType changes
    transport: chatTransport,
    onFinish: ({ message, messages: currentMessages }) => {
      // CRITICAL FIX (Bug 1): Use currentMessages from SDK callback instead of closure variable
      // The SDK provides the up-to-date messages array, closure variable may be stale
      console.log("[useMayaChat] 🔍 AI SDK onFinish called:", {
        messageId: message.id,
        role: message.role,
        hasContent: !!(message as any).content,
        hasParts: !!message.parts,
        partsCount: message.parts?.length || 0,
        partsTypes: message.parts?.map((p: any) => p.type) || [],
        currentMessagesCount: currentMessages.length, // Use SDK-provided messages
      })
      
      // CRITICAL FIX: Save assistant message to database when streaming finishes
      // This ensures messages exist in DB before feed cards try to update them
      if (message.role === "assistant" && chatId) {
        // Extract text content from message
        let textContent = ""
        const messageAny = message as any
        if (messageAny.content && typeof messageAny.content === "string") {
          textContent = messageAny.content
        } else if (message.parts && Array.isArray(message.parts)) {
          const textParts = message.parts.filter((p: any) => p && p.type === "text")
          textContent = textParts.map((p: any) => p.text || "").join(" ")
        }
        
        // Extract feed cards from parts if they exist
        let feedCards: any[] | undefined = undefined
        if (message.parts && Array.isArray(message.parts)) {
          const feedCardParts = message.parts.filter((p: any) => p && p.type === "tool-generateFeed" && p.output)
          if (feedCardParts.length > 0) {
            feedCards = feedCardParts.map((p: any) => p.output)
            console.log("[useMayaChat] 💾 Found feed cards in message parts, will save with message:", feedCards.length)
          }
        }
        
        // CRITICAL FIX: Prevent duplicate saves - check if we've already saved this message
        const messageKey = message.id ? `feed-${message.id}` : `feed-temp-${Date.now()}`
        if (savedFeedCardMessagesRef.current.has(messageKey)) {
          console.log("[useMayaChat] ⚠️ Message already saved, skipping duplicate save:", messageKey)
          return
        }
        
        // Mark as saved BEFORE async operation to prevent race conditions
        savedFeedCardMessagesRef.current.add(messageKey)
        
        // Save message to database (non-blocking)
        fetch('/api/maya/save-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            chatId: chatId,
            role: 'assistant',
            content: textContent,
            feedCards: feedCards, // Include feed cards if they exist
          }),
        })
          .then(async (response) => {
            if (response.ok) {
              const result = await response.json()
              console.log("[useMayaChat] ✅ Saved assistant message to database:", {
                messageId: result.message?.id,
                hasFeedCards: !!feedCards,
                feedCardsCount: feedCards?.length || 0,
              })
              // Update messageKey with real ID if we got one
              if (result.message?.id && messageKey.startsWith('feed-temp-')) {
                savedFeedCardMessagesRef.current.delete(messageKey)
                savedFeedCardMessagesRef.current.add(`feed-${result.message.id}`)
              }
            } else {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
              console.error("[useMayaChat] ⚠️ Failed to save assistant message:", response.status, errorData)
              // Remove from saved set so we can retry
              savedFeedCardMessagesRef.current.delete(messageKey)
            }
          })
          .catch((error) => {
            console.error("[useMayaChat] ⚠️ Error saving assistant message:", error.message || String(error))
            // Remove from saved set so we can retry
            savedFeedCardMessagesRef.current.delete(messageKey)
            // Non-critical - message will still work in UI, just won't persist
          })
      }
      
      // Check if feed cards are still in messages after finish
      // CRITICAL: Use currentMessages from SDK callback, not closure variable
      const feedCardMessages = currentMessages.filter((m: any) => 
        m.role === "assistant" && m.parts?.some((p: any) => p.type === "tool-generateFeed")
      )
      console.log("[useMayaChat] 🔍 Feed cards after onFinish:", {
        messagesWithFeedCards: feedCardMessages.length,
        feedCardMessageIds: feedCardMessages.map((m: any) => m.id),
      })
    },
    onError: (error) => {
      // Simplified error handling - just extract message safely
      let errorMessage = "An error occurred while chatting with Maya. Please try again."

      // Minimal, safe error extraction
      if (error instanceof Error && error.message) {
        errorMessage = error.message
      } else if (typeof error === "string" && error) {
        errorMessage = error
      } else if (error && typeof error === "object") {
        const err = error as any
        if (err.message && typeof err.message === "string") {
          errorMessage = err.message
        } else if (err.error && typeof err.error === "string") {
          errorMessage = err.error
        }
      }

      // Minimal logging - avoid complex serialization that causes issues
      try {
        if (error instanceof Error) {
          console.error("[useMayaChat] Maya chat error:", errorMessage, error.stack ? "\nStack: " + error.stack.substring(0, 200) : "")
        } else {
          console.error("[useMayaChat] Maya chat error:", errorMessage)
        }
      } catch {
        // Silently fail if logging causes issues
      }
    },
  })

  // Ref to track retry state and prevent infinite recursion
  const loadChatRetryRef = useRef(false)

  // Load chat function
  const loadChat = useCallback(
    async (specificChatId?: number, explicitChatType?: string): Promise<void> => {
      try {
        // CRITICAL FIX: Set loading state BEFORE any state changes
        // This ensures isEmpty check in UI sees isLoadingChat=true
        setIsLoadingChat(true)
        
        // CRITICAL FIX: Don't clear messages immediately - preserve them until new ones arrive
        // This prevents welcome screen from showing during load
        // Messages will be replaced when new ones arrive from API

        // Build URL - either load specific chat or default maya chat
        // Use explicitChatType if provided, otherwise use getChatType() to correctly handle Feed tab (feed-planner) vs Photos tab (maya/pro)
        // CRITICAL: Use explicitChatType to avoid closure issues when activeTab changes
        // CRITICAL: Always include chatType in URL, even when loading specific chatId
        // This ensures the load-chat route knows which tab we're in and filters correctly
        const chatType = explicitChatType || getChatType()
        const url = specificChatId
          ? `/api/maya/load-chat?chatId=${specificChatId}&chatType=${chatType}`
          : `/api/maya/load-chat?chatType=${chatType}`

        console.log("[useMayaChat] Loading chat from URL:", url, "chatType:", chatType, "activeTab:", activeTab, "proMode:", proMode, "explicitChatType:", explicitChatType)

        const response = await fetch(url)
        console.log("[useMayaChat] Load chat response status:", response.status)

        if (!response.ok) {
          // Handle 404 gracefully - if specific chat not found, create new one
          if (response.status === 404) {
            if (specificChatId && !loadChatRetryRef.current) {
              // Specific chat not found - clear it and create new chat (only retry once)
              console.warn("[useMayaChat] Chat not found (404), creating new chat")
              setChatId(null)
              saveChatIdToStorage(null, chatType)
              loadChatRetryRef.current = true // Prevent infinite recursion
              // Create new chat by calling loadChat again without specificChatId
              const result: void = await loadChat(undefined, explicitChatType)
              loadChatRetryRef.current = false // Reset after retry
              return result
            } else {
              // User not found or other 404 - log error but don't crash
              const errorText = await response.text().catch(() => "Unknown error")
              console.error("[useMayaChat] Failed to load chat (404):", errorText)
              setIsLoadingChat(false)
              loadChatRetryRef.current = false // Reset on error
              // Set empty state instead of throwing
              setChatId(null)
              setChatTitle("Chat with Maya")
              setMessages([])
              // CRITICAL FIX: Mark as loaded even when no chat exists to prevent infinite loop
              hasLoadedChatRef.current = true
              console.log("[useMayaChat] ✅ No chat found (404), marked as loaded to prevent infinite loop")
              return
            }
          }
          // For other errors, throw as before
          loadChatRetryRef.current = false // Reset on error
          throw new Error(`Failed to load chat: ${response.status}`)
        }
        
        // Reset retry flag on success
        loadChatRetryRef.current = false

        let data: any
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error("[useMayaChat] Error parsing chat response JSON")
          setIsLoadingChat(false)
          // CRITICAL FIX: Mark as loaded even on parse error to prevent infinite loop
          hasLoadedChatRef.current = true
          console.log("[useMayaChat] ✅ JSON parse error, marked as loaded to prevent infinite loop")
          return
        }

        // Safely check if data exists before accessing properties
        if (!data || typeof data !== "object") {
          console.error("[useMayaChat] Invalid chat data received - data is not an object")
          setIsLoadingChat(false)
          // CRITICAL FIX: Mark as loaded even on invalid data to prevent infinite loop
          hasLoadedChatRef.current = true
          console.log("[useMayaChat] ✅ Invalid data, marked as loaded to prevent infinite loop")
          return
        }

        console.log("[useMayaChat] Loaded chat ID:", data.chatId, "Messages:", data.messages?.length, "Title:", data.chatTitle)

        // CRITICAL FIX: Set chatId FIRST before setting messages
        // This ensures useChat resets BEFORE we set messages, preventing them from being cleared
        if (data.chatId) {
          setChatId(data.chatId)
        }

        if (data.chatTitle && typeof data.chatTitle === "string") {
          setChatTitle(data.chatTitle)
        }

        if (data.messages && Array.isArray(data.messages)) {
          let conceptCardsFound = 0

          // CRITICAL FIX: Deduplicate messages by ID to prevent duplicates
          // Use a Map to keep the first occurrence of each message ID
          const messageMap = new Map<string, any>()
          data.messages.forEach((msg: any) => {
            if (msg.id) {
              const msgId = msg.id.toString()
              // Only add if we haven't seen this ID before (keeps first occurrence)
              if (!messageMap.has(msgId)) {
                messageMap.set(msgId, msg)
              } else {
                console.warn("[useMayaChat] ⚠️ Duplicate message ID detected:", msgId, "- keeping first occurrence")
              }
            }
          })

          // Convert Map back to array and sort by createdAt to ensure correct chronological order
          // CRITICAL: Sort by createdAt to fix message ordering issue on page refresh
          const uniqueMessages = Array.from(messageMap.values()).sort((a, b) => {
            // Handle both Date objects and ISO strings
            // Fallback to 0 if createdAt is missing or invalid (will sort to beginning)
            const getTime = (msg: any): number => {
              if (!msg.createdAt) return 0
              try {
                if (msg.createdAt instanceof Date) {
                  return msg.createdAt.getTime()
                }
                const parsed = new Date(msg.createdAt)
                return isNaN(parsed.getTime()) ? 0 : parsed.getTime()
              } catch {
                return 0
              }
            }
            const aTime = getTime(a)
            const bTime = getTime(b)
            return aTime - bTime // Ascending order (oldest first)
          })
          
          // CRITICAL FIX: Only update messages if we actually got new messages
          // This preserves existing messages if API returns empty array (shouldn't happen, but safety)
          if (uniqueMessages.length === 0 && messages.length > 0) {
            console.warn("[useMayaChat] ⚠️ API returned empty messages but we have existing messages - preserving existing")
            setIsLoadingChat(false)
            hasLoadedChatRef.current = true
            return
          }

          // CRITICAL: Populate refs BEFORE setting messages to prevent trigger detection
          uniqueMessages.forEach((msg: any) => {
            if (msg.id) {
              savedMessageIds.current.add(msg.id.toString())
            }

            // Check if message already has concept cards and mark as processed
            const hasConceptCards = msg.parts?.some(
              (p: any) => p.type === "tool-generateConcepts" && p.output?.concepts?.length > 0,
            )
            if (hasConceptCards) {
              conceptCardsFound++
              console.log("[useMayaChat] Found concept cards in message:", msg.id)
            }
          })

          console.log(
            "[useMayaChat] Chat loaded with",
            uniqueMessages.length,
            "unique messages (removed",
            data.messages.length - uniqueMessages.length,
            "duplicates), savedIds:",
            savedMessageIds.current.size,
            "conceptCardsFound:",
            conceptCardsFound,
          )

          // CRITICAL FIX: Only update messages if we actually got new messages
          // This preserves existing messages if API returns empty array (shouldn't happen, but safety)
          if (uniqueMessages.length === 0 && messages.length > 0) {
            console.warn("[useMayaChat] ⚠️ API returned empty messages but we have existing messages - preserving existing")
            setIsLoadingChat(false)
            hasLoadedChatRef.current = true
            return
          }

          // CRITICAL FIX: Store messages in ref to set after useChat resets
          // useChat resets when chatId changes (via chatSessionId), clearing messages
          // We store messages here, then set them in useEffect after useChat resets
          console.log("[useMayaChat] 📝 Storing messages in ref:", uniqueMessages.length, "messages (will set after useChat reset)")
          pendingMessagesRef.current = uniqueMessages
          
          // CRITICAL DEBUG: Check if loaded messages have feed cards
          const loadedFeedCardMessages = data.messages.filter((m: any) => 
            m.role === "assistant" && m.parts?.some((p: any) => p.type === "tool-generateFeed")
          )
          console.log("[useMayaChat] 🔍 LOADED MESSAGES from DB:", {
            totalMessages: data.messages.length,
            uniqueMessagesCount: uniqueMessages.length,
            messagesWithFeedCards: loadedFeedCardMessages.length,
            feedCardMessageIds: loadedFeedCardMessages.map((m: any) => ({ 
              id: m.id, 
              parts: m.parts?.map((p: any) => p.type),
              hasFeedCard: m.parts?.some((p: any) => p.type === "tool-generateFeed"),
            })),
          })
        } else {
          // No messages - store empty array in ref
          pendingMessagesRef.current = []
        }

        setIsLoadingChat(false)
        // CRITICAL: Mark chat as loaded ONLY after successful load
        // This ensures hasLoadedChatRef accurately reflects whether chat is actually loaded
        hasLoadedChatRef.current = true
        // Reset loading timeout tracker
        loadingStartTimeRef.current = null
        console.log("[useMayaChat] ✅ Chat loaded successfully, hasLoadedChatRef set to true")
      } catch (error) {
        console.error("[useMayaChat] Error loading chat:", error)
        
        // If we were trying to load a specific chatId that failed, clear it from localStorage
        // This prevents repeatedly trying to load a chat that doesn't exist
        if (specificChatId) {
          const chatType = getChatType()
          const storageKey = getChatIdStorageKey(chatType)
          localStorage.removeItem(storageKey)
          console.log("[useMayaChat] Cleared invalid chatId from localStorage:", storageKey)
        }
        
        setIsLoadingChat(false)
        // CRITICAL: Reset hasLoadedChatRef on error so we can retry
        hasLoadedChatRef.current = false
        // Reset loading timeout tracker
        loadingStartTimeRef.current = null
        // Clear pending messages on error
        pendingMessagesRef.current = null
        console.log("[useMayaChat] ❌ Chat load failed, hasLoadedChatRef reset to false")
      }
    },
    [getChatType, activeTab, proMode, setMessages],
  )

  // Ref to track the last checked combination to prevent re-checking
  const lastCheckedKeyRef = useRef<string | null>(null)
  // Ref to track previous dependencies to detect unnecessary re-runs
  const prevDepsRef = useRef<{ userId: string | undefined; proMode: boolean; activeTab: string | undefined } | null>(null)

  // Check if user has chat history
  useEffect(() => {
    // Track current dependencies
    const currentDeps = {
      userId: user?.id,
      proMode,
      activeTab,
    }

    // Check if dependencies actually changed
    const prevDeps = prevDepsRef.current
    if (prevDeps && 
        prevDeps.userId === currentDeps.userId &&
        prevDeps.proMode === currentDeps.proMode &&
        prevDeps.activeTab === currentDeps.activeTab) {
      console.log("[useMayaChat] ⏭️ SKIP - Dependencies unchanged:", currentDeps)
      return
    }

    // Update prev deps
    prevDepsRef.current = currentDeps
    // CRITICAL FIX: Check guards at useEffect level BEFORE defining async function
    // This prevents multiple async functions from being created
    if (typeof window === "undefined" || !user?.id) {
      console.log("[useMayaChat] ⏭️ SKIP - No user or not in browser")
      setHasUsedMayaBefore(false)
      return
    }

    // Calculate chat type directly from activeTab and proMode to avoid function reference issues
    const chatType = activeTab === "feed" ? "feed-planner" : (proMode ? "pro" : "maya")

    // Validate chatType before making request
    if (!chatType || typeof chatType !== "string") {
      console.warn("[useMayaChat] Invalid chatType, skipping history check:", chatType)
      setHasUsedMayaBefore(false)
      return
    }

    // CRITICAL FIX: Create a unique key for this check combination
    // Use String() to ensure stable string representation
    const userId = String(user.id)
    const checkKey = `${userId}-${chatType}`
    
    // CRITICAL FIX: Check if we've already checked this exact combination
    // Do this at useEffect level to prevent async function from being created
    const lastChecked = lastCheckedKeyRef.current
    if (lastChecked === checkKey) {
      console.log("[useMayaChat] ⏭️ SKIP - Already checked this combination:", checkKey, "lastChecked:", lastChecked)
      return
    }

    // CRITICAL FIX: Prevent infinite loop - check refs FIRST before any async operations
    if (isCheckingHistoryRef.current) {
      console.log("[useMayaChat] ⏭️ SKIP - Request in flight for chatType:", chatType, "checkKey:", checkKey)
      return
    }

    // CRITICAL: Set refs IMMEDIATELY (synchronously) before any async operations
    // This prevents race conditions where multiple calls happen before the first completes
    isCheckingHistoryRef.current = true
    checkedHistoryForChatTypeRef.current = chatType
    lastCheckedKeyRef.current = checkKey // Mark this combination as checked
    console.log("[useMayaChat] 🔍 STARTING history check for chatType:", chatType, "user?.id:", user?.id, "proMode:", proMode, "activeTab:", activeTab, "checkKey:", checkKey, "lastCheckedKeyRef was:", lastChecked)

    async function checkChatHistory() {

      try {
        const response = await fetch(`/api/maya/chats?chatType=${encodeURIComponent(chatType)}`, {
          credentials: "include",
        })
        
        if (response.ok) {
          const data = await response.json()
          const hasChats = data.chats && Array.isArray(data.chats) && data.chats.length > 0
          // CRITICAL FIX: Only update state if it actually changed to prevent unnecessary re-renders
          setHasUsedMayaBefore((prev) => {
            if (prev === hasChats) {
              console.log("[useMayaChat] ⏭️ hasUsedMayaBefore unchanged:", hasChats, "- skipping state update")
              return prev
            }
            console.log("[useMayaChat] ✅ Updating hasUsedMayaBefore:", prev, "→", hasChats)
            return hasChats
          })
          console.log("[useMayaChat] Chat history check:", {
            hasChats,
            chatCount: data.chats?.length || 0,
            chatType,
            proMode,
          })
        } else {
          console.warn("[useMayaChat] Chat history check failed with status:", response.status)
          setHasUsedMayaBefore((prev) => {
            if (prev === false) return prev // Already false, no need to update
            return false
          })
        }
      } catch (error) {
        // More specific error logging
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          console.warn("[useMayaChat] Network error checking chat history (API may not be available yet):", error)
        } else {
          console.error("[useMayaChat] Error checking chat history:", error)
        }
        setHasUsedMayaBefore((prev) => {
          if (prev === false) return prev // Already false, no need to update
          return false
        })
      } finally {
        // Reset checking flag after request completes
        isCheckingHistoryRef.current = false
        console.log("[useMayaChat] ✅ History check complete for chatType:", chatType, "checkKey:", checkKey)
      }
    }

    checkChatHistory()

    // Cleanup function - no action needed, refs persist across renders
    // This is intentional - we want to remember what we checked to prevent re-checking
    return () => {
      // Component unmounted - but don't reset refs
      // This allows us to skip re-checking if component remounts with same props
    }
    // CRITICAL FIX: Use stable dependencies - user.id instead of user object
    // NOTE: hasUsedMayaBefore is NOT in dependencies to prevent infinite loops
    // The guard (lastCheckedKeyRef) prevents re-checking the same combination
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, proMode, activeTab])

  // Load chat when user or mode changes
  useEffect(() => {
    // Skip if user is not available - don't do anything
    if (!user) {
      // Only clear state once when user becomes undefined (use ref to track)
      if (!hasClearedStateRef.current) {
        console.log("[useMayaChat] User is undefined/null, clearing chat state (one-time)")
        hasClearedStateRef.current = true
        hasLoadedChatRef.current = false
        lastModeRef.current = null
        setIsLoadingChat(false)
        setMessages([])
        setChatId(null)
        setChatTitle("Chat with Maya")
        // Note: We don't clear localStorage here because chat types are separate
      }
      return
    }

    // Additional check: ensure user has at least one required property (id or email)
    // Some user objects might be truthy but incomplete
    // Check if both id and email are missing or empty strings
    const hasId = user.id && typeof user.id === 'string' && user.id.trim().length > 0
    const hasEmail = user.email && typeof user.email === 'string' && user.email.trim().length > 0
    
    if (!hasId && !hasEmail) {
      console.warn("[useMayaChat] User object exists but missing valid id and email properties, skipping chat load", {
        userId: user.id,
        userEmail: user.email,
        userKeys: Object.keys(user)
      })
      if (!hasClearedStateRef.current) {
        hasClearedStateRef.current = true
        hasLoadedChatRef.current = false
        setIsLoadingChat(false)
      }
      return
    }

    // Reset cleared state ref when user becomes available
    hasClearedStateRef.current = false

    // CRITICAL FIX: Add timeout to prevent stuck loading states
    // If loading takes more than 10 seconds, reset and retry
    const LOAD_TIMEOUT = 10000 // 10 seconds
    
    if (isLoadingChat && !hasLoadedChatRef.current) {
      // Track when loading started
      if (!loadingStartTimeRef.current) {
        loadingStartTimeRef.current = Date.now()
        console.log("[useMayaChat] ⏳ Loading started, will timeout after", LOAD_TIMEOUT, "ms")
      } else {
        // Check if timeout exceeded
        const elapsed = Date.now() - loadingStartTimeRef.current
        if (elapsed > LOAD_TIMEOUT) {
          console.warn("[useMayaChat] ⚠️ Load timeout exceeded (", elapsed, "ms), resetting state")
          setIsLoadingChat(false)
          hasLoadedChatRef.current = false
          loadingStartTimeRef.current = null
          // Continue to load logic below
        } else {
          console.log("[useMayaChat] ⏭️ SKIP - Already loading chat (", elapsed, "ms elapsed), waiting for current load to complete")
          return
        }
      }
    } else {
      // Reset timeout tracker when not loading
      loadingStartTimeRef.current = null
    }

    console.log("[useMayaChat] 🚀 Loading chat for user:", user?.email || user?.id || "unknown", "proMode:", proMode, "activeTab:", activeTab, "hasLoadedChatRef:", hasLoadedChatRef.current)

    // Check if mode/chatType changed (using chatType instead of mode to handle Feed tab)
    // Calculate chatType directly from activeTab and proMode to avoid function reference issues
    const currentChatType = activeTab === "feed" ? "feed-planner" : (proMode ? "pro" : "maya")
    const chatTypeChanged = lastModeRef.current !== null && lastModeRef.current !== currentChatType

    console.log("[useMayaChat] Current chatType:", currentChatType, "lastModeRef:", lastModeRef.current, "chatTypeChanged:", chatTypeChanged, "chatId:", chatId, "messagesCount:", messages.length)

    if (chatTypeChanged) {
      console.log("[useMayaChat] ChatType changed from", lastModeRef.current, "to", currentChatType, "- loading new chat for this type")
      
      // CRITICAL FIX: Don't clear messages immediately - show loading state instead
      // Messages will be replaced when new chat loads, preventing blank screen
      // Set loading state to show loading indicator during transition
      setIsLoadingChat(true)
      
      // CRITICAL DEBUG: Log messages state before transition
      const feedCardMessages = messages.filter((m: any) => 
        m.role === "assistant" && m.parts?.some((p: any) => p.type === "tool-generateFeed")
      )
      console.log("[useMayaChat] 🔍 TAB SWITCH: Transitioning from", lastModeRef.current, "to", currentChatType, {
        currentMessages: messages.length,
        messagesWithFeedCards: feedCardMessages.length,
      })
      
      // Clear tracking refs but keep messages visible until new ones load
      savedMessageIds.current.clear()
      savedFeedCardMessagesRef.current.clear() // Clear feed card tracking
      setChatId(null) // Will be set when new chat loads
      setChatTitle("Chat with Maya")
      hasLoadedChatRef.current = false
      // CRITICAL FIX: Reset history check refs when chatType changes so we check history for new type
      checkedHistoryForChatTypeRef.current = null
      lastCheckedKeyRef.current = null // Reset so we can check the new chatType
      
      console.log("[useMayaChat] 🔍 TAB SWITCH: Loading new chat for type:", currentChatType)
    }

    lastModeRef.current = currentChatType

    // CRITICAL: Check if we actually have a loaded chat for this chatType
    // We need to load if:
    // 1. hasLoadedChatRef is false (first time loading)
    // 2. chatType changed (switched tabs, need to load new chatType)
    // 3. hasLoadedChatRef is true but chatId doesn't match saved chatId for this chatType (wrong chat loaded)
    const savedChatIdForThisType = loadChatIdFromStorage(currentChatType)
    const hasWrongChatId = chatId !== null && savedChatIdForThisType !== null && chatId !== savedChatIdForThisType
    
    // CRITICAL FIX: Simplified loading condition to prevent infinite loops
    // Only load if:
    // - Not currently loading AND
    // - (Chat not loaded OR chatType changed OR wrong chat loaded)
    const needsLoad = 
      !isLoadingChat && // Not currently loading
      (!hasLoadedChatRef.current || chatTypeChanged || hasWrongChatId) // Need to load

    // CRITICAL DEBUG: Log the condition breakdown
    console.log("[useMayaChat] 🔍 Loading condition check:", {
      isLoadingChat,
      hasLoadedChatRef: hasLoadedChatRef.current,
      chatTypeChanged,
      hasWrongChatId,
      needsLoad,
      savedChatIdForThisType,
    })

    if (needsLoad) {
      if (!hasLoadedChatRef.current) {
        console.log("[useMayaChat] hasLoadedChatRef is false, loading chat...")
      } else if (chatTypeChanged) {
        console.log("[useMayaChat] ChatType changed, loading new chat...")
      } else if (hasWrongChatId) {
        console.log("[useMayaChat] Wrong chatId loaded (current:", chatId, "expected:", savedChatIdForThisType, "), reloading...")
      } else {
        console.log("[useMayaChat] No chat loaded (chatId:", chatId, "messages:", messages.length, "), loading...")
      }
      
      // CRITICAL: DO NOT set hasLoadedChatRef.current = true here
      // It will be set to true in loadChat() AFTER the chat successfully loads
      // This ensures the ref accurately reflects whether chat is actually loaded

      // Check localStorage for saved chat (chat-type-specific)
      if (savedChatIdForThisType) {
        console.log("[useMayaChat] Found saved chatId in localStorage for", currentChatType, ":", savedChatIdForThisType)
        // Load specific chat - pass chatType explicitly for consistency (though not strictly needed when chatId is provided)
        loadChat(savedChatIdForThisType, currentChatType).catch((error: unknown) => {
          console.error("[useMayaChat] ❌ Error loading saved chat:", error)
          setIsLoadingChat(false)
          hasLoadedChatRef.current = false // Reset so we can retry
        })
      } else {
        // No saved chat - load the most recent chat for this chatType
        // This preserves previous chats when switching between photo mode and feed mode
        // CRITICAL: Pass currentChatType explicitly to avoid closure issues
        // This ensures we load the correct chatType even if activeTab changes during the call
        console.log("[useMayaChat] No saved chatId for", currentChatType, "- loading most recent chat for this type")
        loadChat(undefined, currentChatType).catch((error: unknown) => {
          console.error("[useMayaChat] ❌ Error loading most recent chat:", error)
          setIsLoadingChat(false)
          hasLoadedChatRef.current = false // Reset so we can retry
        })
      }
    } else {
      console.log("[useMayaChat] Chat already loaded - hasLoadedChatRef:", hasLoadedChatRef.current, "chatId:", chatId, "messagesCount:", messages.length, "savedChatId:", savedChatIdForThisType)
    }
    // Dependencies: user, proMode, activeTab
    // Note: We calculate chatType directly from activeTab and proMode (not using getModeString) to avoid function reference issues
    // loadChat is NOT in dependencies to avoid infinite loops, but we pass currentChatType explicitly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, proMode, activeTab])

  // CRITICAL FIX: Set messages after useChat resets when chatId changes
  // useChat resets when chatSessionId (based on chatId) changes, clearing messages
  // We store messages in pendingMessagesRef during loadChat, then set them here after useChat resets
  useEffect(() => {
    if (pendingMessagesRef.current && chatId !== null) {
      console.log("[useMayaChat] 📝 Setting pending messages after useChat reset:", pendingMessagesRef.current.length)
      setMessages(pendingMessagesRef.current)
      pendingMessagesRef.current = null // Clear after setting
    }
  }, [chatId, setMessages])

  // Save chatId to localStorage when it changes (chat-type-specific)
  // BUT: Skip saving if we're in the middle of creating a new chat (to prevent reload)
  const isCreatingNewChatRef = useRef(false)
  useEffect(() => {
    // Skip saving if we're creating a new chat (handleNewChat will save it)
    if (isCreatingNewChatRef.current) {
      return
    }
    const chatType = getChatType()
    saveChatIdToStorage(chatId, chatType)
  }, [chatId, getChatType])

  // Handle new chat
  const handleNewChat = useCallback(async () => {
    // Reset state for new chat (clearLibrary will be called by component if needed)
    try {
      // Set flag to prevent useEffect from saving chatId and triggering reloads
      isCreatingNewChatRef.current = true
      
      // CRITICAL: Clear messages FIRST before creating new chat
      // This ensures useChat hook's internal state is reset
      setMessages([])
      savedMessageIds.current.clear()
      
      // Create new chat with correct chatType based on activeTab
      // Feed tab uses "feed-planner", Photos tab uses "maya" or "pro"
      const chatType = getChatType()
      console.log("[useMayaChat] Creating new chat with chatType:", chatType, "activeTab:", activeTab)
      
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType }),
      })

      if (!response.ok) throw new Error("Failed to create new chat")

      const data = await response.json()
      
      // Mark as loaded BEFORE setting chatId to prevent useEffect from loading
      hasLoadedChatRef.current = true
      
      // Save to localStorage BEFORE setting chatId (to prevent useEffect from triggering)
      saveChatIdToStorage(data.chatId, chatType)
      
      // Set new chatId AFTER saving and marking as loaded
      setChatId(data.chatId)
      setChatTitle("New Chat") // Reset title for new chat
      
      // CRITICAL: Clear messages again after setting chatId to ensure useChat hook resets
      // This is necessary because useChat might maintain internal state
      setMessages([])
      savedMessageIds.current.clear()
      savedFeedCardMessagesRef.current.clear() // Clear feed card tracking
      
      // Reset flag in next tick to allow useEffect to run normally
      setTimeout(() => {
        isCreatingNewChatRef.current = false
      }, 0)

      console.log("[useMayaChat] ✅ New chat created:", { chatId: data.chatId, chatType, activeTab })
      console.log("[useMayaChat] ✅ Messages cleared and chat state reset for new chat (empty)")
    } catch (error) {
      console.error("[useMayaChat] ❌ Error creating new chat:", error)
      // On error, ensure messages are still cleared and reset flag
      setMessages([])
      savedMessageIds.current.clear()
      savedFeedCardMessagesRef.current.clear() // Clear feed card tracking
      isCreatingNewChatRef.current = false
    }
  }, [getChatType, activeTab, setMessages])

  // Handle select chat
  const handleSelectChat = useCallback(
    async (selectedChatId: number, selectedChatTitle?: string) => {
      const chatType = getChatType()
      console.log("[useMayaChat] Selecting chat:", selectedChatId, "for chatType:", chatType)
      
      // CRITICAL FIX: Clear messages and set loading state FIRST
      // This prevents welcome screen from showing during load
      setMessages([])
      setIsLoadingChat(true)
      
      // CRITICAL FIX: Set ref to false to allow loadChat to manage it
      // This ensures loadChat sets it to true only after successful load
      hasLoadedChatRef.current = false
      
      // Save to localStorage
      saveChatIdToStorage(selectedChatId, chatType)
      
      // Update title
      if (selectedChatTitle) {
        setChatTitle(selectedChatTitle)
      }
      
      // Load the chat (will set hasLoadedChatRef.current = true on success)
      // Pass chatType explicitly to ensure correct type is used
      await loadChat(selectedChatId, chatType)
    },
    [loadChat, getChatType, saveChatIdToStorage, setMessages, setIsLoadingChat],
  )

  // Handle delete chat
  const handleDeleteChat = useCallback(
    (deletedChatId: number) => {
      // If the deleted chat was the current one, switch to new chat
      if (chatId === deletedChatId) {
        handleNewChat()
      }
      // Clear localStorage if it was the current chat (chat-type-specific)
      const chatType = getChatType()
      const storedChatId = loadChatIdFromStorage(chatType)
      if (storedChatId === deletedChatId) {
        const storageKey = getChatIdStorageKey(chatType)
        localStorage.removeItem(storageKey)
      }
    },
    [chatId, handleNewChat, getChatType],
  )

  return {
    // Chat state
    chatId,
    chatTitle,
    isLoadingChat,
    hasUsedMayaBefore,

    // Chat operations
    loadChat,
    handleNewChat,
    handleSelectChat,
    handleDeleteChat,

    // Setters
    setChatId,
    setChatTitle,
    setIsLoadingChat,

    // Refs
    savedMessageIds,
    hasLoadedChatRef,

    // useChat integration
    messages,
    sendMessage,
    status,
    setMessages,
  }
}
