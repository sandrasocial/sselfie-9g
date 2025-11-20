"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageIcon, Loader2 } from 'lucide-react'
import { toast } from "@/hooks/use-toast"

interface FeedPost {
  id: number
  position: number
  prompt: string
  caption: string
  content_pillar: string
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
        description: "This takes about 30 seconds",
      })

      onGenerate()
    } catch (error) {
      console.error("[v0] Generate error:", error)
      toast({
        title: "Generation failed",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setGeneratingPostId(null)
    }
  }

  const sortedPosts = [...posts].sort((a, b) => a.position - b.position)
  const readyCount = posts.filter(p => p.image_url).length
  const pendingCount = posts.filter(p => !p.image_url && p.generation_status !== 'generating').length

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
            ) : post.generation_status === "generating" || generatingPostId === post.id ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50">
                <Loader2 size={24} className="text-stone-400 animate-spin mb-2" strokeWidth={1.5} />
                <p className="text-xs text-stone-500 font-light tracking-wider">Creating...</p>
              </div>
            ) : (
              <button
                onClick={() => handleGeneratePost(post.id)}
                disabled={generatingPostId !== null}
                className="w-full h-full flex flex-col items-center justify-center bg-stone-50 hover:bg-white transition-colors p-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ImageIcon size={20} className="text-stone-300 mb-2" strokeWidth={1.5} />
                <p className="text-[10px] text-stone-900 font-light mb-1 tracking-wider">Post {post.position}</p>
                <p className="text-[9px] text-stone-500 text-center line-clamp-2 leading-tight">
                  {post.prompt || post.content_pillar}
                </p>
                <span className="text-[9px] text-stone-400 mt-2 tracking-wider uppercase">Generate</span>
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
