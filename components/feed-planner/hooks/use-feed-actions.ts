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

  // Helper function to navigate to Maya Chat for image generation
  const navigateToMayaChat = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/studio#maya/feed"
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
    isDownloadingBundle,
    // Actions
    toggleCaption,
    copyCaptionToClipboard,
    handleGenerateBio,
    handleEnhanceCaption,
    navigateToMayaChat,
    handleDownloadBundle,
  }
}

