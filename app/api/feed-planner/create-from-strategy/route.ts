import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { deductCredits, checkCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"
import { getStudioProCreditCost } from "@/lib/nano-banana-client"
import { detectProModeType } from "@/lib/feed-planner/mode-detection"
import {
  getDefaultVariationId,
  getFeedStyleV2ByName,
  getFeedStyleVariationById,
  normalizeFeedStyleV2Name,
} from "@/lib/feed-planner/feed-style-prompt-loader"
import { isSupportedFeedPlanPostCount } from "@/lib/maya/feed-strategy"

/**
 * Live Feed Planner creation route.
 *
 * Current production behavior here is Pro-only: every created post is forced to
 * `generationMode = "pro"` and priced with the Studio Pro/Nano Banana path.
 *
 * Some surrounding feed-planner code still contains Classic branching, but it
 * is dormant for this route until a later consolidation pass intentionally
 * re-enables it.
 */

export const maxDuration = 300

function buildFeedCreateIdempotencyPrefix(userId: number, key: string): string {
  return `feed-create:${userId}:${key}`
}

function parseFeedIdFromReference(referenceId?: string | null): number | null {
  if (!referenceId) return null
  const match = /:feed:(\d+)$/.exec(referenceId)
  if (!match) return null
  const feedId = Number(match[1])
  return Number.isFinite(feedId) ? feedId : null
}

// Helper function to safely truncate strings
function truncate(str: string | null | undefined, maxLength: number, defaultValue: string = ''): string {
  if (!str) return defaultValue
  return str.length > maxLength ? str.substring(0, maxLength) : str
}

// Helper function to generate SHORT layout type label (max 50 chars) from post analysis
function getLayoutType(gridPattern: string | undefined, posts: any[]): string {
  if (!posts || posts.length === 0) return "Mixed Layout"
  
  // Support compact 6-post layouts plus the standard 9- and 12-post grids.
  if (posts.length === 6) return "grid_3x2"
  if (posts.length === 12) return "grid_3x4"
  if (posts.length === 9) return "grid_3x3"
  
  // Count post types
  const portraitCount = posts.filter(p => 
    p.type === 'portrait' || p.postType === 'portrait'
  ).length
  const objectCount = posts.filter(p => 
    ['object', 'flatlay', 'scenery'].includes(p.type || p.postType)
  ).length
  const proCount = posts.filter(p => 
    p.generationMode === 'pro' || p.generationMode === 'Pro'
  ).length
  const quoteCount = posts.filter(p => 
    p.type === 'quote' || p.postType === 'quote'
  ).length
  
  // Generate descriptive but SHORT label (max 50 chars)
  if (proCount >= 5) return "Pro-Heavy"
  if (portraitCount >= 6) return "Portrait-Focused"
  if (objectCount >= 5) return "Lifestyle-Rich"
  if (quoteCount >= 3) return "Quote-Heavy"
  if (portraitCount === objectCount && portraitCount > 0) return "Balanced Mix"
  if (proCount >= 3) return "Mixed with Pro"
  if (portraitCount > objectCount) return "Portrait-Dominant"
  if (objectCount > portraitCount) return "Lifestyle-Dominant"
  
  return "Mixed Layout"
}

/**
 * Create feed from Maya's pre-generated strategy
 * This endpoint accepts a complete strategy from the conversational flow
 */
export async function POST(request: NextRequest) {
  let advisoryLockKey: string | null = null
  let advisoryLockAcquired = false
  try {
    console.log("[FEED-FROM-STRATEGY] ==================== START ====================")

    const { user: authUser, error: authError } = await getAuthenticatedUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const neonUserId = neonUser.id

    // Get Maya's strategy from request
    const {
      strategy,
      customSettings,
      userModePreference,
      imageLibrary,
      saveToPlanner = false,
      idempotencyKey: bodyIdempotencyKey,
    } = await request.json()

    const headerIdempotencyKey = request.headers.get("x-idempotency-key")
    const idempotencyKeyRaw = (typeof bodyIdempotencyKey === "string" ? bodyIdempotencyKey : headerIdempotencyKey || "").trim()
    const idempotencyKey = idempotencyKeyRaw.length > 0 ? idempotencyKeyRaw.slice(0, 120) : null

    if (idempotencyKey) {
      const idempotencyPrefix = buildFeedCreateIdempotencyPrefix(neonUser.id, idempotencyKey)
      const [existingCharge] = await sql`
        SELECT reference_id
        FROM credit_transactions
        WHERE user_id = ${neonUser.id.toString()}
        AND reference_id LIKE ${`${idempotencyPrefix}:feed:%`}
        ORDER BY created_at DESC
        LIMIT 1
      `
      const existingFeedId = parseFeedIdFromReference(existingCharge?.reference_id)
      if (existingFeedId) {
        const [existingFeed] = await sql`
          SELECT id, status
          FROM feed_layouts
          WHERE id = ${existingFeedId}
          AND user_id = ${neonUser.id}
          LIMIT 1
        `
        if (existingFeed) {
          return NextResponse.json({
            success: true,
            feedLayoutId: existingFeed.id,
            message: "Feed already created for this request.",
            status: existingFeed.status || (saveToPlanner ? "saved" : "chat"),
            idempotentReplay: true,
          })
        }
      }

      advisoryLockKey = idempotencyPrefix
      const [lockResult] = await sql`
        SELECT pg_try_advisory_lock(hashtext(${advisoryLockKey})) AS locked
      `
      advisoryLockAcquired = Boolean(lockResult?.locked)

      if (!advisoryLockAcquired) {
        const [inFlightCharge] = await sql`
          SELECT reference_id
          FROM credit_transactions
          WHERE user_id = ${neonUser.id.toString()}
          AND reference_id LIKE ${`${idempotencyPrefix}:feed:%`}
          ORDER BY created_at DESC
          LIMIT 1
        `
        const inFlightFeedId = parseFeedIdFromReference(inFlightCharge?.reference_id)
        if (inFlightFeedId) {
          return NextResponse.json({
            success: true,
            feedLayoutId: inFlightFeedId,
            message: "Feed already created for this request.",
            status: saveToPlanner ? "saved" : "chat",
            idempotentReplay: true,
          })
        }
        return NextResponse.json(
          {
            error: "Feed creation already in progress for this request.",
            retryable: true,
          },
          { status: 409 }
        )
      }
    }
    
    // CRITICAL: saveToPlanner determines if feed appears in Feed Planner screen
    // - saveToPlanner: false → status: 'chat' (feed saved for persistence, but NOT in planner)
    // - saveToPlanner: true → status: 'saved' (feed explicitly saved to planner)
    // This prevents incomplete feeds from appearing in planner and confusing users
    const feedStatus = saveToPlanner ? 'saved' : 'chat'
    console.log(`[FEED-FROM-STRATEGY] Feed status: ${feedStatus} (saveToPlanner: ${saveToPlanner})`)
    
    // CRITICAL: User's mode preference (from toggle) takes precedence over auto-detection
    // userModePreference: 'pro' | 'classic' | undefined
    // If provided, ALL posts use this mode (user explicitly chose)
    // If undefined, fall back to auto-detection per post
    const forceMode = userModePreference === 'pro' || userModePreference === 'classic' ? userModePreference : null
    
    if (forceMode) {
      console.log(`[FEED-FROM-STRATEGY] 🎯 User mode preference: ${forceMode.toUpperCase()} (overriding auto-detection for all posts)`)
    } else {
      console.log(`[FEED-FROM-STRATEGY] 🔍 No user mode preference - using auto-detection per post`)
    }

    // CRITICAL: Image library (user's selected images) - only for Pro Mode
    // This is the library wizard selection, NOT auto-fetched from database
    const userImageLibrary = imageLibrary ? {
      selfies: Array.isArray(imageLibrary.selfies) ? imageLibrary.selfies : [],
      products: Array.isArray(imageLibrary.products) ? imageLibrary.products : [],
      people: Array.isArray(imageLibrary.people) ? imageLibrary.people : [],
      vibes: Array.isArray(imageLibrary.vibes) ? imageLibrary.vibes : [],
      intent: typeof imageLibrary.intent === 'string' ? imageLibrary.intent : '',
    } : null

    if (userImageLibrary && forceMode === 'pro') {
      console.log(`[FEED-FROM-STRATEGY] 📚 User image library provided:`, {
        selfies: userImageLibrary.selfies.length,
        products: userImageLibrary.products.length,
        people: userImageLibrary.people.length,
        vibes: userImageLibrary.vibes.length,
      })
    }

    if (!strategy || !strategy.posts || !Array.isArray(strategy.posts)) {
      console.error("[FEED-FROM-STRATEGY] Invalid strategy format:", strategy)
      return NextResponse.json(
        { error: "Invalid strategy format - posts array required" },
        { status: 400 }
      )
    }

    // Feed cards support compact 6-post layouts plus the standard 9- and 12-post grids.
    if (!isSupportedFeedPlanPostCount(strategy.posts.length)) {
      console.error("[FEED-FROM-STRATEGY] Invalid strategy: expected 6, 9, or 12 posts, got", strategy.posts.length)
      return NextResponse.json(
        { error: "Strategy must contain exactly 6, 9, or 12 posts" },
        { status: 400 }
      )
    }

    console.log("[FEED-FROM-STRATEGY] Received strategy with", strategy.posts.length, "posts")
    
    // 🔴 CRITICAL FIX: Normalize "imagePrompt" to "prompt" if Maya used wrong field name
    // Maya sometimes outputs "imagePrompt" instead of "prompt" - this normalizes it
    for (const post of strategy.posts) {
      if ((post as any).imagePrompt && !(post as any).prompt) {
        console.log(`[FEED-FROM-STRATEGY] ⚠️ Post ${post.position}: Converting "imagePrompt" to "prompt"`)
        ;(post as any).prompt = (post as any).imagePrompt
        delete (post as any).imagePrompt
      }
    }
    
    // Log prompt status for debugging
    const promptsCount = strategy.posts.filter((p: any) => p.prompt && p.prompt.trim().length > 20).length
    console.log(`[FEED-FROM-STRATEGY] Posts with valid prompts: ${promptsCount} out of ${strategy.posts.length}`)

    // ==================== PREREQUISITE VALIDATION (BEFORE CREATING FEED) ====================
    // Determine which posts will be Classic vs Pro Mode
    const classicPosts: typeof strategy.posts = []
    const proPosts: typeof strategy.posts = []
    
    for (const post of strategy.posts) {
      // CRITICAL: Feed Planner ALWAYS uses Pro Mode (Nano Banana Pro) for ALL users
      // Force Pro Mode for all Feed Planner posts, regardless of user preference or post type
      let generationMode: 'classic' | 'pro' = 'pro'
      
      // All Feed Planner posts go to Pro Mode
      proPosts.push(post)
    }
    
    // CRITICAL: Feed Planner ALWAYS uses Pro Mode - all posts are Pro Mode
    console.log(`[FEED-FROM-STRATEGY] Mode distribution: 0 Classic, ${proPosts.length} Pro (all Feed Planner posts use Pro Mode)`)
    
    // Calculate total credits needed (strategy + images)
    // Strategy credits: 1 credit (fixed)
    const strategyCredits = 1
    
    // Image credits: All posts are Pro Mode × 2 credits each
    const totalImageCredits = proPosts.length * getStudioProCreditCost('2K')
    
    // Total credits needed
    const totalCredits = strategyCredits + totalImageCredits
    
    console.log(`[FEED-FROM-STRATEGY] Credit calculation: ${strategyCredits} (strategy) + ${totalImageCredits} (images: ${proPosts.length} Pro Mode posts × ${getStudioProCreditCost('2K')} credits each) = ${totalCredits} total credits`)
    
    // CRITICAL: Feed Planner ALWAYS uses Pro Mode - no Classic Mode posts, so no trained model check needed
    // Removed Classic Mode trained model check since all Feed Planner posts use Pro Mode
    if (false) { // This block is disabled - Feed Planner always uses Pro Mode
      const [model] = await sql`
        SELECT trigger_word, replicate_version_id, replicate_model_id, lora_weights_url
        FROM user_models
        WHERE user_id = ${neonUserId}
        AND training_status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1
      `
      
      if (!model || !model.replicate_version_id || !model.lora_weights_url) {
        console.error("[FEED-FROM-STRATEGY] ❌ Classic Mode requires trained model but none found")
        return NextResponse.json(
          {
            error: "Classic Mode requires a trained model",
            message: `You have ${classicPosts.length} Classic Mode posts, but no trained model found. Please train your model first or switch to Pro Mode for all posts.`,
            missingPrerequisite: "trained_model",
            classicPostsCount: classicPosts.length,
            proPostsCount: proPosts.length,
            canSwitchToPro: true,
          },
          { status: 400 }
        )
      }
      
      console.log("[FEED-FROM-STRATEGY] ✅ Trained model found for Classic Mode posts")
    }
    
    // Check for avatar images (required for Pro Mode posts)
    if (proPosts.length > 0) {
      // First check user's image library (from request)
      const hasLibrarySelfies = userImageLibrary && userImageLibrary.selfies && userImageLibrary.selfies.length >= 3
      
      // Also check database as fallback
      const avatarImages = await sql`
        SELECT id FROM user_avatar_images
        WHERE user_id = ${neonUser.id} AND is_active = true
        LIMIT 3
      `
      
      const hasDatabaseSelfies = avatarImages.length >= 3
      
      if (!hasLibrarySelfies && !hasDatabaseSelfies) {
        const libraryCount = userImageLibrary?.selfies?.length || 0
        const databaseCount = avatarImages.length
        
        console.error(`[FEED-FROM-STRATEGY] ❌ Pro Mode requires 3+ avatar images but only found: library=${libraryCount}, database=${databaseCount}`)
        return NextResponse.json(
          {
            error: "Pro Mode requires at least 3 avatar images",
            message: `You have ${proPosts.length} Pro Mode posts, but only ${Math.max(libraryCount, databaseCount)} avatar image(s) available. Please add at least 3 avatar images to your library or switch to Classic Mode.`,
            missingPrerequisite: "avatar_images",
            classicPostsCount: classicPosts.length,
            proPostsCount: proPosts.length,
            currentAvatarCount: Math.max(libraryCount, databaseCount),
            requiredAvatarCount: 3,
            canSwitchToClassic: classicPosts.length === 0, // Can only switch if no Classic posts
          },
          { status: 400 }
        )
      }
      
      console.log("[FEED-FROM-STRATEGY] ✅ Avatar images found for Pro Mode posts")
    }
    
    // Check credits BEFORE creating feed layout
    const hasEnoughCredits = await checkCredits(neonUser.id.toString(), totalCredits)
    if (!hasEnoughCredits) {
      const currentBalance = await getUserCredits(neonUser.id.toString())
      console.error(`[FEED-FROM-STRATEGY] ❌ Insufficient credits: need ${totalCredits}, have ${currentBalance}`)
      return NextResponse.json(
        {
          error: "Insufficient credits",
          message: `You need ${totalCredits} credits to create this feed (${strategyCredits} for strategy + ${totalImageCredits} for images). You currently have ${currentBalance} credits.`,
          requiredCredits: totalCredits,
          currentBalance: currentBalance,
          shortfall: totalCredits - currentBalance,
          strategyCredits,
          imageCredits: totalImageCredits,
          classicPostsCount: classicPosts.length,
          proPostsCount: proPosts.length,
        },
        { status: 402 }
      )
    }
    
    console.log("[FEED-FROM-STRATEGY] ✅ All prerequisites validated - proceeding with feed creation")
    // ==================== END PREREQUISITE VALIDATION ====================

    // Credits are validated upfront, then charged only after rows are created successfully.
    // This prevents charging users for feeds that fail during persistence.

    // Get user's brand profile with all fields needed for caption generation
    const [brandProfile] = await sql`
      SELECT 
        name,
        business_type,
        brand_vibe,
        brand_voice,
        target_audience,
        content_pillars,
        color_palette
      FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      LIMIT 1
    `

    // Get research data if available (from content_research table)
    const [researchData] = await sql`
      SELECT 
        research_summary,
        best_hooks,
        trending_hashtags,
        competitive_insights
      FROM content_research
      WHERE user_id = ${neonUser.id.toString()}
      ORDER BY created_at DESC
      LIMIT 1
    `

    // Generate SHORT layout type label and store FULL gridPattern in visual_rhythm
    const layoutTypeLabel = getLayoutType(strategy.gridPattern, strategy.posts || [])
    const fullGridPattern = strategy.gridPattern || strategy.visualRhythm || 'Balanced flow'
    
    // Ensure layoutTypeLabel is always a valid string (safety check)
    const safeLayoutTypeLabel = (layoutTypeLabel || 'Mixed Layout').substring(0, 50)
    
    console.log("[FEED-FROM-STRATEGY] Layout type label:", safeLayoutTypeLabel)
    console.log("[FEED-FROM-STRATEGY] Full grid pattern length:", fullGridPattern.length)
    
    // Resolve feed style + variation from personal brand for V2 prompt mapping
    let feedStyle: string | null = null
    let feedStyleVariationId: number | null = null
    try {
      const [personalBrand] = await sql`
        SELECT settings_preference, feed_style_variation_id
        FROM user_personal_brand
        WHERE user_id = ${neonUser.id}
        ORDER BY updated_at DESC
        LIMIT 1
      `
      const settingsPreference = personalBrand?.settings_preference
      const personalBrandVariationId = personalBrand?.feed_style_variation_id
        ? Number(personalBrand.feed_style_variation_id)
        : null

      if (settingsPreference) {
        const settings = typeof settingsPreference === "string"
          ? JSON.parse(settingsPreference)
          : settingsPreference
        if (Array.isArray(settings) && settings.length > 0) {
          feedStyle = normalizeFeedStyleV2Name(String(settings[0]).trim())
        }
      }

      if (feedStyle) {
        const style = await getFeedStyleV2ByName(feedStyle)
        if (style?.enabled) {
          if (personalBrandVariationId) {
            const variation = await getFeedStyleVariationById(personalBrandVariationId)
            if (variation && variation.enabled && variation.feed_style_id === style.id) {
              feedStyleVariationId = variation.id
            }
          }
          if (!feedStyleVariationId) {
            feedStyleVariationId = await getDefaultVariationId(style.id)
          }
        }
      }
    } catch (error) {
      console.warn("[FEED-FROM-STRATEGY] Unable to resolve feed style/variation:", error)
      feedStyle = null
      feedStyleVariationId = null
    }

    // Enable photoshoot mode for consistency (like Maya's photoshoot feature)
    // This ensures all 9 images use consistent styling, lighting, and colors
    const photoshootBaseSeed = Math.floor(Math.random() * 1000000)
    console.log("[FEED-FROM-STRATEGY] ✅ Enabling photoshoot mode with base seed:", photoshootBaseSeed)
    
    // Create feed_layouts entry with photoshoot consistency enabled
    let feedLayout: { id: number }
    try {
      const [result] = await sql`
        INSERT INTO feed_layouts (
          user_id,
          title,
          description,
          business_type,
          brand_vibe,
          layout_type,
          visual_rhythm,
          feed_story,
          username,
          brand_name,
          status,
          color_palette,
          photoshoot_enabled,
          photoshoot_base_seed,
          feed_style,
          feed_style_variation_id,
          created_at,
          updated_at
        ) VALUES (
          ${neonUser.id},
          'Instagram Feed Strategy',
          ${strategy.strategyDocument || truncate(fullGridPattern, 5000, 'Feed strategy')},
          ${truncate(brandProfile?.business_type, 255, 'Personal Brand')},
          ${truncate(brandProfile?.brand_vibe, 255, 'Strategic')},
          ${safeLayoutTypeLabel},
          ${fullGridPattern},
          ${strategy.userRequest || 'Conversational feed creation'},
          ${truncate('user' + neonUser.id, 255)},
          ${truncate(brandProfile?.brand_name, 255, 'Personal Brand')},
          ${feedStatus},
          ${brandProfile?.color_palette || null},
          true,
          ${photoshootBaseSeed},
          ${feedStyle},
          ${feedStyleVariationId},
          NOW(),
          NOW()
        )
        RETURNING id
      `
      feedLayout = result as { id: number }
    } catch (error: any) {
      if (error?.code === '42703') {
        const [result] = await sql`
          INSERT INTO feed_layouts (
            user_id,
            title,
            description,
            business_type,
            brand_vibe,
            layout_type,
            visual_rhythm,
            feed_story,
            username,
            brand_name,
            status,
            color_palette,
            photoshoot_enabled,
            photoshoot_base_seed,
            created_at,
            updated_at
          ) VALUES (
            ${neonUser.id},
            'Instagram Feed Strategy',
            ${strategy.strategyDocument || truncate(fullGridPattern, 5000, 'Feed strategy')},
            ${truncate(brandProfile?.business_type, 255, 'Personal Brand')},
            ${truncate(brandProfile?.brand_vibe, 255, 'Strategic')},
            ${safeLayoutTypeLabel},
            ${fullGridPattern},
            ${strategy.userRequest || 'Conversational feed creation'},
            ${truncate('user' + neonUser.id, 255)},
            ${truncate(brandProfile?.brand_name, 255, 'Personal Brand')},
            ${feedStatus},
            ${brandProfile?.color_palette || null},
            true,
            ${photoshootBaseSeed},
            NOW(),
            NOW()
          )
          RETURNING id
        `
        feedLayout = result as { id: number }
      } else {
        throw error
      }
    }

    console.log("[FEED-FROM-STRATEGY] Feed layout created:", feedLayout.id)

    // ==================== OPTIMIZATION: Create posts with minimal data first, return immediately ====================
    // Insert posts with placeholder prompts/captions (fast - allows immediate return)
    console.log(`[FEED-FROM-STRATEGY] Creating ${strategy.posts.length} posts with placeholder data...`)
    
    const failedPosts: Array<{ position: number; error: string }> = []
    
    for (const post of strategy.posts) {
      try {
        // CRITICAL: Feed Planner ALWAYS uses Pro Mode (Nano Banana Pro) for ALL users
        // Force Pro Mode for all Feed Planner posts, regardless of user preference or post type
        let generationMode: 'classic' | 'pro' = 'pro'

        const proModeType = generationMode === 'pro' 
          ? detectProModeType({
              generation_mode: generationMode,
              post_type: post.type || post.postType,
              description: post.description || '',
              prompt: '',
              content_pillar: post.purpose || '',
            })
          : null

        // Insert post with prompts from strategy JSON (like concept cards)
        // Prompts are generated by Maya and embedded in the strategy JSON
        // Note: Only use columns that definitely exist in the database
        // generation_mode and pro_mode_type may not exist - check first or make optional
        // Seed variation: position - 1 (so position 1 gets 0, position 2 gets 1, etc.) for photoshoot consistency
        const seedVariation = post.position - 1
        
        // Use prompt from strategy JSON if available (Maya generates it), otherwise use placeholder
        const postPrompt = post.prompt && post.prompt.trim() && post.prompt !== 'Generating prompt...'
          ? post.prompt.trim()
          : 'Generating prompt...'
        
        // CRITICAL FIX: Use caption from strategy JSON if available (Maya generates it), otherwise use placeholder
        const postCaption = post.caption && post.caption.trim() && post.caption !== 'Generating caption...'
          ? post.caption.trim()
          : 'Generating caption...'
        
        try {
          // Try with all columns first (including seed_variation for photoshoot consistency)
          await sql`
            INSERT INTO feed_posts (
              feed_layout_id,
              user_id,
              position,
              post_type,
              content_pillar,
              caption,
              prompt,
              post_status,
              generation_status,
              generation_mode,
              pro_mode_type,
              seed_variation,
              created_at,
              updated_at
            ) VALUES (
              ${feedLayout.id},
              ${neonUser.id},
              ${post.position},
              ${truncate(post.type || post.postType, 50, 'portrait')},
              ${truncate(post.purpose, 255, 'general')},
              ${truncate(postCaption, 5000)},
              ${postPrompt},
              'draft',
              'pending',
              ${generationMode},
              ${proModeType ? truncate(proModeType, 50) : null},
              ${seedVariation},
              NOW(),
              NOW()
            )
          `
          console.log(`[FEED-FROM-STRATEGY] ✅ Post ${post.position} created:`, {
            hasCaption: post.caption && post.caption.trim().length > 0,
            captionLength: postCaption.length,
            usingPlaceholder: postCaption === 'Generating caption...'
          })
        } catch (insertError: any) {
          // If generation_mode/pro_mode_type columns don't exist, try without them
          if (insertError?.code === '42703' && (insertError?.message?.includes('generation_mode') || insertError?.message?.includes('pro_mode_type'))) {
            console.warn(`[FEED-FROM-STRATEGY] ⚠️ generation_mode/pro_mode_type columns don't exist, inserting without them`)
            // Still include seed_variation for photoshoot consistency
            await sql`
              INSERT INTO feed_posts (
                feed_layout_id,
                user_id,
                position,
                post_type,
                content_pillar,
                caption,
                prompt,
                post_status,
                generation_status,
                seed_variation,
                created_at,
                updated_at
              ) VALUES (
                ${feedLayout.id},
                ${neonUser.id},
                ${post.position},
                ${truncate(post.type || post.postType, 50, 'portrait')},
                ${truncate(post.purpose, 255, 'general')},
                ${truncate(postCaption, 5000)},
                ${postPrompt},
                'draft',
                'pending',
                ${seedVariation},
                NOW(),
                NOW()
              )
            `
            console.log(`[FEED-FROM-STRATEGY] ✅ Post ${post.position} created (without mode columns)`)
          } else {
            throw insertError // Re-throw if it's a different error
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[FEED-FROM-STRATEGY] ❌ Error creating post ${post.position}:`, errorMessage)
        failedPosts.push({
          position: post.position,
          error: errorMessage,
        })
        // Continue with next post - we'll report failures at the end
      }
    }

    // Check how many posts were actually created
    const createdPosts = await sql`
      SELECT COUNT(*) as count
      FROM feed_posts
      WHERE feed_layout_id = ${feedLayout.id}
      AND user_id = ${neonUser.id}
    `
    const actualPostCount = createdPosts[0]?.count || 0
    console.log(`[FEED-FROM-STRATEGY] Posts in database: ${actualPostCount} out of ${strategy.posts.length} expected`)
    
    if (actualPostCount === 0) {
      console.error(`[FEED-FROM-STRATEGY] ❌ CRITICAL: No posts were created! All inserts failed.`)
      await sql`
        DELETE FROM feed_layouts
        WHERE id = ${feedLayout.id}
        AND user_id = ${neonUser.id}
      `
      return NextResponse.json(
        {
          success: false,
          feedLayoutId: feedLayout.id,
          error: "Failed to create feed posts",
          message: "We couldn't create any posts for your feed. This might be a temporary issue. Please try again, or contact support if the problem continues.",
          failedPosts: failedPosts,
          canRetry: true,
        },
        { status: 500 }
      )
    }

    // Charge only for persisted rows (strategy + created posts).
    const creditsToCharge = strategyCredits + (actualPostCount * getStudioProCreditCost('2K'))
    const deductionReferenceId = idempotencyKey
      ? `${buildFeedCreateIdempotencyPrefix(neonUser.id, idempotencyKey)}:feed:${feedLayout.id}`
      : undefined
    const deduction = await deductCredits(
      neonUser.id.toString(),
      creditsToCharge,
      "image",
      `Feed Planner - Strategy + ${actualPostCount} post(s)`,
      deductionReferenceId
    )

    if (!deduction.success) {
      // Compensation path: remove partially created feed if billing failed.
      await sql`
        DELETE FROM feed_posts
        WHERE feed_layout_id = ${feedLayout.id}
        AND user_id = ${neonUser.id}
      `
      await sql`
        DELETE FROM feed_layouts
        WHERE id = ${feedLayout.id}
        AND user_id = ${neonUser.id}
      `
      return NextResponse.json(
        {
          success: false,
          error: "Failed to charge credits for feed creation",
          message: deduction.error || "Unable to charge credits. No feed was saved.",
        },
        { status: 500 }
      )
    }
    
    if (actualPostCount < strategy.posts.length) {
      const failedCount = strategy.posts.length - actualPostCount
      console.warn(`[FEED-FROM-STRATEGY] ⚠️ Only ${actualPostCount} out of ${strategy.posts.length} posts were created (${failedCount} failed)`)
      
      // Return partial success with warning
      return NextResponse.json({
        success: true,
        feedLayoutId: feedLayout.id,
        message: `Feed created with ${actualPostCount} of ${strategy.posts.length} posts. ${failedCount} post(s) failed to create.`,
        status: "partial",
        createdCount: actualPostCount,
        expectedCount: strategy.posts.length,
        creditsCharged: creditsToCharge,
        failedPosts: failedPosts,
        warning: `${failedCount} post(s) could not be created. You can regenerate them later.`,
      })
    }
    
    // Check if prompts are already in the strategy JSON (Maya-generated, like concept cards)
    const hasPromptsInJSON = strategy.posts?.some((p: any) => p.prompt && p.prompt.trim() && p.prompt !== 'Generating prompt...')
    
    if (hasPromptsInJSON) {
      console.log("[FEED-FROM-STRATEGY] ✅ Prompts already in strategy JSON (Maya-generated) - skipping prompt generation")
    } else {
      console.log("[FEED-FROM-STRATEGY] ⚠️ No prompts in strategy JSON - prompts will be generated when user clicks 'Generate Feed'")
    }
    
    console.log("[FEED-FROM-STRATEGY] ✅ Posts created. Feed saved to database.")
    console.log("[FEED-FROM-STRATEGY] CRITICAL: No background processing - user must click 'Generate Feed' to generate images/captions")

    // ==================== RETURN IMMEDIATELY ====================
    // Return feed ID immediately
    // CRITICAL: DO NOT process captions or queue images automatically
    // User must explicitly click "Generate Feed" button to generate images and captions
    // This gives users full control over when generation happens
    console.log("[FEED-FROM-STRATEGY] ==================== RETURNING ====================")
    
    return NextResponse.json({
      success: true,
      feedLayoutId: feedLayout.id,
      message: "Feed saved! Click 'Generate Feed' to create images and captions.",
      status: feedStatus, // Feed status: 'chat' (not in planner) or 'saved' (in planner)
      creditsCharged: creditsToCharge,
    })
  } catch (error) {
    console.error("[FEED-FROM-STRATEGY] Error:", error)
    
    // Provide user-friendly error messages based on error type
    let errorMessage = "We couldn't create your feed right now."
    let userMessage = "Something went wrong while creating your feed. Please try again in a moment."
    
    if (error instanceof Error) {
      // Database connection errors
      if (error.message.includes("connection") || error.message.includes("timeout")) {
        userMessage = "We're having trouble connecting to the database. Please try again in a moment."
      }
      // Validation errors
      else if (error.message.includes("Invalid") || error.message.includes("required")) {
        userMessage = "Your feed request is missing some information. Please check your input and try again."
      }
      // Credit errors (should be caught earlier, but just in case)
      else if (error.message.includes("credit") || error.message.includes("insufficient")) {
        userMessage = "You don't have enough credits to create this feed. Please purchase more credits or upgrade your plan."
      }
      // Generic error
      else {
        userMessage = "We encountered an unexpected error. Please try again, or contact support if the problem continues."
      }
      
      errorMessage = error.message
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        message: userMessage,
        canRetry: true,
      },
      { status: 500 }
    )
  } finally {
    if (advisoryLockAcquired && advisoryLockKey) {
      try {
        await sql`SELECT pg_advisory_unlock(hashtext(${advisoryLockKey}))`
      } catch (unlockError) {
        console.warn("[FEED-FROM-STRATEGY] Failed to release advisory lock:", unlockError)
      }
    }
  }
}

/* ==================== OLD SYNCHRONOUS PROCESSING CODE - REMOVED FOR OPTIMIZATION ====================
    The following code was removed to optimize API response time:
    - Synchronous prompt generation (18-36 seconds)
    - Synchronous caption generation (9-18 seconds)
    - Synchronous image queueing
    
    Replaced with:
    - Fast post creation with placeholders (< 1 second)
    - Background processing of prompts/captions
    - Background image queueing
    
    Old code (for reference):
    
    for (const post of strategy.posts) {
      try {
        console.log(`[FEED-FROM-STRATEGY] Processing post ${post.position} (type: ${post.type || post.postType})`)
        
        // CRITICAL: Feed Planner ALWAYS uses Pro Mode (Nano Banana Pro) for ALL users
        // Force Pro Mode for all Feed Planner posts, regardless of user preference or post type
        let generationMode: 'classic' | 'pro' = 'pro'
        console.log(`[FEED-FROM-STRATEGY] Post ${post.position}: Forced to Pro Mode for Feed Planner`)

        const proModeType = generationMode === 'pro' 
          ? detectProModeType({
              generation_mode: generationMode,
              post_type: post.type || post.postType,
              description: post.description || '',
              prompt: '',
              content_pillar: post.purpose || '',
            })
          : null

        // Generate prompt based on generation mode
        // CRITICAL: Always generate prompts using Maya's prompting pipeline
        // post.description is visual direction (input), NOT the final prompt (output)
        let finalPrompt = ''
        
        if (generationMode === 'pro') {
          // Generate Pro Mode prompt (quote graphics use sophisticated builder, others use Nano Banana)
          try {
            // Get user's avatar images for Pro Mode
            const avatarImages = await sql`
              SELECT image_url, display_order
              FROM user_avatar_images
              WHERE user_id = ${neonUser.id}
              AND is_active = true
              ORDER BY display_order ASC, uploaded_at ASC
              LIMIT 5
            `
            
            const baseImages = avatarImages.map((img: any) => ({
              url: img.image_url,
              id: img.display_order?.toString(),
              type: 'avatar',
            }))
            
            if (baseImages.length === 0) {
              throw new Error("No avatar images found for Pro Mode")
            }
            
            // Phase 1A: Use canonical BrandKit builder
            const { buildBrandKit } = await import('@/lib/brand/build-brand-kit')
            const brandKitResult = buildBrandKit(brandProfile)
            const brandKit = brandKitResult.brandKit
            
            console.log(`[FEED-FROM-STRATEGY] BrandKit built:`, {
              hasColors: brandKitResult.metadata.hasColors,
              hasVisualAesthetic: brandKitResult.metadata.hasVisualAesthetic,
              hasFashionStyle: brandKitResult.metadata.hasFashionStyle,
              missingFields: brandKitResult.metadata.missingFields,
            })
            
            // Check if this is a quote graphic post
            if (post.type === 'quote' || proModeType === 'quote-graphic') {
              // Use sophisticated quote prompt builder for quote graphics
              console.log(`[FEED-FROM-STRATEGY] Generating sophisticated quote prompt for post ${post.position}`)
              
              // Determine vibe from brand profile
              const brandVibe = (brandProfile?.brand_vibe || strategy.visualRhythm || 'editorial').toLowerCase()
              let vibe: 'minimal' | 'editorial' | 'bold' | 'elegant' | 'modern' = 'editorial'
              
              if (brandVibe.includes('minimal')) {
                vibe = 'minimal'
              } else if (brandVibe.includes('bold') || brandVibe.includes('dramatic')) {
                vibe = 'bold'
              } else if (brandVibe.includes('elegant') || brandVibe.includes('luxury')) {
                vibe = 'elegant'
              } else if (brandVibe.includes('modern') || brandVibe.includes('contemporary')) {
                vibe = 'modern'
              }
              
              // Only pass brandColors if we have at least one color
              const brandColors = brandKit && (brandKit.primary_color || brandKit.secondary_color || brandKit.accent_color)
                ? {
                    primary_color: brandKit.primary_color || '',
                    secondary_color: brandKit.secondary_color || '',
                    accent_color: brandKit.accent_color || '',
                  }
                : undefined
              
              finalPrompt = buildSophisticatedQuotePrompt({
                quoteText: post.description || post.caption || 'Inspiring quote',
                caption: post.caption,
                brandColors: brandColors,
                vibe: vibe,
                hasReferenceImages: baseImages.length > 0,
              })
              
              console.log(`[FEED-FROM-STRATEGY] ✅ Sophisticated quote prompt generated for post ${post.position}`)
            } else {
              // Use Nano Banana prompt builder for other Pro Mode posts (carousels, text overlays, etc.)
              // Phase 4B: Route through Prompt Authority Layer
              const authorityResult = await generateFeedPlannerProModePromptViaAuthority({
                userId: neonUser.id.toString(),
                mode: (proModeType || 'workbench') as string,
                userRequest: post.description || post.purpose || `Feed post ${post.position}`,
                baseImages: baseImages.map(img => ({
                  url: img.url,
                  type: img.type || 'avatar',
                  description: undefined,
                })),
                productImages: [],
                textElements: undefined, // Don't add text elements for non-quote posts
                platformFormat: customSettings?.aspectRatio || '4:5',
                brandKit: brandKit ? {
                  primaryColor: brandKit.primary_color || brandKit.colorPalette?.primary || null,
                  secondaryColor: brandKit.secondary_color || brandKit.colorPalette?.secondary || null,
                  accentColor: brandKit.accent_color || brandKit.colorPalette?.accent || null,
                  fontStyle: brandKit.font_style || null,
                  brandTone: brandKit.brand_tone || brandKit.brandVibe || null,
                } : undefined,
              })
              
              finalPrompt = authorityResult.prompt
              console.log(`[FEED-FROM-STRATEGY] ✅ Generated Nano Banana Pro prompt for post ${post.position} via Authority Layer`)
            }
          } catch (promptError) {
            console.error(`[FEED-FROM-STRATEGY] ❌ Error generating Pro Mode prompt for post ${post.position}:`, promptError)
            // Don't fallback to description - throw error to surface the issue
            throw new Error(`Failed to generate Pro Mode prompt for post ${post.position}: ${promptError instanceof Error ? promptError.message : 'Unknown error'}`)
          }
        } else {
          throw new Error(`CLASSIC_MODE_DEPRECATED: Feed Planner uses Pro Mode only (post ${post.position})`)
        }
        
        // Validate that we have a proper prompt (not just description)
        if (!finalPrompt || finalPrompt.length < 20) {
          throw new Error(`Generated prompt is too short or empty for post ${post.position}`)
        }

        // ✅ ALWAYS generate caption using caption writer (not Maya's direct output)
        console.log(`[FEED-FROM-STRATEGY] Generating caption for post ${post.position} using caption writer`)
        
        let caption = ''
        try {
          const captionResult = await generateInstagramCaption({
            postPosition: post.position,
            shotType: post.type || post.postType || 'portrait',
            purpose: post.purpose || post.description || 'general',
            emotionalTone: post.tone || 'warm',
            brandProfile: brandProfile || {
              business_type: 'Personal Brand',
              brand_vibe: 'Strategic',
              brand_voice: 'Authentic',
              target_audience: 'Entrepreneurs',
            },
            targetAudience: brandProfile?.target_audience || 'general audience',
            brandVoice: brandProfile?.brand_voice || 'authentic',
            contentPillar: post.purpose || 'lifestyle',
            hookConcept: post.hookConcept,
            storyConcept: post.storyConcept,
            valueConcept: post.valueConcept,
            ctaConcept: post.ctaConcept,
            hashtags: post.hashtags,
            previousCaptions: previousCaptions,
            researchData: researchData || null,
            narrativeRole: post.narrativeRole,
          })
          
          caption = captionResult.caption || ''
          console.log(`[FEED-FROM-STRATEGY] ✅ Caption generated (${caption.length} chars)`)
          
          // Track for variety in next captions
          previousCaptions.push({
            position: post.position,
            caption: caption,
          })
          
          captionResults.push({ success: true, position: post.position })
        } catch (captionError) {
          console.error(`[FEED-FROM-STRATEGY] ❌ Caption generation failed for post ${post.position}:`, captionError)
          // Fallback to Maya's caption if caption writer fails
          caption = post.caption || `Check out this post! #instagram #feed`
          captionResults.push({ success: false, position: post.position })
        }

        // Insert post
        // CRITICAL: Save description (visual direction) for potential prompt regeneration
        await sql`
          INSERT INTO feed_posts (
            feed_layout_id,
            user_id,
            position,
            post_type,
            content_pillar,
            caption,
            prompt,
            description,
            post_status,
            generation_status,
            generation_mode,
            pro_mode_type,
            created_at,
            updated_at
          ) VALUES (
            ${feedLayout.id},
            ${neonUser.id},
            ${post.position},
            ${truncate(post.type || post.postType, 50, 'portrait')},
            ${truncate(post.purpose, 255, 'general')},
            ${truncate(caption, 5000)}, -- Truncate to max length
            ${truncate(finalPrompt, 2000)}, -- Truncate to max length
            ${truncate(post.description || '', 2000)}, -- Save visual direction for potential regeneration
            'draft',
            'pending',
            ${generationMode},
            ${proModeType ? truncate(proModeType, 50) : null},
            NOW(),
            NOW()
          )
        `

        postsWithCaptions.push({ ...post, caption, prompt: finalPrompt })
        console.log(`[FEED-FROM-STRATEGY] ✅ Post ${post.position} inserted (${generationMode} mode)`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[FEED-FROM-STRATEGY] ✗ Error inserting post ${post.position}:`, errorMessage)
        console.error(`[FEED-FROM-STRATEGY] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
        insertionErrors.push({ position: post.position, error: errorMessage })
        // Continue with next post instead of throwing - we want to insert as many posts as possible
        // But we'll track errors and return them to the user
      }
    }

    // Check if we have any successful insertions
    const successfulPosts = postsWithCaptions.length
    const failedPosts = insertionErrors.length
    
    console.log(`[FEED-FROM-STRATEGY] Posts processed: ${successfulPosts} successful, ${failedPosts} failed out of ${strategy.posts.length} total`)
    
    // If ALL posts failed, return an error
    if (successfulPosts === 0 && failedPosts > 0) {
      console.error(`[FEED-FROM-STRATEGY] ❌ ALL posts failed to insert!`)
      return NextResponse.json(
        {
          error: "Failed to create any posts",
          details: `All ${failedPosts} posts failed to insert. First error: ${insertionErrors[0]?.error}`,
          insertionErrors: insertionErrors,
        },
        { status: 500 }
      )
    }
    
    // If some posts failed, log warning but continue
    if (failedPosts > 0) {
      console.warn(`[FEED-FROM-STRATEGY] ⚠️ ${failedPosts} posts failed, but ${successfulPosts} were successfully inserted`)
    }
    console.log(`[FEED-FROM-STRATEGY] Caption generation: ${captionResults.filter(r => r.success).length} successful, ${captionResults.filter(r => !r.success).length} failed`)

    // Queue images for generation
    const { queueAllImagesForFeed } = await import("@/lib/feed-planner/queue-images")
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000"

    const queueSettings = customSettings ? {
      styleStrength: customSettings.styleStrength,
      promptAccuracy: customSettings.promptAccuracy,
      aspectRatio: customSettings.aspectRatio,
      realismStrength: customSettings.realismStrength,
      extraLoraScale: customSettings.realismStrength,
    } : undefined

    // CRITICAL: Pass user's selected image library (from library wizard) to queue function
    // This ensures Pro Mode uses user's selected images, not auto-fetched from database
    const queueImageLibrary = userImageLibrary || undefined

    // Await queue to catch errors and return them to user
    try {
      const queueResult = await queueAllImagesForFeed(
        feedLayout.id, 
        authUser.id, 
        origin, 
        queueSettings,
        queueImageLibrary // Pass user's selected image library
      )
      
      if (!queueResult.success) {
        console.error("[FEED-FROM-STRATEGY] ❌ Queue error:", queueResult)
        
        // Update feed status to indicate queue failure
        await sql`
          UPDATE feed_layouts
          SET status = 'queue_failed',
              updated_at = NOW()
          WHERE id = ${feedLayout.id}
        `
        
        return NextResponse.json(
          {
            success: false,
            feedLayoutId: feedLayout.id,
            error: "Failed to queue images for generation",
            message: queueResult.message || "Unknown error occurred while queueing images",
            details: (queueResult as any).error || undefined,
            canRetry: true,
          },
          { status: 500 }
        )
      }
      
      console.log("[FEED-FROM-STRATEGY] ✅ Images queued successfully:", queueResult)
    } catch (queueError: any) {
      console.error("[FEED-FROM-STRATEGY] ❌ Queue error:", queueError)
      
      // Update feed status to indicate queue failure
      await sql`
        UPDATE feed_layouts
        SET status = 'queue_failed',
            updated_at = NOW()
        WHERE id = ${feedLayout.id}
      `
      
      // Determine if error is retryable
      const errorMessage = queueError instanceof Error ? queueError.message : String(queueError)
      const isRetryable = !errorMessage.includes("No trained model") && 
                          !errorMessage.includes("avatar images") &&
                          !errorMessage.includes("Insufficient credits")
      
      return NextResponse.json(
        {
          success: false,
          feedLayoutId: feedLayout.id,
          error: "Failed to queue images for generation",
          message: errorMessage,
          details: queueError instanceof Error ? queueError.stack : undefined,
          canRetry: isRetryable,
        },
        { status: 500 }
      )
    }
*/
