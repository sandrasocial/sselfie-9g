"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2, ImageIcon, Copy, Check, Sparkles, Wand2, Edit2, X, Save, Hash } from 'lucide-react'
import { toast } from "@/hooks/use-toast"

interface FeedPostCardProps {
  post: {
    id: number
    position: number
    prompt: string
    caption: string
    content_pillar: string
    post_type?: string
    image_url: string | null
    generation_status: string
  }
  feedId: number
  onGenerate: () => void
}

export default function FeedPostCard({ post, feedId, onGenerate }: FeedPostCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showFullCaption, setShowFullCaption] = useState(false)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCaption, setEditedCaption] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [copiedHashtags, setCopiedHashtags] = useState(false)

  // Get post type label (portrait, carousel, quote, etc.)
  const postTypeLabel = post.post_type?.toLowerCase() || 'portrait'
  
  // Get a cleaner description from content_pillar or a default
  const getPostDescription = () => {
    if (post.content_pillar && post.content_pillar.length > 0) {
      return post.content_pillar
    }
    // Fallback based on post type
    const typeDescriptions: Record<string, string> = {
      'portrait': 'Portrait photo',
      'carousel': 'Carousel post',
      'quote': 'Quote graphic',
      'infographic': 'Infographic',
    }
    return typeDescriptions[postTypeLabel] || `Post ${post.position}`
  }

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

  const caption = post.caption || ""
  const truncatedCaption = caption.length > 100 
    ? caption.substring(0, 100) + "..." 
    : caption

  // Extract hashtags from caption
  const extractHashtags = (text: string): string => {
    const hashtagRegex = /#[\w]+/g
    const hashtags = text.match(hashtagRegex) || []
    return hashtags.join(" ")
  }

  const hashtags = extractHashtags(caption)

  // Get caption length indicator color
  const getLengthColor = (length: number): string => {
    if (length >= 125 && length <= 150) return "text-green-600" // Optimal range
    if (length > 150 && length <= 300) return "text-yellow-600" // Good but getting long
    if (length > 300) return "text-orange-600" // Very long
    return "text-stone-500" // Too short
  }

  const getLengthIndicator = (length: number): string => {
    if (length >= 125 && length <= 150) return "Optimal" // Best engagement
    if (length > 150 && length <= 300) return "Good"
    if (length > 300) return "Long"
    return "Short" // Better if 125-150 chars
  }

  const copyCaptionToClipboard = async () => {
    if (!caption) {
      toast({
        title: "No caption",
        description: "This post doesn't have a caption yet",
        variant: "destructive",
      })
      return
    }
    try {
      await navigator.clipboard.writeText(caption)
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
    if (!caption) {
      toast({
        title: "No caption to enhance",
        description: "Please regenerate the caption first",
        variant: "destructive",
      })
      return
    }

    setIsEnhancing(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/enhance-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id, currentCaption: caption }),
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

  const handleRegenerateCaption = async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/regenerate-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to regenerate caption")
      }

      const data = await response.json()
      
      if (data.caption) {
        // Refresh the component by calling onGenerate to trigger a re-fetch
        onGenerate()
        toast({
          title: "Caption regenerated!",
          description: "Maya has created a new caption for this post.",
        })
      } else {
        throw new Error("No caption returned")
      }
    } catch (error) {
      console.error("[v0] Regenerate caption error:", error)
      toast({
        title: "Regeneration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleStartEdit = () => {
    setEditedCaption(caption)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditedCaption("")
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (editedCaption.trim() === caption) {
      // No changes
      setIsEditing(false)
      return
    }

    if (editedCaption.trim().length > 2200) {
      toast({
        title: "Caption too long",
        description: "Instagram captions can be at most 2,200 characters",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/update-caption`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id, caption: editedCaption.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update caption")
      }

      onGenerate()
      setIsEditing(false)
      toast({
        title: "Caption updated!",
        description: "Your changes have been saved.",
      })
    } catch (error) {
      console.error("[v0] Save caption error:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyHashtags = async () => {
    if (!hashtags) {
      toast({
        title: "No hashtags",
        description: "This caption doesn't have any hashtags",
        variant: "destructive",
      })
      return
    }

    try {
      await navigator.clipboard.writeText(hashtags)
      setCopiedHashtags(true)
      setTimeout(() => setCopiedHashtags(false), 2000)
      toast({
        title: "Hashtags copied!",
        description: `${hashtags.split(" ").length} hashtags copied to clipboard`,
      })
    } catch (error) {
      console.error("[v0] Failed to copy hashtags:", error)
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive",
      })
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
            {post.content_pillar && (
              <p className="text-xs text-stone-500 capitalize">{post.content_pillar}</p>
            )}
          </div>
        </div>
        <button className="p-2 hover:bg-stone-50 rounded-full transition-colors">
          <MoreHorizontal size={20} className="text-stone-950" />
        </button>
      </div>

      {/* Instagram Image */}
      <div className="relative aspect-square bg-gradient-to-br from-stone-50 to-stone-100">
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
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full border-4 border-stone-200 border-t-stone-900 animate-spin"></div>
              <Wand2 size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-900" strokeWidth={2} />
            </div>
            <p className="text-sm text-stone-700 font-light tracking-wider">Creating your image...</p>
            <p className="text-xs text-stone-500 mt-1">This takes about 30 seconds</p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="w-full h-full" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }}></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
              {/* Post Type Badge */}
              <div className="mb-6 px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-full">
                <span className="text-xs font-medium text-stone-900 tracking-wider uppercase">
                  {postTypeLabel}
                </span>
              </div>
              
              {/* Icon */}
              <div className="mb-4 w-20 h-20 rounded-full bg-white/60 backdrop-blur-sm border border-stone-200 flex items-center justify-center shadow-sm">
                <ImageIcon size={32} className="text-stone-400" strokeWidth={1.5} />
              </div>
              
              {/* Description */}
              <p className="text-sm text-stone-700 text-center font-light leading-relaxed mb-8 px-4">
                {getPostDescription()}
              </p>
              
              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="group px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium tracking-wide rounded-xl transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              >
                <Wand2 size={16} className="group-hover:rotate-12 transition-transform" strokeWidth={2} />
                <span>Generate</span>
              </button>
            </div>
            
            {/* Position indicator - subtle in corner */}
            <div className="absolute top-4 right-4 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm border border-stone-200">
              <span className="text-[10px] font-medium text-stone-700">{post.position}</span>
            </div>
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
        {isRegenerating ? (
          <div className="space-y-2 px-4 py-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="text-stone-600 animate-spin" />
              <p className="text-sm text-stone-700">Maya is creating a new caption...</p>
            </div>
          </div>
        ) : isEditing ? (
          <div className="space-y-3 px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-stone-950">sselfie</span>
            </div>
            <textarea
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              className="w-full min-h-[120px] px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent resize-y"
              placeholder="Write your caption here..."
              maxLength={2200}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${getLengthColor(editedCaption.length)}`}>
                  {editedCaption.length}/2,200 • {getLengthIndicator(editedCaption.length)}
                </span>
                {editedCaption.length >= 125 && editedCaption.length <= 150 && (
                  <span className="text-xs text-green-600">✨ Optimal</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || editedCaption.trim() === caption}
                  className="px-3 py-1.5 text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : caption ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm flex-1 min-w-0">
                <span className="font-semibold text-stone-950">sselfie</span>{" "}
                <span className="text-stone-950 whitespace-pre-wrap break-words">
                  {showFullCaption ? caption : truncatedCaption}
                </span>
                {caption.length > 100 && (
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
                {hashtags && (
                  <button
                    onClick={handleCopyHashtags}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300"
                    title="Copy hashtags"
                  >
                    {copiedHashtags ? (
                      <Check size={18} className="text-green-600" />
                    ) : (
                      <Hash size={18} className="text-stone-600" />
                    )}
                  </button>
                )}
                <button
                  onClick={handleStartEdit}
                  disabled={isRegenerating || isEnhancing}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Edit caption"
                >
                  <Edit2 size={18} className="text-stone-600" />
                </button>
                <button
                  onClick={handleRegenerateCaption}
                  disabled={isRegenerating || isEnhancing}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Regenerate caption"
                >
                  <Wand2 size={18} className="text-stone-600" />
                </button>
                <button
                  onClick={handleEnhanceCaption}
                  disabled={isEnhancing || isRegenerating}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Enhance caption (make it longer)"
                >
                  {isEnhancing ? (
                    <Loader2 size={18} className="text-stone-600 animate-spin" />
                  ) : (
                    <Sparkles size={18} className="text-stone-600" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between px-4">
              <p className="text-xs text-stone-400 uppercase tracking-wide">Just now</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${getLengthColor(caption.length)}`}>
                  {caption.length} chars • {getLengthIndicator(caption.length)}
                </span>
                {caption.length >= 125 && caption.length <= 150 && (
                  <span className="text-xs text-green-600">✨</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 px-4 py-2 bg-stone-50 rounded-lg border border-stone-200">
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-500 italic">No caption yet</p>
              <button
                onClick={handleRegenerateCaption}
                disabled={isRegenerating}
                className="px-3 py-1.5 text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    <span>Generate Caption</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
