"use client"

import { useState, useEffect } from "react"
import {
  Copy,
  Download,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
  Sparkles,
  Grid3x3,
  User,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeedPost {
  id: number
  position: number
  post_type: string
  title: string
  description: string
  prompt: string
  image_url: string | null
  caption: string
  hashtags: string
  is_posted: boolean
  posted_at: string | null
  maya_tip: string | null
}

interface InstagramBio {
  id: number
  bio_text: string
}

interface Highlight {
  id: number
  title: string
  description: string
  cover_image_url: string | null
}

interface FeedPublishingHubProps {
  feedId: string
  feedLayout: any
  posts: FeedPost[]
  bio: InstagramBio | null
  highlights: Highlight[]
  username?: string
  brandName?: string
}

export default function FeedPublishingHub({
  feedId,
  feedLayout,
  posts,
  bio,
  highlights,
  username = "username",
  brandName = "Your Brand",
}: FeedPublishingHubProps) {
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [copiedHashtags, setCopiedHashtags] = useState(false)
  const [copiedBio, setCopiedBio] = useState(false)
  const [postedStatus, setPostedStatus] = useState<Record<number, boolean>>(
    posts.reduce((acc, post) => ({ ...acc, [post.id]: post.is_posted }), {}),
  )
  const [loadingTips, setLoadingTips] = useState(false)
  const [dynamicTips, setDynamicTips] = useState<Record<number, string>>({})
  const [generatingImages, setGeneratingImages] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)

  const layout = feedLayout.layout

  const copyToClipboard = async (text: string, type: "caption" | "hashtags" | "bio") => {
    await navigator.clipboard.writeText(text)
    if (type === "caption") {
      setCopiedCaption(true)
      setTimeout(() => setCopiedCaption(false), 2000)
    } else if (type === "hashtags") {
      setCopiedHashtags(true)
      setTimeout(() => setCopiedHashtags(false), 2000)
    } else if (type === "bio") {
      setCopiedBio(true)
      setTimeout(() => setCopiedBio(false), 2000)
    }
  }

  const downloadImage = (imageUrl: string, postNumber: number) => {
    const a = document.createElement("a")
    a.href = imageUrl
    a.download = `post-${postNumber}.png`
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const markAsPosted = async (postId: number) => {
    const newStatus = !postedStatus[postId]
    setPostedStatus((prev) => ({ ...prev, [postId]: newStatus }))

    await fetch(`/api/feed/${feedId}/mark-posted`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, isPosted: newStatus }),
    })
  }

  const handlePrevious = () => {
    if (selectedPost && selectedPost.position > 1) {
      const previousPost = posts.find((post) => post.position === selectedPost.position - 1)
      setSelectedPost(previousPost || null)
    }
  }

  const handleNext = () => {
    if (selectedPost && selectedPost.position < posts.length) {
      const nextPost = posts.find((post) => post.position === selectedPost.position + 1)
      setSelectedPost(nextPost || null)
    }
  }

  useEffect(() => {
    if (selectedPost && !dynamicTips[selectedPost.id]) {
      fetchInstagramTips(selectedPost)
    }
  }, [selectedPost])

  const fetchInstagramTips = async (post: FeedPost) => {
    setLoadingTips(true)
    try {
      const response = await fetch("/api/maya/instagram-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: post.post_type,
          caption: post.caption,
          position: post.position,
        }),
      })

      const data = await response.json()
      setDynamicTips((prev) => ({ ...prev, [post.id]: data.tips }))
    } catch (error) {
      console.error("[v0] Error fetching Instagram tips:", error)
    } finally {
      setLoadingTips(false)
    }
  }

  const getMayaTip = (post: FeedPost) => {
    if (dynamicTips[post.id]) {
      return dynamicTips[post.id]
    }

    const tips = {
      Quote: "Post this during peak engagement hours (6-9pm). Ask a question in your caption to boost comments.",
      "Close-Up": "This portrait creates instant connection. Use it to introduce yourself or share a personal story.",
      "Half Body": "Perfect for showing your style and personality. Great for carousel posts with tips or insights.",
      "Full Body":
        "Showcase your complete look. Tag brands you're wearing to increase reach and potential partnerships.",
      Lifestyle: "Behind-the-scenes content performs well. Share your process or daily routine to build authenticity.",
      Object: "Product shots work great with shopping tags. Use this to showcase tools, books, or items you love.",
    }
    return tips[post.post_type as keyof typeof tips] || "Share your authentic story with this post."
  }

  const postedCount = Object.values(postedStatus).filter(Boolean).length

  // Function to start image generation
  const startImageGeneration = async () => {
    setGeneratingImages(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/generate-images`, {
        method: "POST",
      })

      if (response.ok) {
        // Start polling for progress
        pollGenerationProgress()
      }
    } catch (error) {
      console.error("[v0] Error starting image generation:", error)
      setGeneratingImages(false)
    }
  }

  const pollGenerationProgress = async () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/feed/${feedId}/progress`)
        const data = await response.json()

        setGenerationProgress(data.progress)

        if (data.progress === 100) {
          clearInterval(interval)
          setGeneratingImages(false)
          // Refresh the page to show generated images
          window.location.reload()
        }
      } catch (error) {
        console.error("[v0] Error checking progress:", error)
      }
    }, 3000) // Check every 3 seconds
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-stone-950">Your Feed Preview</h1>
            <Button variant="ghost" size="sm" className="gap-2">
              <Share2 size={16} />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="px-4 py-8">
          {/* Profile Header */}
          <div className="flex items-center gap-8 mb-6">
            {/* Profile Picture with Instagram gradient ring */}
            <div className="relative">
              <div className="w-[150px] h-[150px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[3px]">
                <div className="w-full h-full rounded-full bg-white p-[3px]">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
                    <User size={48} className="text-stone-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats and Actions */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xl text-stone-950">@{username}</h2>
                <Button variant="outline" size="sm" className="rounded-lg px-6 font-semibold bg-transparent">
                  Edit profile
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg px-6 font-semibold bg-transparent">
                  View archive
                </Button>
              </div>

              {/* Stats */}
              <div className="flex gap-10 mb-6">
                <button className="hover:opacity-70 transition-opacity">
                  <span className="font-semibold text-stone-950">9</span> <span className="text-stone-950">posts</span>
                </button>
                <button className="hover:opacity-70 transition-opacity">
                  <span className="font-semibold text-stone-950">-</span>{" "}
                  <span className="text-stone-950">followers</span>
                </button>
                <button className="hover:opacity-70 transition-opacity">
                  <span className="font-semibold text-stone-950">-</span>{" "}
                  <span className="text-stone-950">following</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <div className="mb-6 max-w-[600px]">
              <div className="mb-2">
                <p className="text-sm font-semibold text-stone-950">{brandName}</p>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-stone-950 whitespace-pre-wrap leading-relaxed">{bio.bio_text}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(bio.bio_text, "bio")}
                  className="flex-shrink-0 h-8 w-8 p-0"
                >
                  {copiedBio ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="mb-8">
              <div className="flex gap-6 overflow-x-auto pb-2">
                {highlights.map((highlight) => (
                  <button key={highlight.id} className="flex flex-col items-center gap-2 min-w-[80px] group">
                    <div className="w-[77px] h-[77px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                      <div className="w-full h-full rounded-full bg-white p-[3px]">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center group-hover:opacity-80 transition-opacity">
                          <Sparkles size={24} className="text-stone-600" />
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-stone-950 text-center leading-tight max-w-[80px] truncate">
                      {highlight.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-stone-200">
          <div className="flex justify-center">
            <button className="flex items-center justify-center gap-2 px-4 py-3 border-t border-stone-950 -mt-[1px]">
              <Grid3x3 size={12} className="text-stone-950" />
              <span className="text-xs font-semibold text-stone-950 uppercase tracking-widest">Posts</span>
            </button>
          </div>
        </div>

        {/* Generate Images Button */}
        {posts.some((post) => !post.image_url) && !generatingImages && (
          <div className="mx-4 my-6 bg-gradient-to-br from-stone-950 to-stone-800 rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium mb-2">Ready to Generate Your Feed</h3>
                <p className="text-white/80 text-sm mb-4">
                  Your feed strategy is complete. Click below to generate all 9 images using your trained model.
                </p>
                <Button onClick={startImageGeneration} className="bg-white text-stone-950 hover:bg-white/90">
                  <Sparkles size={16} className="mr-2" />
                  Generate All Images
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar During Generation */}
        {generatingImages && (
          <div className="mx-4 my-6 bg-white rounded-xl p-6 border border-stone-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-950 rounded-full animate-spin" />
              <div>
                <h3 className="text-lg font-medium text-stone-950">Generating Your Feed</h3>
                <p className="text-sm text-stone-600">Maya is creating your images... {generationProgress}% complete</p>
              </div>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-3">
              <div
                className="bg-stone-950 h-3 rounded-full transition-all duration-500"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="aspect-square relative group overflow-hidden bg-stone-100"
            >
              {post.image_url ? (
                <>
                  <img
                    src={post.image_url || "/placeholder.svg"}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Instagram hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Heart size={20} fill="white" />
                      <span>-</span>
                    </div>
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <MessageCircle size={20} fill="white" />
                      <span>-</span>
                    </div>
                  </div>
                  {postedStatus[post.id] && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check size={14} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-stone-50">
                  <Sparkles size={24} className="text-stone-400 mb-2" />
                  <span className="text-xs text-stone-500 text-center">{post.title}</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Progress Tracker */}
        <div className="px-4 py-8">
          <div className="bg-gradient-to-br from-stone-50 to-white rounded-xl p-6 border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-stone-950">Publishing Progress</h3>
              <span className="text-2xl font-semibold text-stone-950">
                {postedCount}/{posts.length}
              </span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(postedCount / posts.length) * 100}%` }}
              />
            </div>
            <p className="text-sm text-stone-600 mt-3">
              {postedCount === posts.length
                ? "All posts published! Your feed is complete."
                : `${posts.length - postedCount} posts remaining to publish`}
            </p>
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-stone-200 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <Sparkles size={16} className="text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-stone-950 text-sm">@{username}</h3>
                  <p className="text-xs text-stone-600">{selectedPost.post_type}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={20} className="text-stone-950" />
              </button>
            </div>

            {/* Navigation Arrows */}
            {selectedPost.position > 1 && (
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
              >
                <ChevronLeft size={24} className="text-stone-950" />
              </button>
            )}
            {selectedPost.position < posts.length && (
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
              >
                <ChevronRight size={24} className="text-stone-950" />
              </button>
            )}

            {/* Image */}
            <div className="relative aspect-square bg-stone-100">
              {selectedPost.image_url ? (
                <img
                  src={selectedPost.image_url || "/placeholder.svg"}
                  alt={selectedPost.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                  <Sparkles size={48} className="text-stone-400 mb-4" />
                  <h3 className="text-xl font-medium text-stone-950 mb-2">{selectedPost.title}</h3>
                  <p className="text-sm text-stone-600 text-center">{selectedPost.description}</p>
                </div>
              )}
            </div>

            {/* Instagram-style action bar */}
            <div className="border-b border-stone-200 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button className="hover:opacity-60 transition-opacity">
                    <Heart size={24} className="text-stone-950" />
                  </button>
                  <button className="hover:opacity-60 transition-opacity">
                    <MessageCircle size={24} className="text-stone-950" />
                  </button>
                  <button className="hover:opacity-60 transition-opacity">
                    <Send size={24} className="text-stone-950" />
                  </button>
                </div>
                <button className="hover:opacity-60 transition-opacity">
                  <Bookmark size={24} className="text-stone-950" />
                </button>
              </div>
              <p className="text-sm text-stone-950">
                <span className="font-semibold">Post {selectedPost.position} of 9</span>
              </p>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Caption */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm text-stone-950 leading-relaxed flex-1">
                    <span className="font-semibold mr-2">@{username}</span>
                    {selectedPost.caption}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(selectedPost.caption, "caption")}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    {copiedCaption ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </Button>
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-blue-900 leading-relaxed flex-1">{selectedPost.hashtags}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(selectedPost.hashtags, "hashtags")}
                    className="flex-shrink-0 h-8 w-8 p-0"
                  >
                    {copiedHashtags ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </Button>
                </div>
              </div>

              {/* Maya's Tips */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-stone-950 mb-1">Maya's Instagram Tips</h4>
                    {loadingTips && !dynamicTips[selectedPost.id] ? (
                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                        <span>Researching current trends...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-stone-700 leading-relaxed">{getMayaTip(selectedPost)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {selectedPost.image_url && (
                  <Button
                    onClick={() => downloadImage(selectedPost.image_url!, selectedPost.position)}
                    className="flex-1 gap-2 bg-stone-950 hover:bg-stone-800"
                  >
                    <Download size={16} />
                    Save to Device
                  </Button>
                )}
                <Button
                  onClick={() => markAsPosted(selectedPost.id)}
                  className={`flex-1 gap-2 ${
                    postedStatus[selectedPost.id] ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <Check size={16} />
                  {postedStatus[selectedPost.id] ? "Posted" : "Mark as Posted"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
