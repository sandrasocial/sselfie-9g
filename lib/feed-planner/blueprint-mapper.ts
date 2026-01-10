/**
 * Blueprint Strategy Mapper
 * 
 * Maps blueprint strategy_data (from blueprint_subscribers.strategy_data)
 * to feed_posts format (expected by FeedViewScreen/InstagramFeedView)
 * 
 * Decision 2: Embed Feed Planner for Paid Blueprint
 */

export interface BlueprintStrategyData {
  title?: string
  description?: string
  prompt?: string
  contentCalendar?: {
    [week: string]: Array<{
      day: number
      type: string
      title: string
      caption: string
    }>
  }
  captionTemplates?: {
    [category: string]: Array<{
      title: string
      template: string
    }>
  }
}

export interface MappedFeedPost {
  id: number // Virtual ID (position-based)
  feed_layout_id: number // Virtual feed ID (will be -1 for blueprint mode)
  user_id: string
  position: number // 1-9 for grid
  post_type: string // 'single' | 'carousel' | 'reel'
  image_url: string | null
  caption: string | null
  text_overlay: string | null
  text_overlay_style: any | null
  prompt: string | null
  generation_status: string // 'pending' | 'generating' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface MappedFeedData {
  feed: {
    id: number // Virtual feed ID (-1 for blueprint mode)
    user_id: string
    title: string
    description: string | null
    layout_type: string
    status: string
    created_at: string
    updated_at: string
  }
  posts: MappedFeedPost[]
  bio: null // Blueprint doesn't have bio
  highlights: [] // Blueprint doesn't have highlights
}

/**
 * Maps blueprint strategy_data to feed format
 * 
 * For paid blueprint users, we create a virtual feed (not in database)
 * that displays the 30-day content calendar as a 3x3 grid (9 posts)
 * 
 * Strategy:
 * - Extract first 9 posts from contentCalendar (one per day, for first 9 days)
 * - If less than 9 posts exist, create placeholder posts
 * - Each post position maps to a day in the calendar
 */
export function mapBlueprintStrategyToFeed(
  userId: string,
  strategyData: BlueprintStrategyData | null
): MappedFeedData | null {
  if (!strategyData) {
    return null
  }

  // Extract posts from contentCalendar
  const posts: MappedFeedPost[] = []
  let postPosition = 1

  // Flatten contentCalendar into array of days
  const allDays: Array<{ day: number; type: string; title: string; caption: string }> = []

  if (strategyData.contentCalendar) {
    // Sort weeks by key (week1, week2, etc.)
    const sortedWeeks = Object.keys(strategyData.contentCalendar)
      .sort((a, b) => {
        const aNum = parseInt(a.replace('week', '')) || 0
        const bNum = parseInt(b.replace('week', '')) || 0
        return aNum - bNum
      })

    for (const week of sortedWeeks) {
      const days = strategyData.contentCalendar[week] || []
      allDays.push(...days)
    }
  }

  // Map first 9 days to grid positions (1-9)
  // If we have less than 9 posts, create placeholder posts
  for (let position = 1; position <= 9; position++) {
    const dayData = allDays[position - 1] // 0-indexed array

    posts.push({
      id: position, // Virtual ID based on position
      feed_layout_id: -1, // Virtual feed ID (blueprint mode)
      user_id: userId,
      position,
      post_type: 'single',
      image_url: null, // Images will be generated per post
      caption: dayData?.caption || null,
      text_overlay: null,
      text_overlay_style: null,
      prompt: dayData?.title || strategyData.prompt || null, // Use day title as prompt basis
      generation_status: 'pending', // All posts start as pending
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  // Create virtual feed
  const feed = {
    id: -1, // Virtual feed ID (blueprint mode)
    user_id: userId,
    title: strategyData.title || 'Blueprint Feed',
    description: strategyData.description || null,
    layout_type: 'grid_3x3',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return {
    feed,
    posts,
    bio: null,
    highlights: [],
  }
}
