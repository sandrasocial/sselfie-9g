"use client"

import { useState } from "react"
import { toast } from "@/hooks/use-toast"

/**
 * Hook for managing all feed actions (generate, regenerate, enhance, etc.)
 */
export function useFeedActions(
  feedId: number,
  posts: any[],
  feedData: any,
  onUpdate: () => void | Promise<void>
) {
  const [expandedCaptions, setExpandedCaptions] = useState<Set<number>>(new Set())
  const [copiedCaptions, setCopiedCaptions] = useState<Set<number>>(new Set())
  const [enhancingCaptions, setEnhancingCaptions] = useState<Set<number>>(new Set())
  const [isGeneratingBio, setIsGeneratingBio] = useState(false)
  const [regeneratingPost, setRegeneratingPost] = useState<number | null>(null)
  const [generatingRemaining, setGeneratingRemaining] = useState(false)
  const [isDownloadingBundle, setIsDownloadingBundle] = useState(false)

  const toggleCaption = (postId: number) => {
    const newExpanded = new Set(expandedCaptions)
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId)
    } else {
      newExpanded.add(postId)
    }
    setExpandedCaptions(newExpanded)
  }

  const copyCaptionToClipboard = async (caption: string, postId: number) => {
    try {
      await navigator.clipboard.writeText(caption)
      const newCopied = new Set(copiedCaptions)
      newCopied.add(postId)
      setCopiedCaptions(newCopied)
      setTimeout(() => {
        const updated = new Set(copiedCaptions)
        updated.delete(postId)
        setCopiedCaptions(updated)
      }, 2000)
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

  const handleGenerateBio = async () => {
    if (!feedData?.feed?.id) {
      toast({
        title: "Error",
        description: "Feed ID is missing. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingBio(true)

    try {
      const response = await fetch(`/api/feed/${feedData.feed.id}/generate-bio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (!response.ok) {
        let errorData: any = {}
        let errorMessage = "Failed to generate bio"
        
        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } else {
            const errorText = await response.text()
            if (errorText && errorText.trim().length > 0) {
              try {
                errorData = JSON.parse(errorText)
                errorMessage = errorData.error || errorMessage
              } catch {
                errorMessage = errorText.substring(0, 200) || errorMessage
              }
            }
          }
        } catch (parseError) {
          console.error(`[v0] Error parsing response:`, parseError)
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Unknown error"}`
        }
        
        throw new Error(errorMessage)
      }

      let data
      try {
        const responseText = await response.text()
        if (!responseText || responseText.trim().length === 0) {
          throw new Error("Empty response from server")
        }
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`[v0] Failed to parse response:`, parseError)
        throw new Error("Invalid response from server. Please try again.")
      }

      if (data.bio) {
        // Refresh feed data to show updated bio
        await onUpdate()
        toast({
          title: feedData.bio?.bio_text ? "Bio regenerated!" : "Bio generated!",
          description: "Your Instagram bio has been created based on your brand profile.",
        })
      } else {
        throw new Error("No bio returned")
      }
    } catch (error) {
      console.error("[v0] Generate bio error:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingBio(false)
    }
  }

  const handleEnhanceCaption = async (postId: number, currentCaption: string) => {
    if (!feedData?.feed?.id) {
      toast({
        title: "Error",
        description: "Feed ID is missing. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    const newEnhancing = new Set(enhancingCaptions)
    newEnhancing.add(postId)
    setEnhancingCaptions(newEnhancing)

    try {
      const response = await fetch(`/api/feed/${feedData.feed.id}/enhance-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId, currentCaption }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to enhance caption")
      }

      const data = await response.json()
      
      if (data.enhancedCaption) {
        // Refresh feed data to show updated caption
        await onUpdate()
        toast({
          title: "Caption enhanced!",
          description: "Maya has improved your caption. You can edit it further if needed.",
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
      const updated = new Set(enhancingCaptions)
      updated.delete(postId)
      setEnhancingCaptions(updated)
    }
  }

  const handleGenerateSingle = async (postId: number) => {
    try {
      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId }),
      })

      if (!response.ok) {
        let errorData = {}
        let errorMessage = "Failed to generate"
        try {
          const errorText = await response.text()
          if (errorText) {
            errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorData.details || errorMessage
          }
        } catch (parseError) {
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            message: "Failed to parse error response"
          }
        }
        console.error(`[v0] ❌ Failed to generate post ${postId}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          feedId: feedId
        })
        throw new Error(errorMessage)
      }

      let data
      try {
        data = await response.json()
        console.log("[v0] ✅ Generated post:", postId, "prediction ID:", data.predictionId)
      } catch (parseError) {
        console.error(`[v0] ⚠️ Success response but failed to parse JSON for post ${postId}:`, parseError)
        throw new Error("Failed to parse response")
      }

      toast({
        title: "Creating your photo",
        description: "This takes about 30 seconds",
      })

      // Refresh feed data after a short delay to pick up prediction_id
      setTimeout(() => {
        onUpdate()
      }, 1000)
      
      // Additional refresh after 5 seconds to catch early completions
      setTimeout(() => {
        onUpdate()
      }, 5000)
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleGenerateRemaining = async () => {
    const postsWithoutPrediction = posts.filter(
      (p: any) => !p.prediction_id && p.generation_status !== "completed" && !p.image_url,
    )

    if (postsWithoutPrediction.length === 0) {
      toast({
        title: "All posts are generating",
        description: "No remaining posts to generate",
      })
      return
    }

    setGeneratingRemaining(true)
    toast({
      title: `Generating ${postsWithoutPrediction.length} remaining images`,
      description: "This may take a few minutes",
    })

    try {
      // Use queue-all-images API (same as create-strategy does)
      console.log(`[v0] Queueing ${postsWithoutPrediction.length} remaining images via queue-all-images API`)
      const response = await fetch(`/api/feed-planner/queue-all-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedLayoutId: feedId }),
      })

      if (!response.ok) {
        let errorData = {}
        try {
          const errorText = await response.text()
          if (errorText) {
            errorData = JSON.parse(errorText)
          }
        } catch (parseError) {
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            message: "Failed to parse error response"
          }
        }
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to queue images`)
      }

      const data = await response.json()
      console.log(`[v0] ✅ Successfully queued ${data.queuedCount || postsWithoutPrediction.length} images`)

      // Refresh feed data after a short delay
      setTimeout(() => {
        onUpdate()
        setGeneratingRemaining(false)
        toast({
          title: "Generation started",
          description: `Started generating ${data.queuedCount || postsWithoutPrediction.length} images`,
        })
      }, 2000)
    } catch (error: any) {
      setGeneratingRemaining(false)
      console.error(`[v0] ❌ Error queueing images:`, error)
      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleRegeneratePost = async (postId: number) => {
    if (!feedId) {
      toast({
        title: "Error",
        description: "Feed ID not found. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Regenerate this photo? This will use 1 credit.")) {
      return
    }

    setRegeneratingPost(postId)

    try {
      console.log(`[v0] Regenerating post ${postId} in feed ${feedId}`)
      const response = await fetch(`/api/feed/${feedId}/generate-single`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ postId }),
      })

      if (!response.ok) {
        let errorData: any = {}
        let errorMessage = `Failed to regenerate (HTTP ${response.status})`
        
        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json()
            errorMessage = errorData.error || errorData.details || errorMessage
          } else {
            const errorText = await response.text()
            if (errorText && errorText.trim().length > 0) {
              try {
                errorData = JSON.parse(errorText)
                errorMessage = errorData.error || errorData.details || errorMessage
              } catch {
                errorMessage = errorText.substring(0, 200) || errorMessage
              }
            }
          }
        } catch (parseError) {
          console.error(`[v0] Error parsing response:`, parseError)
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Unknown error"}`
        }
        
        // Provide user-friendly error messages based on status code
        if (response.status === 401) {
          errorMessage = errorData?.details || "Authentication failed. Please refresh the page and try again."
        } else if (response.status === 402) {
          errorMessage = "Insufficient credits. Please purchase more credits to regenerate."
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please wait a moment and try again."
        } else if (response.status === 404) {
          errorMessage = "Post or feed not found. Please refresh the page."
        } else if (response.status === 400) {
          errorMessage = errorData?.details || "Invalid request. Please check your input and try again."
        }
        
        throw new Error(errorMessage)
      }

      let data
      try {
        const responseText = await response.text()
        if (!responseText || responseText.trim().length === 0) {
          throw new Error("Empty response from server")
        }
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`[v0] Failed to parse response:`, parseError)
        throw new Error("Invalid response from server. Please try again.")
      }
      
      console.log(`[v0] ✅ Successfully queued regeneration for post ${postId}, prediction ID:`, data.predictionId)

      if (!data.predictionId) {
        throw new Error("No prediction ID returned. Please try again.")
      }

      toast({
        title: "Regenerating photo",
        description: "Creating a new variation in the same category. This takes about 30 seconds.",
      })

      // Refresh feed data to show generating status
      await onUpdate()
    } catch (error) {
      console.error(`[v0] Error regenerating post ${postId}:`, error)
      toast({
        title: "Regeneration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setRegeneratingPost(null)
    }
  }

  const handleDownloadBundle = async () => {
    if (!feedData || !feedId) return
    
    try {
      setIsDownloadingBundle(true)
      const response = await fetch(`/api/feed/${feedId}/download-bundle`)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Download failed' }))
        throw new Error(error.error || 'Download failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `instagram-feed-${feedId}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Download started",
        description: "Your feed bundle is downloading",
      })
    } catch (error) {
      console.error("[v0] Download bundle error:", error)
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsDownloadingBundle(false)
    }
  }

  return {
    // State
    expandedCaptions,
    copiedCaptions,
    enhancingCaptions,
    isGeneratingBio,
    regeneratingPost,
    generatingRemaining,
    isDownloadingBundle,
    // Actions
    toggleCaption,
    copyCaptionToClipboard,
    handleGenerateBio,
    handleEnhanceCaption,
    handleGenerateSingle,
    handleGenerateRemaining,
    handleRegeneratePost,
    handleDownloadBundle,
  }
}

