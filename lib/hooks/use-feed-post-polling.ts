"use client"

import { useState, useEffect, useRef, useCallback } from "react"

/**
 * Hook for polling individual feed post generation status
 * 
 * Matches the pattern used in concept cards for consistent behavior.
 * Reuses existing /api/feed/[feedId]/check-post endpoint.
 * 
 * @param feedId - Feed ID
 * @param postId - Post ID from database
 * @param predictionId - Replicate prediction ID (from generate-single response)
 * @param enabled - Whether polling should be active
 * @param onComplete - Callback when generation completes (receives imageUrl)
 * @param onError - Callback when generation fails (receives error message)
 */
export function useFeedPostPolling({
  feedId,
  postId,
  predictionId,
  enabled = true,
  onComplete,
  onError,
}: {
  feedId: number | string
  postId: number | string
  predictionId: string | null
  enabled?: boolean
  onComplete?: (imageUrl: string) => void
  onError?: (error: string) => void
}) {
  const [status, setStatus] = useState<"idle" | "generating" | "completed" | "failed">("idle")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check post status (matches concept card pattern)
  const checkStatus = useCallback(async () => {
    if (!predictionId || !postId || !feedId) {
      return
    }

    try {
      const response = await fetch(
        `/api/feed/${feedId}/check-post?predictionId=${predictionId}&postId=${postId}`
      )

      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.statusText}`)
      }

      const data = await response.json()

      // Handle errors from API
      if (data.error) {
        throw new Error(data.error || "Failed to check generation status")
      }

      console.log(`[useFeedPostPolling] Post ${postId} status:`, data.status)

      if (data.status === "succeeded") {
        // Generation completed
        setStatus("completed")
        setImageUrl(data.imageUrl)
        setError(null)

        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }

        // Call completion callback
        if (onComplete && data.imageUrl) {
          onComplete(data.imageUrl)
        }
      } else if (data.status === "failed") {
        // Generation failed
        const errorMessage = data.error || "Generation failed"
        setStatus("failed")
        setError(errorMessage)
        setImageUrl(null)

        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }

        // Call error callback
        if (onError) {
          onError(errorMessage)
        }
      } else {
        // Still processing (processing, starting, etc.)
        setStatus("generating")
        setError(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to check generation status"
      console.error(`[useFeedPostPolling] Error checking post ${postId}:`, err)

      // Don't stop polling on network errors - retry on next interval
      // Only stop on actual generation failures
      setError(errorMessage)

      // Call error callback for actual errors
      if (onError && errorMessage.includes("Generation failed")) {
        onError(errorMessage)
      }
    }
  }, [feedId, postId, predictionId, onComplete, onError])

  // Start polling when predictionId is available and enabled
  useEffect(() => {
    // Don't poll if:
    // - Not enabled
    // - No predictionId (generation not started)
    // - No postId
    // - Already completed or failed
    if (!enabled || !predictionId || !postId || status === "completed" || status === "failed") {
      // Clean up any existing polling if conditions are no longer met
      if (pollIntervalRef.current) {
        console.log(`[useFeedPostPolling] Stopping polling for post ${postId} (conditions not met)`)
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }

    // Set status to generating when polling starts
    if (status === "idle") {
      setStatus("generating")
    }

    console.log(`[useFeedPostPolling] Starting polling for post ${postId} with prediction ${predictionId}`)

    // Initial check immediately
    checkStatus()

    // Poll every 3 seconds (matches concept card interval)
    pollIntervalRef.current = setInterval(() => {
      checkStatus()
    }, 3000)

    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollIntervalRef.current) {
        console.log(`[useFeedPostPolling] Stopping polling for post ${postId}`)
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [enabled, predictionId, postId, checkStatus, status])

  // Reset state when predictionId changes (new generation started)
  // FIX: Only reset if we don't already have an imageUrl (don't reset if image already loaded)
  useEffect(() => {
    if (predictionId && !imageUrl) {
      setStatus("generating")
      setError(null)
      // Don't clear imageUrl if it already exists (from previous generation)
    } else if (!predictionId && imageUrl) {
      // If predictionId is cleared but we have imageUrl, keep the imageUrl
      // This happens when polling completes and we clear predictionId
      setStatus("completed")
    }
  }, [predictionId, imageUrl])

  return {
    status,
    imageUrl,
    error,
    isPolling: status === "generating" && pollIntervalRef.current !== null,
  }
}
