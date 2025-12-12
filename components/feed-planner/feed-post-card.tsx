"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2, ImageIcon, Copy, Check, Sparkles } from 'lucide-react'
import { toast } from "@/hooks/use-toast"

interface FeedPostCardProps {
  post: {
    id: number
    position: number
    prompt: string
    caption: string
    content_pillar: string
    image_url: string | null
    generation_status: string
  }
  feedId: number
  onGenerate: () => void
}

export default function FeedPostCard({ post, feedId, onGenerate }: FeedPostCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showFullCaption, setShowFullCaption] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)

    try {
      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      })

      if (!response.ok) throw new Error("Failed to generate")

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
      setIsGenerating(false)
    }
  }

  const truncatedCaption = post.caption.length > 100 
    ? post.caption.substring(0, 100) + "..." 
    : post.caption

  const copyCaptionToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(post.caption)
      setCopiedCaption(true)
      setTimeout(() => setCopiedCaption(false), 2000)
      toast({
        title: "Copied!",
        description: "Caption copied to clipboard",
      })
    } catch (error) {
      console.error("[v0] Failed to copy caption:", error)
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleEnhanceCaption = async () => {
    setIsEnhancing(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/enhance-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id, currentCaption: post.caption }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to enhance caption")
      }

      const data = await response.json()
      
      if (data.enhancedCaption) {
        // Refresh the component by calling onGenerate to trigger a re-fetch
        onGenerate()
        toast({
          title: "Caption enhanced!",
          description: "Maya has improved your caption. Refresh to see the update.",
        })
      } else {
        throw new Error("No enhanced caption returned")
      }
    } catch (error) {
      console.error("[v0] Enhance caption error:", error)
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsEnhancing(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-lg max-w-[470px] mx-auto">
      {/* Instagram Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <span className="text-xs font-bold text-stone-950">S</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-950">sselfie</p>
            <p className="text-xs text-stone-500">{post.content_pillar}</p>
          </div>
        </div>
        <button className="p-2 hover:bg-stone-50 rounded-full transition-colors">
          <MoreHorizontal size={20} className="text-stone-950" />
        </button>
      </div>

      {/* Instagram Image */}
      <div className="relative aspect-square bg-stone-50">
        {post.image_url ? (
          <Image
            src={post.image_url || "/placeholder.svg"}
            alt={`Post ${post.position}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 470px"
          />
        ) : isGenerating || post.generation_status === "generating" ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Loader2 size={32} className="text-stone-400 animate-spin mb-3" strokeWidth={1.5} />
            <p className="text-sm text-stone-500 font-light tracking-wider">Creating your photo...</p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6">
            <ImageIcon size={48} className="text-stone-300 mb-4" strokeWidth={1.5} />
            <p className="text-xs text-stone-900 font-light mb-2 tracking-wider">POST {post.position}</p>
            <p className="text-xs text-stone-600 text-center line-clamp-3 leading-relaxed mb-6 max-w-xs">
              {post.prompt}
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white text-sm font-light tracking-wider rounded-xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Photo
            </button>
          </div>
        )}
      </div>

      {/* Instagram Action Bar */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="hover:opacity-60 transition-opacity">
              <Heart size={24} className="text-stone-950" strokeWidth={2} />
            </button>
            <button className="hover:opacity-60 transition-opacity">
              <MessageCircle size={24} className="text-stone-950" strokeWidth={2} />
            </button>
            <button className="hover:opacity-60 transition-opacity">
              <Send size={24} className="text-stone-950" strokeWidth={2} />
            </button>
          </div>
          <button className="hover:opacity-60 transition-opacity">
            <Bookmark size={24} className="text-stone-950" strokeWidth={2} />
          </button>
        </div>

        {/* Caption */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm flex-1 min-w-0">
              <span className="font-semibold text-stone-950">sselfie</span>{" "}
              <span className="text-stone-950 whitespace-pre-wrap break-words">
                {showFullCaption ? post.caption : truncatedCaption}
              </span>
              {post.caption.length > 100 && (
                <button
                  onClick={() => setShowFullCaption(!showFullCaption)}
                  className="text-stone-500 ml-1 hover:text-stone-700 transition-colors"
                >
                  {showFullCaption ? "less" : "more"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              <button
                onClick={copyCaptionToClipboard}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300"
                title="Copy caption"
              >
                {copiedCaption ? (
                  <Check size={18} className="text-green-600" />
                ) : (
                  <Copy size={18} className="text-stone-600" />
                )}
              </button>
              <button
                onClick={handleEnhanceCaption}
                disabled={isEnhancing}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Enhance with Maya"
              >
                {isEnhancing ? (
                  <Loader2 size={18} className="text-stone-600 animate-spin" />
                ) : (
                  <Sparkles size={18} className="text-stone-600" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Just now</p>
        </div>
      </div>
    </div>
  )
}
