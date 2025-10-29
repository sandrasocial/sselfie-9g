"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Download, Plus, History } from "lucide-react"

import FeedPostCard from "./feed-post-card"
import BrandProfileWizard from "./brand-profile-wizard"
import StoryHighlightCard from "./story-highlight-card"
import MayaChatHistory from "./maya-chat-history"

interface FeedPost {
  id: string | number
  imageUrl: string | null
  status: "concept" | "generating" | "ready" | "error"
  title: string
  description: string
  prompt: string
  category: string
  caption?: string
  hashtags?: string
  textOverlay?: {
    text: string
    position: "top" | "center" | "bottom"
    font: string
    color: string
  }
  position: number // Added for FeedPostCard
}

interface InstagramProfile {
  profileImage: string
  name: string
  handle: string
  bio: string
  highlights: Array<{ title: string; coverUrl: string; description: string; type: "image" | "color" }>
}

export default function FeedDesignerScreen() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [isDesigning, setIsDesigning] = useState(false)
  const [isApplyingDesign, setIsApplyingDesign] = useState(false)
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [profile, setProfile] = useState<InstagramProfile>({
    profileImage: "/placeholder.svg?height=80&width=80",
    name: "Your Brand",
    handle: "@yourbrand",
    bio: "Loading your brand story...",
    highlights: [],
  })
  const [feedStrategy, setFeedStrategy] = useState<any>(null)
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat")
  const [feedUrl, setFeedUrl] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [hasTrainedModel, setHasTrainedModel] = useState<boolean>(true)
  const [currentPrompts, setCurrentPrompts] = useState<Array<{ label: string; prompt: string }>>([])
  const [brandData, setBrandData] = useState<any>(null)
  const [showBrandWizard, setShowBrandWizard] = useState(false)
  const [brandCompleted, setBrandCompleted] = useState(true) // Default to true to prevent premature rendering
  const [editingHighlights, setEditingHighlights] = useState(false)
  const [chatId, setChatId] = useState<number | null>(null)
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const savedMessageIds = useRef(new Set<string>())

  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profilePredictionId, setProfilePredictionId] = useState<string | null>(null)
  const [profileGenerationId, setProfileGenerationId] = useState<string | null>(null)
  const [isProfileGenerated, setIsProfileGenerated] = useState(false)

  useEffect(() => {
    if (!profilePredictionId || !profileGenerationId || isProfileGenerated) {
      return
    }

    console.log("[v0] Starting polling for profile image with prediction", profilePredictionId)

    const pollInterval = setInterval(async () => {
      try {
        console.log("[v0] Polling profile image generation status...")
        const response = await fetch(
          `/api/maya/check-generation?predictionId=${profilePredictionId}&generationId=${profileGenerationId}`,
        )
        const data = await response.json()

        console.log("[v0] Profile image generation status:", data.status)

        if (data.status === "succeeded") {
          console.log("[v0] Profile image generation succeeded! Image URL:", data.imageUrl)
          setProfile((prev) => ({ ...prev, profileImage: data.imageUrl }))
          setIsProfileGenerated(true)
          setIsGeneratingProfile(false)
          clearInterval(pollInterval)

          if (feedUrl) {
            const feedId = feedUrl.split("/").pop()
            if (feedId) {
              try {
                await fetch(`/api/feed/${feedId}/profile-image`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ profileImageUrl: data.imageUrl }),
                })
              } catch (error) {
                console.error("[v0] Error saving profile image:", error)
              }
            }
          }
        } else if (data.status === "failed") {
          console.log("[v0] Profile image generation failed:", data.error)
          setProfileError(data.error || "Generation failed")
          setIsGeneratingProfile(false)
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error("[v0] Error polling generation:", err)
        setProfileError("Failed to check generation status")
        setIsGeneratingProfile(false)
        clearInterval(pollInterval)
      }
    }, 3000)

    return () => {
      console.log("[v0] Cleaning up polling interval")
      clearInterval(pollInterval)
    }
  }, [profilePredictionId, profileGenerationId, isProfileGenerated, feedUrl])

  const handleGenerateProfileImage = async () => {
    if (!brandData) {
      setProfileError("Complete your brand profile first")
      return
    }

    setIsGeneratingProfile(true)
    setProfileError(null)

    try {
      console.log("[v0] Generating profile image...")

      const mayaResponse = await fetch("/api/maya/generate-feed-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: "Profile Picture",
          caption: `Professional profile picture for ${brandData.name || "personal brand"}`,
          feedPosition: 0,
          colorTheme: brandData.colorTheme,
          brandVibe: brandData.brandVibe || brandData.futureVision,
        }),
      })

      let conceptPrompt: string
      if (!mayaResponse.ok) {
        console.error("[v0] Maya prompt generation failed, using fallback")
        conceptPrompt = `Professional Instagram profile picture for ${brandData.name || "personal brand"}. ${brandData.brandVibe || ""}. Clean, professional, and eye-catching.`
      } else {
        const mayaData = await mayaResponse.json()
        conceptPrompt = mayaData.prompt
        console.log("[v0] Maya generated profile prompt:", conceptPrompt)
      }

      const response = await fetch("/api/maya/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptTitle: "Profile Picture",
          conceptDescription: `Professional profile picture for ${brandData.name || "personal brand"}`,
          conceptPrompt,
          category: "feed-design",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image")
      }

      console.log("[v0] Generation started with prediction ID:", data.predictionId)
      setProfilePredictionId(data.predictionId)
      setProfileGenerationId(data.generationId)
    } catch (err) {
      console.error("[v0] Error generating profile image:", err)
      setProfileError(err instanceof Error ? err.message : "Failed to generate image")
      setIsGeneratingProfile(false)
    }
  }

  const { status, messages, sendMessage, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/maya/feed-chat" }),
    initialMessages: [],
    body: {
      chatId: chatId,
    },
    onError: (error) => {
      console.error("[v0] Feed chat error:", error)
      setIsDesigning(false)
    },
  })

  const isTyping = status === "submitted" || status === "streaming"
  const [inputValue, setInputValue] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const generatePersonalizedPrompts = (brand: any) => {
    return [
      {
        label: "Story Highlights",
        prompt: "Create my story highlights",
      },
      {
        label: "Profile Picture",
        prompt: "Create my profile picture",
      },
      {
        label: "Feed Layout",
        prompt: "Design my feed layout",
      },
      {
        label: "Instagram Strategy",
        prompt: "Create my instagram strategy",
      },
    ]
  }

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        await Promise.all([loadBrandProfile(), checkTrainedModel(), loadLatestFeed()])
      } catch (error) {
        console.error("[v0] Error initializing component:", error)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeComponent()
  }, [])

  const loadBrandProfile = async () => {
    try {
      const response = await fetch("/api/profile/personal-brand")
      const data = await response.json()

      if (data.exists && data.completed) {
        setBrandData(data.data)
        setBrandCompleted(true)
        setShowBrandWizard(false)
        setProfile({
          profileImage: data.data.profileImage || "/placeholder.svg?height=80&width=80",
          name: data.data.name || "Your Brand",
          handle: `@${data.data.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"}`,
          bio: data.data.futureVision || data.data.currentSituation || "Building something amazing",
          highlights: data.data.highlights || [],
        })
        setCurrentPrompts(generatePersonalizedPrompts(data.data))
      } else {
        setShowBrandWizard(true)
        setBrandCompleted(false)
        setCurrentPrompts(generatePersonalizedPrompts(null))
      }
    } catch (error) {
      console.error("[v0] Error loading brand profile:", error)
      setCurrentPrompts(generatePersonalizedPrompts(null))
    }
  }

  const checkTrainedModel = async () => {
    try {
      console.log("[v0] Checking trained model status...")
      const response = await fetch("/api/training/status")
      const data = await response.json()
      console.log("[v0] Training status response:", data)

      const hasModel = data.hasTrainedModel === true
      console.log("[v0] Has trained model:", hasModel)

      setHasTrainedModel(hasModel)
    } catch (error) {
      console.error("[v0] Error checking trained model:", error)
      setHasTrainedModel(false)
    }
  }

  useEffect(() => {
    if (isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      // Only set isDesigning when Maya is responding (assistant message being generated)
      if (lastMessage.role === "assistant") {
        console.log("[v0] Maya is designing feed strategy...")
        setIsDesigning(true)
      }
    }

    if (!isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        console.log("[v0] Maya finished responding, reloading feed data in 2 seconds...")
        setIsApplyingDesign(true)
        setTimeout(() => {
          loadLatestFeed()
          setIsDesigning(false)
          setIsApplyingDesign(false)
        }, 2000)
      }
    }
  }, [isTyping, messages])

  const loadLatestFeed = async () => {
    try {
      console.log("[v0] Loading latest feed...")
      const response = await fetch("/api/feed/latest")

      if (!response.ok) {
        console.error("[v0] Failed to load feed:", response.status)
        return
      }

      const data = await response.json()

      if (data.exists && data.feed) {
        console.log("[v0] ✓ Latest feed found with", data.posts?.length || 0, "posts")

        const strategy = {
          brandVibe: data.feed.brand_vibe,
          businessType: data.feed.business_type,
          colorPalette: data.feed.color_palette,
          visualRhythm: data.feed.visual_rhythm,
          feedStory: data.feed.feed_story,
          instagramBio: data.bio?.bio_text || profile.bio,
          highlights: data.highlights.map((h: any) => ({
            title: h.title,
            description: h.prompt, // This is the FLUX prompt Maya generated
            coverUrl: h.cover_url,
            type: h.type || "image",
          })),
          posts: data.posts.map((p: any) => ({
            id: p.id,
            title: p.post_type || p.category,
            description: p.prompt,
            prompt: p.prompt,
            category: p.post_type || p.category,
            caption: p.caption,
            hashtags: p.hashtags,
            textOverlay: p.text_overlay_style,
          })),
        }

        setFeedStrategy(strategy)
        setFeedUrl(`/feed/${data.feed.id}`)

        if (data.bio) {
          setProfile((prev) => ({
            ...prev,
            bio: data.bio.bio_text,
          }))
        }

        if (data.highlights.length > 0) {
          const mappedHighlights = data.highlights.map((h: any) => ({
            title: h.title,
            coverUrl: h.cover_url || "/placeholder.svg?height=64&width=64",
            description: h.prompt, // This is the FLUX prompt Maya generated
            type: h.type || "image",
          }))
          setProfile((prev) => ({
            ...prev,
            highlights: mappedHighlights,
          }))
        }

        const postsWithConcepts = data.posts.map((p: any) => ({
          id: p.id, // Use actual database ID
          imageUrl: p.image_url,
          status: p.image_url ? ("ready" as const) : ("concept" as const),
          title: p.post_type || "Post",
          description: p.prompt || "",
          prompt: p.prompt || "",
          category: p.post_type || "Portrait",
          caption: p.caption,
          hashtags: p.hashtags,
          textOverlay: p.text_overlay_style,
          position: p.position,
        }))

        setFeedPosts(postsWithConcepts)
        console.log("[v0] ✓ Feed loaded with", postsWithConcepts.length, "concept cards")
      } else {
        console.log("[v0] No existing feed found")
      }
    } catch (error) {
      console.error("[v0] Error loading latest feed:", error)
    }
  }

  const retryFailedPost = async (postIndex: number) => {
    const post = feedPosts[postIndex]
    if (!feedUrl) return

    const feedId = feedUrl.split("/").pop()
    if (!feedId) return

    try {
      setFeedPosts((prev) => prev.map((p, i) => (i === postIndex ? { ...p, status: "generating" as const } : p)))

      const response = await fetch(`/api/feed/${feedId}/retry-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIndex }),
      })

      if (!response.ok) {
        throw new Error("Failed to retry generation")
      }

      await pollSinglePost(feedId, postIndex)
    } catch (error) {
      console.error("[v0] Error retrying post:", error)
      setFeedPosts((prev) => prev.map((p, i) => (i === postIndex ? { ...p, status: "error" as const } : p)))
    }
  }

  const pollSinglePost = async (feedId: string, postIndex: number, predictionId?: string) => {
    const maxAttempts = 60
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          predictionId ? `/api/feed/${feedId}/prediction/${predictionId}` : `/api/feed/${feedId}/progress`,
        )
        const data = await response.json()
        const post = predictionId ? data.prediction : data.posts[postIndex]

        if (!post) {
          console.error(`[v0] Post data not found for index ${postIndex}`)
          return
        }

        if (post.status === "completed" || post.status === "ready") {
          setFeedPosts((prev) =>
            prev.map((p, i) =>
              i === postIndex
                ? {
                    ...p,
                    imageUrl: post.image_url,
                    status: "ready" as const,
                  }
                : p,
            ),
          )
          break
        }

        if (post.status === "failed") {
          setFeedPosts((prev) => prev.map((p, i) => (i === postIndex ? { ...p, status: "error" as const } : p)))
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 3000))
        attempts++
      } catch (error) {
        console.error("[v0] Error polling single post:", error)
        attempts++
      }
    }
    if (attempts >= maxAttempts) {
      console.warn(`[v0] Polling for post ${postIndex} timed out.`)
      setFeedPosts((prev) => prev.map((p, i) => (i === postIndex ? { ...p, status: "error" as const } : p)))
    }
  }

  const downloadFeed = async () => {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()

    feedPosts.forEach((post, index) => {
      if (post.imageUrl && post.status === "ready") {
        const base64Data = post.imageUrl.split(",")[1]
        zip.file(`post-${index + 1}.png`, base64Data, { base64: true })
      }
    })

    const captions = feedPosts
      .map((post, index) => {
        if (post.status === "ready") {
          return `Post ${index + 1}: ${post.title}\n${post.description}\n\n`
        }
        return ""
      })
      .join("")

    zip.file("captions.txt", captions)

    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "instagram-feed.zip"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleQuickPrompt = (prompt: string) => {
    if (isTyping) return
    sendMessage({ text: prompt })
  }

  const handleSendMessage = () => {
    const messageText = inputValue.trim()
    if (messageText && !isTyping) {
      console.log("[v0] Sending message:", messageText)

      if (chatId) {
        fetch("/api/maya/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            role: "user",
            content: messageText,
          }),
        }).catch((error) => {
          console.error("[v0] Error saving user message:", error)
        })
      }

      sendMessage({ text: messageText })
      setInputValue("")
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const handleGeneratePost = async (feedId: string, postIndex: number) => {
    console.log("[v0] Generating post:", { feedId, postIndex })

    try {
      setFeedPosts((prev) => prev.map((p, i) => (i === postIndex ? { ...p, status: "generating" as const } : p)))

      const response = await fetch(`/api/feed/${feedId}/generate-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIndex }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate post")
      }

      const pollInterval = setInterval(async () => {
        const progressResponse = await fetch(`/api/feed/${feedId}/progress`)
        const data = await progressResponse.json()
        const post = data.posts[postIndex]

        if (post.status === "completed") {
          clearInterval(pollInterval)
          setFeedPosts((prev) =>
            prev.map((p, i) =>
              i === postIndex
                ? {
                    ...p,
                    imageUrl: post.image_url,
                    status: "ready" as const,
                  }
                : p,
            ),
          )
        } else if (post.status === "failed") {
          clearInterval(pollInterval)
          setFeedPosts((prev) => prev.map((p, i) => (i === postIndex ? { ...p, status: "error" as const } : p)))
        }
      }, 3000)

      setTimeout(() => clearInterval(pollInterval), 120000) // 2 min timeout
    } catch (error) {
      console.error("[v0] Error generating post:", error)
      setFeedPosts((prev) => prev.map((p, i) => (i === postIndex ? { ...p, status: "error" as const } : p)))
    }
  }

  const handleBrandWizardComplete = () => {
    console.log("[v0] Brand wizard completed, reloading brand profile...")
    setShowBrandWizard(false)
    loadBrandProfile()
  }

  const handleAddHighlight = () => {
    setProfile((prev) => ({
      ...prev,
      highlights: [...prev.highlights, { title: "", coverUrl: "#D4C5B9", description: "", type: "image" }],
    }))
    setEditingHighlights(true)
  }

  const handleUpdateHighlight = async (
    index: number,
    data: { title: string; coverUrl: string; description: string; type: "image" | "color" },
  ) => {
    setProfile((prev) => ({
      ...prev,
      highlights: prev.highlights.map((h, i) =>
        i === index
          ? { title: data.title, coverUrl: data.coverUrl, description: data.description, type: data.type }
          : h,
      ),
    }))

    if (feedUrl) {
      const feedId = feedUrl.split("/").pop()
      if (feedId) {
        try {
          const updatedHighlights = profile.highlights.map((h, i) =>
            i === index
              ? { title: data.title, coverUrl: data.coverUrl, description: data.description, type: data.type }
              : h,
          )

          console.log("[v0] Saving highlight to database:", { index, coverUrl: data.coverUrl })

          await fetch(`/api/feed/${feedId}/highlights`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ highlights: updatedHighlights }),
          })

          console.log("[v0] Highlight saved successfully")
        } catch (error) {
          console.error("[v0] Error saving highlights:", error)
        }
      }
    }
  }

  const handleRemoveHighlight = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index),
    }))
  }

  useEffect(() => {
    loadChat()
  }, [])

  useEffect(() => {
    if (!chatId || isTyping) return

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== "assistant") return
    if (savedMessageIds.current.has(lastMessage.id)) return

    const textParts = lastMessage.parts?.filter((p: any) => p.type === "text") || []
    const textContent = textParts
      .map((p: any) => p.text)
      .join("\n")
      .trim()

    if (!textContent) return

    savedMessageIds.current.add(lastMessage.id)

    fetch("/api/maya/save-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        role: lastMessage.role,
        content: textContent,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          savedMessageIds.current.delete(lastMessage.id)
        }
      })
      .catch(() => {
        savedMessageIds.current.delete(lastMessage.id)
      })
  }, [messages, chatId, isTyping])

  const loadChat = async (specificChatId?: number) => {
    try {
      setIsLoadingChat(true)
      const url = specificChatId
        ? `/api/maya/load-chat?chatId=${specificChatId}&chatType=feed-designer`
        : "/api/maya/load-chat?chatType=feed-designer"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setChatId(data.chatId)

        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages)
        } else {
          setMessages([])
        }

        setShowHistory(false)
      }
    } catch (error) {
      console.error("[v0] Error loading chat:", error)
    } finally {
      setIsLoadingChat(false)
    }
  }

  const handleNewChat = async () => {
    try {
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType: "feed-designer" }),
      })

      if (response.ok) {
        const data = await response.json()
        setChatId(data.chatId)
        savedMessageIds.current.clear()
        setMessages([])
        setShowHistory(false)
      }
    } catch (error) {
      console.error("[v0] Error creating new chat:", error)
    }
  }

  const handleSelectChat = (selectedChatId: number) => {
    if (selectedChatId !== chatId) {
      setChatId(selectedChatId)
      setMessages([])
      savedMessageIds.current.clear()
      loadChat(selectedChatId)
    }
  }

  if (isInitializing || isLoadingChat) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-stone-950 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-stone-600">Loading feed designer...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {showBrandWizard && !brandCompleted && (
        <BrandProfileWizard
          isOpen={showBrandWizard}
          onClose={() => setShowBrandWizard(false)}
          onComplete={handleBrandWizardComplete}
          existingData={brandData}
        />
      )}

      <div className="md:hidden flex-shrink-0 border-b border-stone-200 bg-white">
        <div className="flex">
          <button
            onClick={() => setMobileView("chat")}
            className={`flex-1 py-3 text-sm font-medium tracking-wide transition-all ${
              mobileView === "chat"
                ? "text-stone-950 border-b-2 border-stone-950"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Chat with Maya
          </button>
          <button
            onClick={() => setMobileView("preview")}
            className={`flex-1 py-3 text-sm font-medium tracking-wide transition-all ${
              mobileView === "preview"
                ? "text-stone-950 border-b-2 border-stone-950"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Feed Preview
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          className={`flex flex-col bg-white border-r border-stone-200 transition-all duration-300 ${
            mobileView === "chat" ? "flex w-full md:w-2/5" : "hidden md:flex md:w-2/5"
          }`}
        >
          <div className="flex-shrink-0 border-b border-stone-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-stone-200">
                  <img
                    src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                    alt="Maya"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-950">Maya</h3>
                  <p className="text-xs text-stone-500">Instagram Strategist</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-2 rounded-lg transition-all ${
                    showHistory ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                  title="Chat history"
                >
                  <History size={18} />
                </button>

                <button
                  onClick={handleNewChat}
                  className="p-2 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-all"
                  title="Start new chat"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {showHistory && (
            <div className="flex-shrink-0 border-b border-stone-200 p-4 bg-stone-50">
              <MayaChatHistory currentChatId={chatId} onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isTyping && !brandCompleted && (
              <div className="flex flex-col items-center justify-center h-full px-4 py-8">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-stone-200 mb-4">
                  <img
                    src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                    alt="Maya"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-xl font-bold text-stone-950 mb-2 text-center">Complete Your Brand Profile</h2>
                <p className="text-sm text-stone-600 text-center mb-6 max-w-md leading-relaxed">
                  Before I can design your perfect Instagram feed, I need to understand your unique brand story, style,
                  and vision. This takes just a few minutes!
                </p>
                <Button onClick={() => setShowBrandWizard(true)} className="bg-stone-950 hover:bg-stone-800 text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Brand Profile
                </Button>
              </div>
            )}

            {messages.length === 0 && !isTyping && brandCompleted && (
              <div className="flex flex-col items-center justify-center h-full px-4 py-8">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-stone-200 mb-4">
                  <img
                    src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                    alt="Maya"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-xl font-bold text-stone-950 mb-2 text-center">Plan Your Instagram Feed</h2>
                <p className="text-sm text-stone-600 text-center mb-6 max-w-md leading-relaxed">
                  Tell me about your brand and I'll create a strategic 9-post feed with captions, hashtags, and
                  personalized tips.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {currentPrompts.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickPrompt(item.prompt)}
                      className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 hover:border-stone-300 transition-all text-center group"
                    >
                      <span className="text-xs font-medium text-stone-700 transition-colors">{item.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-stone-200">
                    <img
                      src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                      alt="Maya"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className={`max-w-[80%] ${message.role === "user" ? "order-2" : "order-1"}`}>
                  {message.parts &&
                    Array.isArray(message.parts) &&
                    message.parts.map((part, partIndex) => {
                      if (part.type === "text") {
                        return (
                          <div
                            key={partIndex}
                            className={`rounded-2xl px-4 py-3 ${
                              message.role === "user" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-950"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>
                          </div>
                        )
                      }
                      return null
                    })}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-stone-200">
                  <img
                    src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                    alt="Maya"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-stone-100 rounded-2xl px-4 py-3 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full animate-bounce bg-stone-700"></div>
                      <div
                        className="w-2 h-2 rounded-full animate-bounce bg-stone-700"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full animate-bounce bg-stone-700"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                    <span className="text-sm text-stone-600">
                      {isDesigning ? "Maya is designing your feed..." : "Maya is thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex-shrink-0 border-t border-stone-200 p-4">
            {messages.length > 0 && !isTyping && (
              <div className="mb-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {currentPrompts.slice(0, 3).map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickPrompt(item.prompt)}
                      disabled={isTyping}
                      className="flex-shrink-0 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 hover:border-stone-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-xs font-medium text-stone-700 whitespace-nowrap">{item.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe your brand and feed vision..."
                className="flex-1 resize-none bg-stone-50 border-stone-200"
                rows={2}
                disabled={isTyping}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isTyping || !inputValue?.trim()}
                className="bg-stone-950 hover:bg-stone-800 text-white self-end px-6"
              >
                Send
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`flex flex-col bg-stone-50 transition-all duration-300 relative ${
            mobileView === "preview" ? "flex w-full md:w-3/5" : "hidden md:flex md:w-3/5"
          }`}
        >
          {(isDesigning || isApplyingDesign) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-stone-950 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm font-medium text-stone-950 mb-1">
                  {isDesigning ? "Maya is designing your feed..." : "Applying design..."}
                </p>
                <p className="text-xs text-stone-600">
                  {isDesigning
                    ? "Creating a strategic 9-post layout with concepts tailored to your brand"
                    : "Your feed strategy is being loaded into the preview"}
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="bg-white border-b border-stone-200 p-6 sticky top-0 z-10">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-start gap-6">
                  <div className="relative group">
                    {!isGeneratingProfile && !isProfileGenerated && brandData ? (
                      <button
                        onClick={handleGenerateProfileImage}
                        className="w-20 h-20 rounded-full overflow-hidden border-2 border-stone-200 hover:border-stone-400 transition-all relative group"
                      >
                        <img
                          src={profile.profileImage || "/placeholder.svg"}
                          alt={profile.name}
                          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-stone-950/50 rounded-full">
                          <span className="text-xs text-white font-medium">Generate</span>
                        </div>
                      </button>
                    ) : isGeneratingProfile ? (
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-stone-200 bg-stone-100 flex items-center justify-center">
                        <div className="relative w-10 h-10">
                          <div className="absolute inset-0 rounded-full bg-stone-200/20 animate-ping"></div>
                          <div className="relative w-10 h-10 rounded-full bg-stone-950 animate-spin border-4 border-transparent border-t-white"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-stone-200">
                        <img
                          src={profile.profileImage || "/placeholder.svg"}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-stone-950">{profile.name}</h2>
                    <p className="text-sm text-stone-500 mb-2">{profile.handle}</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{profile.bio}</p>
                    {profileError && <p className="text-xs text-red-600 mt-2">{profileError}</p>}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-stone-600"></div>
                      <span className="text-xs tracking-wider uppercase font-medium text-stone-600">
                        Story Highlights
                      </span>
                    </div>
                    <Button
                      onClick={() => setEditingHighlights(!editingHighlights)}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      {editingHighlights ? "Done" : "Edit"}
                    </Button>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {profile.highlights.map((highlight, index) => (
                      <StoryHighlightCard
                        key={index}
                        highlight={highlight}
                        index={index}
                        onUpdate={handleUpdateHighlight}
                        onRemove={handleRemoveHighlight}
                        userColorTheme={brandData?.colorTheme}
                        feedId={feedUrl?.split("/").pop()}
                        isEditing={editingHighlights}
                      />
                    ))}

                    {(editingHighlights || profile.highlights.length === 0) && profile.highlights.length < 10 && (
                      <button
                        onClick={handleAddHighlight}
                        className="flex flex-col items-center gap-2 flex-shrink-0 w-[80px] group"
                      >
                        <div className="w-16 h-16 rounded-full bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center group-hover:border-stone-400 group-hover:bg-stone-50 transition-all">
                          <span className="text-2xl text-stone-400 group-hover:text-stone-600">+</span>
                        </div>
                        <span className="text-xs text-stone-400 group-hover:text-stone-600">Add New</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                {generationError && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-950 mb-1">Generation Error</p>
                        <p className="text-sm text-red-700">{generationError}</p>
                      </div>
                      <button
                        onClick={() => setGenerationError(null)}
                        className="text-red-400 hover:text-red-600 text-xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {!hasTrainedModel && (
                  <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-950 mb-1">Training Required</p>
                        <p className="text-sm text-amber-700 mb-3">
                          You need to train your personal model before generating feed images.
                        </p>
                        <Button
                          onClick={() => (window.location.href = "/?tab=studio")}
                          className="bg-amber-950 hover:bg-amber-800 text-white"
                        >
                          Go to Studio
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isApplyingDesign && (
                  <div className="mb-6 bg-white rounded-xl p-6 border border-stone-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-stone-200 flex-shrink-0">
                        <img
                          src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                          alt="Maya"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full animate-bounce bg-stone-700"></div>
                            <div
                              className="w-2 h-2 rounded-full animate-bounce bg-stone-700"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="w-2 h-2 rounded-full animate-bounce bg-stone-700"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-stone-950">Applying design to preview...</span>
                        </div>
                        <p className="text-xs text-stone-600">
                          Your feed strategy is being loaded into the Instagram preview
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isDesigning && feedPosts.every((p) => !p.title) && (
                  <div className="mb-6 bg-white rounded-xl p-6 border border-stone-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-stone-200 flex-shrink-0">
                        <img
                          src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                          alt="Maya"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full animate-bounce bg-stone-700"></div>
                            <div
                              className="w-2 h-2 rounded-full animate-bounce bg-stone-700"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="w-2 h-2 rounded-full animate-bounce bg-stone-700"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-stone-950">Maya is designing your feed...</span>
                        </div>
                        <p className="text-xs text-stone-600">
                          Creating a strategic 9-post layout with concepts tailored to your brand
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1 bg-white rounded-xl overflow-hidden border border-stone-200">
                  {feedPosts.map((post) => {
                    const feedId = feedUrl?.split("/").pop()

                    return (
                      <div key={post.id} className="aspect-square bg-stone-100 relative group">
                        {isDesigning && !post.title && (
                          <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-300 animate-pulse">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-8 h-8 border-2 border-stone-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                <span className="text-xs text-stone-500">Designing...</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {!isDesigning && post.status === "concept" && !post.title && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-stone-400 text-sm">{post.position + 1}</span>
                          </div>
                        )}

                        {post.title && feedId && (
                          <div className="absolute inset-0">
                            <FeedPostCard
                              post={{
                                id: post.id, // Now this is the actual database ID
                                position: post.position,
                                post_type: post.category,
                                prompt: post.prompt,
                                caption: post.caption || "",
                                image_url: post.imageUrl,
                                generation_status:
                                  post.status === "ready"
                                    ? "completed"
                                    : post.status === "generating"
                                      ? "generating"
                                      : "pending",
                                prediction_id: null,
                              }}
                              feedId={feedId}
                              onGenerated={() => loadLatestFeed()}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {feedPosts.some((p) => p.status === "ready") && (
                  <div className="mt-6 flex gap-3 justify-center">
                    {feedUrl && (
                      <Button
                        onClick={() => window.open(feedUrl, "_blank")}
                        className="bg-stone-950 hover:bg-stone-800 text-white"
                      >
                        View Full Feed
                      </Button>
                    )}
                    <Button onClick={downloadFeed} variant="outline" className="border-stone-300 bg-transparent">
                      <Download className="w-4 h-4 mr-2" />
                      Download ZIP
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
