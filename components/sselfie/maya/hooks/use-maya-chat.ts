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

import { useState, useEffect, useRef, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const CHAT_ID_STORAGE_KEY = "mayaCurrentChatId"

export interface UseMayaChatProps {
  initialChatId?: number
  studioProMode: boolean
  user: any | null
  getModeString: () => "pro" | "maya"
}

export interface UseMayaChatReturn {
  // Chat state
  chatId: number | null
  chatTitle: string
  isLoadingChat: boolean
  hasUsedMayaBefore: boolean

  // Chat operations
  loadChat: (specificChatId?: number) => Promise<void>
  handleNewChat: () => Promise<void>
  handleSelectChat: (selectedChatId: number, selectedChatTitle?: string) => void
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
 * Load chat ID from localStorage
 */
function loadChatIdFromStorage(): number | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const saved = localStorage.getItem(CHAT_ID_STORAGE_KEY)
    return saved ? Number.parseInt(saved, 10) : null
  } catch (error) {
    console.error("[useMayaChat] ❌ Error loading chatId from localStorage:", error)
    return null
  }
}

/**
 * Save chat ID to localStorage
 */
function saveChatIdToStorage(chatId: number | null) {
  if (typeof window === "undefined") {
    return
  }

  try {
    if (chatId) {
      localStorage.setItem(CHAT_ID_STORAGE_KEY, chatId.toString())
      console.log("[useMayaChat] 💾 Saved chatId to localStorage:", chatId)
    } else {
      localStorage.removeItem(CHAT_ID_STORAGE_KEY)
    }
  } catch (error) {
    console.error("[useMayaChat] ❌ Error saving chatId to localStorage:", error)
  }
}

export function useMayaChat({
  initialChatId,
  studioProMode,
  user,
  getModeString,
}: UseMayaChatProps): UseMayaChatReturn {
  // Chat state
  const [chatId, setChatId] = useState<number | null>(initialChatId || null)
  const [chatTitle, setChatTitle] = useState<string>("Chat with Maya")
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const [hasUsedMayaBefore, setHasUsedMayaBefore] = useState<boolean>(false)

  // Refs for tracking state
  const hasLoadedChatRef = useRef(false)
  const savedMessageIds = useRef(new Set<string>())
  const lastModeRef = useRef<string | null>(null)
  const hasClearedStateRef = useRef(false)

  // Integrate useChat from AI SDK
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/maya/chat",
      headers: {
        "x-studio-pro-mode": studioProMode ? "true" : "false",
      },
    }) as any,
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

  // Load chat function
  const loadChat = useCallback(
    async (specificChatId?: number) => {
      try {
        setIsLoadingChat(true)

        // Build URL - either load specific chat or default maya chat
        const chatType = getModeString()
        const url = specificChatId
          ? `/api/maya/load-chat?chatId=${specificChatId}`
          : `/api/maya/load-chat?chatType=${chatType}`

        console.log("[useMayaChat] Loading chat from URL:", url, "chatType:", chatType, "studioProMode:", studioProMode)

        const response = await fetch(url)
        console.log("[useMayaChat] Load chat response status:", response.status)

        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.status}`)
        }

        let data: any
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error("[useMayaChat] Error parsing chat response JSON")
          setIsLoadingChat(false)
          return
        }

        // Safely check if data exists before accessing properties
        if (!data || typeof data !== "object") {
          console.error("[useMayaChat] Invalid chat data received - data is not an object")
          setIsLoadingChat(false)
          return
        }

        console.log("[useMayaChat] Loaded chat ID:", data.chatId, "Messages:", data.messages?.length, "Title:", data.chatTitle)

        if (data.chatId) {
          setChatId(data.chatId)
        }

        if (data.chatTitle && typeof data.chatTitle === "string") {
          setChatTitle(data.chatTitle)
        }

        if (data.messages && Array.isArray(data.messages)) {
          let conceptCardsFound = 0

          // CRITICAL: Populate refs BEFORE setting messages to prevent trigger detection
          data.messages.forEach((msg: any) => {
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
            data.messages.length,
            "messages, savedIds:",
            savedMessageIds.current.size,
            "conceptCardsFound:",
            conceptCardsFound,
          )

          // Now set messages AFTER refs are populated
          setMessages(data.messages)
        } else {
          setMessages([])
        }

        setIsLoadingChat(false)
      } catch (error) {
        console.error("[useMayaChat] Error loading chat:", error)
        setIsLoadingChat(false)
      }
    },
    [getModeString, studioProMode, setMessages],
  )

  // Check if user has chat history
  useEffect(() => {
    async function checkChatHistory() {
      if (!user) {
        setHasUsedMayaBefore(false)
        return
      }

      try {
        const chatType = getModeString()
        const response = await fetch(`/api/maya/chats?chatType=${chatType}`, {
          credentials: "include",
        })
        if (response.ok) {
          const data = await response.json()
          const hasChats = data.chats && Array.isArray(data.chats) && data.chats.length > 0
          setHasUsedMayaBefore(hasChats)
          console.log("[useMayaChat] Chat history check:", {
            hasChats,
            chatCount: data.chats?.length || 0,
            chatType,
            studioProMode,
          })
        } else {
          console.warn("[useMayaChat] Chat history check failed with status:", response.status)
          setHasUsedMayaBefore(false)
        }
      } catch (error) {
        console.error("[useMayaChat] Error checking chat history:", error)
        setHasUsedMayaBefore(false)
      }
    }

    checkChatHistory()
  }, [user, studioProMode, getModeString])

  // Load chat when user or mode changes
  useEffect(() => {
    // Skip if user is not available - don't do anything
    if (!user) {
      // Only clear state once when user becomes undefined (use ref to track)
      if (!hasClearedStateRef.current) {
        console.log("[useMayaChat] User is undefined, clearing chat state (one-time)")
        hasClearedStateRef.current = true
        hasLoadedChatRef.current = false
        lastModeRef.current = null
        setIsLoadingChat(false)
        setMessages([])
        setChatId(null)
        setChatTitle("Chat with Maya")
        localStorage.removeItem(CHAT_ID_STORAGE_KEY)
      }
      return
    }

    // Reset cleared state ref when user becomes available
    hasClearedStateRef.current = false

    console.log("[useMayaChat] 🚀 Loading chat for user:", user?.email, "studioProMode:", studioProMode)

    // Check if mode changed
    const currentMode = getModeString()
    const modeChanged = lastModeRef.current !== null && lastModeRef.current !== currentMode

    if (modeChanged) {
      console.log("[useMayaChat] Mode changed from", lastModeRef.current, "to", currentMode, "- resetting chat load state")
      hasLoadedChatRef.current = false
    }

    lastModeRef.current = currentMode

    if (!hasLoadedChatRef.current) {
      hasLoadedChatRef.current = true

      // Check localStorage for saved chat
      const savedChatId = loadChatIdFromStorage()
      if (savedChatId) {
        console.log("[useMayaChat] Found saved chatId in localStorage, loading:", savedChatId)
        loadChat(savedChatId)
      } else {
        // No saved chat - load the most recent chat to show history
        console.log("[useMayaChat] No saved chatId, loading most recent chat for mode:", currentMode)
        loadChat() // This calls API without chatId, which loads most recent
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, studioProMode, getModeString]) // Removed loadChat from dependencies to prevent infinite loops

  // Save chatId to localStorage when it changes
  useEffect(() => {
    saveChatIdToStorage(chatId)
  }, [chatId])

  // Handle new chat
  const handleNewChat = useCallback(async () => {
    // Reset state for new chat (clearLibrary will be called by component if needed)
    try {
      // Create new chat with correct chatType based on mode
      const chatType = getModeString()
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType }),
      })

      if (!response.ok) throw new Error("Failed to create new chat")

      const data = await response.json()
      setChatId(data.chatId)
      setChatTitle("New Chat") // Reset title for new chat
      setMessages([])
      savedMessageIds.current.clear()

      saveChatIdToStorage(data.chatId)

      console.log("[useMayaChat] New chat created:", { chatId: data.chatId, chatType })
    } catch (error) {
      console.error("[useMayaChat] Error creating new chat:", error)
    }
  }, [getModeString, setMessages])

  // Handle select chat
  const handleSelectChat = useCallback(
    (selectedChatId: number, selectedChatTitle?: string) => {
      loadChat(selectedChatId)
      setChatTitle(selectedChatTitle || "")
      saveChatIdToStorage(selectedChatId)
    },
    [loadChat],
  )

  // Handle delete chat
  const handleDeleteChat = useCallback(
    (deletedChatId: number) => {
      // If the deleted chat was the current one, switch to new chat
      if (chatId === deletedChatId) {
        handleNewChat()
      }
      // Clear localStorage if it was the current chat
      const storedChatId = loadChatIdFromStorage()
      if (storedChatId === deletedChatId) {
        localStorage.removeItem(CHAT_ID_STORAGE_KEY)
      }
    },
    [chatId, handleNewChat],
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
