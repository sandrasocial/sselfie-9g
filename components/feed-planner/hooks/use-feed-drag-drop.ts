"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "@/hooks/use-toast"

/**
 * Hook for managing drag-and-drop reordering of feed posts
 */
export function useFeedDragDrop(
  posts: any[],
  feedId: number,
  onReorderComplete: () => void
) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [reorderedPosts, setReorderedPosts] = useState<any[]>([])
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  // Track previous posts to detect actual changes
  // Include image_url in the key so we detect when images are updated
  const prevPostsRef = useRef<string>('')
  const postsKey = posts.map((p: any) => `${p.id}-${p.position}-${p.image_url || ''}`).join(',')

  // Initialize reorderedPosts when posts change (only if not currently dragging)
  // CRITICAL: reorderedPosts must always be in sync with posts for drag handlers to work correctly
  // FIX: Always update when posts change (detected by postsKey) to catch image_url updates
  useEffect(() => {
    // Update if posts changed (by comparing IDs, positions, AND image_urls)
    // This ensures we catch image updates, not just position changes
    // CRITICAL: Only skip update if currently dragging (to preserve drag state)
    if (draggedIndex === null) {
      // Always update if postsKey changed (includes image_url changes)
      if (prevPostsRef.current !== postsKey) {
        prevPostsRef.current = postsKey
        setReorderedPosts(posts)
      } else if (reorderedPosts.length === 0 && posts.length > 0) {
        // Fallback: Initialize if reorderedPosts is empty but posts exist
        setReorderedPosts(posts)
      }
    }
  }, [posts, draggedIndex, postsKey, reorderedPosts.length])

  // Ensure reorderedPosts is always initialized (use posts as fallback for rendering if empty)
  const displayPosts = reorderedPosts.length > 0 ? reorderedPosts : posts

  const handleDragStart = (index: number) => {
    // Only allow dragging if post is complete
    // Use displayPosts to ensure we're working with the same array that's rendered
    const post = displayPosts[index]
    if (!post?.image_url || post.generation_status !== 'completed') {
      return
    }
    // Ensure reorderedPosts is initialized if it was empty
    if (reorderedPosts.length === 0) {
      setReorderedPosts(displayPosts)
    }
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      const newPosts = [...reorderedPosts]
      const [draggedPost] = newPosts.splice(draggedIndex, 1)
      newPosts.splice(index, 0, draggedPost)
      setReorderedPosts(newPosts)
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return
    
    const originalIndex = draggedIndex
    setDraggedIndex(null)
    
    // Check if order actually changed
    const orderChanged = reorderedPosts.some((post, index) => {
      const originalPost = posts[index]
      return !originalPost || post.id !== originalPost.id
    })
    
    if (!orderChanged) {
      // Order didn't change, revert to original
      setReorderedPosts(posts)
      return
    }
    
    // Save new order to database
    try {
      setIsSavingOrder(true)
      const response = await fetch(`/api/feed/${feedId}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postOrders: reorderedPosts.map((post, index) => ({
            postId: post.id,
            newPosition: index + 1, // 1-9
          })),
        }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save order' }))
        throw new Error(error.error || 'Failed to save order')
      }
      
      toast({
        title: "Feed reordered",
        description: "Your feed layout has been updated",
      })
      
      // Refresh feed data to get updated positions
      await onReorderComplete()
    } catch (error) {
      console.error("[v0] Reorder error:", error)
      toast({
        title: "Failed to save order",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
      // Revert to original order
      setReorderedPosts(posts)
    } finally {
      setIsSavingOrder(false)
    }
  }

  return {
    draggedIndex,
    reorderedPosts: displayPosts,
    isSavingOrder,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}

