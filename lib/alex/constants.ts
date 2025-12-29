/**
 * Constants for Alex system
 */

export const ALEX_CONSTANTS = {
  MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 4000,
  MAX_ITERATIONS: 5,
  STREAMING: true,
  
  ADMIN_EMAIL: 'ssa@ssasocial.com',
  FROM_EMAIL: 'ssa@sselfie.studio',
  FROM_NAME: 'Sandra @ SSELFIE Studio',
  
  // Tool categories
  TOOL_CATEGORIES: {
    EMAIL: 'email',
    ANALYTICS: 'analytics',
    CONTENT: 'content',
    BUSINESS: 'business',
    AUTOMATION: 'automation',
    HISTORICAL: 'historical'
  }
} as const

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  USER_NOT_FOUND: 'User not found',
  ADMIN_ACCESS_REQUIRED: 'Admin access required',
  TOOL_NOT_FOUND: 'Tool not found or not executable',
  EXECUTION_FAILED: 'Tool execution failed',
  STREAMING_ERROR: 'Streaming error occurred',
  NO_MESSAGES: 'Messages is required',
  INVALID_MESSAGES: 'Messages must be an array',
  EMPTY_MESSAGES: 'Messages cannot be empty'
} as const

