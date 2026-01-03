/**
 * Feed Feature Type Definitions
 * 
 * Standardized TypeScript interfaces for feed-related data structures.
 * These types ensure consistency across all feed endpoints and components.
 * 
 * Database fields use snake_case, API responses use camelCase.
 */

/**
 * Feed Layout - Main feed configuration and metadata
 */
export interface FeedLayout {
  id: number
  user_id: string
  title: string | null
  description: string | null
  brand_vibe: string | null
  business_type: string | null
  color_palette: string | null
  visual_rhythm: string | null
  feed_story: string | null
  layout_type: string | null
  username: string | null
  brand_name: string | null
  status: string | null
  created_at: Date | string
  updated_at: Date | string
  last_activity: Date | string | null
}

/**
 * Feed Post - Individual post within a feed
 */
export interface FeedPost {
  id: number
  feed_layout_id: number
  user_id: string
  position: number
  post_type: string | null
  shot_type: string | null
  prompt: string | null
  caption: string | null
  image_url: string | null
  generation_status: string | null
  prediction_id: string | null
  created_at: Date | string
  updated_at: Date | string
}

/**
 * Instagram Bio - Bio associated with a feed
 */
export interface InstagramBio {
  id: number
  feed_layout_id: number
  user_id: string
  bio_text: string | null
  created_at: Date | string
  updated_at: Date | string
}

/**
 * Instagram Highlight - Highlights associated with a feed
 */
export interface InstagramHighlight {
  id: number
  feed_layout_id: number
  user_id: string
  title: string | null
  cover_image_url: string | null
  created_at: Date | string
  updated_at: Date | string
}

/**
 * Feed API Response - Standard response format from feed endpoints
 */
export interface FeedResponse {
  exists?: boolean
  feed: FeedLayout
  posts: FeedPost[]
  bio: InstagramBio | null
  highlights: InstagramHighlight[]
  username?: string
  brandName?: string
}

/**
 * Feed List Item - Simplified feed data for list views
 */
export interface FeedListItem {
  id: number
  title: string
  feedTitle?: string
  description?: string
  overallVibe?: string
  aesthetic?: string
  colorPalette?: string
  totalCredits?: number
  status?: string
  createdAt: Date | string
  posts?: FeedPost[]
  // Normalized fields for frontend compatibility
  feedId?: number
  postsCount?: number
}

/**
 * Feed List Response - Response format for feed list endpoints
 */
export interface FeedListResponse {
  feeds: FeedListItem[]
}

