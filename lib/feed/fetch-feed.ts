/**
 * Feed Fetching Utilities
 * 
 * Standardized functions for fetching feed data from the API.
 * Provides consistent error handling and response formatting.
 */

import type { FeedResponse, FeedListResponse, FeedListItem } from './types'

const API_BASE = '/api'

/**
 * Fetch a specific feed by ID
 */
export async function fetchFeedById(feedId: number): Promise<FeedResponse> {
  const response = await fetch(`${API_BASE}/feed/${feedId}`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch feed' }))
    throw new Error(error.error || `Failed to fetch feed: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Fetch the user's latest feed
 */
export async function fetchLatestFeed(): Promise<FeedResponse> {
  const response = await fetch(`${API_BASE}/feed/latest`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch latest feed' }))
    throw new Error(error.error || `Failed to fetch latest feed: ${response.status}`)
  }
  
  const data = await response.json()
  
  // Handle "no feed exists" case
  if (data.exists === false) {
    return {
      exists: false,
      feed: null as any, // Will be checked by caller
      posts: [],
      bio: null,
      highlights: [],
    }
  }
  
  return data
}

/**
 * Fetch all feeds for the current user (for list views)
 */
export async function fetchFeedList(): Promise<FeedListResponse> {
  const response = await fetch(`${API_BASE}/maya/feed/list`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch feed list' }))
    throw new Error(error.error || `Failed to fetch feed list: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Fetch feed by ID or latest (utility function)
 */
export async function fetchFeed(feedId?: number | null): Promise<FeedResponse> {
  if (feedId) {
    return fetchFeedById(feedId)
  }
  return fetchLatestFeed()
}

