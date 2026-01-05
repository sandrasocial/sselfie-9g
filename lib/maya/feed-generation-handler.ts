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
  validateAndAugmentPrompt,
  generateFallbackPrompt,
  getColorPaletteByPreference,
  ensureFeedCohesion,
  getPostTypeDistribution,
  type ColorPalette,
  type FeedPromptParams
} from '@/lib/feed-planner/feed-prompt-expert'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FeedPost {
  position: number
  postType: 'user' | 'lifestyle' | string // Allow string for flexibility when parsing Maya's response
  shotType: 'portrait' | 'half-body' | 'full-body' | 'object' | 'flatlay' | 'scenery' | string
  visualDirection: string
  purpose: string
  caption?: string
  background?: string
  generationMode?: 'classic' | 'pro' | string
  type?: string // Legacy field for post type (alternative to postType)
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
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that Maya used the correct aesthetic
 */
function validateAestheticChoice(
  strategy: FeedStrategy,
  userRequest?: string,
  brandPreference?: string
): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Extract aesthetic from user request
  const requestLower = userRequest?.toLowerCase() || ''
  
  const aestheticKeywords: Record<string, string[]> = {
    'dark_moody': ['dark', 'moody', 'monochrome', 'black and white', 'edgy', 'dramatic'],
    'clean_minimal': ['clean', 'minimal', 'minimalistic', 'white', 'bright', 'pure', 'ethereal', 'simple white'],
    'scandi_muted': ['scandi', 'scandinavian', 'nordic', 'hygge', 'greige', 'muted'],
    'beige_simple': ['beige', 'coffee', 'latte', 'warm neutral', 'cozy', 'tan', 'beige & simple'],
    'pastels_scandic': ['pastel', 'soft', 'pink', 'romantic', 'dusty', 'feminine', 'pastels scandic']
  }
  
  // Find requested aesthetic
  let requestedAesthetic: string | null = null
  
  for (const [aesthetic, keywords] of Object.entries(aestheticKeywords)) {
    if (keywords.some(kw => requestLower.includes(kw))) {
      requestedAesthetic = aesthetic
      break
    }
  }
  
  if (requestedAesthetic) {
    const strategyAesthetic = (strategy.colorPalette || strategy.overallVibe || '').toLowerCase()
    const aestheticName = requestedAesthetic.replace(/_/g, ' ') // Replace all underscores with spaces
    
    // Check if strategy aesthetic matches requested
    const aestheticMatches: Record<string, string[]> = {
      'dark_moody': ['dark', 'moody', 'monochrome', 'black'],
      'clean_minimal': ['clean', 'minimal', 'white', 'bright', 'pure'],
      'scandi_muted': ['scandi', 'scandinavian', 'greige', 'muted', 'hygge'],
      'beige_simple': ['beige', 'coffee', 'latte', 'tan', 'warm'],
      'pastels_scandic': ['pastel', 'soft', 'pink', 'romantic', 'dusty']
    }
    
    const matchKeywords = aestheticMatches[requestedAesthetic] || []
    const hasMatch = matchKeywords.some(kw => strategyAesthetic.includes(kw))
    
    if (!hasMatch && strategyAesthetic.length > 0) {
      errors.push(
        `User requested "${aestheticName}" but strategy uses "${strategy.colorPalette || strategy.overallVibe}". ` +
        `Expected keywords: ${matchKeywords.join(', ')}`
      )
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate grid composition for patterns
 */
function validateGridComposition(posts: FeedPost[]): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Get lifestyle post positions
  const lifestylePositions = posts
    .filter(p => (p.postType || '').toLowerCase() === 'lifestyle')
    .map(p => p.position)
    .sort((a, b) => a - b)
  
  if (lifestylePositions.length === 0) {
    warnings.push('No lifestyle posts found in strategy - should have 2 lifestyle posts (22% of feed)')
    return { valid: true, errors, warnings }
  }
  
  // Check for diagonal patterns (forbidden)
  const forbiddenDiagonals = [
    [2, 5, 8], // Vertical center column
    [3, 6, 9], // Right column
    [1, 5, 9], // Main diagonal
    [3, 5, 7]  // Reverse diagonal
  ]
  
  // Check for row patterns (forbidden)
  const forbiddenRows = [
    [1, 2, 3], // Top row
    [4, 5, 6], // Middle row
    [7, 8, 9]  // Bottom row
  ]
  
  // Check for column patterns (forbidden)
  const forbiddenColumns = [
    [1, 4, 7], // Left column
    [2, 5, 8], // Center column
    [3, 6, 9]  // Right column
  ]
  
  // Check all forbidden patterns
  const allForbidden = [...forbiddenDiagonals, ...forbiddenRows, ...forbiddenColumns]
  
  for (const pattern of allForbidden) {
    const matches = pattern.filter(pos => lifestylePositions.includes(pos))
    if (matches.length === pattern.length) {
      // All positions in pattern are lifestyle posts
      errors.push(`Lifestyle posts form forbidden pattern: positions ${pattern.join(', ')}`)
    }
  }
  
  // Check for diagonal pairs (warnings)
  const diagonalPairs = [
    [2, 5], [5, 8], // Vertical center
    [3, 5], [5, 7], // Diagonals
    [1, 5], [5, 9], // Main diagonal
    [3, 6], [6, 9]  // Right column
  ]
  
  for (const pair of diagonalPairs) {
    if (pair.every(pos => lifestylePositions.includes(pos))) {
      warnings.push(`Lifestyle posts in diagonal positions: ${pair.join(', ')} - consider varying for more organic distribution`)
    }
  }
  
  // Check for same row/column (warnings)
  for (const row of forbiddenRows) {
    const matches = row.filter(pos => lifestylePositions.includes(pos))
    if (matches.length >= 2) {
      warnings.push(`Multiple lifestyle posts in same row: positions ${matches.join(', ')} - consider scattering across grid`)
    }
  }
  
  for (const col of forbiddenColumns) {
    const matches = col.filter(pos => lifestylePositions.includes(pos))
    if (matches.length >= 2) {
      warnings.push(`Multiple lifestyle posts in same column: positions ${matches.join(', ')} - consider scattering across grid`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// ============================================================================
// FEED STRATEGY PARSING
// ============================================================================

/**
 * Parse feed strategy from Maya's JSON response
 * Looks for [CREATE_FEED_STRATEGY] trigger and extracts JSON
 * 
 * @param mayaResponse - Maya's full response text
 * @param userRequest - Optional user request text to validate aesthetic choice
 */
export function parseFeedStrategy(mayaResponse: string, userRequest?: string): FeedStrategy | null {
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
        jsonMatch = ['', mayaResponse.substring(jsonStart, jsonEnd)] as RegExpMatchArray
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

    // Validate strategy
    console.log('[FEED-PARSER] 🔍 Validating strategy...')
    
    // Extract user request from strategy or parameter
    const extractedUserRequest = userRequest || normalizedStrategy.userRequest || mayaResponse.substring(0, 500) // Use first 500 chars as fallback
    
    // Validate aesthetic choice
    const aestheticValidation = validateAestheticChoice(
      normalizedStrategy,
      extractedUserRequest
    )
    
    if (!aestheticValidation.valid) {
      console.error('[FEED-PARSER] ❌ Aesthetic validation failed:')
      aestheticValidation.errors.forEach(error => {
        console.error(`  - ${error}`)
      })
      // Don't block - just warn (Maya might have good reasons)
    } else {
      console.log('[FEED-PARSER] ✅ Aesthetic validation passed')
    }
    
    if (aestheticValidation.warnings.length > 0) {
      console.warn('[FEED-PARSER] ⚠️ Aesthetic warnings:')
      aestheticValidation.warnings.forEach(warning => {
        console.warn(`  - ${warning}`)
      })
    }
    
    // Validate grid composition
    const gridValidation = validateGridComposition(normalizedPosts)
    
    if (!gridValidation.valid) {
      console.error('[FEED-PARSER] ❌ Grid composition validation failed:')
      gridValidation.errors.forEach(error => {
        console.error(`  - ${error}`)
      })
      // Don't block - just warn (Maya might have creative reasons)
    } else {
      console.log('[FEED-PARSER] ✅ Grid composition validation passed')
    }
    
    if (gridValidation.warnings.length > 0) {
      console.warn('[FEED-PARSER] ⚠️ Grid composition warnings:')
      gridValidation.warnings.forEach(warning => {
        console.warn(`  - ${warning}`)
      })
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

  console.log('[FEED-PROMPTS] 🎨 Processing Maya\'s prompts with validation and augmentation...')

  // Determine color palette from user preferences or strategy
  const selectedPalette = getColorPaletteByPreference(
    visualAesthetic || strategy.colorPalette,
    brandVibe || strategy.overallVibe
  )

  console.log(`[FEED-PROMPTS] 🎨 Selected aesthetic: ${selectedPalette.name} (${selectedPalette.id})`)
  console.log(`[FEED-PROMPTS] 🎨 Color palette: ${selectedPalette.hexCodes.join(', ')}`)

  // Get recommended distribution for this aesthetic
  const distribution = getPostTypeDistribution(selectedPalette)
  console.log(`[FEED-PROMPTS] 📊 Recommended distribution: ${distribution.userPosts} user, ${distribution.lifestylePosts} lifestyle (${distribution.ratio})`)

  // Process each post - validate/augment Maya's prompts or generate fallback
  const generatedPosts: GeneratedFeedPost[] = strategy.posts.map((post, index) => {
    // Normalize postType
    const normalizedPostType: 'user' | 'lifestyle' = 
      post.postType === 'user' || post.postType === 'lifestyle' 
        ? post.postType as 'user' | 'lifestyle'
        : (post.type === 'portrait' || post.type === 'half-body' || post.type === 'full-body' 
            ? 'user' 
            : 'lifestyle')
    
    // Determine mode for this specific post
    let postMode: 'classic' | 'pro' = 
      (post.generationMode === 'classic' || post.generationMode === 'pro')
        ? post.generationMode as 'classic' | 'pro'
        : 'classic'
    
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

    // Check if Maya provided a prompt
    const mayaPrompt = (post as any).imagePrompt || (post as any).prompt
    
    if (!mayaPrompt || mayaPrompt.trim().length < 20) {
      console.warn(`[FEED-PROMPTS] ⚠️ Post ${post.position}: No prompt from Maya or prompt too short, generating fallback`)
      
      // Generate fallback
      const promptParams: FeedPromptParams = {
        mode: postMode,
        postType: normalizedPostType,
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
      
      const fallbackPrompt = generateFallbackPrompt(promptParams)
      
      return {
        ...post,
        prompt: fallbackPrompt,
        status: 'pending' as const,
        generationMode: postMode,
        colorPalette: selectedPalette.name,
        aesthetic: selectedPalette.id
      }
    }
    
    // Validate and augment Maya's prompt (pass user's trigger word for validation)
    const validation = validateAndAugmentPrompt(
      mayaPrompt,
      postMode,
      selectedPalette,
      normalizedPostType,
      postMode === 'classic' ? triggerWord : undefined // Pass trigger word for Classic Mode validation
    )
    
    console.log(`[FEED-PROMPTS] Post ${post.position} validation:`, {
      valid: validation.valid,
      score: validation.score,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
      hasAugmentation: !!validation.augmentedPrompt
    })
    
    if (!validation.valid) {
      console.error(`[FEED-PROMPTS] ❌ Post ${post.position} validation errors:`, validation.errors)
    }
    
    if (validation.warnings.length > 0) {
      console.warn(`[FEED-PROMPTS] ⚠️ Post ${post.position} warnings:`, validation.warnings)
    }
    
    // If critical errors (score < 50), use fallback
    if (validation.score < 50) {
      console.warn(`[FEED-PROMPTS] ⚠️ Post ${post.position}: Score too low (${validation.score}), using fallback`)
      
      const promptParams: FeedPromptParams = {
        mode: postMode,
        postType: normalizedPostType,
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
      
      const fallbackPrompt = generateFallbackPrompt(promptParams)
      
      return {
        ...post,
        prompt: fallbackPrompt,
        status: 'pending' as const,
        generationMode: postMode,
        colorPalette: selectedPalette.name,
        aesthetic: selectedPalette.id
      }
    }
    
    // Use Maya's prompt (possibly augmented)
    const finalPrompt = validation.augmentedPrompt || mayaPrompt
    
    if (validation.augmentedPrompt) {
      console.log(`[FEED-PROMPTS] ✅ Post ${post.position}: Using augmented Maya prompt (added: ${validation.suggestions.join(', ')})`)
    } else {
      console.log(`[FEED-PROMPTS] ✅ Post ${post.position}: Using original Maya prompt (score: ${validation.score})`)
    }

    return {
      ...post,
      prompt: finalPrompt,
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

  // Count how many used Maya's prompts vs fallback
  const mayaPromptCount = generatedPosts.filter(p => {
    const originalPrompt = (strategy.posts.find(sp => sp.position === p.position) as any)?.imagePrompt || 
                          (strategy.posts.find(sp => sp.position === p.position) as any)?.prompt
    return originalPrompt && originalPrompt.trim().length >= 20
  }).length
  
  const fallbackCount = generatedPosts.length - mayaPromptCount
  
  console.log(`[FEED-PROMPTS] ✅ Processed ${generatedPosts.length} prompts in ${selectedPalette.name} aesthetic`)
  console.log(`[FEED-PROMPTS] 📊 Used Maya's prompts: ${mayaPromptCount}, Fallback generated: ${fallbackCount}`)

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
  // Extract user request from mayaResponse for validation (first 500 chars usually contain user's request)
  const userRequestHint = mayaResponse.substring(0, 500) + (visualAesthetic ? ` ${visualAesthetic}` : '')
  const strategy = parseFeedStrategy(mayaResponse, userRequestHint)
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
  saveToPlanner?: boolean // CRITICAL: If false, feed saved with status='chat' (not in planner). If true, status='saved' (in planner)
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
        saveToPlanner: options.saveToPlanner ?? false, // Default to false (chat feed, not in planner)
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

    // Fetch feed data since API endpoint only returns feedLayoutId
    // The endpoint returns { feedLayoutId, message, status } but not feed/posts
    let feedData = null
    let postsData: any[] = []
    
    if (data.feedLayoutId) {
      try {
        const feedResponse = await fetch(`/api/feed/${data.feedLayoutId}`)
        if (feedResponse.ok) {
          const feedResult = await feedResponse.json()
          
          // Extract feed and posts from response (handle different response formats)
          if (feedResult.posts && Array.isArray(feedResult.posts)) {
            postsData = feedResult.posts
            feedData = {
              id: feedResult.id || data.feedLayoutId,
              brand_name: feedResult.brand_name || feedResult.title || 'Instagram Feed',
              description: feedResult.description || feedResult.gridPattern || '',
              gridPattern: feedResult.gridPattern || '',
              status: feedResult.status || data.status || 'draft',
            }
          } else if (feedResult.feed?.posts && Array.isArray(feedResult.feed.posts)) {
            // Legacy format
            postsData = feedResult.feed.posts
            feedData = {
              id: feedResult.feed.id || data.feedLayoutId,
              brand_name: feedResult.feed.brand_name || feedResult.feed.title || 'Instagram Feed',
              description: feedResult.feed.description || feedResult.feed.gridPattern || '',
              gridPattern: feedResult.feed.gridPattern || '',
              status: feedResult.feed.status || data.status || 'draft',
            }
          } else {
            console.warn('[FEED-HANDLER] ⚠️ Feed data fetched but no posts found')
            // Still create minimal feed data
            feedData = {
              id: data.feedLayoutId,
              brand_name: 'Instagram Feed',
              description: '',
              gridPattern: '',
              status: data.status || 'draft',
            }
          }
          
          console.log('[FEED-HANDLER] ✅ Fetched feed data:', { feedId: data.feedLayoutId, postsCount: postsData.length })
        } else {
          console.warn('[FEED-HANDLER] ⚠️ Failed to fetch feed data after creation, but feed was created')
          // Still return success with minimal data
          feedData = {
            id: data.feedLayoutId,
            brand_name: 'Instagram Feed',
            description: '',
            gridPattern: '',
            status: data.status || 'draft',
          }
        }
      } catch (fetchError) {
        console.error('[FEED-HANDLER] ❌ Error fetching feed data after creation:', fetchError)
        // Still return success with minimal data - feed was created successfully
        feedData = {
          id: data.feedLayoutId,
          brand_name: 'Instagram Feed',
          description: '',
          gridPattern: '',
          status: data.status || 'draft',
        }
      }
    }

    return {
      success: true,
      feedId: data.feedLayoutId?.toString(),
      feed: feedData,
      posts: postsData,
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

    // Use update-message endpoint which accepts messageId and content
    // Append the feed marker to existing message content for persistence
    const response = await fetch('/api/maya/update-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId,
        content: `[FEED_CARD:${feedId}]`,
        append: true, // Append to existing content
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[FEED-HANDLER] ❌ Failed to save feed marker to message:', {
        status: response.status,
        error: errorData.error,
      })
    } else {
      console.log('[FEED-HANDLER] ✅ Feed marker saved to message:', messageId)
    }
  } catch (error) {
    console.error('[FEED-HANDLER] Error saving feed marker:', error)
    // Don't throw - this is not critical
  }
}
