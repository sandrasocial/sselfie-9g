import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { deductCredits, checkCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"
import { getStudioProCreditCost } from "@/lib/nano-banana-client"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"
import { detectRequiredMode, detectProModeType } from "@/lib/feed-planner/mode-detection"
import { generateVisualComposition } from "@/lib/feed-planner/visual-composition-expert"
import { buildSophisticatedQuotePrompt } from "@/lib/maya/quote-graphic-prompt-builder"

const sql = neon(process.env.DATABASE_URL!)

export const maxDuration = 300

// Helper function to safely truncate strings
function truncate(str: string | null | undefined, maxLength: number, defaultValue: string = ''): string {
  if (!str) return defaultValue
  return str.length > maxLength ? str.substring(0, maxLength) : str
}

// Helper function to generate SHORT layout type label (max 50 chars) from post analysis
function getLayoutType(gridPattern: string | undefined, posts: any[]): string {
  if (!posts || posts.length === 0) return "Mixed Layout"
  
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

    // Get Maya's strategy from request
    const { strategy, customSettings, userModePreference, imageLibrary } = await request.json()
    
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

    if (strategy.posts.length !== 9) {
      console.error("[FEED-FROM-STRATEGY] Invalid strategy: expected 9 posts, got", strategy.posts.length)
      return NextResponse.json(
        { error: "Strategy must contain exactly 9 posts" },
        { status: 400 }
      )
    }

    console.log("[FEED-FROM-STRATEGY] Received strategy with", strategy.posts.length, "posts")

    // ==================== PREREQUISITE VALIDATION (BEFORE CREATING FEED) ====================
    // Determine which posts will be Classic vs Pro Mode
    const classicPosts: typeof strategy.posts = []
    const proPosts: typeof strategy.posts = []
    
    for (const post of strategy.posts) {
      let generationMode: 'classic' | 'pro'
      
      if (forceMode) {
        // User explicitly chose a mode - use it for ALL posts
        generationMode = forceMode
      } else {
        // No user preference - auto-detect based on post type
        generationMode = post.generationMode || detectRequiredMode({
          post_type: post.type || post.postType,
          description: post.description || '',
          prompt: '',
          content_pillar: post.purpose || '',
        })
      }
      
      if (generationMode === 'classic') {
        classicPosts.push(post)
      } else {
        proPosts.push(post)
      }
    }
    
    console.log(`[FEED-FROM-STRATEGY] Mode distribution: ${classicPosts.length} Classic, ${proPosts.length} Pro`)
    
    // Calculate total credits needed (strategy + images)
    // Strategy credits: 1 credit (fixed)
    const strategyCredits = CREDIT_COSTS.STRATEGY || 1
    
    // Image credits: Classic posts × 1 credit, Pro posts × 2 credits
    const classicImageCredits = classicPosts.length * CREDIT_COSTS.IMAGE
    const proImageCredits = proPosts.length * getStudioProCreditCost('2K')
    const totalImageCredits = classicImageCredits + proImageCredits
    
    // Total credits needed
    const totalCredits = strategyCredits + totalImageCredits
    
    console.log(`[FEED-FROM-STRATEGY] Credit calculation: ${strategyCredits} (strategy) + ${totalImageCredits} (images: ${classicPosts.length} Classic × ${CREDIT_COSTS.IMAGE} + ${proPosts.length} Pro × ${getStudioProCreditCost('2K')}) = ${totalCredits} total credits`)
    
    // Check for trained model (required for Classic Mode posts)
    if (classicPosts.length > 0) {
      const [model] = await sql`
        SELECT trigger_word, replicate_version_id, replicate_model_id, lora_weights_url
        FROM user_models
        WHERE user_id = ${neonUser.id}
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

    // Deduct credits upfront for entire feed
    const deduction = await deductCredits(
      neonUser.id.toString(),
      totalCredits,
      "image",
      "Feed Planner - Complete feed strategy"
    )

    if (!deduction.success) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 500 }
      )
    }

    console.log("[FEED-FROM-STRATEGY] Credits deducted. New balance:", deduction.newBalance)

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
    
    // Enable photoshoot mode for consistency (like Maya's photoshoot feature)
    // This ensures all 9 images use consistent styling, lighting, and colors
    const photoshootBaseSeed = Math.floor(Math.random() * 1000000)
    console.log("[FEED-FROM-STRATEGY] ✅ Enabling photoshoot mode with base seed:", photoshootBaseSeed)
    
    // Create feed_layouts entry with photoshoot consistency enabled
    const [feedLayout] = await sql`
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
        'pending',
        ${brandProfile?.color_palette || null},
        true,
        ${photoshootBaseSeed},
        NOW(),
        NOW()
      )
      RETURNING id
    `

    console.log("[FEED-FROM-STRATEGY] Feed layout created:", feedLayout.id)

    // ==================== OPTIMIZATION: Create posts with minimal data first, return immediately ====================
    // Insert posts with placeholder prompts/captions (fast - allows immediate return)
    console.log(`[FEED-FROM-STRATEGY] Creating ${strategy.posts.length} posts with placeholder data...`)
    
    for (const post of strategy.posts) {
      try {
        // Determine generation mode (needed for post creation)
        let generationMode: 'classic' | 'pro'
        if (forceMode) {
          generationMode = forceMode
        } else {
          generationMode = post.generationMode || detectRequiredMode({
            post_type: post.type || post.postType,
            description: post.description || '',
            prompt: '',
            content_pillar: post.purpose || '',
          })
        }

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
              ${'Generating caption...'},
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
          console.log(`[FEED-FROM-STRATEGY] ✅ Post ${post.position} created (placeholder)`)
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
                ${'Generating caption...'},
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
        console.error(`[FEED-FROM-STRATEGY] ❌ Error creating post ${post.position}:`, error)
        // Log full error details for debugging
        if (error instanceof Error) {
          console.error(`[FEED-FROM-STRATEGY] Error details:`, {
            message: error.message,
            stack: error.stack,
          })
        }
        // Continue with next post
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
      return NextResponse.json(
        {
          success: false,
          feedLayoutId: feedLayout.id,
          error: "Failed to create posts",
          message: "All posts failed to insert. Please check server logs for details.",
        },
        { status: 500 }
      )
    }
    
    if (actualPostCount < strategy.posts.length) {
      console.warn(`[FEED-FROM-STRATEGY] ⚠️ Only ${actualPostCount} out of ${strategy.posts.length} posts were created`)
    }
    
    // Check if prompts are already in the strategy JSON (Maya-generated, like concept cards)
    const hasPromptsInJSON = strategy.posts?.some((p: any) => p.prompt && p.prompt.trim() && p.prompt !== 'Generating prompt...')
    
    if (hasPromptsInJSON) {
      console.log("[FEED-FROM-STRATEGY] ✅ Prompts already in strategy JSON (Maya-generated) - skipping prompt generation")
    } else {
      console.log("[FEED-FROM-STRATEGY] ⚠️ No prompts in strategy JSON - will generate in background")
    }
    
    console.log("[FEED-FROM-STRATEGY] ✅ Posts created. Starting background processing for captions and image queuing...")

    // ==================== BACKGROUND PROCESSING ====================
    // Process captions and queue images in background (fire and forget)
    // Prompts are already generated by Maya if included in strategy JSON
    // This allows API to return immediately while processing continues
    const { processFeedPostsInBackground } = await import("@/lib/feed-planner/process-feed-posts-background")
    
    // Get user model for background processing
    const [model] = await sql`
      SELECT trigger_word, replicate_version_id, replicate_model_id
      FROM user_models
      WHERE user_id = ${neonUser.id}
      AND training_status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `

    const triggerWord = model?.trigger_word || null

    // Start background processing (don't await - fire and forget)
    processFeedPostsInBackground({
      feedLayoutId: feedLayout.id,
      authUserId: authUser.id,
      strategy,
      brandProfile,
      researchData,
      model,
      triggerWord,
      forceMode,
      customSettings,
      userImageLibrary,
      origin: process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000",
    })
      .then((result) => {
        if (result.success) {
          console.log(`[FEED-FROM-STRATEGY] ✅ Background processing complete: ${result.queuedCount} images queued`)
        } else {
          console.error(`[FEED-FROM-STRATEGY] ❌ Background processing failed:`, result.error)
        }
      })
      .catch((error) => {
        console.error(`[FEED-FROM-STRATEGY] ❌ Background processing error:`, error)
      })

    // ==================== RETURN IMMEDIATELY ====================
    // Return feed ID immediately
    // If prompts are in JSON, they're already saved; captions and images will be processed in background
    console.log("[FEED-FROM-STRATEGY] ==================== RETURNING IMMEDIATELY ====================")
    
    return NextResponse.json({
      success: true,
      feedLayoutId: feedLayout.id,
      message: hasPromptsInJSON 
        ? "Feed created! Prompts are ready. Captions are being generated in the background."
        : "Feed created! Prompts and captions are being generated in the background.",
      status: "processing", // Indicates background processing
    })
  } catch (error) {
    console.error("[FEED-FROM-STRATEGY] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create feed",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
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
        
        // CRITICAL: Check user's mode preference FIRST (from toggle)
        // If user explicitly chose Pro or Classic, use that for ALL posts
        // Otherwise, use auto-detection per post
        let generationMode: 'classic' | 'pro'
        
        if (forceMode) {
          // User explicitly chose a mode - use it for ALL posts
          generationMode = forceMode
          console.log(`[FEED-FROM-STRATEGY] Post ${post.position}: Using user preference (${forceMode})`)
        } else {
          // No user preference - auto-detect based on post type
          generationMode = post.generationMode || detectRequiredMode({
            post_type: post.type || post.postType,
            description: post.description || '',
            prompt: '',
            content_pillar: post.purpose || '',
          })
          console.log(`[FEED-FROM-STRATEGY] Post ${post.position}: Auto-detected as ${generationMode}`)
        }

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
            
            // Get brand kit colors from color_palette JSONB field
            // Note: user_personal_brand doesn't have primary_color/secondary_color columns
            // Colors are stored in color_palette JSONB field
            const [brandData] = await sql`
              SELECT color_palette, brand_vibe, color_theme
              FROM user_personal_brand
              WHERE user_id = ${neonUser.id}
              LIMIT 1
            `
            
            // Extract colors from color_palette JSONB if available
            let brandKit: {
              primary_color?: string
              secondary_color?: string
              accent_color?: string
              font_style?: string
              brand_tone?: string
            } | undefined = undefined
            
            if (brandData?.color_palette) {
              try {
                const palette = typeof brandData.color_palette === 'string' 
                  ? JSON.parse(brandData.color_palette) 
                  : brandData.color_palette
                
                // Extract colors from palette array (format: [{name: "Primary", hex: "#..."}, ...])
                if (Array.isArray(palette) && palette.length > 0) {
                  brandKit = {
                    primary_color: palette[0]?.hex || palette[0]?.color || undefined,
                    secondary_color: palette[1]?.hex || palette[1]?.color || undefined,
                    accent_color: palette[2]?.hex || palette[2]?.color || undefined,
                    font_style: undefined, // Not stored in color_palette
                    brand_tone: brandData.brand_vibe || brandData.color_theme || undefined,
                  }
                }
              } catch (e) {
                console.warn(`[FEED-FROM-STRATEGY] Failed to parse color_palette:`, e)
              }
            }
            
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
              const { buildNanoBananaPrompt } = await import("@/lib/maya/nano-banana-prompt-builder")
              
              // Use post.description as userRequest (visual direction input)
              const { optimizedPrompt } = await buildNanoBananaPrompt({
                userId: neonUser.id.toString(),
                mode: (proModeType || 'workbench') as any,
                userRequest: post.description || post.purpose || `Feed post ${post.position}`,
                inputImages: {
                  baseImages,
                  productImages: [],
                  textElements: undefined, // Don't add text elements for non-quote posts
                },
                workflowMeta: {
                  platformFormat: customSettings?.aspectRatio || '4:5',
                },
                brandKit: brandKit ? {
                  primary_color: brandKit.primary_color,
                  secondary_color: brandKit.secondary_color,
                  accent_color: brandKit.accent_color,
                  font_style: brandKit.font_style,
                  brand_tone: brandKit.brand_tone,
                } : undefined,
              })
              
              finalPrompt = optimizedPrompt
              console.log(`[FEED-FROM-STRATEGY] ✅ Generated Nano Banana Pro prompt for post ${post.position}`)
            }
          } catch (promptError) {
            console.error(`[FEED-FROM-STRATEGY] ❌ Error generating Pro Mode prompt for post ${post.position}:`, promptError)
            // Don't fallback to description - throw error to surface the issue
            throw new Error(`Failed to generate Pro Mode prompt for post ${post.position}: ${promptError instanceof Error ? promptError.message : 'Unknown error'}`)
          }
        } else {
          // Generate FLUX prompt for Classic Mode
          try {
            // Use post.description as visualDirection (input), NOT as the prompt itself
            const visualComposition = await generateVisualComposition({
              postPosition: post.position,
              shotType: post.type || 'portrait',
              purpose: post.purpose || 'general',
              visualDirection: post.description || `Post ${post.position}`, // ← Input: visual direction
              brandVibe: brandProfile?.brand_vibe || 'authentic',
              authUserId: authUser.id,
              triggerWord: triggerWord || undefined,
            })
            finalPrompt = visualComposition.fluxPrompt // ← Output: proper FLUX prompt
            console.log(`[FEED-FROM-STRATEGY] ✅ Generated FLUX prompt for post ${post.position}`)
          } catch (promptError) {
            console.error(`[FEED-FROM-STRATEGY] ❌ Error generating FLUX prompt for post ${post.position}:`, promptError)
            // Don't fallback to description - throw error to surface the issue
            throw new Error(`Failed to generate Classic Mode prompt for post ${post.position}: ${promptError instanceof Error ? promptError.message : 'Unknown error'}`)
          }
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

