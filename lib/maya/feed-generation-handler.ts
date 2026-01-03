/**
 * Feed Generation Handler
 * 
 * Orchestrates the complete feed generation workflow:
 * 1. Parse feed strategy from Maya's response
 * 2. Generate optimized prompts using feed-prompt-expert
 * 3. Validate prompts and ensure cohesion
 * 4. Return structured data for feed creation
 * 
 * Separates concerns from main chat route for better maintainability
 * Note: Database persistence is handled by existing routes (create-from-strategy)
 */

import { 
  generateFeedPrompt,
  validateFeedPrompt,
  getColorPaletteByPreference,
  ensureFeedCohesion,
  getPostTypeDistribution,
  type ColorPalette
} from '@/lib/feed-planner/feed-prompt-expert'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FeedPost {
  position: number
  postType: 'user' | 'lifestyle'
  shotType: 'portrait' | 'half-body' | 'full-body' | 'object' | 'flatlay' | 'scenery'
  visualDirection: string
  purpose: string
  caption?: string
  background?: string
  generationMode: 'classic' | 'pro'
  type?: string // Legacy field for post type
  postType?: string // Alternative field name
  description?: string // Visual direction alternative
}

export interface FeedStrategy {
  feedTitle?: string
  title?: string
  overallVibe?: string
  colorPalette?: string
  posts: FeedPost[]
  strategicRationale?: string
  strategyDocument?: string
  totalCredits?: number
  gridPattern?: string
  visualRhythm?: string
  userRequest?: string
}

export interface GeneratedFeedPost extends FeedPost {
  prompt: string
  status: 'pending' | 'generating' | 'complete' | 'failed'
  error?: string
  colorPalette?: string
  aesthetic?: string
}

export interface GeneratedFeed {
  strategy: FeedStrategy
  posts: GeneratedFeedPost[]
  aesthetic: string
  aestheticId: string
  totalCredits: number
  status: 'pending' | 'generating' | 'complete' | 'failed'
}

// ============================================================================
// FEED STRATEGY PARSING
// ============================================================================

/**
 * Parse feed strategy from Maya's JSON response
 * Looks for [CREATE_FEED_STRATEGY] trigger and extracts JSON
 */
export function parseFeedStrategy(mayaResponse: string): FeedStrategy | null {
  try {
    // Look for [CREATE_FEED_STRATEGY] trigger
    if (!mayaResponse.includes('[CREATE_FEED_STRATEGY]')) {
      return null
    }

    // Extract JSON between markers (try multiple formats)
    let jsonMatch = mayaResponse.match(/```json\s*([\s\S]*?)\s*```/)
    if (!jsonMatch) {
      // Try without language tag
      jsonMatch = mayaResponse.match(/```\s*([\s\S]*?)\s*```/)
    }
    if (!jsonMatch) {
      // Try finding JSON object directly
      const jsonStart = mayaResponse.indexOf('{')
      const jsonEnd = mayaResponse.lastIndexOf('}') + 1
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        jsonMatch = [null, mayaResponse.substring(jsonStart, jsonEnd)]
      }
    }

    if (!jsonMatch || !jsonMatch[1]) {
      console.error('[FEED-PARSER] No JSON code block found')
      return null
    }

    const strategyData = JSON.parse(jsonMatch[1])
    
    // Normalize field names (handle both feedTitle and title)
    if (!strategyData.feedTitle && strategyData.title) {
      strategyData.feedTitle = strategyData.title
    }
    
    // Validate required fields
    if (!strategyData.feedTitle || !strategyData.posts || !Array.isArray(strategyData.posts)) {
      console.error('[FEED-PARSER] Invalid strategy structure:', {
        hasTitle: !!strategyData.feedTitle,
        hasPosts: !!strategyData.posts,
        isArray: Array.isArray(strategyData.posts)
      })
      return null
    }

    if (strategyData.posts.length !== 9) {
      console.error(`[FEED-PARSER] Strategy must have exactly 9 posts, found ${strategyData.posts.length}`)
      return null
    }

    // Normalize posts array (handle different field names)
    const normalizedPosts = strategyData.posts.map((post: any, index: number) => {
      // Log to verify captions are present
      if (!post.caption || post.caption.trim() === '') {
        console.warn(`[FEED-PARSER] ⚠️ Post ${index + 1} missing caption!`)
      }

      return {
        position: post.position || index + 1,
        postType: post.postType || (post.type === 'portrait' || post.type === 'half-body' || post.type === 'full-body' ? 'user' : 'lifestyle'),
        shotType: post.shotType || post.type || 'portrait',
        visualDirection: post.visualDirection || post.description || post.purpose || `Post ${post.position || index + 1}`,
        purpose: post.purpose || post.contentPillar || post.description || 'general',
        caption: post.caption || undefined, // CRITICAL: Caption from Maya's strategy
        background: post.background || undefined,
        generationMode: post.generationMode || post.generation_mode || 'classic',
        // Keep legacy fields for compatibility
        type: post.type || post.shotType,
        description: post.description || post.visualDirection
      }
    })

    const normalizedStrategy: FeedStrategy = {
      ...strategyData,
      posts: normalizedPosts,
      feedTitle: strategyData.feedTitle || strategyData.title,
      totalCredits: strategyData.totalCredits || normalizedPosts.reduce((sum: number, post: FeedPost) => 
        sum + (post.generationMode === 'pro' ? 2 : 1), 0
      )
    }

    console.log(`[FEED-PARSER] ✅ Parsed strategy: "${normalizedStrategy.feedTitle}" with ${normalizedPosts.length} posts`)
    return normalizedStrategy

  } catch (error) {
    console.error('[FEED-PARSER] Error parsing feed strategy:', error)
    if (error instanceof SyntaxError) {
      console.error('[FEED-PARSER] JSON parse error - response may not contain valid JSON')
    }
    return null
  }
}

// ============================================================================
// PROMPT GENERATION FOR FEED
// ============================================================================

interface PromptGenerationContext {
  strategy: FeedStrategy
  userId: string
  userGender?: string
  userEthnicity?: string
  physicalPreferences?: string
  triggerWord?: string
  brandVibe?: string
  visualAesthetic?: string
  userSelectedMode?: 'classic' | 'pro' | null
}

/**
 * Generate prompts for all 9 posts using feed-prompt-expert
 */
export async function generateFeedPrompts(context: PromptGenerationContext): Promise<GeneratedFeedPost[]> {
  const { 
    strategy, 
    userGender, 
    userEthnicity, 
    physicalPreferences, 
    triggerWord, 
    brandVibe, 
    visualAesthetic, 
    userSelectedMode 
  } = context

  // Determine color palette from user preferences or strategy
  const selectedPalette = getColorPaletteByPreference(
    visualAesthetic || strategy.colorPalette,
    brandVibe || strategy.overallVibe
  )

  console.log(`[FEED-PROMPTS] 🎨 Selected aesthetic: ${selectedPalette.name} (${selectedPalette.id})`)

  // Get recommended distribution for this aesthetic
  const distribution = getPostTypeDistribution(selectedPalette)
  console.log(`[FEED-PROMPTS] 📊 Recommended distribution: ${distribution.userPosts} user, ${distribution.lifestylePosts} lifestyle (${distribution.ratio})`)

  // Generate prompts for each post
  const generatedPosts: GeneratedFeedPost[] = strategy.posts.map((post, index) => {
    const isUserPost = post.postType === 'user'
    
    // Determine mode for this specific post
    let postMode: 'classic' | 'pro' = post.generationMode || 'classic'
    
    // Override with user-selected mode if provided
    if (userSelectedMode) {
      postMode = userSelectedMode
      console.log(`[FEED-PROMPTS] Post ${post.position}: Using user-selected mode (${userSelectedMode})`)
    } else {
      console.log(`[FEED-PROMPTS] Post ${post.position}: Using post-specific mode (${postMode})`)
    }

    // Map shot type to feed-prompt-expert format
    let feedShotType: 'portrait' | 'half-body' | 'full-body' | 'object' | 'flatlay' | 'scenery' = 'portrait'
    const shotTypeLower = (post.shotType || 'portrait').toLowerCase()
    
    if (shotTypeLower.includes('half') || shotTypeLower.includes('upper')) {
      feedShotType = 'half-body'
    } else if (shotTypeLower.includes('full') || shotTypeLower.includes('body')) {
      feedShotType = 'full-body'
    } else if (shotTypeLower.includes('flatlay') || shotTypeLower.includes('flat')) {
      feedShotType = 'flatlay'
    } else if (shotTypeLower.includes('object') || shotTypeLower.includes('product')) {
      feedShotType = 'object'
    } else if (shotTypeLower.includes('scenery') || shotTypeLower.includes('landscape')) {
      feedShotType = 'scenery'
    }

    const promptParams = {
      mode: postMode,
      postType: post.postType,
      shotType: feedShotType,
      colorPalette: selectedPalette,
      visualDirection: post.visualDirection,
      purpose: post.purpose,
      background: post.background,
      triggerWord: postMode === 'classic' ? triggerWord : undefined,
      gender: userGender || 'woman',
      ethnicity: userEthnicity || undefined,
      physicalPreferences: physicalPreferences || undefined
    }

    // Generate the prompt
    const generatedPrompt = generateFeedPrompt(promptParams)

    // Validate prompt quality
    const validation = validateFeedPrompt(generatedPrompt, postMode)
    
    if (!validation.valid) {
      console.error(`[FEED-PROMPT] ❌ Post ${post.position} validation errors:`, validation.errors)
    }
    
    if (validation.warnings.length > 0) {
      console.warn(`[FEED-PROMPT] ⚠️ Post ${post.position} warnings:`, validation.warnings)
    }

    return {
      ...post,
      prompt: generatedPrompt,
      status: 'pending' as const,
      generationMode: postMode,
      colorPalette: selectedPalette.name,
      aesthetic: selectedPalette.id
    }
  })

  // Validate cohesion across all 9 prompts
  const cohesionCheck = ensureFeedCohesion(
    generatedPosts.map(p => p.prompt),
    selectedPalette
  )

  if (!cohesionCheck.cohesive) {
    console.warn('[FEED-COHESION] ⚠️ Issues detected:', cohesionCheck.issues)
    // Log but continue - prompts are still usable
  } else {
    console.log(`[FEED-COHESION] ✅ All prompts validated for ${selectedPalette.name} aesthetic`)
  }

  console.log(`[FEED-PROMPTS] ✅ Generated ${generatedPosts.length} prompts in ${selectedPalette.name} aesthetic`)

  return generatedPosts
}

// ============================================================================
// VALIDATION HELPERS (Client-Safe)
// ============================================================================

/**
 * Verify all posts have required caption field
 * This is a client-safe validation function (no database access)
 */
export function verifyPostCaptions(posts: GeneratedFeedPost[]): boolean {
  const missingCaptions = posts.filter(p => !p.caption || p.caption.trim() === '')
  
  if (missingCaptions.length > 0) {
    console.error('[FEED-VERIFICATION] ❌ Posts missing captions:', 
      missingCaptions.map(p => p.position)
    )
    return false
  }
  
  console.log('[FEED-VERIFICATION] ✅ All posts have captions')
  return true
}

/**
 * Validate feed data structure
 * This is a client-safe validation function (no database access)
 */
export function validateFeedStructure(feed: {
  title?: string
  posts?: GeneratedFeedPost[]
}): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!feed.title) errors.push('Missing feed title')
  if (!feed.posts || !Array.isArray(feed.posts)) errors.push('Missing posts array')
  if (feed.posts && feed.posts.length !== 9) errors.push('Feed must have exactly 9 posts')

  // Validate each post
  feed.posts?.forEach((post, index) => {
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

// ============================================================================
// MAIN ORCHESTRATION FUNCTION
// ============================================================================

interface GenerateFeedParams {
  mayaResponse: string
  userId: string
  userGender?: string
  userEthnicity?: string
  physicalPreferences?: string
  triggerWord?: string
  brandVibe?: string
  visualAesthetic?: string
  userSelectedMode?: 'classic' | 'pro' | null
}

/**
 * Main orchestration: Parse strategy → Generate prompts → Return structured data
 * 
 * Note: Database persistence is handled by existing routes (create-from-strategy)
 * This function returns the structured data ready for persistence
 */
export async function generateCompleteFeed(params: GenerateFeedParams): Promise<GeneratedFeed | null> {
  const {
    mayaResponse,
    userId,
    userGender,
    userEthnicity,
    physicalPreferences,
    triggerWord,
    brandVibe,
    visualAesthetic,
    userSelectedMode
  } = params

  console.log('[FEED-HANDLER] ==================== START ====================')

  // Step 1: Parse strategy
  const strategy = parseFeedStrategy(mayaResponse)
  if (!strategy) {
    console.error('[FEED-HANDLER] ❌ Failed to parse feed strategy from Maya response')
    return null
  }

  console.log(`[FEED-HANDLER] ✅ Strategy parsed: "${strategy.feedTitle}"`)

  // Step 2: Generate prompts
  const postsWithPrompts = await generateFeedPrompts({
    strategy,
    userId,
    userGender,
    userEthnicity,
    physicalPreferences,
    triggerWord,
    brandVibe,
    visualAesthetic,
    userSelectedMode
  })

  // Determine aesthetic
  const selectedPalette = getColorPaletteByPreference(
    visualAesthetic || strategy.colorPalette,
    brandVibe || strategy.overallVibe
  )

  // Calculate total credits
  const totalCredits = postsWithPrompts.reduce((sum, post) => 
    sum + (post.generationMode === 'pro' ? 2 : 1), 0
  )

  // Step 3: Return complete feed structure
  const generatedFeed: GeneratedFeed = {
    strategy: {
      ...strategy,
      totalCredits
    },
    posts: postsWithPrompts,
    aesthetic: selectedPalette.name,
    aestheticId: selectedPalette.id,
    totalCredits,
    status: 'pending' // Will be updated when images are generated
  }

  console.log(`[FEED-HANDLER] ✅ Feed generation complete: ${postsWithPrompts.length} posts, ${totalCredits} credits, ${selectedPalette.name} aesthetic`)
  console.log('[FEED-HANDLER] ==================== END ====================')

  return generatedFeed
}

// ============================================================================
// API CLIENT FUNCTIONS (Call existing endpoints, don't duplicate logic)
// ============================================================================

/**
 * Options for creating a feed
 */
export interface CreateFeedOptions {
  studioProMode?: boolean
  customSettings?: {
    styleStrength?: number
    promptAccuracy?: number
    aspectRatio?: string
    realismStrength?: number
  }
  userModePreference?: 'classic' | 'pro' | null
  imageLibrary?: any
}

/**
 * Create feed from strategy by calling the existing API endpoint
 * This delegates to /api/feed-planner/create-from-strategy
 */
export async function createFeedFromStrategyHandler(
  strategy: FeedStrategy,
  options: CreateFeedOptions = {}
): Promise<{
  success: boolean
  feedId?: string
  feed?: any
  posts?: any[]
  error?: string
}> {
  try {
    console.log('[FEED-HANDLER] Creating feed from strategy via API...')

    const response = await fetch('/api/feed-planner/create-from-strategy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strategy,
        customSettings: options.customSettings,
        userModePreference: options.userModePreference,
        imageLibrary: options.imageLibrary,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('[FEED-HANDLER] API error:', errorData)
      return {
        success: false,
        error: errorData.error || errorData.message || 'Failed to create feed',
      }
    }

    const data = await response.json()
    
    console.log('[FEED-HANDLER] ✅ Feed created successfully:', data.feedLayoutId)

    return {
      success: true,
      feedId: data.feedLayoutId?.toString(),
      feed: data.feed,
      posts: data.posts,
    }
  } catch (error) {
    console.error('[FEED-HANDLER] Error creating feed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate captions for a feed by calling the existing API endpoint
 */
export async function generateCaptionsHandler(feedId?: string): Promise<{
  success: boolean
  feedId?: string
  captions?: any[]
  error?: string
}> {
  try {
    // If feedId not provided, try to get it from the last feed card in messages
    // This is a simplified version - the actual implementation might need more context
    if (!feedId) {
      console.warn('[FEED-HANDLER] No feedId provided for caption generation')
      return {
        success: false,
        error: 'Feed ID is required',
      }
    }

    console.log('[FEED-HANDLER] Generating captions for feed:', feedId)

    const response = await fetch(`/api/feed/${feedId}/generate-captions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: errorData.error || 'Failed to generate captions',
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      feedId: feedId,
      captions: data.captions,
    }
  } catch (error) {
    console.error('[FEED-HANDLER] Error generating captions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate strategy document for a feed by calling the existing API endpoint
 */
export async function generateStrategyHandler(feedId?: string): Promise<{
  success: boolean
  feedId?: string
  strategy?: any
  error?: string
}> {
  try {
    if (!feedId) {
      console.warn('[FEED-HANDLER] No feedId provided for strategy generation')
      return {
        success: false,
        error: 'Feed ID is required',
      }
    }

    console.log('[FEED-HANDLER] Generating strategy for feed:', feedId)

    const response = await fetch(`/api/feed/${feedId}/generate-strategy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      return {
        success: false,
        error: errorData.error || 'Failed to generate strategy',
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      feedId: feedId,
      strategy: data.strategy,
    }
  } catch (error) {
    console.error('[FEED-HANDLER] Error generating strategy:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Save feed marker to message for persistence
 * This allows the feed card to be restored when messages are reloaded
 */
export async function saveFeedMarkerToMessage(
  messageId: number,
  feedId: string
): Promise<void> {
  try {
    console.log('[FEED-HANDLER] Saving feed marker to message:', { messageId, feedId })

    const response = await fetch('/api/maya/save-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId,
        feedMarker: `[FEED_CARD:${feedId}]`,
      }),
    })

    if (!response.ok) {
      console.warn('[FEED-HANDLER] Failed to save feed marker to message')
    } else {
      console.log('[FEED-HANDLER] ✅ Feed marker saved to message')
    }
  } catch (error) {
    console.error('[FEED-HANDLER] Error saving feed marker:', error)
    // Don't throw - this is not critical
  }
}
