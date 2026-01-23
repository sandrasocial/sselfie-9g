"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"

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
  const { toast } = useToast()
  const [status, setStatus] = useState<"idle" | "generating" | "completed" | "failed">("idle")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const slowWarningShownRef = useRef<boolean>(false)
  const verySlowWarningShownRef = useRef<boolean>(false)

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
        let errorDetails = response.statusText
        let errorData: any = null
        try {
          errorData = await response.json()
          errorDetails = errorData.details || errorData.error || response.statusText
        } catch {
          // If JSON parsing fails, use statusText
        }
        
        // Don't throw for retryable errors
        if (response.status === 503 || errorData?.retryable) {
          console.warn(`[useFeedPostPolling] Retryable error for post ${postId}, will retry:`, {
            status: response.status,
            details: errorDetails,
            errorData: errorData || "No JSON body",
          })
          return // Don't throw, allow polling to continue
        }
        
        throw new Error(`Failed to check status (${response.status}): ${errorDetails}`)
      }

      const data = await response.json()

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
        return
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
        return
      }

      // Handle errors from API without a terminal status
      if (data.error) {
        // 🔴 FIX: Handle content moderation errors gracefully (E005)
        const errorMessage = data.error || "Failed to check generation status"
        const isContentFlagged = errorMessage.includes("E005") || errorMessage.includes("flagged as sensitive")
        
        if (isContentFlagged) {
          console.warn(`[useFeedPostPolling] Content flagged for post ${postId}:`, errorMessage)
          // Set a user-friendly error message
          const friendlyError = "Content flagged by safety systems. Please try different wording or style."
          setStatus("failed")
          setError(friendlyError)
          setImageUrl(null)

          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }

          // Call error callback with friendly message
          if (onError) {
            onError(friendlyError)
          }
          return // Don't throw - handle gracefully
        }
        
        // For other errors, throw as before
        throw new Error(errorMessage)
      } else {
        // Still processing (processing, starting, queued, etc.)
        setStatus("generating")
        setError(null)
        
        // Check how long it's been and show user-friendly notifications
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now()
        }
        
        const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)
        
        // Show "taking longer than expected" message after 90 seconds (1.5 min)
        if (elapsedSeconds > 90 && !slowWarningShownRef.current) {
          slowWarningShownRef.current = true
          toast({
            title: "Still generating...",
            description: "Your image is taking a bit longer than usual. Replicate might be queued. We'll keep trying.",
            duration: 5000,
          })
        }
        
        // Show "still working" message after 3 minutes
        if (elapsedSeconds > 180 && !verySlowWarningShownRef.current) {
          verySlowWarningShownRef.current = true
          toast({
            title: "Generation in progress",
            description: "Your image is still being generated. This can take up to 5 minutes during peak times.",
            duration: 5000,
          })
        }
      }
    } catch (err) {
      // Extract error message with better handling for various error types
      let errorMessage = "Failed to check generation status"
      let errorDetails: any = {}
      
      if (err instanceof Error) {
        errorMessage = err.message || errorMessage
        errorDetails = {
          name: err.name,
          message: err.message,
          stack: err.stack?.substring(0, 200), // First 200 chars of stack
        }
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err && typeof err === 'object') {
        // Try to extract meaningful information from error object
        errorDetails = err
        if ('message' in err && typeof err.message === 'string') {
          errorMessage = err.message
        } else if ('error' in err && typeof err.error === 'string') {
          errorMessage = err.error
        } else if ('details' in err && typeof err.details === 'string') {
          errorMessage = err.details
        } else {
          // If it's an empty object or has no message, use stringified version
          const stringified = JSON.stringify(err)
          if (stringified !== '{}') {
            errorMessage = `Error: ${stringified.substring(0, 200)}`
          }
        }
      }
      
      const isRetryable = errorMessage.includes("503") || 
                         errorMessage.includes("Service Unavailable") ||
                         errorMessage.includes("Network") ||
                         errorMessage.includes("fetch") ||
                         errorMessage.includes("timeout")
      
      if (isRetryable) {
        // Retryable errors - log but don't stop polling
        console.warn(`[useFeedPostPolling] Retryable error for post ${postId}, will retry:`, errorMessage)
        
        setError(null) // Clear error for retryable issues
        return // Don't throw, allow polling to continue
      }
      
      // Non-retryable errors - log with full context
      // Log errorMessage directly (not in object) to avoid empty {} display
      console.error(`[useFeedPostPolling] Error checking post ${postId}: ${errorMessage}`)
      console.error(`[useFeedPostPolling] Error context:`, {
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        errorDetails: Object.keys(errorDetails).length > 0 ? errorDetails : 'No additional details',
        postId,
        predictionId,
        feedId,
        rawError: err // Include raw error for full inspection
      })

      // Don't stop polling on network errors - retry on next interval
      // Only stop on actual generation failures
      setError(errorMessage)
      
      // Show user-friendly error toast for non-retryable errors
      if (!isRetryable) {
        // Use Replicate error handler for friendly messages
        import("@/lib/replicate-error-handler").then(({ getReplicateErrorMessage }) => {
          const friendlyError = getReplicateErrorMessage(err)
          toast({
            title: "Generation issue",
            description: friendlyError.userMessage,
            variant: "destructive",
            duration: 7000,
          })
        })
      }

      // Call error callback for actual errors (not retryable ones)
      if (onError && errorMessage.includes("Generation failed") && !isRetryable) {
        onError(errorMessage)
      }
    }
  }, [feedId, postId, predictionId, onComplete, onError])

  // Start polling when predictionId is available and enabled
  useEffect(() => {
    // Don't poll if:
    // - Not enabled
    // - No predictionId (generation not started)
    // - PredictionId is temporary (optimistic UI - starts with "temp-")
    // - No postId
    // - Already completed or failed
    const isTempPredictionId = predictionId?.startsWith("temp-")
    if (!enabled || !predictionId || isTempPredictionId || !postId || status === "completed" || status === "failed") {
      // Clean up any existing polling if conditions are no longer met
      if (pollIntervalRef.current) {
        console.log(`[useFeedPostPolling] Stopping polling for post ${postId} (conditions not met)`)
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      // Set status to generating for temp predictionIds (optimistic UI)
      if (isTempPredictionId && status === "idle") {
        setStatus("generating")
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
