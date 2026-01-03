/**
 * Feed Persistence Module
 * 
 * Centralized database operations for feed planner using raw SQL (Neon):
 * - Save complete feeds with captions and prompts
 * - Retrieve feeds with all post data
 * - Update feed generation status
 * - Delete feeds
 * 
 * CRITICAL: Ensures captions and prompts are properly saved to database
 */

import { getDb } from '@/lib/db'
import type { neon } from '@neondatabase/serverless'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreateFeedInput {
  userId: string
  title: string
  overallVibe: string
  colorPalette: string
  aesthetic: string
  aestheticId: string
  strategicRationale: string
  totalCredits: number
  posts: CreateFeedPostInput[]
}

export interface CreateFeedPostInput {
  position: number
  postType: 'user' | 'lifestyle' | string
  shotType: string
  visualDirection: string
  purpose: string
  caption: string  // CRITICAL: Required
  background?: string
  generationMode: 'classic' | 'pro'
  prompt: string   // CRITICAL: Required
  imageUrl?: string
  status?: 'pending' | 'generating' | 'complete' | 'failed'
  error?: string
}

export interface UpdateFeedStatusInput {
  feedId: number | string
  status: 'pending' | 'generating' | 'complete' | 'partial' | 'failed'
}

export interface UpdatePostImageInput {
  postId: number | string
  imageUrl: string
  status: 'complete' | 'failed'
  error?: string
}

export interface FeedWithPosts {
  id: number
  user_id: string
  title: string
  description?: string
  overall_vibe?: string
  color_palette?: string
  aesthetic?: string
  aesthetic_id?: string
  strategic_rationale?: string
  total_credits?: number
  status?: string
  created_at: Date
  updated_at?: Date
  posts: FeedPost[]
}

export interface FeedPost {
  id: number
  feed_layout_id: number
  user_id: string
  position: number
  post_type: string
  shot_type?: string
  visual_direction?: string
  purpose?: string
  caption?: string
  background?: string
  generation_mode?: string
  prompt?: string
  image_url?: string
  generation_status?: string
  error?: string
  created_at: Date
  updated_at?: Date
}

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Save a complete feed with all posts to database
 * CRITICAL: Ensures captions and prompts are stored
 */
export async function saveFeed(input: CreateFeedInput): Promise<FeedWithPosts> {
  const sql = getDb()
  
  try {
    console.log(`[FEED-PERSISTENCE] Saving feed: "${input.title}"`)

    // Validate required fields
    if (!input.title || !input.posts || input.posts.length !== 9) {
      throw new Error('Invalid feed input: title and 9 posts required')
    }

    // Validate each post has caption and prompt
    input.posts.forEach((post, index) => {
      if (!post.caption || post.caption.trim() === '') {
        throw new Error(`Post ${index + 1} missing required caption`)
      }
      if (!post.prompt || post.prompt.trim() === '') {
        throw new Error(`Post ${index + 1} missing required prompt`)
      }
    })

    // Insert feed layout
    const [feedLayout] = await sql`
      INSERT INTO feed_layouts (
        user_id,
        title,
        description,
        overall_vibe,
        color_palette,
        aesthetic,
        aesthetic_id,
        strategic_rationale,
        total_credits,
        status
      ) VALUES (
        ${input.userId},
        ${input.title},
        ${input.overallVibe},
        ${input.overallVibe},
        ${input.colorPalette},
        ${input.aesthetic},
        ${input.aestheticId},
        ${input.strategicRationale},
        ${input.totalCredits},
        'pending'
      )
      RETURNING *
    `

    const feedLayoutId = feedLayout.id

    // Insert all posts
    for (const post of input.posts) {
      await sql`
        INSERT INTO feed_posts (
          feed_layout_id,
          user_id,
          position,
          post_type,
          shot_type,
          visual_direction,
          purpose,
          caption,
          background,
          generation_mode,
          prompt,
          image_url,
          generation_status,
          error
        ) VALUES (
          ${feedLayoutId},
          ${input.userId},
          ${post.position},
          ${post.postType},
          ${post.shotType},
          ${post.visualDirection},
          ${post.purpose},
          ${post.caption},           -- CRITICAL: Caption saved
          ${post.background || null},
          ${post.generationMode},
          ${post.prompt},            -- CRITICAL: Prompt saved
          ${post.imageUrl || null},
          ${post.status || 'pending'},
          ${post.error || null}
        )
      `
    }

    console.log(`[FEED-PERSISTENCE] ✅ Feed saved with ID: ${feedLayoutId}`)

    // Retrieve the complete feed with posts
    return await getFeedById(feedLayoutId.toString(), input.userId) as FeedWithPosts

  } catch (error) {
    console.error('[FEED-PERSISTENCE] Error saving feed:', error)
    throw error
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get all feeds for a user
 */
export async function getUserFeeds(userId: string): Promise<FeedWithPosts[]> {
  const sql = getDb()
  
  try {
    // Get all feed layouts for user
    const feedLayouts = await sql`
      SELECT 
        id,
        user_id,
        title,
        description,
        overall_vibe,
        color_palette,
        aesthetic,
        aesthetic_id,
        strategic_rationale,
        total_credits,
        status,
        created_at,
        updated_at
      FROM feed_layouts
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `

    // Get posts for each feed
    const feedsWithPosts: FeedWithPosts[] = []
    
    for (const feed of feedLayouts) {
      const posts = await sql`
        SELECT 
          id,
          feed_layout_id,
          user_id,
          position,
          post_type,
          shot_type,
          visual_direction,
          purpose,
          caption,
          background,
          generation_mode,
          prompt,
          image_url,
          generation_status,
          error,
          created_at,
          updated_at
        FROM feed_posts
        WHERE feed_layout_id = ${feed.id}
        ORDER BY position ASC
      `

      feedsWithPosts.push({
        ...feed,
        posts: posts as FeedPost[]
      })
    }

    console.log(`[FEED-PERSISTENCE] Retrieved ${feedsWithPosts.length} feeds for user ${userId}`)
    return feedsWithPosts

  } catch (error) {
    console.error('[FEED-PERSISTENCE] Error fetching user feeds:', error)
    throw error
  }
}

/**
 * Get a specific feed by ID
 */
export async function getFeedById(feedId: string | number, userId: string): Promise<FeedWithPosts | null> {
  const sql = getDb()
  
  try {
    const feedIdNum = typeof feedId === 'string' ? parseInt(feedId, 10) : feedId

    // Get feed layout
    const [feedLayout] = await sql`
      SELECT 
        id,
        user_id,
        title,
        description,
        overall_vibe,
        color_palette,
        aesthetic,
        aesthetic_id,
        strategic_rationale,
        total_credits,
        status,
        created_at,
        updated_at
      FROM feed_layouts
      WHERE id = ${feedIdNum}
        AND user_id = ${userId}
    `

    if (!feedLayout) {
      console.warn(`[FEED-PERSISTENCE] Feed ${feedId} not found for user ${userId}`)
      return null
    }

    // Get posts
    const posts = await sql`
      SELECT 
        id,
        feed_layout_id,
        user_id,
        position,
        post_type,
        shot_type,
        visual_direction,
        purpose,
        caption,
        background,
        generation_mode,
        prompt,
        image_url,
        generation_status,
        error,
        created_at,
        updated_at
      FROM feed_posts
      WHERE feed_layout_id = ${feedIdNum}
      ORDER BY position ASC
    `

    const feed: FeedWithPosts = {
      ...feedLayout,
      posts: posts as FeedPost[]
    }

    console.log(`[FEED-PERSISTENCE] Retrieved feed: ${feed.title}`)
    return feed

  } catch (error) {
    console.error('[FEED-PERSISTENCE] Error fetching feed:', error)
    throw error
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update feed status (e.g., when generation completes)
 */
export async function updateFeedStatus(input: UpdateFeedStatusInput): Promise<void> {
  const sql = getDb()
  
  try {
    const feedIdNum = typeof input.feedId === 'string' ? parseInt(input.feedId, 10) : input.feedId

    await sql`
      UPDATE feed_layouts
      SET status = ${input.status},
          updated_at = NOW()
      WHERE id = ${feedIdNum}
    `

    console.log(`[FEED-PERSISTENCE] Updated feed ${input.feedId} status to: ${input.status}`)

  } catch (error) {
    console.error('[FEED-PERSISTENCE] Error updating feed status:', error)
    throw error
  }
}

/**
 * Update a post's image URL and status after generation
 */
export async function updatePostImage(input: UpdatePostImageInput): Promise<void> {
  const sql = getDb()
  
  try {
    const postIdNum = typeof input.postId === 'string' ? parseInt(input.postId, 10) : input.postId

    await sql`
      UPDATE feed_posts
      SET image_url = ${input.imageUrl},
          generation_status = ${input.status},
          error = ${input.error || null},
          updated_at = NOW()
      WHERE id = ${postIdNum}
    `

    console.log(`[FEED-PERSISTENCE] Updated post ${input.postId} with image`)

  } catch (error) {
    console.error('[FEED-PERSISTENCE] Error updating post image:', error)
    throw error
  }
}

/**
 * Update a post's caption and prompt
 * CRITICAL: Ensures captions and prompts are saved
 */
export async function updatePostContent(
  postId: string | number,
  caption?: string,
  prompt?: string
): Promise<void> {
  const sql = getDb()
  
  try {
    const postIdNum = typeof postId === 'string' ? parseInt(postId, 10) : postId

    if (caption !== undefined && prompt !== undefined) {
      // Update both
      await sql`
        UPDATE feed_posts
        SET caption = ${caption},
            prompt = ${prompt},
            updated_at = NOW()
        WHERE id = ${postIdNum}
      `
    } else if (caption !== undefined) {
      // Update caption only
      await sql`
        UPDATE feed_posts
        SET caption = ${caption},
            updated_at = NOW()
        WHERE id = ${postIdNum}
      `
    } else if (prompt !== undefined) {
      // Update prompt only
      await sql`
        UPDATE feed_posts
        SET prompt = ${prompt},
            updated_at = NOW()
        WHERE id = ${postIdNum}
      `
    } else {
      console.warn('[FEED-PERSISTENCE] No updates provided for post', postId)
      return
    }

    console.log(`[FEED-PERSISTENCE] Updated post ${postId} content`)

  } catch (error) {
    console.error('[FEED-PERSISTENCE] Error updating post content:', error)
    throw error
  }
}

/**
 * Batch update multiple posts (useful for bulk generation results)
 */
export async function batchUpdatePosts(
  updates: Array<UpdatePostImageInput>
): Promise<void> {
  const sql = getDb()
  
  try {
    await Promise.all(
      updates.map(update => updatePostImage(update))
    )

    console.log(`[FEED-PERSISTENCE] ✅ Batch updated ${updates.length} posts`)

  } catch (error) {
    console.error('[FEED-PERSISTENCE] Error batch updating posts:', error)
    throw error
  }
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a feed (cascade deletes all posts via foreign key)
 */
export async function deleteFeed(feedId: string | number, userId: string): Promise<void> {
  const sql = getDb()
  
  try {
    const feedIdNum = typeof feedId === 'string' ? parseInt(feedId, 10) : feedId

    // Delete feed (cascade will delete posts)
    await sql`
      DELETE FROM feed_layouts
      WHERE id = ${feedIdNum}
        AND user_id = ${userId}
    `

    console.log(`[FEED-PERSISTENCE] ✅ Deleted feed ${feedId}`)

  } catch (error) {
    console.error('[FEED-PERSISTENCE] Error deleting feed:', error)
    throw error
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a feed has all required data
 */
export function validateFeedData(feed: any): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!feed.title) errors.push('Missing feed title')
  if (!feed.posts || !Array.isArray(feed.posts)) errors.push('Missing posts array')
  if (feed.posts && feed.posts.length !== 9) errors.push('Feed must have exactly 9 posts')

  // Validate each post
  feed.posts?.forEach((post: any, index: number) => {
    if (!post.caption || post.caption.trim() === '') {
      errors.push(`Post ${index + 1} missing caption`)
    }
    if (!post.prompt || post.prompt.trim() === '') {
      errors.push(`Post ${index + 1} missing prompt`)
    }
    if (post.position < 1 || post.position > 9) {
      errors.push(`Post ${index + 1} has invalid position (must be 1-9)`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate that a post has all required fields
 */
export function validatePostData(post: any): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!post.caption || post.caption.trim() === '') {
    errors.push('Missing caption')
  }
  if (!post.prompt || post.prompt.trim() === '') {
    errors.push('Missing prompt')
  }
  if (!post.position || post.position < 1 || post.position > 9) {
    errors.push('Invalid position (must be 1-9)')
  }
  if (!post.postType) {
    errors.push('Missing postType')
  }
  if (!post.generationMode) {
    errors.push('Missing generationMode')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

