"use client"

import { useState, useEffect, useRef } from "react"
import {
  Grid3x3,
  LayoutGrid,
  List,
  Loader2,
  ChevronLeft,
  MessageCircle,
  Heart,
  Bookmark,
  Send,
  MoreHorizontal,
  X,
} from "lucide-react"
import Image from "next/image"
import { mutate } from "swr"
import { toast } from "@/hooks/use-toast"

interface InstagramFeedViewProps {
  feedData: any
  onBack?: () => void
}

export default function InstagramFeedView({ feedData, onBack }: InstagramFeedViewProps) {
  console.log("[v0] ==================== INSTAGRAM FEED VIEW RENDERED ====================")
  console.log("[v0] feedData:", feedData ? "exists" : "null")
  console.log("[v0] feedData.posts count:", feedData?.posts?.length || 0)
  console.log("[v0] feedData.feed.id:", feedData?.feed?.id)

  const [activeTab, setActiveTab] = useState<"grid" | "posts" | "strategy">("grid")
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [expandedCaptions, setExpandedCaptions] = useState<Set<number>>(new Set())
  const [generatingPosts, setGeneratingPosts] = useState<Set<number>>(new Set())
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingActiveRef = useRef(false)
  const [completedPosts, setCompletedPosts] = useState<Set<number>>(new Set())
  const [pollBackoff, setPollBackoff] = useState(10000) // Start at 10 seconds instead of 5
  const [regeneratingPost, setRegeneratingPost] = useState<number | null>(null)
  const [showGallery, setShowGallery] = useState<number | null>(null)

  const [isFeedComplete, setIsFeedComplete] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const posts = feedData?.posts ? [...feedData.posts].sort((a: any, b: any) => a.position - b.position) : []
  const feedId = feedData?.feed?.id
  const totalPosts = 9
  const readyPosts = posts.filter((p: any) => p.image_url).length
  const progress = Math.round((readyPosts / totalPosts) * 100)

  console.log("[v0] Calculated values:")
  console.log("[v0]  - posts count:", posts.length)
  console.log("[v0]  - feedId:", feedId)
  console.log("[v0]  - readyPosts:", readyPosts)
  console.log("[v0]  - progress:", progress + "%")

  useEffect(() => {
    console.log(
      "[v0] Feed completion check - readyPosts:",
      readyPosts,
      "totalPosts:",
      totalPosts,
      "isFeedComplete:",
      isFeedComplete,
    )

    if (readyPosts === totalPosts && !isFeedComplete) {
      console.log("[v0] 🎉 All posts complete! Revealing feed with confetti")
      setIsFeedComplete(true)

      // Trigger confetti celebration
      setTimeout(() => {
        setShowConfetti(true)
        triggerConfetti()
      }, 500)

      // Clear confetti after 3 seconds
      setTimeout(() => {
        setShowConfetti(false)
      }, 3500)

      // Clear localStorage
      if (feedId) {
        localStorage.removeItem(`feedPolling_${feedId}`)
      }
    }
  }, [readyPosts, totalPosts, isFeedComplete, feedId])

  const triggerConfetti = () => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const colors = ["#292524", "#57534e", "#78716c"] // stone colors only

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min
    }

    const confettiInterval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(confettiInterval)
        return
      }

      const particleCount = 3

      // Create confetti particles
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div")
        particle.style.position = "fixed"
        particle.style.width = "8px"
        particle.style.height = "8px"
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
        particle.style.left = Math.random() * window.innerWidth + "px"
        particle.style.top = "-10px"
        particle.style.zIndex = "9999"
        particle.style.pointerEvents = "none"
        particle.style.borderRadius = "2px"
        particle.style.opacity = "0.8"

        document.body.appendChild(particle)

        const angle = randomInRange(-30, 30)
        const velocity = randomInRange(2, 5)
        const rotation = randomInRange(0, 360)

        let posY = -10
        let posX = Number.parseFloat(particle.style.left)
        let rotateAngle = 0

        const animate = () => {
          posY += velocity
          posX += Math.sin((angle * Math.PI) / 180) * 2
          rotateAngle += 5

          particle.style.top = posY + "px"
          particle.style.left = posX + "px"
          particle.style.transform = `rotate(${rotateAngle}deg)`

          if (posY < window.innerHeight) {
            requestAnimationFrame(animate)
          } else {
            particle.remove()
          }
        }

        requestAnimationFrame(animate)
      }
    }, 100)
  }

  useEffect(() => {
    console.log(
      "[v0] Feed completion check - readyPosts:",
      readyPosts,
      "totalPosts:",
      totalPosts,
      "isFeedComplete:",
      isFeedComplete,
    )
    if (!feedId) {
      console.log("[v0] No feedId, skipping localStorage init")
      return
    }

    const savedState = localStorage.getItem(`feedPolling_${feedId}`)
    if (savedState) {
      try {
        const { completedPostIds, backoffDelay } = JSON.parse(savedState)
        setCompletedPosts(new Set(completedPostIds))
        setPollBackoff(backoffDelay)
        console.log(
          "[v0] Resumed polling state from localStorage - completed:",
          completedPostIds.length,
          "backoff:",
          backoffDelay,
        )
      } catch (error) {
        console.error("[v0] Error loading polling state:", error)
      }
    } else {
      console.log("[v0] No saved polling state found")
    }
  }, [feedId])

  useEffect(() => {
    if (!feedId || completedPosts.size === 0) return

    const timeoutId = setTimeout(() => {
      localStorage.setItem(
        `feedPolling_${feedId}`,
        JSON.stringify({
          completedPostIds: Array.from(completedPosts),
          backoffDelay: pollBackoff,
        }),
      )
      console.log("[v0] Saved polling state - completed:", completedPosts.size, "backoff:", pollBackoff)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [completedPosts, pollBackoff, feedId])

  useEffect(() => {
    if (!feedId || !feedData?.posts) {
      console.log("[v0] No feed posts data, skipping polling setup")
      return
    }

    const postsInProgress = feedData.posts.filter(
      (p: any) => p.prediction_id && p.generation_status === "generating" && !p.image_url && !completedPosts.has(p.id),
    )

    console.log("[v0] Polling check:")
    console.log("[v0]  - Total posts:", feedData.posts.length)
    console.log("[v0]  - Posts with prediction_id:", feedData.posts.filter((p: any) => p.prediction_id).length)
    console.log(
      "[v0]  - Posts generating:",
      feedData.posts.filter((p: any) => p.generation_status === "generating").length,
    )
    console.log("[v0]  - Posts in progress (needs polling):", postsInProgress.length)
    console.log(
      "[v0]  - Posts in progress IDs:",
      postsInProgress.map((p: any) => p.id),
    )

    if (postsInProgress.length === 0) {
      if (pollIntervalRef.current) {
        console.log("[v0] No posts in progress, clearing poll interval")
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
        isPollingActiveRef.current = false
      }
      // localStorage.removeItem(`feedPolling_${feedId}`) // Removed this line, it was clearing state prematurely
      return
    }

    if (isPollingActiveRef.current) {
      console.log("[v0] Polling already active, skipping new interval setup.")
      return
    }

    isPollingActiveRef.current = true
    console.log("[v0] Setting up polling interval...")

    const poll = async () => {
      console.log("[v0] === POLLING TICK === Checking posts...")
      // Re-fetch latest feed data to check current state
      const latestFeedRes = await fetch(`/api/feed/${feedId}`)
      if (!latestFeedRes.ok) {
        console.error("[v0] Failed to fetch latest feed data:", latestFeedRes.status)
        return
      }

      const latestFeed = await latestFeedRes.json()
      const stillGenerating = latestFeed.posts.filter(
        (p: any) =>
          p.prediction_id && p.generation_status === "generating" && !p.image_url && !completedPosts.has(p.id),
      )

      if (stillGenerating.length === 0) {
        console.log("[v0] No more posts generating in the latest fetch.")
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
          isPollingActiveRef.current = false
          console.log("[v0] Cleared polling interval.")
        }
        return
      }

      console.log(
        "[v0] Polling for:",
        stillGenerating.map((p: any) => p.id),
      )

      for (const post of stillGenerating) {
        if (!post.prediction_id) {
          console.log("[v0] Post", post.id, "- No prediction_id, skipping check.")
          continue
        }

        try {
          const checkUrl = `/api/feed/${feedId}/check-post?predictionId=${post.prediction_id}&postId=${post.id}`
          console.log("[v0] Post", post.id, "- Calling:", checkUrl)
          const response = await fetch(checkUrl)

          console.log("[v0] Post", post.id, "- Response status:", response.status)

          if (response.status === 429) {
            console.log("[v0] Rate limited, backing off...")
            setPollBackoff((prev) => {
              const newBackoff = Math.min(prev * 2, 30000)
              console.log("[v0] New backoff delay:", newBackoff)
              return newBackoff
            })
            // Don't process further in this tick if rate limited, wait for next interval with backoff
            return
          }

          if (!response.ok) {
            console.error("[v0] Post", post.id, "- Check-post error:", response.status)
            continue
          }

          const data = await response.json()
          console.log("[v0] Post", post.id, "- Status:", data.status)

          if (data.status === "succeeded" && data.imageUrl) {
            console.log("[v0] Post", post.id, "- ✓ COMPLETED! Image URL:", data.imageUrl)
            setCompletedPosts((prev) => {
              const updated = new Set(prev).add(post.id)
              console.log("[v0] Updated completed posts count:", updated.size)
              return updated
            })
            await mutate(`/api/feed/${feedId}`)
            setPollBackoff(10000) // Reset to 10 seconds
          }
        } catch (error) {
          console.error("[v0] Post", post.id, "- Error during polling:", error)
        }
      }
      console.log("[v0] === POLLING TICK COMPLETE ===")
    }

    poll() // Initial call
    pollIntervalRef.current = setInterval(poll, pollBackoff)
    console.log("[v0] Polling interval started with delay:", pollBackoff, "ms")

    return () => {
      if (pollIntervalRef.current) {
        console.log("[v0] Cleaning up poll interval")
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
        isPollingActiveRef.current = false
      }
    }
  }, [feedId, completedPosts, pollBackoff])

  const toggleCaption = (postId: number) => {
    const newExpanded = new Set(expandedCaptions)
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId)
    } else {
      newExpanded.add(postId)
    }
    setExpandedCaptions(newExpanded)
  }

  const handleGenerateSingle = async (postId: number) => {
    try {
      setGeneratingPosts((prev) => new Set(prev).add(postId))

      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate")
      }

      toast({
        title: "Creating your photo",
        description: "This takes about 30 seconds",
      })

      await mutate(`/api/feed/${feedId}`)
    } catch (error: any) {
      setGeneratingPosts((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })

      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleRegeneratePost = async (postId: number) => {
    if (!confirm("Regenerate this photo? This will use 1 credit.")) {
      return
    }

    setRegeneratingPost(postId)

    try {
      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })

      if (!response.ok) {
        throw new Error("Failed to regenerate")
      }

      toast({
        title: "Regenerating photo",
        description: "This takes about 30 seconds",
      })

      await mutate(`/api/feed/${feedId}`)
    } catch (error) {
      toast({
        title: "Regeneration failed",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setRegeneratingPost(null)
    }
  }

  if (!feedId || !isFeedComplete) {
    return (
      <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen relative overflow-hidden">
        {/* Blurred Instagram Feed Preview */}
        <div className="filter blur-lg pointer-events-none opacity-50">
          <div className="bg-white border-b border-stone-200">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="w-24 h-6 bg-stone-200 rounded"></div>
              <div className="flex items-center gap-1">
                <div className="w-16 h-5 bg-stone-200 rounded"></div>
              </div>
              <div className="w-6 h-6 bg-stone-200 rounded-full"></div>
            </div>

            <div className="px-8 pb-4">
              <div className="flex items-start gap-12">
                <div className="w-32 h-32 rounded-full bg-stone-200"></div>
                <div className="flex-1 space-y-4">
                  <div className="flex gap-8">
                    <div className="w-16 h-12 bg-stone-200 rounded"></div>
                    <div className="w-16 h-12 bg-stone-200 rounded"></div>
                    <div className="w-16 h-12 bg-stone-200 rounded"></div>
                  </div>
                  <div className="w-full h-16 bg-stone-200 rounded"></div>
                </div>
              </div>
            </div>

            <div className="flex border-t border-stone-200">
              <div className="flex-1 h-12 bg-stone-100"></div>
              <div className="flex-1 h-12 bg-stone-50"></div>
              <div className="flex-1 h-12 bg-stone-50"></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 p-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-stone-200 rounded"></div>
            ))}
          </div>
        </div>

        {/* Loading Overlay */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center px-8 max-w-md">
            <div className="mb-12 relative w-40 h-40 mx-auto">
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-40 h-40 rounded-full border-2 border-transparent border-t-stone-950 animate-spin"
                  style={{ animationDuration: "2s" }}
                ></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-32 h-32 rounded-full border-2 border-transparent border-b-stone-400 animate-spin"
                  style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
                ></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 flex items-center justify-center">
                  <img src="/icon-192.png" alt="SSELFIE Logo" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-stone-950 text-2xl font-serif font-extralight tracking-[0.3em] uppercase">
                {feedId ? "Maya is creating your photos" : "Loading your feed"}
              </h2>

              {feedId && (
                <>
                  <div className="flex items-center gap-3 justify-center">
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
                    <span className="text-sm font-light text-stone-600">
                      {readyPosts}/{totalPosts} photos ready
                    </span>
                  </div>

                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-stone-900 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className="text-xs font-light text-stone-500 leading-relaxed">
                    Your feed will be revealed when all images are complete
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen">
      <div className="bg-white border-b border-stone-200">
        <div className="flex items-center justify-between px-4 py-3">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-stone-50 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-stone-900" strokeWidth={2} />
            </button>
          )}
          <div className="flex items-center gap-1">
            <span className="text-base font-semibold text-stone-900">sselfie</span>
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <button className="p-2 -mr-2 hover:bg-stone-50 rounded-full transition-colors">
            <MoreHorizontal size={24} className="text-stone-900" strokeWidth={2} />
          </button>
        </div>

        <div className="px-4 md:px-8 pb-4">
          <div className="flex flex-col md:flex-row md:items-start md:gap-12 mb-4">
            <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[3px] mb-4 md:mb-0">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-2xl md:text-4xl font-bold text-stone-900">S</span>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-sm md:text-base font-semibold text-stone-900">9</div>
                  <div className="text-xs md:text-sm text-stone-500">posts</div>
                </div>
                <div className="text-center">
                  <div className="text-sm md:text-base font-semibold text-stone-900">1.2K</div>
                  <div className="text-xs md:text-sm text-stone-500">followers</div>
                </div>
                <div className="text-center">
                  <div className="text-sm md:text-base font-semibold text-stone-900">342</div>
                  <div className="text-xs md:text-sm text-stone-500">following</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold text-stone-900">SSELFIE Studio</div>
                <div className="text-sm text-stone-900 whitespace-pre-wrap">
                  {feedData.bio?.bio_text || "Your Instagram feed strategy created by Maya"}
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
                  Following
                </button>
                <button className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors">
                  Message
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-t border-stone-200">
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
              activeTab === "grid" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
            }`}
          >
            <Grid3x3 size={20} strokeWidth={activeTab === "grid" ? 2.5 : 2} />
            <span className="text-xs font-medium uppercase tracking-wider">Grid</span>
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
              activeTab === "posts" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
            }`}
          >
            <LayoutGrid size={20} strokeWidth={activeTab === "posts" ? 2.5 : 2} />
            <span className="text-xs font-medium uppercase tracking-wider">Posts</span>
          </button>
          <button
            onClick={() => setActiveTab("strategy")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-t-2 transition-colors ${
              activeTab === "strategy" ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400"
            }`}
          >
            <List size={20} strokeWidth={activeTab === "strategy" ? 2.5 : 2} />
            <span className="text-xs font-medium uppercase tracking-wider">Strategy</span>
          </button>
        </div>
      </div>

      <div className="pb-20">
        {activeTab === "grid" && (
          <div className="grid grid-cols-3 gap-[2px] md:gap-1">
            {posts.map((post: any) => {
              const isGenerating = post.generation_status === "generating" || generatingPosts.has(post.id)
              const shotTypeLabel = post.content_pillar?.toLowerCase() || `post ${post.position}`

              return (
                <div key={post.id} className="aspect-square bg-stone-100 relative group">
                  {post.image_url ? (
                    <>
                      <Image
                        src={post.image_url || "/placeholder.svg"}
                        alt={`Post ${post.position}`}
                        fill
                        className="object-cover cursor-pointer"
                        sizes="(max-width: 768px) 33vw, 311px"
                        onClick={() => setSelectedPost(post)}
                      />
                      <div className="absolute inset-0 bg-stone-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRegeneratePost(post.id)
                          }}
                          disabled={regeneratingPost === post.id}
                          className="text-[10px] font-semibold text-white bg-stone-900 hover:bg-stone-800 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                        >
                          {regeneratingPost === post.id ? "Regenerating..." : "Regenerate"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowGallery(post.id)
                          }}
                          className="text-[10px] font-semibold text-white bg-stone-700 hover:bg-stone-600 px-3 py-1.5 rounded transition-colors"
                        >
                          Choose from Gallery
                        </button>
                      </div>
                    </>
                  ) : isGenerating ? (
                    <div className="absolute inset-0 bg-stone-50 flex flex-col items-center justify-center p-3">
                      <Loader2 className="w-6 h-6 text-stone-400 animate-spin mb-2" strokeWidth={1.5} />
                      <div className="text-[10px] font-light text-stone-500 text-center">Creating</div>
                    </div>
                  ) : (
                    <div
                      className="absolute inset-0 bg-white border border-stone-200 flex flex-col"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerateSingle(post.id)
                      }}
                    >
                      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-stone-100">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center flex-shrink-0">
                          <span className="text-[8px] font-bold text-stone-700">S</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[8px] font-semibold text-stone-950 truncate">sselfie</span>
                          <span className="text-[7px] text-stone-500 truncate lowercase">{shotTypeLabel}</span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
                        <p className="text-[11px] font-light leading-relaxed text-stone-600 mb-3 lowercase">
                          {shotTypeLabel}
                        </p>
                        <button className="text-[9px] font-semibold text-stone-900 hover:text-stone-700 transition-colors px-3 py-1.5 bg-stone-100 rounded">
                          Create Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "posts" && (
          <div className="space-y-6 md:space-y-8">
            {posts.map((post: any) => {
              const isExpanded = expandedCaptions.has(post.id)
              const caption = post.caption || ""
              const shouldTruncate = caption.length > 150
              const displayCaption = isExpanded || !shouldTruncate ? caption : caption.substring(0, 150) + "..."

              return (
                <div key={post.id} className="border-b border-stone-100 pb-6">
                  <div className="flex items-center justify-between px-4 md:px-0 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <span className="text-xs font-bold text-stone-900">S</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">sselfie</p>
                        <p className="text-xs text-stone-500">{post.content_pillar || `Post ${post.position}`}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                      <MoreHorizontal size={20} className="text-stone-900" />
                    </button>
                  </div>

                  <div className="aspect-square bg-stone-100 relative">
                    {post.image_url ? (
                      <Image
                        src={post.image_url || "/placeholder.svg"}
                        alt={`Post ${post.position}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 935px"
                      />
                    ) : post.generation_status === "generating" ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-stone-400" strokeWidth={1.5} />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <button
                          onClick={() => handleGenerateSingle(post.id)}
                          className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
                        >
                          Generate Photo
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="px-4 md:px-0 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button className="hover:opacity-60 transition-opacity">
                          <Heart size={24} className="text-stone-900" strokeWidth={2} />
                        </button>
                        <button className="hover:opacity-60 transition-opacity">
                          <MessageCircle size={24} className="text-stone-900" strokeWidth={2} />
                        </button>
                        <button className="hover:opacity-60 transition-opacity">
                          <Send size={24} className="text-stone-900" strokeWidth={2} />
                        </button>
                      </div>
                      <button className="hover:opacity-60 transition-opacity">
                        <Bookmark size={24} className="text-stone-900" strokeWidth={2} />
                      </button>
                    </div>

                    <div className="text-sm">
                      <span className="font-semibold text-stone-900">sselfie</span>{" "}
                      <span className="text-stone-900 whitespace-pre-wrap">{displayCaption}</span>
                      {shouldTruncate && (
                        <button
                          onClick={() => toggleCaption(post.id)}
                          className="text-stone-500 ml-1 hover:text-stone-700 transition-colors"
                        >
                          {isExpanded ? "less" : "more"}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 uppercase tracking-wide">Just now</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "strategy" && (
          <div className="p-4 md:p-8 space-y-8">
            {/* Overall Strategy */}
            <div className="bg-stone-50 rounded-xl p-6 space-y-4">
              <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
                Your Instagram Strategy
              </div>
              <div className="text-sm font-light text-stone-700 leading-relaxed whitespace-pre-wrap">
                {feedData.strategy?.brand_positioning ||
                  feedData.feed.feed_story ||
                  "Your Instagram feed strategy created by Maya"}
              </div>
            </div>

            {/* Posting Strategy */}
            {feedData.strategy?.posting_schedule && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">When To Post</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {feedData.strategy.posting_schedule.optimalTimes?.map((time: any, idx: number) => (
                    <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-2">
                      <div className="text-sm font-medium text-stone-900">{time.day}</div>
                      <div className="text-lg font-semibold text-stone-900">{time.time}</div>
                      <div className="text-xs text-stone-600">{time.reason}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border border-stone-200 rounded-xl p-4">
                  <div className="text-xs text-stone-500 mb-2">Posting Frequency</div>
                  <div className="text-sm text-stone-700">{feedData.strategy.posting_schedule.frequency}</div>
                </div>
              </div>
            )}

            {/* Content Strategy */}
            {feedData.strategy?.content_pillars && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
                  Content Mix Strategy
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(feedData.strategy.content_pillars).map(([key, value]: any) => (
                    <div key={key} className="bg-stone-50 rounded-xl p-4 space-y-2">
                      <div className="text-sm font-medium text-stone-900 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="text-xs text-stone-600 leading-relaxed">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story Strategy */}
            {feedData.strategy?.caption_templates && Array.isArray(feedData.strategy.caption_templates) && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
                  Story Sequences For Each Post
                </div>
                {feedData.strategy.caption_templates.slice(0, 9).map((story: any, idx: number) => (
                  <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-stone-900">Post {story.postNumber || idx + 1}</div>
                      <div className="text-xs text-stone-500">{story.storyTiming}</div>
                    </div>
                    <div className="text-xs text-stone-600">{story.storyPurpose}</div>
                    <div className="space-y-1.5">
                      {story.storySequence?.map((seq: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-semibold text-stone-600">{i + 1}</span>
                          </div>
                          <div className="text-xs text-stone-700 leading-relaxed">{seq}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reel Strategy */}
            {feedData.strategy?.content_format_mix?.reels && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
                  Reel Recommendations
                </div>
                {feedData.strategy.content_format_mix.reels.map((reel: any, idx: number) => (
                  <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
                    <div className="text-sm font-medium text-stone-900">Post {reel.postNumber} → Reel</div>
                    <div className="text-xs text-stone-600 leading-relaxed">{reel.reelConcept}</div>
                    <div className="space-y-2">
                      <div className="text-[10px] text-stone-500 uppercase tracking-wider">Hook</div>
                      <div className="text-xs text-stone-700 font-medium">{reel.hookSuggestion}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] text-stone-500 uppercase tracking-wider">Trending Audio</div>
                      <div className="text-xs text-stone-700">{reel.audioRecommendation}</div>
                    </div>
                    <div className="text-[10px] text-stone-500">{reel.coverPhotoTips}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Carousel Strategy */}
            {feedData.strategy?.content_format_mix?.carousels && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Carousel Ideas</div>
                {feedData.strategy.content_format_mix.carousels.map((carousel: any, idx: number) => (
                  <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
                    <div className="text-sm font-medium text-stone-900">Post {carousel.postNumber} → Carousel</div>
                    <div className="text-xs text-stone-600 leading-relaxed">{carousel.carouselIdea}</div>
                    <div className="space-y-1.5">
                      {carousel.slideBreakdown?.map((slide: string, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-semibold text-stone-600">{i + 1}</span>
                          </div>
                          <div className="text-xs text-stone-700">{slide}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Growth Tactics */}
            {feedData.strategy?.growth_tactics && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Growth Tactics</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(feedData.strategy.growth_tactics).map(([key, tactics]: any) => (
                    <div key={key} className="bg-stone-50 rounded-xl p-4 space-y-3">
                      <div className="text-sm font-medium text-stone-900 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="space-y-1.5">
                        {tactics.map((tactic: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0 mt-1.5" />
                            <div className="text-xs text-stone-600 leading-relaxed">{tactic}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtag Strategy */}
            {feedData.strategy?.hashtag_strategy && (
              <div className="space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Hashtag Strategy</div>
                <div className="bg-stone-50 rounded-xl p-4 space-y-4">
                  <div>
                    <div className="text-xs text-stone-500 mb-2">Main Hashtags (Use on every post)</div>
                    <div className="flex flex-wrap gap-2">
                      {feedData.strategy.hashtag_strategy.mainHashtags?.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-2">Rotating Hashtags (Vary by post)</div>
                    <div className="flex flex-wrap gap-2">
                      {feedData.strategy.hashtag_strategy.rotatingHashtags?.map((tag: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-stone-600 pt-2 border-t border-stone-200">
                    💡 {feedData.strategy.hashtag_strategy.hashtagPlacement}
                  </div>
                </div>
              </div>
            )}

            {/* Trending Strategy */}
            {feedData.strategy?.content_format_mix?.trends && (
              <div className="bg-stone-50 rounded-xl p-6 space-y-4">
                <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Trend Strategy</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-stone-500 mb-1">When to Use Trends</div>
                    <div className="text-sm text-stone-700 leading-relaxed">
                      {feedData.strategy.content_format_mix.trends.whenToUseTrends}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-1">Trending Audio</div>
                    <div className="text-sm text-stone-700">
                      {feedData.strategy.content_format_mix.trends.trendingAudio?.join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-500 mb-1">Brand Alignment</div>
                    <div className="text-sm text-stone-700 leading-relaxed">
                      {feedData.strategy.content_format_mix.trends.personalBrandAlignment}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Pattern (existing) */}
            <div className="bg-stone-50 rounded-xl p-4 space-y-3">
              <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Grid Pattern</div>
              <div className="text-sm font-light text-stone-700">{feedData.feed.layout_type || "Balanced Mix"}</div>
              <div className="text-sm font-light text-stone-600 leading-relaxed">
                {feedData.feed.visual_rhythm || "Dynamic flow with varied composition"}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-stone-900/60 hover:bg-stone-900/80 rounded-full transition-colors"
            >
              <X size={20} className="text-white" />
            </button>

            <div className="md:w-2/3 bg-stone-900 flex items-center justify-center">
              <Image
                src={selectedPost.image_url || "/placeholder.svg"}
                alt={`Post ${selectedPost.position}`}
                width={800}
                height={800}
                className="max-h-[90vh] object-contain"
              />
            </div>

            <div className="md:w-1/3 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <span className="text-xs font-bold text-stone-900">S</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">sselfie</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                  <MoreHorizontal size={24} className="text-stone-900" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="text-sm">
                  <span className="font-semibold text-stone-900">sselfie</span>{" "}
                  <span className="text-stone-900 whitespace-pre-wrap">{selectedPost.caption}</span>
                </div>
                <p className="text-xs text-stone-400 uppercase tracking-wide mt-3">Just now</p>
              </div>

              <div className="border-t border-stone-200 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <button className="hover:opacity-60 transition-opacity">
                      <Heart size={24} className="text-stone-900" strokeWidth={2} />
                    </button>
                    <button className="hover:opacity-60 transition-opacity">
                      <MessageCircle size={24} className="text-stone-900" strokeWidth={2} />
                    </button>
                    <button className="hover:opacity-60 transition-opacity">
                      <Send size={24} className="text-stone-900" strokeWidth={2} />
                    </button>
                  </div>
                  <button className="hover:opacity-60 transition-opacity">
                    <Bookmark size={24} className="text-stone-900" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGallery && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowGallery(null)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-900">Choose from Gallery</h3>
              <button
                onClick={() => setShowGallery(null)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-stone-500 mb-4">
              Gallery integration coming soon. You can select from your previously generated photos.
            </p>
            <button
              onClick={() => setShowGallery(null)}
              className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
