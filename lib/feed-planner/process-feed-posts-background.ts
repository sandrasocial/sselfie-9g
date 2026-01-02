/**
 * Background processing for feed posts
 * Generates prompts and captions, then queues images
 * This runs after feed layout is created to return faster to user
 */

import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"
import { detectRequiredMode, detectProModeType } from "@/lib/feed-planner/mode-detection"
import { generateVisualComposition } from "@/lib/feed-planner/visual-composition-expert"
import { buildSophisticatedQuotePrompt } from "@/lib/maya/quote-graphic-prompt-builder"
import { queueAllImagesForFeed } from "./queue-images"

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
    
    // Track progress
    let processedCount = 0
    const totalPosts = posts.length

    const postsWithCaptions = []
    const previousCaptions: Array<{ position: number; caption: string }> = []

    // Process each post: generate prompt and caption
    for (const post of posts) {
      try {
        console.log(`[BACKGROUND-PROCESSING] Processing post ${post.position}`)

        // Determine generation mode
        let generationMode: 'classic' | 'pro'
        if (forceMode) {
          generationMode = forceMode
        } else {
          generationMode = post.generation_mode || detectRequiredMode({
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

        // Generate prompt
        let finalPrompt = ''
        
        if (generationMode === 'pro') {
          // Pro Mode prompt generation
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

          // Get brand kit
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

          if (post.post_type === 'quote' || proModeType === 'quote-graphic') {
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
            const { buildNanoBananaPrompt } = await import("@/lib/maya/nano-banana-prompt-builder")
            
            const { optimizedPrompt } = await buildNanoBananaPrompt({
              userId: neonUser.id.toString(),
              mode: (proModeType || 'workbench') as any,
              userRequest: visualDirection || post.content_pillar || `Feed post ${post.position}`,
              inputImages: {
                baseImages,
                productImages: [],
                textElements: undefined,
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
          }
        } else {
          // Classic Mode: Generate FLUX prompt
          const visualComposition = await generateVisualComposition({
            postPosition: post.position,
            shotType: post.post_type || 'portrait',
            purpose: post.content_pillar || 'general',
            visualDirection: visualDirection || `Post ${post.position}`,
            brandVibe: brandProfile?.brand_vibe || 'authentic',
            authUserId: authUserId,
            triggerWord: triggerWord || undefined,
          })
          finalPrompt = visualComposition.fluxPrompt
        }

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

    console.log(`[BACKGROUND-PROCESSING] ✅ All posts processed (${processedCount}/${totalPosts}). Queueing images...`)
    
    // Update status to indicate queueing
    await sql`
      UPDATE feed_layouts
      SET status = 'queueing',
          updated_at = NOW()
      WHERE id = ${feedLayoutId}
    `

    // Queue images for generation
    const queueSettings = customSettings ? {
      styleStrength: customSettings.styleStrength,
      promptAccuracy: customSettings.promptAccuracy,
      aspectRatio: customSettings.aspectRatio,
      realismStrength: customSettings.realismStrength,
      extraLoraScale: customSettings.realismStrength,
    } : undefined

    const queueResult = await queueAllImagesForFeed(
      feedLayoutId,
      authUserId,
      origin,
      queueSettings,
      userImageLibrary
    )

    if (!queueResult.success) {
      console.error(`[BACKGROUND-PROCESSING] ❌ Queue failed:`, queueResult)
      await sql`
        UPDATE feed_layouts
        SET status = 'queue_failed', updated_at = NOW()
        WHERE id = ${feedLayoutId}
      `
      return { success: false, error: queueResult.message || "Queue failed" }
    }

    // Update status to 'pending' (images are queued, waiting for generation)
    await sql`
      UPDATE feed_layouts
      SET status = 'pending',
          updated_at = NOW()
      WHERE id = ${feedLayoutId}
    `

    console.log(`[BACKGROUND-PROCESSING] ✅ Images queued successfully`)
    return { success: true, queuedCount: queueResult.queuedCount || posts.length }
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

