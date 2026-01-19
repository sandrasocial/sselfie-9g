/**
 * Replicate Error Handler
 * 
 * Provides user-friendly error messages for Replicate API errors
 * instead of exposing technical error details to users.
 */

export interface UserFriendlyError {
  userMessage: string
  technicalMessage: string
  shouldRetry: boolean
  retryAfter?: number // seconds
  severity: 'error' | 'warning' | 'info'
}

/**
 * Convert Replicate error to user-friendly message
 */
export function getReplicateErrorMessage(error: any): UserFriendlyError {
  const errorString = error instanceof Error ? error.message : String(error)
  const errorLower = errorString.toLowerCase()
  
  // Extract status code if available
  const statusCode = error?.response?.status || error?.status
  
  // ============================================================================
  // RATE LIMITING (429)
  // ============================================================================
  if (
    statusCode === 429 ||
    errorLower.includes('429') ||
    errorLower.includes('rate limit') ||
    errorLower.includes('too many requests')
  ) {
    return {
      userMessage: "We're processing a lot of requests right now. Your image will generate in a moment.",
      technicalMessage: errorString,
      shouldRetry: true,
      retryAfter: 30,
      severity: 'warning'
    }
  }
  
  // ============================================================================
  // SERVICE UNAVAILABLE / DOWNTIME (502, 503, 504)
  // ============================================================================
  if (
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    errorLower.includes('502') ||
    errorLower.includes('503') ||
    errorLower.includes('504') ||
    errorLower.includes('bad gateway') ||
    errorLower.includes('service unavailable') ||
    errorLower.includes('gateway timeout')
  ) {
    return {
      userMessage: "Our image generation service is temporarily down. Please try again in a few minutes.",
      technicalMessage: errorString,
      shouldRetry: true,
      retryAfter: 120,
      severity: 'error'
    }
  }
  
  // ============================================================================
  // CONTENT MODERATION / SAFETY FILTER (E005)
  // ============================================================================
  if (
    errorLower.includes('e005') ||
    errorLower.includes('content moderation') ||
    errorLower.includes('safety filter') ||
    errorLower.includes('nsfw') ||
    errorLower.includes('inappropriate content')
  ) {
    return {
      userMessage: "This image couldn't be generated due to content guidelines. Please try adjusting your prompt or outfit choices.",
      technicalMessage: errorString,
      shouldRetry: false,
      severity: 'warning'
    }
  }
  
  // ============================================================================
  // AUTHENTICATION ERRORS (401, 403)
  // ============================================================================
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    errorLower.includes('401') ||
    errorLower.includes('403') ||
    errorLower.includes('unauthorized') ||
    errorLower.includes('forbidden') ||
    errorLower.includes('invalid token') ||
    errorLower.includes('authentication')
  ) {
    return {
      userMessage: "We're having trouble connecting to our image service. Our team has been notified.",
      technicalMessage: errorString,
      shouldRetry: false,
      severity: 'error'
    }
  }
  
  // ============================================================================
  // MODEL NOT FOUND / INVALID MODEL (404)
  // ============================================================================
  if (
    statusCode === 404 ||
    errorLower.includes('404') ||
    errorLower.includes('not found') ||
    errorLower.includes('model does not exist')
  ) {
    return {
      userMessage: "The image generation service is unavailable. Our team has been notified.",
      technicalMessage: errorString,
      shouldRetry: false,
      severity: 'error'
    }
  }
  
  // ============================================================================
  // TIMEOUT / PREDICTION TIMEOUT
  // ============================================================================
  if (
    errorLower.includes('timeout') ||
    errorLower.includes('timed out') ||
    errorLower.includes('deadline exceeded')
  ) {
    return {
      userMessage: "Image generation is taking longer than usual. Please try again.",
      technicalMessage: errorString,
      shouldRetry: true,
      retryAfter: 60,
      severity: 'warning'
    }
  }
  
  // ============================================================================
  // PREDICTION FAILED (Model errors)
  // ============================================================================
  if (
    errorLower.includes('prediction failed') ||
    errorLower.includes('model error') ||
    errorLower.includes('inference failed')
  ) {
    return {
      userMessage: "We couldn't generate this image. Please try again with slightly different settings.",
      technicalMessage: errorString,
      shouldRetry: true,
      retryAfter: 10,
      severity: 'warning'
    }
  }
  
  // ============================================================================
  // INPUT VALIDATION ERRORS (400)
  // ============================================================================
  if (
    statusCode === 400 ||
    errorLower.includes('400') ||
    errorLower.includes('invalid input') ||
    errorLower.includes('validation error') ||
    errorLower.includes('bad request')
  ) {
    return {
      userMessage: "There was an issue with your image settings. Please try adjusting your selections.",
      technicalMessage: errorString,
      shouldRetry: false,
      severity: 'error'
    }
  }
  
  // ============================================================================
  // NETWORK ERRORS
  // ============================================================================
  if (
    errorLower.includes('network') ||
    errorLower.includes('connection') ||
    errorLower.includes('econnreset') ||
    errorLower.includes('enotfound') ||
    errorLower.includes('etimedout')
  ) {
    return {
      userMessage: "Connection issue. Please check your internet and try again.",
      technicalMessage: errorString,
      shouldRetry: true,
      retryAfter: 5,
      severity: 'warning'
    }
  }
  
  // ============================================================================
  // OUT OF CAPACITY / QUOTA
  // ============================================================================
  if (
    errorLower.includes('capacity') ||
    errorLower.includes('quota') ||
    errorLower.includes('out of') ||
    errorLower.includes('insufficient')
  ) {
    return {
      userMessage: "Our image service is at capacity. Please try again in a few minutes.",
      technicalMessage: errorString,
      shouldRetry: true,
      retryAfter: 180,
      severity: 'warning'
    }
  }
  
  // ============================================================================
  // REFERENCE IMAGE ERRORS
  // ============================================================================
  // Be specific - only trigger on actual image download/reference errors, not just any error with "image" in it
  if (
    errorLower.includes('image_input') ||
    errorLower.includes('reference image') ||
    errorLower.includes('failed to download image') ||
    errorLower.includes('invalid image url') ||
    errorLower.includes('image url is invalid') ||
    errorLower.includes('could not download image')
  ) {
    return {
      userMessage: "There was an issue with your profile photos. Please try re-uploading your photos.",
      technicalMessage: errorString,
      shouldRetry: false,
      severity: 'error'
    }
  }
  
  // ============================================================================
  // DEFAULT FALLBACK
  // ============================================================================
  return {
    userMessage: "We couldn't generate this image right now. Please try again.",
    technicalMessage: errorString,
    shouldRetry: true,
    retryAfter: 30,
    severity: 'error'
  }
}

/**
 * Format error for API response
 */
export function formatReplicateErrorResponse(error: any, context?: string) {
  const friendlyError = getReplicateErrorMessage(error)
  
  return {
    error: friendlyError.userMessage,
    details: context || friendlyError.technicalMessage,
    shouldRetry: friendlyError.shouldRetry,
    retryAfter: friendlyError.retryAfter,
    severity: friendlyError.severity,
    // Technical details for logging (not shown to user)
    _technical: {
      originalError: error instanceof Error ? error.message : String(error),
      statusCode: error?.response?.status || error?.status,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Check if error is retryable
 */
export function isReplicateErrorRetryable(error: any): boolean {
  const friendlyError = getReplicateErrorMessage(error)
  return friendlyError.shouldRetry
}

/**
 * Get suggested retry delay in seconds
 */
export function getReplicateRetryDelay(error: any): number {
  const friendlyError = getReplicateErrorMessage(error)
  return friendlyError.retryAfter || 30
}
