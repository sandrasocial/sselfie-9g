"use client"

import type React from "react"
import VideoCard from "./video-card"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  Camera,
  Send,
  ArrowDown,
  X,
  Home,
  Aperture,
  MessageCircle,
  ImageIcon,
  Grid,
  User,
  SettingsIcon,
  LogOut,
  Sliders,
  Plus,
  Clock,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import ConceptCard from "./concept-card"
import MayaChatHistory from "./maya-chat-history"
import UnifiedLoading from "./unified-loading"
import { useRouter } from "next/navigation"
import type { SessionUser } from "next-auth" // Assuming SessionUser type is available

interface MayaChatScreenProps {
  onImageGenerated?: () => void
  user: SessionUser | null // Assuming user object is passed down
}

export default function MayaChatScreen({ onImageGenerated, user }: MayaChatScreenProps) {
  const [inputValue, setInputValue] = useState("")
  const [chatId, setChatId] = useState<number | null>(null)
  const [chatTitle, setChatTitle] = useState<string>("Chat with Maya") // Added for chat title
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const savedMessageIds = useRef(new Set<string>())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isAtBottomRef = useRef(true)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const retryQueue = useRef<Array<{ messageId: string; payload: any }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [contentFilter, setContentFilter] = useState<"all" | "photos" | "videos">("all")
  const [currentPrompts, setCurrentPrompts] = useState<Array<{ label: string; prompt: string }>>([])
  const [userGender, setUserGender] = useState<string | null>(null)
  const [showHeader, setShowHeader] = useState(true)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [styleStrength, setStyleStrength] = useState(1.0) // Updated default from 1.05 to 1.0
  const [promptAccuracy, setPromptAccuracy] = useState(3.5) // Guidance scale: 2.5-5.0
  const [aspectRatio, setAspectRatio] = useState("4:5")
  const [realismStrength, setRealismStrength] = useState(0.2) // Extra LoRA scale: 0.0-0.8
  const [showSettings, setShowSettings] = useState(false)

  const settingsSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const messageSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef(0)
  const isSavingMessageRef = useRef(false)

  const [pendingConceptRequest, setPendingConceptRequest] = useState<string | null>(null)
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false)
  const processedConceptMessagesRef = useRef<Set<string>>(new Set())

  // Extract user authentication status and the chat ID to load from props or context (if available)
  // For this example, we'll assume they are available as `isAuthenticated` and `chatIdToLoad`
  const isAuthenticated = !!user // Simple check for demonstration
  const chatIdToLoad = user ? Number(user.chatId) : null // Replace with actual logic to get chatIdToLoad

  useEffect(() => {
    const settingsStr = localStorage.getItem("mayaGenerationSettings")
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr)
        console.log("[v0] 📊 Loaded saved settings from localStorage:", settings)
        const loadedStyleStrength = settings.styleStrength ?? 1.0 // Updated fallback default to 1.0
        setStyleStrength(loadedStyleStrength === 1.1 ? 1.0 : loadedStyleStrength) // Removed 1.05 migration, only migrate 1.1 to 1.0
        setPromptAccuracy(settings.promptAccuracy || 3.5)
        setAspectRatio(settings.aspectRatio || "4:5") // Updated default from "1:1" to "4:5"
        setRealismStrength(settings.realismStrength ?? 0.2)
      } catch (error) {
        console.error("[v0] ❌ Error loading settings:", error)
      }
    } else {
      console.log("[v0] 📊 No saved settings found, using defaults")
    }
  }, []) // Empty dependency array - only run once on mount

  useEffect(() => {
    // Clear any existing timer
    if (settingsSaveTimerRef.current) {
      clearTimeout(settingsSaveTimerRef.current)
    }

    // Set new timer to save after 500ms of no changes
    settingsSaveTimerRef.current = setTimeout(() => {
      const settings = {
        styleStrength,
        promptAccuracy,
        aspectRatio,
        realismStrength,
      }
      console.log("[v0] 💾 Saving settings to localStorage:", settings)
      localStorage.setItem("mayaGenerationSettings", JSON.stringify(settings))
    }, 500)

    // Cleanup timer on unmount
    return () => {
      if (settingsSaveTimerRef.current) {
        clearTimeout(settingsSaveTimerRef.current)
      }
    }
  }, [styleStrength, promptAccuracy, aspectRatio, realismStrength]) // Added realismStrength to dependencies

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/maya/chat" }),
    initialMessages: [],
    body: {
      chatId: chatId,
    },
    onError: (error) => {
      console.error("[v0] Maya chat error:", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
    },
  })

  const loadChat = useCallback(
    async (specificChatId?: number) => {
      try {
        setIsLoadingChat(true)

        // Build URL - either load specific chat or default maya chat
        const url = specificChatId
          ? `/api/maya/load-chat?chatId=${specificChatId}`
          : `/api/maya/load-chat?chatType=maya`

        console.log("[v0] Loading chat from URL:", url)

        const response = await fetch(url)
        console.log("[v0] Load chat response status:", response.status)

        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Loaded chat ID:", data.chatId, "Messages:", data.messages?.length, "Title:", data.chatTitle)

        if (data.chatId) {
          setChatId(data.chatId)
        }

        if (data.chatTitle) {
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
              processedConceptMessagesRef.current.add(msg.id.toString())
              console.log("[v0] Marked message as processed for concepts:", msg.id)
            }
          })

          console.log(
            "[v0] Chat loaded with",
            data.messages.length,
            "messages, savedIds:",
            savedMessageIds.current.size,
            "processedConcepts:",
            processedConceptMessagesRef.current.size,
            "conceptCardsFound:",
            conceptCardsFound,
          )

          const firstWithConcepts = data.messages.find((msg: any) =>
            msg.parts?.some((p: any) => p.type === "tool-generateConcepts"),
          )
          if (firstWithConcepts) {
            console.log(
              "[v0] First message with concepts:",
              JSON.stringify(firstWithConcepts, null, 2).substring(0, 500),
            )
          } else {
            console.log("[v0] NO messages with tool-generateConcepts parts found in response!")
          }

          // Now set messages AFTER refs are populated
          setMessages(data.messages)
        } else {
          setMessages([])
        }

        setShowHistory(false)
      } catch (error) {
        console.error("[v0] Error loading chat:", error)
      } finally {
        setIsLoadingChat(false)
      }
    },
    [setMessages],
  )

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoadingChat(false)
      return
    }

    // If we already have a chatId, don't reload
    if (chatId) {
      console.log("[v0] Already have chatId:", chatId, "skipping loadChat")
      setIsLoadingChat(false)
      return
    }

    console.log("[v0] 🚀 Maya chat screen mounted, calling loadChat()")
    loadChat(chatIdToLoad || undefined)
  }, [isAuthenticated, chatIdToLoad, loadChat, chatId])

  // Detect [GENERATE_CONCEPTS] trigger in messages
  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return

    // Find the last assistant message
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
    if (!lastAssistantMessage) return

    const messageId = lastAssistantMessage.id.toString()
    if (processedConceptMessagesRef.current.has(messageId)) {
      console.log("[v0] Skipping already processed message:", messageId)
      return
    }

    const alreadyHasConceptCards = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateConcepts" && p.output?.concepts?.length > 0,
    )
    if (alreadyHasConceptCards) {
      // Mark as processed so we don't check again
      processedConceptMessagesRef.current.add(messageId)
      console.log("[v0] Message already has concepts, marking as processed:", messageId)
      return
    }

    const textContent =
      typeof lastAssistantMessage.content === "string"
        ? lastAssistantMessage.content
        : lastAssistantMessage.parts
            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") || ""

    // Check for [GENERATE_CONCEPTS] trigger
    const conceptMatch = textContent.match(/\[GENERATE_CONCEPTS\]\s*(.+?)(?:\n|$)/i)
    if (conceptMatch && !isGeneratingConcepts && !pendingConceptRequest) {
      const conceptRequest = conceptMatch[1].trim()
      console.log("[v0] Detected concept generation trigger:", conceptRequest)
      // Mark this message as processed BEFORE triggering generation
      processedConceptMessagesRef.current.add(messageId)
      setPendingConceptRequest(conceptRequest)
    }
  }, [messages, status, isGeneratingConcepts, pendingConceptRequest])

  // The problem was: message was saved BEFORE concepts were generated, so concepts were never persisted
  useEffect(() => {
    if (!pendingConceptRequest || isGeneratingConcepts) return

    const generateConcepts = async () => {
      setIsGeneratingConcepts(true)
      console.log("[v0] Calling generate-concepts API for:", pendingConceptRequest)

      try {
        const conversationContext = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-10)
          .map((m) => {
            let content = ""
            if (typeof m.content === "string") {
              content = m.content
            } else if (m.parts) {
              content = m.parts
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text)
                .join(" ")
            }
            const cleanContent = content.replace(/\[GENERATE_CONCEPTS\][^\n]*/g, "").trim()
            if (!cleanContent) return null
            return `${m.role === "user" ? "User" : "Maya"}: ${cleanContent.substring(0, 500)}`
          })
          .filter(Boolean)
          .join("\n")

        const response = await fetch("/api/maya/generate-concepts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userRequest: pendingConceptRequest,
            count: 5,
            conversationContext: conversationContext || undefined,
          }),
        })
        // </CHANGE>

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const result = await response.json()
        console.log("[v0] Concept generation result:", result.state, result.concepts?.length)

        if (result.state === "ready" && result.concepts) {
          // Find the current last assistant message ID before updating
          const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
          const messageId = lastAssistantMessage?.id?.toString()

          // Add concept cards to the last assistant message
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages]
            const lastIndex = newMessages.length - 1
            if (lastIndex >= 0 && newMessages[lastIndex].role === "assistant") {
              const existingParts = newMessages[lastIndex].parts || []
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                parts: [
                  ...existingParts,
                  {
                    type: "tool-generateConcepts",
                    output: result,
                  } as any,
                ],
              }
            }
            return newMessages
          })

          // This ensures new concept cards are persisted and show in chat history
          if (chatId && result.concepts.length > 0) {
            // Extract text content from the message
            let textContent = ""
            if (lastAssistantMessage?.parts && Array.isArray(lastAssistantMessage.parts)) {
              const textParts = lastAssistantMessage.parts.filter((p: any) => p.type === "text")
              textContent = textParts
                .map((p: any) => p.text)
                .join("\n")
                .trim()
            }

            console.log("[v0] Saving concept cards to database:", result.concepts.length)

            // Remove the message from savedMessageIds so the save effect won't skip it
            // OR directly save/update the concepts
            fetch("/api/maya/save-message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId,
                role: "assistant",
                content: textContent || "",
                conceptCards: result.concepts,
                updateExisting: true, // Signal to update if message exists
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.success) {
                  console.log("[v0] Concept cards saved successfully to database")
                  // Mark the message as saved now (with concepts)
                  if (messageId) {
                    savedMessageIds.current.add(messageId)
                  }
                } else {
                  console.error("[v0] Failed to save concept cards:", data.error)
                }
              })
              .catch((error) => {
                console.error("[v0] Error saving concept cards:", error)
              })
          }
        }
      } catch (error) {
        console.error("[v0] Error generating concepts:", error)
      } finally {
        setIsGeneratingConcepts(false)
        setPendingConceptRequest(null)
      }
    }

    generateConcepts()
  }, [pendingConceptRequest, isGeneratingConcepts, setMessages, messages, chatId]) // Added 'messages' to dependency array

  // It was causing race conditions by loading a different chat and overwriting messages

  useEffect(() => {
    // Don't save if we're currently generating concepts - wait for them to be added first
    console.log(
      "[v0] Save effect triggered - status:",
      status,
      "chatId:",
      chatId,
      "messagesLen:",
      messages.length,
      "isGeneratingConcepts:",
      isGeneratingConcepts,
      "pendingConceptRequest:",
      !!pendingConceptRequest,
    )

    if (status !== "ready" || !chatId || messages.length === 0 || isGeneratingConcepts || pendingConceptRequest) {
      console.log("[v0] Save effect early return - conditions not met")
      return
    }

    // Find the last assistant message
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
    if (!lastAssistantMessage) {
      console.log("[v0] Save effect - no assistant message found")
      return
    }

    // Skip if already saved
    if (savedMessageIds.current.has(lastAssistantMessage.id)) {
      console.log("[v0] Save effect - message already saved:", lastAssistantMessage.id)
      return
    }

    // Check if this message has a [GENERATE_CONCEPTS] trigger but no concepts yet
    // If so, don't save yet - wait for concept generation
    const textContent =
      typeof lastAssistantMessage.content === "string"
        ? lastAssistantMessage.content
        : lastAssistantMessage.parts
            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") || ""

    const hasConceptTrigger = /\[GENERATE_CONCEPTS\]/i.test(textContent)
    const hasConceptCards = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateConcepts" && p.output?.concepts?.length > 0,
    )

    console.log("[v0] Save effect - hasConceptTrigger:", hasConceptTrigger, "hasConceptCards:", hasConceptCards)

    // If there's a trigger but no concepts yet, wait for concept generation
    if (hasConceptTrigger && !hasConceptCards) {
      console.log("[v0] Message has concept trigger but no concepts yet, waiting for generation...")
      return
    }

    // Extract text content from parts for saving
    let saveTextContent = ""
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      const textParts = lastAssistantMessage.parts.filter((p: any) => p.type === "text")
      saveTextContent = textParts
        .map((p: any) => p.text)
        .join("\n")
        .trim()
    }

    // Extract concept cards from parts
    const conceptCards: any[] = []
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      for (const part of lastAssistantMessage.parts) {
        if (part.type === "tool-generateConcepts") {
          const toolPart = part as any
          const output = toolPart.output
          if (output && output.state === "ready" && Array.isArray(output.concepts)) {
            conceptCards.push(...output.concepts)
          }
        }
      }
    }

    // Only save if we have something to save
    if (!saveTextContent && conceptCards.length === 0) {
      console.log("[v0] Save effect - nothing to save (no text, no concepts)")
      return
    }

    // Mark as saved immediately to prevent duplicate saves
    savedMessageIds.current.add(lastAssistantMessage.id)

    console.log(
      "[v0] 📝 Saving assistant message with",
      conceptCards.length,
      "concept cards, text length:",
      saveTextContent.length,
    )
    // </CHANGE>

    // Save to database
    fetch("/api/maya/save-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        role: "assistant",
        content: saveTextContent || "",
        conceptCards: conceptCards.length > 0 ? conceptCards : null,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log("[v0] Assistant message saved successfully with concepts:", conceptCards.length)
        } else {
          console.error("[v0] Failed to save message:", data.error)
          savedMessageIds.current.delete(lastAssistantMessage.id)
        }
      })
      .catch((error) => {
        console.error("[v0] Save error:", error)
        savedMessageIds.current.delete(lastAssistantMessage.id)
      })
  }, [status, chatId, messages, isGeneratingConcepts, pendingConceptRequest]) // Updated dependency to messages

  useEffect(() => {
    if (status !== "ready" || !chatId || messages.length === 0) return

    // Find unsaved user messages
    const unsavedUserMessages = messages.filter((msg) => msg.role === "user" && !savedMessageIds.current.has(msg.id))

    for (const userMsg of unsavedUserMessages) {
      // Extract text content
      let textContent = ""
      if (userMsg.parts && Array.isArray(userMsg.parts)) {
        const textParts = userMsg.parts.filter((p: any) => p.type === "text")
        textContent = textParts
          .map((p: any) => p.text)
          .join("\n")
          .trim()
      } else if (typeof userMsg.content === "string") {
        textContent = userMsg.content
      }

      if (!textContent) continue

      // Mark as saved immediately
      savedMessageIds.current.add(userMsg.id)

      // Save user message to database
      fetch("/api/maya/save-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          role: "user",
          content: textContent,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log("[v0] ✅ User message saved")
          } else {
            console.error("[v0] ❌ Failed to save user message:", data.error)
            savedMessageIds.current.delete(userMsg.id)
          }
        })
        .catch((error) => {
          console.error("[v0] ❌ User message save error:", error)
          savedMessageIds.current.delete(userMsg.id)
        })
    }
  }, [status, chatId, messages])

  const isTyping = status === "submitted" || status === "streaming"

  const promptPoolWoman = {
    lifestyle: [
      {
        label: "Coffee run",
        prompt:
          "Coffee run - candid street style moment, iced coffee in hand, effortless cool energy, morning city light, walking between cafes",
      },
      {
        label: "Cosy home",
        prompt:
          "Cosy at home - soft morning light through windows, relaxed loungewear moment, off-duty vibes, natural and intimate",
      },
      {
        label: "City walk",
        prompt:
          "City walk - metropolitan street style, confident stride, NYC street energy, golden hour between buildings",
      },
      {
        label: "Golden hour",
        prompt:
          "Golden hour - warm sunset glow on skin, magic hour lighting, dreamy and romantic, Instagram golden moment",
      },
      {
        label: "Brunch",
        prompt: "Brunch vibes - chic restaurant moment, natural daylight, weekend aesthetic, effortlessly put together",
      },
      {
        label: "Night out",
        prompt:
          "Night out - evening city lights, glamorous but not overdone, elevated dinner energy, sophisticated nightlife",
      },
      {
        label: "Getting ready",
        prompt:
          "Getting ready - mirror selfie energy, bedroom natural light, half-ready candid moment, relatable and aspirational",
      },
      {
        label: "Morning routine",
        prompt:
          "Morning routine - soft bedroom light, fresh-faced natural beauty, that girl aesthetic, peaceful start to day",
      },
    ],
    aesthetic: [
      {
        label: "Clean girl",
        prompt:
          "Clean girl aesthetic - minimal makeup, slicked back hair, neutral tones, model-off-duty, effortless and fresh",
      },
      {
        label: "Dark & moody",
        prompt: "Dark and moody - dramatic shadows, rich deep tones, mysterious and editorial, night energy",
      },
      {
        label: "Soft glam",
        prompt: "Soft glam - elevated everyday, subtle glow, polished look, luxe but approachable",
      },
      {
        label: "Scandinavian",
        prompt: "Scandinavian minimal - clean lines, neutral palette, Copenhagen street style, effortless Nordic cool",
      },
      {
        label: "Old money",
        prompt: "Old money aesthetic - quiet luxury, understated elegance, timeless and refined",
      },
      {
        label: "It girl",
        prompt:
          "It girl energy - trendsetting confidence, off-duty model vibes, fashion-forward but effortless, main character",
      },
      {
        label: "That girl",
        prompt:
          "That girl aesthetic - wellness and glow, morning routine energy, healthy lifestyle, aspirational but achievable",
      },
      {
        label: "Coquette",
        prompt:
          "Coquette aesthetic - soft feminine, delicate details, romantic and flirty, bows and blush tones, dreamy",
      },
    ],
    vibe: [
      {
        label: "Luxury",
        prompt:
          "Luxury lifestyle - high-end subtle details, five-star environment, quiet luxury aesthetic, understated wealth",
      },
      {
        label: "Effortless",
        prompt: "Effortless chic - looks like you didn't try but perfect, running errands style, cool girl energy",
      },
      {
        label: "Bold",
        prompt: "Bold and confident - statement energy, head-turning presence, fearless fashion, unapologetic",
      },
      {
        label: "Romantic",
        prompt: "Romantic mood - soft light, feminine details, dreamy atmosphere, date night or golden hour energy",
      },
      {
        label: "Exclusive",
        prompt: "Exclusive access - VIP energy, members-only vibes, private event aesthetic, aspirational lifestyle",
      },
      {
        label: "Candid",
        prompt:
          "Candid moment - caught between poses, natural and unposed, authentic laughter or movement, real moment",
      },
      {
        label: "Main character",
        prompt: "Main character energy - the world is your backdrop, confident and present, all eyes on you moment",
      },
      {
        label: "Soft life",
        prompt: "Soft life aesthetic - ease and luxury, no stress energy, vacation state of mind, peaceful abundance",
      },
    ],
    location: [
      {
        label: "Rooftop",
        prompt:
          "Rooftop setting - city skyline behind, golden hour or blue hour, cocktail optional, urban luxury moment",
      },
      {
        label: "Café",
        prompt:
          "Cafe moment - European sidewalk energy, coffee and croissant vibes, Parisian or NYC cafe culture, people watching",
      },
      {
        label: "Beach",
        prompt: "Beach lifestyle - golden sand, ocean backdrop, effortless beach glamour not posed, coastal vibes",
      },
      {
        label: "Hotel",
        prompt: "Hotel luxury - marble lobby or suite, travel lifestyle, five-star details, vacation aesthetic",
      },
      {
        label: "Street style",
        prompt: "Street style - urban backdrop, walking with purpose, off-duty model energy, city as runway",
      },
      {
        label: "Lounge",
        prompt:
          "Lounge setting - upscale bar or hotel lobby, evening lighting, cocktail culture, sophisticated nightlife",
      },
      {
        label: "Yacht",
        prompt: "Yacht life - deck or marina, nautical luxury, summer Mediterranean energy, effortless coastal glamour",
      },
      {
        label: "Private jet",
        prompt: "Private jet - cabin interior or tarmac, travel luxury, understated wealth, jet-set lifestyle candid",
      },
    ],
  }

  const promptPoolMan = {
    lifestyle: [
      {
        label: "Coffee run",
        prompt: "Coffee run - casual street style, coffee in hand, off-duty cool, morning city energy, effortless",
      },
      {
        label: "City",
        prompt: "City lifestyle - urban explorer, metropolitan backdrop, NYC energy, street smart style",
      },
      {
        label: "Golden hour",
        prompt: "Golden hour - warm sunset light, relaxed moment, cinematic golden glow, natural and aspirational",
      },
      {
        label: "Night out",
        prompt:
          "Night out - evening city lights, smart casual elevated, dinner or drinks energy, confident but relaxed",
      },
      {
        label: "Weekend",
        prompt: "Weekend vibes - relaxed but stylish, casual luxury, Saturday afternoon energy, laid-back and cool",
      },
      {
        label: "Travel day",
        prompt: "Travel day - airport or hotel, comfortable but put-together, jet-set lifestyle, effortless traveler",
      },
      {
        label: "Morning",
        prompt: "Morning routine - natural light, fresh and clean, starting the day energy, minimal and masculine",
      },
      {
        label: "Gym",
        prompt: "Post gym - athletic but styled, healthy lifestyle, workout glow, athleisure done right",
      },
    ],
    aesthetic: [
      {
        label: "Minimal",
        prompt:
          "Minimal aesthetic - clean and intentional, quality over quantity, Scandinavian influence, refined simplicity",
      },
      {
        label: "Dark & moody",
        prompt: "Dark and moody - dramatic lighting, rich tones, mysterious edge, cinematic and artistic",
      },
      {
        label: "Streetwear",
        prompt:
          "Streetwear style - urban fashion-forward, hype culture meets luxury, statement pieces, bold streetwear",
      },
      {
        label: "Scandinavian",
        prompt: "Scandinavian minimal - Nordic clean lines, neutral palette, Copenhagen street style, effortless cool",
      },
      {
        label: "Old money",
        prompt: "Old money aesthetic - quiet luxury, prep influence, timeless menswear, understated wealth and taste",
      },
      {
        label: "Modern",
        prompt: "Modern masculine - contemporary style, clean silhouettes, elevated everyday, refined casual",
      },
      {
        label: "Rugged",
        prompt: "Rugged refined - outdoor meets luxury, natural textures, adventurous spirit, masculine and polished",
      },
      {
        label: "Clean",
        prompt: "Clean aesthetic - fresh and precise, well-groomed, minimal details, put-together without trying",
      },
    ],
    vibe: [
      {
        label: "Luxury",
        prompt: "Luxury lifestyle - subtle wealth indicators, high-end environment, quiet confidence, refined taste",
      },
      {
        label: "Effortless",
        prompt: "Effortless cool - looks easy but intentional, model-off-duty energy, natural charisma",
      },
      {
        label: "Bold",
        prompt: "Bold presence - confident and commanding, statement style, fearless energy, unapologetic",
      },
      {
        label: "Editorial",
        prompt: "Editorial mood - fashion-forward, artistic composition, magazine-worthy but still authentic, elevated",
      },
      {
        label: "Candid",
        prompt: "Candid moment - caught naturally, authentic movement or expression, real and relatable",
      },
      { label: "Exclusive", prompt: "Exclusive access - VIP environment, members-only energy, aspirational lifestyle" },
      {
        label: "Boss",
        prompt: "Boss vibes - successful energy, corner office or business luxury, powerful but not corporate stiff",
      },
      {
        label: "Adventure",
        prompt: "Adventure lifestyle - explorer energy, travel and discovery, rugged luxury, worldly and curious",
      },
    ],
    location: [
      {
        label: "Rooftop",
        prompt: "Rooftop setting - city views, urban luxury, cocktail hour energy, skyline backdrop",
      },
      {
        label: "Café",
        prompt: "Cafe moment - coffee culture, newspaper or laptop optional, European sidewalk or NYC corner spot",
      },
      {
        label: "Penthouse",
        prompt: "Penthouse living - floor-to-ceiling windows, city views, luxury interior, aspirational lifestyle",
      },
      { label: "Hotel", prompt: "Hotel luxury - five-star details, travel lifestyle, lobby or suite, jet-set energy" },
      {
        label: "Street",
        prompt: "Street style - urban backdrop, city as runway, walking with purpose, metropolitan cool",
      },
      {
        label: "Luxury car",
        prompt: "Luxury car - automotive detail or driving, leather interior, subtle wealth, car culture",
      },
      {
        label: "Office",
        prompt: "Corner office - successful professional, modern workspace, power position, boss energy",
      },
      {
        label: "Yacht",
        prompt: "Yacht life - nautical luxury, deck or marina, Mediterranean summer, coastal sophistication",
      },
    ],
  }

  const getRandomPrompts = (gender: string | null) => {
    const promptPool = gender === "woman" ? promptPoolWoman : promptPoolMan
    const allCategories = Object.values(promptPool)
    const selected: Array<{ label: string; prompt: string }> = []

    // Get 1-2 from each category, shuffled
    allCategories.forEach((category) => {
      const shuffled = [...category].sort(() => Math.random() - 0.5)
      selected.push(...shuffled.slice(0, Math.random() > 0.5 ? 2 : 1))
    })

    // Shuffle all selected and take 4
    return selected.sort(() => Math.random() - 0.5).slice(0, 4)
  }

  useEffect(() => {
    const fetchUserGender = async () => {
      try {
        console.log("[v0] Fetching user gender from /api/user/profile")
        const response = await fetch("/api/user/profile")
        console.log("[v0] Profile API response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Profile API data:", data)
          setUserGender(data.gender || null)
          const prompts = getRandomPrompts(data.gender || null)
          console.log("[v0] Setting prompts for gender:", data.gender, "Prompts:", prompts.length)
          setCurrentPrompts(prompts)
        } else {
          console.error("[v0] Profile API error:", response.status, response.statusText)
          setCurrentPrompts(getRandomPrompts(null))
        }
      } catch (error) {
        console.error("[v0] Error fetching user gender:", error)
        setCurrentPrompts(getRandomPrompts(null))
      }
    }
    fetchUserGender()
  }, [])

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch("/api/user/credits")
        const data = await response.json()
        setCreditBalance(data.balance || 0)
      } catch (error) {
        console.error("[v0] Error fetching credits:", error)
        setCreditBalance(0)
      }
    }
    fetchCredits()
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  const retryFailedSaves = async () => {
    if (retryQueue.current.length === 0) return

    console.log("[v0] 🔄 Retrying", retryQueue.current.length, "failed saves")

    const queue = [...retryQueue.current]
    retryQueue.current = []

    for (const item of queue) {
      try {
        const response = await fetch("/api/maya/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        })

        if (response.ok) {
          console.log("[v0] ✅ Retry successful for message:", item.messageId)
          savedMessageIds.current.add(item.messageId)
        } else {
          console.log("[v0] ⚠️ Retry failed, re-queuing:", item.messageId)
          retryQueue.current.push(item)
        }
      } catch (error) {
        console.error("[v0] ❌ Retry error:", error)
        retryQueue.current.push(item)
      }
    }
  }

  useEffect(() => {
    const interval = setInterval(retryFailedSaves, 30000)
    return () => clearInterval(interval)
  }, [])

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
    setShowScrollButton(!isNearBottom)
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  useEffect(() => {
    // Only auto-scroll if user is at bottom (respects manual scrolling up)
    if (isAtBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth")
      })
    }
  }, [messages.length, scrollToBottom]) // Changed from messages to messages.length to prevent infinite loop

  // The loadChat function has been consolidated and is now being called in the useEffect below.
  // This useEffect is now responsible for the initial loadChat call.
  useEffect(() => {
    console.log("[v0] 🚀 Maya chat screen mounted, calling loadChat()")
    // Initial loadChat is now handled by the effect dependent on 'user'
    if (user) {
      loadChat()
    } else {
      // If no user, set loading to false and maybe clear messages or show an empty state
      setIsLoadingChat(false)
      setMessages([]) // Clear messages if no user
      setChatId(null) // Reset chat ID
      setChatTitle("Chat with Maya") // Reset title
    }
  }, [user]) // Depend on user to trigger load

  useEffect(() => {
    console.log("[v0] Maya chat status:", status, "isTyping:", isTyping)
  }, [status, isTyping])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setIsUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await response.json()
      setUploadedImage(url)
      console.log("[v0] Image uploaded:", url)

      // Call the onImageGenerated callback if provided
      if (onImageGenerated) {
        onImageGenerated()
      }
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setIsUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await response.json()
      setUploadedImage(url)
      console.log("[v0] Image uploaded:", url)

      // Call the onImageGenerated callback if provided
      if (onImageGenerated) {
        onImageGenerated()
      }
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSendMessage = async (customPrompt?: string, displayText?: string) => {
    const messageText = customPrompt || inputValue.trim()
    // Use displayText if provided (for quick prompts), otherwise use messageText
    const userVisibleText = displayText || messageText

    if ((messageText || uploadedImage) && !isTyping) {
      const messageContent = uploadedImage
        ? `${userVisibleText}\n\n[Inspiration Image: ${uploadedImage}]`
        : userVisibleText
      // The actual prompt sent to Maya (may include richer context)
      const mayaPrompt = uploadedImage ? `${messageText}\n\n[Inspiration Image: ${uploadedImage}]` : messageText

      console.log("[v0] 📤 Sending message with settings:", {
        styleStrength,
        promptAccuracy,
        aspectRatio,
        realismStrength,
      })

      isAtBottomRef.current = true

      // If no chatId exists, create a new chat first
      let currentChatId = chatId
      if (!currentChatId) {
        console.log("[v0] No chatId exists, creating new chat before sending message...")
        try {
          const response = await fetch("/api/maya/load-chat?chatType=maya")
          if (response.ok) {
            const data = await response.json()
            if (data.chatId) {
              currentChatId = data.chatId
              setChatId(data.chatId)
              if (data.chatTitle) {
                setChatTitle(data.chatTitle)
              }
              console.log("[v0] Created/loaded chat with ID:", data.chatId)
            }
          }
        } catch (error) {
          console.error("[v0] Error creating/loading chat:", error)
        }
      }

      if (currentChatId) {
        fetch("/api/maya/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: currentChatId,
            role: "user",
            content: messageContent, // User-visible text saved
          }),
        }).catch((error) => {
          console.error("[v0] Error saving user message:", error)
        })
      }

      sendMessage({
        text: mayaPrompt,
        experimental_providerMetadata: {
          customSettings: {
            styleStrength,
            promptAccuracy,
            aspectRatio,
            realismStrength,
          },
        },
      })
      setInputValue("")
      setUploadedImage(null)
    }
  }

  const handleNewChat = async () => {
    try {
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setChatId(data.chatId)
        setChatTitle("New Chat") // Reset title for new chat
        savedMessageIds.current.clear()
        setMessages([])
        isAtBottomRef.current = true
        setShowHistory(false)
        setShowChatMenu(false)
        setCurrentPrompts(getRandomPrompts(userGender))
        setTimeout(() => scrollToBottom("instant"), 100)
      }
    } catch (error) {
      console.error("[v0] Error creating new chat:", error)
    }
  }

  const handleSelectChat = (selectedChatId: number, selectedChatTitle: string) => {
    // Added selectedChatTitle
    if (selectedChatId !== chatId) {
      setChatId(selectedChatId)
      setChatTitle(selectedChatTitle) // Set the title of the selected chat
      setMessages([])
      savedMessageIds.current.clear()
      processedConceptMessagesRef.current.clear() // Clear processed concepts for the new chat
      isAtBottomRef.current = true
      loadChat(selectedChatId)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        router.push("/auth/login")
      } else {
        console.error("[v0] Logout failed")
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  const handleNavigation = (tab: string) => {
    // Navigate by updating the hash
    window.location.hash = tab
    setShowNavMenu(false)
  }

  const filteredMessages = messages.filter((msg) => {
    if (contentFilter === "all") return true

    if (contentFilter === "photos") {
      // Show messages with concept cards (photos)
      return msg.parts?.some((inv: any) => inv.type === "tool-generateConcepts" && inv.output?.state === "ready")
    }

    if (contentFilter === "videos") {
      // Show messages with video cards
      return msg.parts?.some((inv: any) => inv.type === "tool-generateVideo")
    }

    return true
  })

  const renderMessageContent = (text: string, isUser: boolean) => {
    const cleanedText = text.replace(/\[GENERATE_CONCEPTS\]\s*[^\n]*/gi, "").trim()

    // Check if message contains an inspiration image
    const inspirationImageMatch = cleanedText.match(/\[Inspiration Image: (https?:\/\/[^\]]+)\]/)

    if (inspirationImageMatch) {
      const imageUrl = inspirationImageMatch[1]
      const textWithoutImage = cleanedText.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim()

      return (
        <div className="space-y-3">
          {textWithoutImage && (
            <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{textWithoutImage}</p>
          )}
          <div className="mt-2">
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-white/60 shadow-lg">
              <img src={imageUrl || "/placeholder.svg"} alt="Inspiration" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-stone-500 mt-1.5 tracking-wide">Inspiration Image</p>
          </div>
        </div>
      )
    }

    if (!cleanedText) return null

    return <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{cleanedText}</p>
  }

  if (isLoadingChat) {
    return <UnifiedLoading message="Loading chat..." />
  }

  const isEmpty = !messages || messages.length === 0

  return (
    <div
      className="flex flex-col h-full bg-gradient-to-b from-stone-50 to-white relative overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-xl border-2 border-dashed border-stone-400 rounded-3xl p-12 text-center max-w-md mx-4">
            <Camera size={48} className="mx-auto mb-4 text-stone-600" strokeWidth={1.5} />
            <h3 className="text-xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              Drop Image Here
            </h3>
            <p className="text-sm text-stone-600 tracking-wide">Upload a reference image for Maya to work with</p>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-stone-200/50">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-stone-200/60 overflow-hidden flex-shrink-0">
            <img src="https://i.postimg.cc/fTtCnzZv/out-1-22.png" alt="Maya" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">
              {chatTitle}
            </h3>
          </div>
        </div>

        <button
          onClick={() => setShowNavMenu(!showNavMenu)}
          className="flex items-center justify-center px-3 h-9 sm:h-10 rounded-lg hover:bg-stone-100/50 transition-colors touch-manipulation active:scale-95"
          aria-label="Navigation menu"
          aria-expanded={showNavMenu}
        >
          <span className="text-xs sm:text-sm font-serif tracking-[0.2em] text-stone-950 uppercase">MENU</span>
        </button>
      </div>

      {showNavMenu && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowNavMenu(false)}
          />

          {/* Sliding menu from right */}
          <div className="fixed top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-3xl border-l border-stone-200 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header with close button - fixed at top */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-200/50">
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950">Menu</h3>
              <button
                onClick={() => setShowNavMenu(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>

            {/* Credits display - fixed below header */}
            <div className="flex-shrink-0 px-6 py-6 border-b border-stone-200/50">
              <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-2">Your Credits</div>
              <div className="text-3xl font-serif font-extralight text-stone-950 tabular-nums">
                {creditBalance.toFixed(1)}
              </div>
            </div>

            {/* Navigation links - scrollable middle section with bottom padding */}
            <div className="flex-1 overflow-y-auto py-2 pb-32 min-h-0">
              <button
                onClick={() => handleNavigation("studio")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Home size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Studio</span>
              </button>
              <button
                onClick={() => handleNavigation("training")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Aperture size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Training</span>
              </button>
              <button
                onClick={() => handleNavigation("maya")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left bg-stone-100/50 border-l-2 border-stone-950"
              >
                <MessageCircle size={18} className="text-stone-950" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-950">Maya</span>
              </button>
              <button
                onClick={() => handleNavigation("gallery")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <ImageIcon size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Gallery</span>
              </button>
              <button
                onClick={() => handleNavigation("academy")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Grid size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Academy</span>
              </button>
              <button
                onClick={() => handleNavigation("profile")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <User size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Profile</span>
              </button>
              <button
                onClick={() => handleNavigation("settings")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <SettingsIcon size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Settings</span>
              </button>
            </div>

            {/* Sign out button - fixed at bottom */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-stone-200/50 bg-white/95">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <LogOut size={16} strokeWidth={2} />
                <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {showHistory && (
        <div className="flex-shrink-0 mx-4 mt-2 mb-2 bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl p-4 shadow-xl shadow-stone-950/5 animate-in slide-in-from-top-2 duration-300">
          <MayaChatHistory currentChatId={chatId} onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
        </div>
      )}

      {showSettings && (
        <>
          <div
            className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowSettings(false)}
          />

          <div className="fixed inset-x-4 top-20 bg-white/95 backdrop-blur-3xl border border-stone-200 rounded-2xl p-6 shadow-xl shadow-stone-950/10 animate-in slide-in-from-top-2 duration-300 z-50 max-w-md mx-auto">
            {/* Close button */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950">
                Generation Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close settings"
              >
                <X size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs tracking-wider uppercase text-stone-600">Style Strength</label>
                  <span className="text-sm font-medium text-stone-950">{styleStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.9"
                  max="1.2"
                  step="0.05"
                  value={styleStrength}
                  onChange={(e) => setStyleStrength(Number.parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs tracking-wider uppercase text-stone-600">Prompt Accuracy</label>
                  <span className="text-sm font-medium text-stone-950">{promptAccuracy.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="5.0"
                  step="0.5"
                  value={promptAccuracy}
                  onChange={(e) => setPromptAccuracy(Number.parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs tracking-wider uppercase text-stone-600">Realism Boost</label>
                  <span className="text-sm font-medium text-stone-950">{realismStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.1"
                  value={realismStrength}
                  onChange={(e) => setRealismStrength(Number.parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-stone-500 mt-1">Higher = more photorealistic, lower = more stylized</p>
              </div>

              <div>
                <label className="text-xs tracking-wider uppercase text-stone-600 mb-2 block">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm"
                >
                  <option value="1:1">Square (1:1)</option>
                  <option value="4:5">Portrait (4:5)</option>
                  <option value="16:9">Landscape (16:9)</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex-1 min-h-0 px-3 sm:px-4">
        <div
          ref={messagesContainerRef}
          className="h-full overflow-y-auto pr-1 scroll-smooth"
          style={{
            paddingBottom: "11rem",
          }}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
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
                Hi, I'm Maya. I'll help you create beautiful photos and videos.
              </p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 w-full max-w-2xl px-2 sm:px-4 -mx-2 sm:-mx-0">
                {currentPrompts.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(item.prompt, item.label)}
                    className="flex-shrink-0 px-4 py-2.5 sm:py-3 bg-white/50 backdrop-blur-xl border border-white/70 rounded-xl hover:bg-stone-100 hover:border-stone-300 transition-all duration-300 touch-manipulation active:scale-95 min-h-[44px]"
                  >
                    <span className="text-xs tracking-wide font-medium text-stone-700 whitespace-nowrap">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredMessages &&
            Array.isArray(filteredMessages) &&
            filteredMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] sm:max-w-[85%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                  {msg.parts &&
                    Array.isArray(msg.parts) &&
                    msg.parts.map((part, partIndex) => {
                      if (part.type === "text") {
                        return (
                          <div
                            key={partIndex}
                            className={`p-4 rounded-2xl transition-all duration-300 ${
                              msg.role === "user"
                                ? "bg-stone-950 text-white shadow-lg shadow-stone-950/20"
                                : "bg-white/50 backdrop-blur-xl border border-white/70 shadow-lg shadow-stone-950/5 text-stone-950"
                            }`}
                            role={msg.role === "assistant" ? "article" : undefined}
                          >
                            {renderMessageContent(part.text, msg.role === "user")}
                          </div>
                        )
                      }

                      if (part.type === "tool-generateConcepts") {
                        const toolPart = part as any
                        const output = toolPart.output

                        if (output && output.state === "ready" && Array.isArray(output.concepts)) {
                          const concepts = output.concepts

                          return (
                            <div key={partIndex} className="mt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-stone-600"></div>
                                <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600">
                                  Photo Ideas
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                {concepts.map((concept: any, conceptIndex: number) => (
                                  <ConceptCard key={conceptIndex} concept={concept} />
                                ))}
                              </div>
                            </div>
                          )
                        }
                        // This part is now handled by the isGeneratingConcepts check before the message
                      }

                      if (part.type === "tool-generateVideo") {
                        const toolPart = part as any
                        const output = toolPart.output

                        if (output && output.state === "processing") {
                          return (
                            <div key={partIndex} className="mt-3">
                              <VideoCard
                                videoUrl=""
                                status="processing"
                                progress={output.progress}
                                motionPrompt={toolPart.args?.motionPrompt}
                              />
                            </div>
                          )
                        }

                        if (output && output.state === "ready" && output.videoUrl) {
                          return (
                            <div key={partIndex} className="mt-3">
                              <VideoCard
                                videoUrl={output.videoUrl}
                                motionPrompt={toolPart.args?.motionPrompt}
                                imageSource={toolPart.args?.imageUrl}
                              />
                            </div>
                          )
                        }

                        if (output && output.state === "loading") {
                          return (
                            <div key={partIndex} className="mt-3">
                              <div className="flex items-center gap-2 text-stone-600">
                                <div className="w-1.5 h-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs tracking-[0.15em] uppercase font-light">
                                  Starting video generation...
                                </span>
                              </div>
                            </div>
                          )
                        }
                      }

                      return null
                    })}
                </div>
              </div>
            ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/50 backdrop-blur-xl border border-white/70 p-3 rounded-2xl max-w-[85%] shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"></div>
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <span className="text-xs font-light text-stone-600">Maya is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Concept generation loading indicator */}
          {isGeneratingConcepts && (
            <div className="flex justify-start mt-4">
              <div className="bg-white/50 backdrop-blur-xl border border-white/70 p-3 rounded-2xl max-w-[85%] shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
                  <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600">
                    Creating photo concepts...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showScrollButton && (
          <button
            onClick={() => {
              isAtBottomRef.current = true
              scrollToBottom("smooth")
            }}
            className="fixed bottom-[11rem] right-4 sm:right-6 p-3 bg-stone-950 text-white rounded-full shadow-2xl shadow-stone-900/40 hover:scale-110 active:scale-95 transition-all duration-300 z-10 animate-in fade-in slide-in-from-bottom-2 min-w-[48px] min-h-[48px] flex items-center justify-center touch-manipulation"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-stone-200/50 px-3 sm:px-4 py-2.5 sm:py-3 z-50 safe-bottom"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        {!isEmpty && !uploadedImage && (
          <div className="mb-2">
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
              {currentPrompts.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(item.prompt, item.label)}
                  disabled={isTyping}
                  className="flex-shrink-0 px-3 py-2 bg-white/40 backdrop-blur-xl border border-white/60 rounded-lg hover:bg-white/60 transition-all duration-300 disabled:opacity-50 touch-manipulation active:scale-95 min-h-[44px]"
                >
                  <span className="text-xs tracking-wide font-medium text-stone-700 whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {uploadedImage && (
          <div className="mb-2 relative inline-block">
            <div className="relative w-20 h-20 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-white/60 shadow-lg">
              <img src={uploadedImage || "/placeholder.svg"} alt="Inspiration" className="w-full h-full object-cover" />
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute top-1 right-1 w-6 h-6 bg-stone-950 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform touch-manipulation"
                aria-label="Remove image"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-xs text-stone-600 mt-1 tracking-wide">Inspiration Image</p>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              aria-label="Upload image file"
            />

            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              disabled={isTyping}
              className="absolute left-2 bottom-2.5 w-9 h-9 flex items-center justify-center text-stone-600 hover:text-stone-950 transition-colors disabled:opacity-50 touch-manipulation active:scale-95 z-10 pointer-events-auto"
              aria-label="Chat menu"
              type="button"
            >
              <Sliders size={20} strokeWidth={2} />
            </button>

            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px"
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                  setTimeout(() => {
                    const textarea = e.target as HTMLTextAreaElement
                    textarea.style.height = "48px"
                  }, 0)
                }
              }}
              onClick={(e) => {
                e.currentTarget.focus()
              }}
              onTouchEnd={(e) => {
                e.currentTarget.focus()
              }}
              placeholder={uploadedImage ? "Describe the style..." : "Message Maya..."}
              className="w-full pl-[5.5rem] pr-12 py-3 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl text-stone-950 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-950/50 focus:bg-white/60 font-medium text-[16px] min-h-[48px] max-h-[80px] shadow-lg shadow-stone-950/10 transition-all duration-300 resize-none overflow-y-auto leading-relaxed touch-manipulation"
              disabled={isTyping || isUploadingImage}
              aria-label="Message input"
              rows={1}
              inputMode="text"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck="true"
              autoComplete="off"
              enterKeyHint="send"
            />

            <button
              onClick={() => handleSendMessage()}
              className="absolute right-2 bottom-2.5 w-9 h-9 flex items-center justify-center text-stone-600 hover:text-stone-950 transition-colors disabled:opacity-50 touch-manipulation active:scale-95 z-10 pointer-events-auto"
              disabled={isTyping || (!inputValue.trim() && !uploadedImage) || isUploadingImage}
              aria-label="Send message"
              type="button"
            >
              <Send size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {showChatMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white/95 backdrop-blur-3xl border border-stone-200 rounded-2xl overflow-hidden shadow-xl shadow-stone-950/10 animate-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={() => {
                handleNewChat()
                setShowChatMenu(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors border-b border-stone-100 touch-manipulation"
            >
              <Plus size={18} strokeWidth={2} />
              <span className="font-medium">New Chat</span>
            </button>
            <button
              onClick={() => {
                setShowHistory(!showHistory)
                setShowChatMenu(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors border-b border-stone-100 touch-manipulation"
            >
              <Clock size={18} strokeWidth={2} />
              <span className="font-medium">Chat History</span>
            </button>
            <button
              onClick={() => {
                fileInputRef.current?.click()
                setShowChatMenu(false)
              }}
              disabled={isUploadingImage}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors touch-manipulation disabled:opacity-50"
            >
              <Camera size={18} strokeWidth={2} />
              <span className="font-medium">{isUploadingImage ? "Uploading..." : "Upload Inspiration"}</span>
            </button>
            <button
              onClick={() => {
                setShowSettings(!showSettings)
                setShowChatMenu(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors touch-manipulation"
            >
              <Sliders size={18} strokeWidth={2} />
              <span className="font-medium">Generation Settings</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
