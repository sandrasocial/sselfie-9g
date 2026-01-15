"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ImageIcon, Loader2 } from 'lucide-react'
import { toast } from "@/hooks/use-toast"

interface FeedPost {
  id: number
  position: number
  prompt: string
  caption: string
  content_pillar: string
  post_type?: string
  image_url: string | null
  generation_status: string
  prediction_id: string | null
}

interface FeedGridPreviewProps {
  feedId: number
  posts: FeedPost[]
  onGenerate: () => void
}

export default function FeedGridPreview({ feedId, posts, onGenerate }: FeedGridPreviewProps) {
  const [generatingPostId, setGeneratingPostId] = useState<number | null>(null)

  const handleGeneratePost = async (postId: number) => {
    setGeneratingPostId(postId)

    try {
      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate")
      }

      toast({
        title: "Generating photo",
        description: "This usually takes 1-2 minutes",
      })

      // Call refresh callback to trigger polling (non-blocking)
      // Don't await - let it refresh in background so UI updates immediately
      if (onGenerate) {
        onGenerate().catch((err) => {
          console.error("[Feed Grid Preview] Error refreshing feed data:", err)
          // Don't show error to user - this is just a background refresh
        })
      }
      
      // DON'T set generatingPostId to null here - let polling detect when image is ready
      // The component will check post.generation_status and post.prediction_id to show loading
      // With the immediate database update, generation_status should be 'generating' after refresh
    } catch (error) {
      console.error("[v0] Generate error:", error)
      toast({
        title: "Generation failed",
        description: "Please try again",
        variant: "destructive",
      })
      setGeneratingPostId(null) // Only reset on error
    }
  }

  // Reset local generating state when post gets an image (from polling)
  useEffect(() => {
    posts.forEach((post) => {
      if (post.image_url && generatingPostId === post.id) {
        setGeneratingPostId(null)
      }
    })
  }, [posts, generatingPostId])

  const sortedPosts = [...posts].sort((a, b) => a.position - b.position)
  const readyCount = posts.filter(p => p.image_url).length
  const pendingCount = posts.filter(p => !p.image_url && p.generation_status !== 'generating' && !p.prediction_id).length

  return (
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase">
            Instagram Grid
          </h2>
          <div className="flex items-center gap-3 text-xs sm:text-sm font-light text-stone-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-stone-900 rounded-full"></div>
              <span>{readyCount} Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-stone-300 rounded-full"></div>
              <span>{pendingCount} Pending</span>
            </div>
          </div>
        </div>
        <p className="text-sm font-light text-stone-500 leading-relaxed">
          Your 9-post grid as it appears on Instagram
        </p>
      </div>

      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl">
        {sortedPosts.map((post) => (
          <div
            key={post.id}
            className="aspect-square bg-white rounded-lg overflow-hidden relative group"
          >
            {post.image_url ? (
              <div className="w-full h-full">
                <Image
                  src={post.image_url || "/placeholder.svg"}
                  alt={`Post ${post.position}`}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/50 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="text-center space-y-1">
                    <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2">
                      <div className="w-2 h-2 bg-stone-900 rounded-full"></div>
                    </div>
                    <p className="text-xs text-white font-light tracking-wider">Ready</p>
                  </div>
                </div>
              </div>
            ) : post.generation_status === "generating" || 
                 (post.prediction_id && !post.image_url) || 
                 generatingPostId === post.id ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50">
                <Loader2 size={24} className="text-stone-400 animate-spin mb-2" strokeWidth={1.5} />
                <p className="text-xs text-stone-500 font-light tracking-wider">Creating...</p>
              </div>
            ) : (
              <button
                onClick={() => handleGeneratePost(post.id)}
                disabled={generatingPostId !== null}
                className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 hover:bg-white transition-colors p-3 disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="w-full h-full" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)',
                    backgroundSize: '16px 16px'
                  }}></div>
                </div>
                
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center">
                  {/* Post Type Badge */}
                  <div className="mb-3 px-3 py-1 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-full">
                    <span className="text-[9px] font-medium text-stone-900 tracking-wider uppercase">
                      {post.post_type?.toLowerCase() || 'portrait'}
                    </span>
                  </div>
                  
                  {/* Icon */}
                  <div className="mb-2 w-12 h-12 rounded-full bg-white/60 backdrop-blur-sm border border-stone-200 flex items-center justify-center shadow-sm">
                    <ImageIcon size={20} className="text-stone-400" strokeWidth={1.5} />
                  </div>
                  
                  {/* Generate Button */}
                  <span className="text-[9px] font-medium text-stone-700 tracking-wider uppercase">Click to generate</span>
                </div>
              </button>
            )}

            {/* Position indicator */}
            <div className="absolute top-2 left-2 w-5 h-5 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
              <span className="text-[10px] font-light text-stone-900">{post.position}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
