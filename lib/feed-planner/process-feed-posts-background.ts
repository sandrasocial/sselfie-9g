/**
 * Background processing for feed posts
 * Generates prompts and captions ONLY
 * CRITICAL: Does NOT queue images - user must click "Generate Feed" button
 * This prevents automatic generation on page refresh and saves costs
 */

import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"
import { detectRequiredMode, detectProModeType } from "@/lib/feed-planner/mode-detection"
import { generateVisualComposition } from "@/lib/feed-planner/visual-composition-expert"
import { buildSophisticatedQuotePrompt } from "@/lib/maya/quote-graphic-prompt-builder"
// REMOVED: import { queueAllImagesForFeed } from "./queue-images" - Images only generate when user clicks button
import { 
  generateFeedPrompt,
  validateFeedPrompt,
  getColorPaletteByPreference,
  ensureFeedCohesion,
  getPostTypeDistribution,
  type ColorPalette
} from '@/lib/feed-planner/feed-prompt-expert'

const sql = neon(process.env.DATABASE_URL!)

interface ProcessFeedPostsParams {
  feedLayoutId: number
  authUserId: string
  strategy: any
  brandProfile: any
  researchData: any
  model: any
  triggerWord: string | null
  forceMode: 'pro' | 'classic' | null
  customSettings?: any
  userImageLibrary?: any
  origin: string
}

export async function processFeedPostsInBackground(params: ProcessFeedPostsParams) {
  const {
    feedLayoutId,
    authUserId,
    strategy,
    brandProfile,
    researchData,
    model,
    triggerWord,
    forceMode,
    customSettings,
    userImageLibrary,
    origin,
  } = params

  console.log(`[BACKGROUND-PROCESSING] Starting background processing for feed ${feedLayoutId}`)

  try {
    const neonUser = await getUserByAuthId(authUserId)
    if (!neonUser) {
      throw new Error("User not found")
    }

    // Update feed status to 'processing' to indicate background work is happening
    await sql`
      UPDATE feed_layouts
      SET status = 'processing',
          updated_at = NOW()
      WHERE id = ${feedLayoutId}
    `

    // Get posts that need processing (should be all 9 posts with placeholder data)
    // Note: description and purpose columns don't exist - we'll get visual direction from strategy.posts
    const posts = await sql`
      SELECT id, position, post_type, prompt, content_pillar, generation_mode, pro_mode_type
      FROM feed_posts
      WHERE feed_layout_id = ${feedLayoutId}
      AND user_id = ${neonUser.id}
      ORDER BY position ASC
    `

    if (posts.length === 0) {
      console.error(`[BACKGROUND-PROCESSING] No posts found for feed ${feedLayoutId}`)
      await sql`
        UPDATE feed_layouts
        SET status = 'processing_failed', updated_at = NOW()
        WHERE id = ${feedLayoutId}
      `
      return { success: false, error: "No posts found" }
    }

    console.log(`[BACKGROUND-PROCESSING] Processing ${posts.length} posts`)
    
    // ==================== FEED PROMPT EXPERT INTEGRATION ====================
    // Determine user's preferred color palette from brand profile
    const userColorPreference = brandProfile?.color_palette || brandProfile?.brand_vibe
    const selectedPalette = getColorPaletteByPreference(userColorPreference, brandProfile?.brand_vibe)
    
    console.log(`[BACKGROUND-PROCESSING] 🎨 Selected aesthetic: ${selectedPalette.name} (${selectedPalette.id})`)
    
    // Get recommended post distribution for this aesthetic
    const distribution = getPostTypeDistribution(selectedPalette)
    console.log(`[BACKGROUND-PROCESSING] 📊 Post distribution: ${distribution.userPosts} user, ${distribution.lifestylePosts} lifestyle (${distribution.ratio})`)
    
    // Get user data for prompting
    const [userDataResult] = await sql`
      SELECT u.gender, u.ethnicity, um.trigger_word, upb.physical_preferences
      FROM users u
      LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
      LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
      WHERE u.id = ${neonUser.id} 
      LIMIT 1
    `
    
    const actualTriggerWord = triggerWord || userDataResult?.trigger_word || 'ohwx'
    const userGender = userDataResult?.gender?.toLowerCase() === 'male' || userDataResult?.gender?.toLowerCase() === 'man' 
      ? 'man' 
      : userDataResult?.gender?.toLowerCase() === 'female' || userDataResult?.gender?.toLowerCase() === 'woman'
      ? 'woman'
      : 'woman' // default
    const userEthnicity = userDataResult?.ethnicity || null
    const physicalPreferences = userDataResult?.physical_preferences || null
    
    console.log(`[BACKGROUND-PROCESSING] 👤 User data:`, { 
      triggerWord: actualTriggerWord, 
      gender: userGender, 
      ethnicity: userEthnicity,
      hasPhysicalPreferences: !!physicalPreferences 
    })
    
    // Track progress
    let processedCount = 0
    const totalPosts = posts.length

    const postsWithCaptions = []
    const previousCaptions: Array<{ position: number; caption: string }> = []
    const generatedPrompts: string[] = []

    // Process each post: generate prompt and caption
    for (const post of posts) {
      try {
        console.log(`[BACKGROUND-PROCESSING] Processing post ${post.position}`)

        // Get visual direction from strategy.posts array
        const strategyPost = strategy.posts?.find((p: any) => p.position === post.position)
        const visualDirection = strategyPost?.description || strategyPost?.visualDirection || post.content_pillar || `Post ${post.position}`
        const postPurpose = strategyPost?.purpose || post.content_pillar || 'general'
        const shotType = post.post_type || strategyPost?.type || strategyPost?.shotType || 'portrait'
        
        // Determine generation mode
        let generationMode: 'classic' | 'pro'
        if (forceMode) {
          generationMode = forceMode
        } else {
          generationMode = post.generation_mode || strategyPost?.generationMode || detectRequiredMode({
            post_type: post.post_type,
            description: visualDirection,
            prompt: '',
            content_pillar: post.content_pillar || '',
          })
        }

        const proModeType = generationMode === 'pro' 
          ? detectProModeType({
              generation_mode: generationMode,
              post_type: post.post_type,
              description: visualDirection,
              prompt: '',
              content_pillar: post.content_pillar || '',
            })
          : null

        // ==================== USE FEED PROMPT EXPERT ====================
        // Determine if this is a user post or lifestyle post
        const isUserPost = ['portrait', 'half-body', 'full-body'].includes(shotType.toLowerCase())
        const isLifestylePost = ['object', 'flatlay', 'scenery', 'quote'].includes(shotType.toLowerCase())
        
        // Map shot type to feed-prompt-expert format
        let feedShotType: 'portrait' | 'half-body' | 'full-body' | 'object' | 'flatlay' | 'scenery' = 'portrait'
        if (shotType.toLowerCase().includes('half') || shotType.toLowerCase().includes('upper')) {
          feedShotType = 'half-body'
        } else if (shotType.toLowerCase().includes('full') || shotType.toLowerCase().includes('body')) {
          feedShotType = 'full-body'
        } else if (shotType.toLowerCase().includes('flatlay') || shotType.toLowerCase().includes('flat')) {
          feedShotType = 'flatlay'
        } else if (shotType.toLowerCase().includes('object') || shotType.toLowerCase().includes('product')) {
          feedShotType = 'object'
        } else if (shotType.toLowerCase().includes('scenery') || shotType.toLowerCase().includes('landscape')) {
          feedShotType = 'scenery'
        }
        
        // Generate prompt using feed-prompt-expert
        let finalPrompt = ''
        
        // Special handling for quote graphics (keep existing sophisticated builder)
        if (post.post_type === 'quote' || proModeType === 'quote-graphic') {
          console.log(`[BACKGROUND-PROCESSING] Using sophisticated quote prompt builder for post ${post.position}`)
          
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
          
          const [brandData] = await sql`
            SELECT color_palette, brand_vibe, color_theme
            FROM user_personal_brand
            WHERE user_id = ${neonUser.id}
            LIMIT 1
          `
          
          let brandKit: any = undefined
          if (brandData?.color_palette) {
            try {
              const palette = typeof brandData.color_palette === 'string' 
                ? JSON.parse(brandData.color_palette) 
                : brandData.color_palette
              
              if (Array.isArray(palette) && palette.length > 0) {
                brandKit = {
                  primary_color: palette[0]?.hex || palette[0]?.color || undefined,
                  secondary_color: palette[1]?.hex || palette[1]?.color || undefined,
                  accent_color: palette[2]?.hex || palette[2]?.color || undefined,
                  font_style: undefined,
                  brand_tone: brandData.brand_vibe || brandData.color_theme || undefined,
                }
              }
            } catch (e) {
              console.warn(`[BACKGROUND-PROCESSING] Failed to parse color_palette:`, e)
            }
          }
          
          const brandVibe = (brandProfile?.brand_vibe || 'editorial').toLowerCase()
          let vibe: 'minimal' | 'editorial' | 'bold' | 'elegant' | 'modern' = 'editorial'
          
          if (brandVibe.includes('minimal')) vibe = 'minimal'
          else if (brandVibe.includes('bold') || brandVibe.includes('dramatic')) vibe = 'bold'
          else if (brandVibe.includes('elegant') || brandVibe.includes('luxury')) vibe = 'elegant'
          else if (brandVibe.includes('modern') || brandVibe.includes('contemporary')) vibe = 'modern'
          
          const brandColors = brandKit && (brandKit.primary_color || brandKit.secondary_color || brandKit.accent_color)
            ? {
                primary_color: brandKit.primary_color || '',
                secondary_color: brandKit.secondary_color || '',
                accent_color: brandKit.accent_color || '',
              }
            : undefined
          
          finalPrompt = buildSophisticatedQuotePrompt({
            quoteText: visualDirection || 'Inspiring quote',
            caption: '',
            brandColors: brandColors,
            vibe: vibe,
            hasReferenceImages: baseImages.length > 0,
          })
        } else {
          // Use feed-prompt-expert for all other posts
          const promptParams = {
            mode: generationMode,
            postType: isUserPost ? 'user' as const : 'lifestyle' as const,
            shotType: feedShotType,
            colorPalette: selectedPalette,
            visualDirection: visualDirection,
            purpose: postPurpose,
            background: undefined, // Can be extracted from visualDirection if needed
            triggerWord: generationMode === 'classic' ? actualTriggerWord : undefined,
            gender: userGender,
            ethnicity: userEthnicity,
            physicalPreferences: physicalPreferences
          }
          
          finalPrompt = generateFeedPrompt(promptParams)
          
          // Validate prompt quality
          const validation = validateFeedPrompt(finalPrompt, generationMode)
          
          if (!validation.valid) {
            console.error(`[BACKGROUND-PROCESSING] ❌ Post ${post.position} validation errors:`, validation.errors)
          }
          
          if (validation.warnings.length > 0) {
            console.warn(`[BACKGROUND-PROCESSING] ⚠️ Post ${post.position} warnings:`, validation.warnings)
          }
          
          generatedPrompts.push(finalPrompt)
        }
        
        // Validate that we have a proper prompt
        if (!finalPrompt || finalPrompt.length < 20) {
          console.error(`[BACKGROUND-PROCESSING] ❌ Generated prompt is too short or empty for post ${post.position}`)
          throw new Error(`Failed to generate valid prompt for post ${post.position}`)
        }
        
        console.log(`[BACKGROUND-PROCESSING] ✅ Generated ${generationMode} mode prompt for post ${post.position} (${finalPrompt.split(/\s+/).length} words)`)

        // Generate caption
        let caption = ''
        try {
          const captionResult = await generateInstagramCaption({
            postPosition: post.position,
            shotType: post.post_type || 'portrait',
            purpose: post.content_pillar || 'general',
            emotionalTone: 'warm',
            brandProfile: brandProfile || {
              business_type: 'Personal Brand',
              brand_vibe: 'Strategic',
              brand_voice: 'Authentic',
              target_audience: 'Entrepreneurs',
            },
            targetAudience: brandProfile?.target_audience || 'general audience',
            brandVoice: brandProfile?.brand_voice || 'authentic',
            contentPillar: post.content_pillar || 'lifestyle',
            hookConcept: strategyPost?.hookConcept,
            storyConcept: strategyPost?.storyConcept,
            valueConcept: strategyPost?.valueConcept,
            ctaConcept: strategyPost?.ctaConcept,
            hashtags: strategyPost?.hashtags,
            previousCaptions: previousCaptions,
            researchData: researchData || null,
            narrativeRole: strategyPost?.narrativeRole,
          })
          
          caption = captionResult.caption || ''
          previousCaptions.push({ position: post.position, caption })
        } catch (captionError) {
          console.error(`[BACKGROUND-PROCESSING] Caption generation failed for post ${post.position}:`, captionError)
          caption = `Check out this post! #instagram #feed`
        }

        // Update post with generated prompt and caption
        await sql`
          UPDATE feed_posts
          SET 
            prompt = ${finalPrompt.substring(0, 2000)},
            caption = ${caption.substring(0, 5000)},
            generation_mode = ${generationMode},
            pro_mode_type = ${proModeType ? proModeType.substring(0, 50) : null},
            updated_at = NOW()
          WHERE id = ${post.id}
        `

        postsWithCaptions.push({ ...post, caption, prompt: finalPrompt })
        processedCount++
        console.log(`[BACKGROUND-PROCESSING] ✅ Post ${post.position} processed (${processedCount}/${totalPosts})`)
        
        // Update progress in database (for UI polling)
        await sql`
          UPDATE feed_layouts
          SET status = 'processing',
              updated_at = NOW()
          WHERE id = ${feedLayoutId}
        `
      } catch (error) {
        console.error(`[BACKGROUND-PROCESSING] ❌ Error processing post ${post.position}:`, error)
        // Continue with next post
        processedCount++ // Count failed posts too for progress tracking
      }
    }

    // ==================== VALIDATE FEED COHESION ====================
    if (generatedPrompts.length > 0) {
      const cohesionCheck = ensureFeedCohesion(generatedPrompts, selectedPalette)
      
      if (!cohesionCheck.cohesive) {
        console.warn(`[BACKGROUND-PROCESSING] ⚠️ Feed cohesion issues detected:`, cohesionCheck.issues)
      } else {
        console.log(`[BACKGROUND-PROCESSING] ✅ Feed cohesion validated - all prompts match ${selectedPalette.name} aesthetic`)
      }
    }
    
    console.log(`[BACKGROUND-PROCESSING] ✅ All posts processed (${processedCount}/${totalPosts}). Prompts and captions ready.`)
    
    // CRITICAL: DO NOT automatically queue images - user must click "Generate Feed" button
    // Images will only be generated when user explicitly clicks the generate button
    // This prevents automatic generation on page refresh and saves costs
    
    // Update status to 'draft' (ready for user to generate images)
    await sql`
      UPDATE feed_layouts
      SET status = 'draft',
          updated_at = NOW()
      WHERE id = ${feedLayoutId}
    `

    console.log(`[BACKGROUND-PROCESSING] ✅ Background processing complete. Images will NOT be auto-generated - user must click "Generate Feed" button.`)
    return { success: true, processedCount, message: "Prompts and captions generated. Images will be generated when user clicks Generate Feed button." }
  } catch (error) {
    console.error(`[BACKGROUND-PROCESSING] ❌ Background processing error:`, error)
    await sql`
      UPDATE feed_layouts
      SET status = 'processing_failed', updated_at = NOW()
      WHERE id = ${feedLayoutId}
    `
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Background processing failed" 
    }
  }
}

