"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useChat } from "@ai-sdk/react"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

interface FeedPost {
  id: string
  imageUrl: string | null
  status: "empty" | "generating" | "ready" | "error"
  title: string
  description: string
  prompt: string
  category: string
  textOverlay?: {
    text: string
    position: "top" | "center" | "bottom"
    font: string
    color: string
  }
}

interface InstagramProfile {
  profileImage: string
  name: string
  handle: string
  bio: string
  highlights: Array<{ title: string; coverUrl: string; description: string }>
}

export default function FeedDesignerScreen() {
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(
    Array(9)
      .fill(null)
      .map((_, i) => ({
        id: `post-${i}`,
        imageUrl: null,
        status: "empty" as const,
        title: "",
        description: "",
        prompt: "",
        category: "",
      })),
  )
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

  useEffect(() => {
    loadBrandProfile()
    checkTrainedModel()
  }, [])

  const loadBrandProfile = async () => {
    try {
      const response = await fetch("/api/profile/personal-brand")
      const data = await response.json()

      if (data.exists && data.completed) {
        setProfile({
          profileImage: "/placeholder.svg?height=80&width=80",
          name: data.data.name || "Your Brand",
          handle: `@${data.data.name?.toLowerCase().replace(/\s+/g, "") || "yourbrand"}`,
          bio: data.data.futureVision || data.data.currentSituation || "Building something amazing",
          highlights: [],
        })
      }
    } catch (error) {
      console.error("[v0] Error loading brand profile:", error)
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

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/maya/feed-chat",
    onFinish: (message) => {
      console.log("[v0] Maya response:", message)

      if (message.toolInvocations && message.toolInvocations.length > 0) {
        message.toolInvocations.forEach((invocation: any) => {
          if (invocation.toolName === "generateCompleteFeed" && invocation.result) {
            const result = invocation.result
            if (result.success && result.strategy) {
              setFeedStrategy(result.strategy)
              console.log("[v0] Feed strategy received:", result.strategy)

              if (result.strategy.instagramBio) {
                setProfile((prev) => ({
                  ...prev,
                  bio: result.strategy.instagramBio,
                }))
              }

              if (result.strategy.highlights && Array.isArray(result.strategy.highlights)) {
                const mappedHighlights = result.strategy.highlights.map((h: any) => ({
                  title: h.title,
                  coverUrl: "/placeholder.svg?height=64&width=64", // Placeholder for now
                  description: h.description,
                }))
                console.log("[v0] Setting highlights:", mappedHighlights)
                setProfile((prev) => ({
                  ...prev,
                  highlights: mappedHighlights,
                }))
              }

              if (result.feedUrl) {
                console.log("[v0] Feed URL:", result.feedUrl)
                setFeedUrl(result.feedUrl)
              }
            }
          }
        })
      }
    },
  })

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

  const pollSinglePost = async (feedId: string, postIndex: number) => {
    const maxAttempts = 60
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/feed/${feedId}/progress`)
        const data = await response.json()
        const post = data.posts[postIndex]

        if (post.status === "completed") {
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
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-950"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
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
          </div>

          <div className="flex-shrink-0 border-t border-stone-200 p-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Textarea
                value={input}
                onChange={handleInputChange}
                placeholder="Describe your brand and feed vision..."
                className="flex-1 resize-none bg-stone-50 border-stone-200"
                rows={2}
                disabled={isLoading || isGenerating}
              />
              <Button
                type="submit"
                disabled={isLoading || isGenerating || !input?.trim()}
                className="bg-stone-950 hover:bg-stone-800 text-white self-end px-6"
              >
                Send
              </Button>
            </form>
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
                  <div className="mb-6 bg-stone-100 border border-stone-300 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-stone-950 mb-1">Generation Error</p>
                        <p className="text-sm text-stone-700">{generationError}</p>
                      </div>
                      <button
                        onClick={() => setGenerationError(null)}
                        className="text-stone-400 hover:text-stone-600 text-xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {!hasTrainedModel && (
                  <div className="mb-6 bg-stone-100 border border-stone-300 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-stone-950 mb-1">Training Required</p>
                        <p className="text-sm text-stone-700 mb-3">
                          You need to train your personal model before generating feed images. This ensures all images
                          feature you!
                        </p>
                        <Button
                          onClick={() => (window.location.href = "/?tab=studio")}
                          className="bg-stone-950 hover:bg-stone-800 text-white text-sm"
                        >
                          Go to Studio
                        </Button>
                      </div>
                    </div>
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

                {feedStrategy && !isGenerating && feedPosts.every((p) => p.status === "empty") && (
                  <div className="mb-6 bg-white rounded-xl p-6 border border-stone-200">
                    <h3 className="text-lg font-bold text-stone-950 mb-4">Your Feed Strategy</h3>
                    <div className="space-y-3 mb-6">
                      {feedStrategy.posts?.map((post: any, index: number) => (
                        <div key={index} className="flex gap-3 text-sm">
                          <span className="font-semibold text-stone-950">{index + 1}.</span>
                          <div>
                            <p className="font-medium text-stone-950">{post.title}</p>
                            <p className="text-stone-600">{post.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {feedUrl && (
                      <div className="mb-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
                        <p className="text-sm text-stone-600 mb-2">Your feed is ready to view:</p>
                        <a
                          href={feedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-stone-950 hover:underline break-all"
                        >
                          {window.location.origin}
                          {feedUrl}
                        </a>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        onClick={generateCompleteFeed}
                        disabled={!hasTrainedModel}
                        className="bg-stone-950 hover:bg-stone-800 text-white"
                      >
                        Generate All 9 Posts
                      </Button>
                      {feedUrl && (
                        <Button
                          onClick={() => window.open(feedUrl, "_blank")}
                          variant="outline"
                          className="border-stone-950 text-stone-950 hover:bg-stone-50"
                        >
                          View Your Feed
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => setFeedStrategy(null)}>
                        Revise Strategy
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1 bg-white rounded-xl overflow-hidden border border-stone-200">
                  {feedPosts.map((post, index) => (
                    <div key={post.id} className="aspect-square bg-stone-100 relative group">
                      {post.status === "empty" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-stone-400 text-sm">{index + 1}</span>
                        </div>
                      )}
                      {post.status === "generating" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950/10">
                          <div className="w-6 h-6 border-2 border-stone-950 border-t-transparent rounded-full animate-spin mb-2"></div>
                          <span className="text-xs text-stone-600">Generating...</span>
                        </div>
                      )}
                      {post.status === "ready" && post.imageUrl && (
                        <img
                          src={post.imageUrl || "/placeholder.svg"}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {post.status === "error" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-200">
                          <span className="text-stone-950 text-xs mb-2">Failed</span>
                          <button
                            onClick={() => retryFailedPost(index)}
                            className="text-xs text-stone-950 hover:text-stone-700 underline"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {feedPosts.some((p) => p.status === "ready") && (
                  <div className="mt-6 flex gap-3 justify-center">
                    {feedUrl && (
                      <Button
                        onClick={() => window.open(feedUrl, "_blank")}
                        className="bg-stone-950 hover:bg-stone-800 text-white"
                      >
                        View Your Feed
                      </Button>
                    )}
                    <Button onClick={downloadFeed} variant="outline">
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
