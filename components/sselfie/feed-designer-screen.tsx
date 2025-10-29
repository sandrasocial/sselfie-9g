"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Download } from "lucide-react"

import FeedPostCard from "./feed-post-card"

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
  highlights: Array<{ title: string; coverUrl: string; description: string }>
}

export default function FeedDesignerScreen() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [isDesigning, setIsDesigning] = useState(false)
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [profile, setProfile] = useState<InstagramProfile>({
    profileImage: "/placeholder.svg?height=80&width=80",
    name: "Your Brand",
    handle: "@yourbrand",
    bio: "Loading your brand story...",
    highlights: [],
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [feedStrategy, setFeedStrategy] = useState<any>(null)
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat")
  const [feedUrl, setFeedUrl] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [hasTrainedModel, setHasTrainedModel] = useState<boolean>(true)
  const [currentPrompts, setCurrentPrompts] = useState<Array<{ label: string; prompt: string }>>([])
  const [brandData, setBrandData] = useState<any>(null)
  const { status, messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/maya/feed-chat" }),
    initialMessages: [],
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
        setProfile({
          profileImage: "/placeholder.svg?height=80&width=80",
          name: data.data.name || "Your Brand",
          handle: `@${data.data.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"}`,
          bio: data.data.futureVision || data.data.currentSituation || "Building something amazing",
          highlights: [],
        })
        setCurrentPrompts(generatePersonalizedPrompts(data.data))
      } else {
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
      if (lastMessage.role === "user") {
        console.log("[v0] Maya is designing feed strategy...")
        setIsDesigning(true)
      }
    }

    if (!isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        console.log("[v0] Maya finished responding, reloading feed data in 2 seconds...")
        setTimeout(() => {
          loadLatestFeed()
          setIsDesigning(false)
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
            description: h.description,
            coverUrl: h.cover_url,
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
            description: h.description,
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

  const generateCompleteFeed = async () => {
    if (!feedStrategy) {
      setGenerationError("No feed strategy available. Please chat with Maya first.")
      return
    }

    if (!hasTrainedModel) {
      setGenerationError(
        "You need a trained model to generate images. Please complete your training in the Studio first.",
      )
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationError(null)

    try {
      const feedId = feedUrl?.split("/").pop()
      if (!feedId) {
        throw new Error("Feed ID not found")
      }

      const response = await fetch(`/api/feed/${feedId}/generate-images`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to start image generation")
      }

      const { predictions } = await response.json()
      console.log("[v0] Image generation started:", predictions)

      await pollGenerationProgress(feedId, predictions)
    } catch (error: any) {
      console.error("[v0] Error generating feed:", error)
      setGenerationError(error.message || "Failed to generate images. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const pollGenerationProgress = async (feedId: string, predictions: any[]) => {
    const maxAttempts = 120 // 4 minutes max
    let attempts = 0
    const totalPosts = predictions.length

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/feed/${feedId}/progress`)
        const data = await response.json()

        const completedCount = data.posts.filter((p: any) => p.status === "completed").length
        const failedCount = data.posts.filter((p: any) => p.status === "failed").length
        const progress = (completedCount / totalPosts) * 100

        setGenerationProgress(progress)

        setFeedPosts((prev) =>
          prev.map((post, index) => {
            const apiPost = data.posts[index]
            if (!apiPost) return post

            return {
              ...post,
              imageUrl: apiPost.image_url || post.imageUrl,
              status:
                apiPost.status === "completed"
                  ? "ready"
                  : apiPost.status === "failed"
                    ? "error"
                    : apiPost.status === "generating"
                      ? "generating"
                      : post.status,
            }
          }),
        )

        if (completedCount + failedCount === totalPosts) {
          if (failedCount > 0) {
            setGenerationError(`${failedCount} image(s) failed to generate. You can retry them individually.`)
          }
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 3000))
        attempts++
      } catch (error) {
        console.error("[v0] Error polling progress:", error)
        attempts++
      }
    }

    if (attempts >= maxAttempts) {
      setGenerationError("Image generation timed out. Some images may still be processing.")
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
    if (isTyping || isGenerating) return
    sendMessage({ text: prompt })
  }

  const handleSendMessage = () => {
    const messageText = inputValue.trim()
    if (messageText && !isTyping && !isGenerating) {
      console.log("[v0] Sending message:", messageText)
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

      // Poll for completion
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

  if (isInitializing) {
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
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isTyping && (
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
                    <span className="text-sm text-stone-600">Maya is designing...</span>
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
                      disabled={isTyping || isGenerating}
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
                disabled={isTyping || isGenerating}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isTyping || isGenerating || !inputValue?.trim()}
                className="bg-stone-950 hover:bg-stone-800 text-white self-end px-6"
              >
                Send
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`flex flex-col bg-stone-50 transition-all duration-300 ${
            mobileView === "preview" ? "flex w-full md:w-3/5" : "hidden md:flex md:w-3/5"
          }`}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="bg-white border-b border-stone-200 p-6 sticky top-0 z-10">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-start gap-6">
                  <img
                    src={profile.profileImage || "/placeholder.svg"}
                    alt={profile.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-stone-200"
                  />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-stone-950">{profile.name}</h2>
                    <p className="text-sm text-stone-500 mb-2">{profile.handle}</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{profile.bio}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-1 rounded-full bg-stone-600"></div>
                    <span className="text-xs tracking-wider uppercase font-medium text-stone-600">
                      Story Highlights
                    </span>
                  </div>
                  {profile.highlights.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {profile.highlights.map((highlight, index) => (
                        <div key={index} className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 p-[2px]">
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                              <span className="text-lg font-bold text-stone-700">{highlight.title.charAt(0)}</span>
                            </div>
                          </div>
                          <span className="text-xs text-stone-600 max-w-[64px] text-center truncate">
                            {highlight.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className="w-16 h-16 rounded-full bg-stone-200 border-2 border-stone-300 flex items-center justify-center">
                            <span className="text-xs text-stone-400">+</span>
                          </div>
                          <span className="text-xs text-stone-400">New</span>
                        </div>
                      ))}
                    </div>
                  )}
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

                {feedStrategy && feedPosts.some((p) => p.status === "concept") && (
                  <div className="mb-6 bg-white rounded-xl p-6 border border-stone-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-stone-950 mb-1">Your Feed Strategy is Ready</h3>
                        <p className="text-sm text-stone-600">
                          Generate all 9 posts at once, or click individual cards to generate them one by one
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={generateCompleteFeed}
                      disabled={!hasTrainedModel || isGenerating}
                      className="w-full bg-stone-950 hover:bg-stone-800 text-white"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate All 9 Posts
                    </Button>
                  </div>
                )}

                {isGenerating && (
                  <div className="mb-6 bg-white rounded-xl p-4 border border-stone-200">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-stone-950">
                        Generating your feed... {Math.round(generationProgress)}%
                      </span>
                    </div>
                    <Progress value={generationProgress} className="h-2" />
                    <p className="text-xs text-stone-500 mt-2">This takes about 2-3 minutes for professional quality</p>
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

                {/* Update the grid rendering to use FeedPostCard component */}
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
