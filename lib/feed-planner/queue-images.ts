import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { CREDIT_COSTS, checkCredits, deductCredits } from "@/lib/credits"
import { getReplicateClient } from "@/lib/replicate-client"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { buildNanoBananaPrompt } from "@/lib/maya/nano-banana-prompt-builder"
import { getStudioProCreditCost } from "@/lib/nano-banana-client"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Queue all images for a feed layout - extracted logic that can be called directly
 */
export async function queueAllImagesForFeed(
  feedLayoutId: number, 
  authUserId: string, 
  origin: string,
  customSettings?: {
    styleStrength?: number
    promptAccuracy?: number
    aspectRatio?: string
    realismStrength?: number
    extraLoraScale?: number
  }
) {
  console.log("[v0] ==================== QUEUE ALL IMAGES (DIRECT CALL) ====================")

  const neonUser = await getUserByAuthId(authUserId)
  if (!neonUser) {
    throw new Error("User not found")
  }

  console.log("[v0] Queueing images for feed layout:", feedLayoutId)

  // Get all posts for this feed that need images (including Pro Mode info)
  const posts = await sql`
    SELECT id, position, prompt, post_type, caption, generation_status, prediction_id, image_url, generation_mode, pro_mode_type
    FROM feed_posts
    WHERE feed_layout_id = ${feedLayoutId}
    AND user_id = ${neonUser.id}
    AND (generation_status = 'pending' OR generation_status IS NULL OR generation_status = 'failed' OR (generation_status = 'generating' AND prediction_id IS NULL))
    AND image_url IS NULL
    ORDER BY position ASC
  `

  if (posts.length === 0) {
    console.log("[v0] No posts found to generate")
    return {
      success: true,
      message: "No posts to generate",
      queuedCount: 0,
      totalPosts: 0,
      failedCount: 0,
    }
  }

  console.log(`[v0] Found ${posts.length} posts to generate`)

  // Get user model and feed layout
  const [feedLayout] = await sql`
    SELECT color_palette, brand_vibe, photoshoot_enabled, photoshoot_base_seed 
    FROM feed_layouts 
    WHERE id = ${feedLayoutId} AND user_id = ${neonUser.id}
  `

  if (!feedLayout) {
    throw new Error("Feed layout not found")
  }

  const [model] = await sql`
    SELECT trigger_word, replicate_version_id, replicate_model_id, lora_scale, lora_weights_url
    FROM user_models
    WHERE user_id = ${neonUser.id}
    AND training_status = 'completed'
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (!model || !model.replicate_version_id || !model.lora_weights_url) {
    throw new Error("No trained model found")
  }

  // Check credits upfront (Pro Mode = 2 credits, Classic = 1 credit)
  const proModePosts = posts.filter(p => p.generation_mode === 'pro')
  const classicPosts = posts.filter(p => !p.generation_mode || p.generation_mode === 'classic')
  const totalCreditsNeeded = (proModePosts.length * getStudioProCreditCost('2K')) + (classicPosts.length * CREDIT_COSTS.IMAGE)
  const hasEnoughCredits = await checkCredits(neonUser.id, totalCreditsNeeded)
  if (!hasEnoughCredits) {
    throw new Error(`Insufficient credits. You need ${totalCreditsNeeded} credits (${proModePosts.length} Pro Mode × 2 + ${classicPosts.length} Classic × 1) to generate ${posts.length} images.`)
  }

  const replicate = getReplicateClient()
  const REALISM_LORA_URL = "https://huggingface.co/strangerzonehf/Flux-Super-Realism-LoRA/resolve/main/super-realism.safetensors"

  // Generate all predictions directly
  const results: Array<{ success: boolean; postId: number; position: number; predictionId?: string; error?: string }> = []

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    try {
      console.log(`[v0] ==================== GENERATING POST ${post.position} (${i + 1}/${posts.length}) ====================`)
      console.log(`[v0] Post ID: ${post.id}, Position: ${post.position}, Mode: ${post.generation_mode || 'classic'}`)

      // Check if this is a Pro Mode post
      if (post.generation_mode === 'pro') {
        console.log(`[v0] 🎨 Pro Mode post detected - routing to Studio Pro API`)
        console.log(`[v0] Pro Mode Type: ${post.pro_mode_type || 'workbench'}`)
        
        try {
          // Get avatar images (required for Pro Mode)
          const avatarImages = await sql`
            SELECT image_url
            FROM user_avatar_images
            WHERE user_id = ${neonUser.id} AND is_active = true
            ORDER BY display_order ASC, uploaded_at ASC
            LIMIT 5
          `
          
          if (avatarImages.length < 3) {
            throw new Error('Pro Mode requires at least 3 avatar images. Please complete avatar setup first.')
          }
          
          // All avatar images are user photos - they preserve the user's identity
          // In Feed Planner Pro Mode, all images should be classified as 'user-photo'
          // to ensure proper identity preservation across all generated images
          const baseImages = avatarImages.map((img: any) => ({
            url: img.image_url,
            type: 'user-photo' as const,
          }))
          
          // Get brand kit if available
          const [brandKit] = await sql`
            SELECT primary_color, secondary_color, accent_color, font_style, brand_tone
            FROM brand_kits
            WHERE user_id = ${neonUser.id} AND is_default = true
            LIMIT 1
          `
          
          // Build Nano Banana prompt
          const proModeType = (post.pro_mode_type || 'workbench') as any
          const userRequest = post.caption || post.prompt || `Feed post ${post.position}`
          
          const { optimizedPrompt } = await buildNanoBananaPrompt({
            userId: neonUser.id,
            mode: proModeType,
            userRequest,
            inputImages: {
              baseImages,
              productImages: [],
              textElements: post.post_type === 'quote' ? [{
                text: post.caption || '',
                style: 'quote' as const,
              }] : undefined,
            },
            workflowMeta: {
              platformFormat: customSettings?.aspectRatio || '4:5',
            },
            brandKit: brandKit ? {
              primaryColor: brandKit.primary_color,
              secondaryColor: brandKit.secondary_color,
              accentColor: brandKit.accent_color,
              fontStyle: brandKit.font_style,
              brandTone: brandKit.brand_tone,
            } : undefined,
          })
          
          // Generate with Nano Banana Pro (credits deducted at end for successful generations only)
          // Note: Instagram portrait posts use 4:5 (1080×1350px) - preserve this aspect ratio
          const aspectRatio = customSettings?.aspectRatio || '4:5'
          const generation = await generateWithNanoBanana({
            prompt: optimizedPrompt,
            image_input: baseImages.map(img => img.url),
            aspect_ratio: aspectRatio, // Use aspect ratio directly (4:5 for Instagram portrait, 1:1 for square, 16:9 for landscape)
            resolution: '2K',
            output_format: 'png',
            safety_filter_level: 'block_only_high',
          })
          
          // Update database with prediction ID
          await sql`
            UPDATE feed_posts
            SET generation_status = 'generating',
                prediction_id = ${generation.predictionId},
                updated_at = NOW()
            WHERE id = ${post.id}
          `
          
          console.log(`[v0] ✅ Successfully created Pro Mode prediction for post ${post.position}:`, generation.predictionId)
          results.push({
            success: true,
            postId: post.id,
            position: post.position,
            predictionId: generation.predictionId,
          })
          
          // Wait between predictions
          if (i < posts.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 11000))
          }
          
          continue // Skip Classic Mode logic below
        } catch (error: any) {
          console.error(`[v0] ❌ Error generating Pro Mode post ${post.position}:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          })
          results.push({
            success: false,
            postId: post.id,
            position: post.position,
            error: error instanceof Error ? error.message : "Unknown error",
          })
          await new Promise((resolve) => setTimeout(resolve, 2000))
          continue
        }
      }

      // Use prompt directly from database (already generated by Maya's concept generation)
      // No enhancement needed - prompts are generated using the same proven logic as concept cards
      let finalPrompt = post.prompt || ""
      
      if (!finalPrompt) {
        throw new Error(`No prompt available for post ${post.position}`)
      }
      
      console.log(`[v0] 📝 Using Maya-generated prompt (${finalPrompt.split(/\s+/).length} words): ${finalPrompt.substring(0, 150)}...`)

      // CRITICAL: Validate and fix trigger word before sending to Replicate
      const promptLower = finalPrompt.toLowerCase().trim()
      const triggerLower = model.trigger_word.toLowerCase()
      
      if (!promptLower.startsWith(triggerLower)) {
        console.log(`[v0] ⚠️ WARNING: Prompt doesn't start with trigger word "${model.trigger_word}"`)
        console.log(`[v0] Prompt start: "${finalPrompt.substring(0, 50)}..."`)
        
        // Remove any username patterns
        let cleanedPrompt = finalPrompt.replace(/\b\w+[_@]\w+\b/g, '').trim()
        cleanedPrompt = cleanedPrompt.replace(/\b[a-zA-Z]+[_@][a-zA-Z0-9_]+\b/g, '').trim()
        cleanedPrompt = cleanedPrompt.replace(/\b\w*_\w*\b/g, '').trim()
        
        // Remove trigger word if in wrong position
        if (cleanedPrompt.toLowerCase().includes(triggerLower) && !cleanedPrompt.toLowerCase().startsWith(triggerLower)) {
          cleanedPrompt = cleanedPrompt.replace(new RegExp(`\\b${model.trigger_word}\\b`, 'gi'), '').trim()
        }
        
        // Remove first part if it's not the trigger word
        const parts = cleanedPrompt.split(',').map(p => p.trim()).filter(p => p.length > 0)
        if (parts.length > 0 && !parts[0].toLowerCase().startsWith(triggerLower)) {
          parts.shift()
          cleanedPrompt = parts.join(', ').trim()
        }
        
        // Build correct format
        cleanedPrompt = cleanedPrompt.replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim()
        
        // Get user data for correct format
        const [userData] = await sql`
          SELECT u.ethnicity, u.gender
          FROM users u
          WHERE u.id = ${neonUser.id}
          LIMIT 1
        `
        
        const ethnicity = userData?.ethnicity || null
        let userGender = "person"
        if (userData?.gender) {
          const dbGender = userData.gender.toLowerCase().trim()
          if (dbGender === "woman" || dbGender === "female") {
            userGender = "woman"
          } else if (dbGender === "man" || dbGender === "male") {
            userGender = "man"
          }
        }
        
        const correctStart = `${model.trigger_word}, ${ethnicity ? ethnicity + ", " : ""}${userGender}`
        finalPrompt = `${correctStart}, ${cleanedPrompt}`
        
        console.log(`[v0] ✅ Fixed prompt format. New start: "${finalPrompt.substring(0, 80)}..."`)
      } else {
        console.log(`[v0] ✅ Prompt correctly starts with trigger word "${model.trigger_word}"`)
      }

      // Get quality settings and apply custom settings if provided
      const qualitySettings = MAYA_QUALITY_PRESETS[post.post_type as keyof typeof MAYA_QUALITY_PRESETS] || MAYA_QUALITY_PRESETS.default
      
      // Apply custom settings (same logic as Maya screen)
      const finalQualitySettings = {
        ...qualitySettings,
        aspect_ratio: customSettings?.aspectRatio || qualitySettings.aspect_ratio,
        lora_scale: customSettings?.styleStrength ?? (model.lora_scale !== null && model.lora_scale !== undefined ? Number(model.lora_scale) : qualitySettings.lora_scale),
        guidance_scale: customSettings?.promptAccuracy ?? qualitySettings.guidance_scale,
        extra_lora: qualitySettings.extra_lora,
        extra_lora_scale: customSettings?.extraLoraScale ?? customSettings?.realismStrength ?? qualitySettings.extra_lora_scale,
      }
      
      const loraScale = finalQualitySettings.lora_scale

      // Create Replicate prediction directly (credits deducted at end for successful generations only)
      let retries = 0
      const maxRetries = 3
      let prediction: any = null

      while (retries < maxRetries) {
        try {
          let versionHash = model.replicate_version_id
          if (versionHash && versionHash.includes(":")) {
            versionHash = versionHash.split(":").pop() || versionHash
          }
          const userLoraPath = model.replicate_model_id && versionHash 
            ? `${model.replicate_model_id}:${versionHash}` 
            : model.lora_weights_url

          prediction = await replicate.predictions.create({
            version: model.replicate_version_id,
            input: {
              prompt: finalPrompt,
              guidance_scale: finalQualitySettings.guidance_scale,
              num_inference_steps: finalQualitySettings.num_inference_steps,
              aspect_ratio: finalQualitySettings.aspect_ratio,
              megapixels: finalQualitySettings.megapixels,
              output_format: finalQualitySettings.output_format,
              output_quality: finalQualitySettings.output_quality,
              lora_scale: Number(loraScale),
              hf_lora: userLoraPath,
              extra_lora: finalQualitySettings.extra_lora,
              extra_lora_scale: finalQualitySettings.extra_lora_scale,
              disable_safety_checker: finalQualitySettings.disable_safety_checker ?? true,
              go_fast: finalQualitySettings.go_fast ?? false,
              num_outputs: finalQualitySettings.num_outputs ?? 1,
              model: finalQualitySettings.model ?? "dev",
              seed: Math.floor(Math.random() * 1000000),
            },
          })
          break
        } catch (error: any) {
          if (error.response?.status === 429 || error.message?.includes("throttled")) {
            const retryAfter = error.response?.data?.retry_after || 10
            retries++
            if (retries >= maxRetries) {
              throw new Error(`Rate limit exceeded after ${maxRetries} retries`)
            }
            console.log(`[v0] ⚠️ Rate limited, retrying in ${retryAfter + 2} seconds (attempt ${retries}/${maxRetries})...`)
            await new Promise((resolve) => setTimeout(resolve, (retryAfter + 2) * 1000))
          } else {
            throw error
          }
        }
      }

      // Update database with prediction ID
      await sql`
        UPDATE feed_posts
        SET generation_status = 'generating', 
            prediction_id = ${prediction.id}, 
            prompt = ${finalPrompt}, 
            updated_at = NOW()
        WHERE id = ${post.id}
      `

      console.log(`[v0] ✅ Successfully created prediction for post ${post.position}:`, prediction.id)
      results.push({
        success: true,
        postId: post.id,
        position: post.position,
        predictionId: prediction.id,
      })

      // Wait between predictions
      if (i < posts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 11000))
      }
    } catch (error: any) {
      console.error(`[v0] ❌ Error generating post ${post.position}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      results.push({
        success: false,
        postId: post.id,
        position: post.position,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  // Deduct credits once for all successful generations (pay on success, not attempt)
  const successful = results.filter((r) => r.success).length
  const proModeSuccessful = results.filter((r) => {
    const post = posts.find(p => p.id === r.postId)
    return r.success && post?.generation_mode === 'pro'
  }).length
  const classicSuccessful = successful - proModeSuccessful
  
  if (successful > 0) {
    // Calculate total credits for successful posts only
    const proModeCredits = proModeSuccessful * getStudioProCreditCost('2K')
    const classicCredits = classicSuccessful * CREDIT_COSTS.IMAGE
    const totalCreditsToDeduct = proModeCredits + classicCredits
    
    console.log(`[v0] Generation complete: ${successful} successful (${classicSuccessful} Classic × ${CREDIT_COSTS.IMAGE} credit, ${proModeSuccessful} Pro Mode × ${getStudioProCreditCost('2K')} credits)`)
    console.log(`[v0] Deducting ${totalCreditsToDeduct} credits for successful generations only...`)
    
    // Get prediction IDs for reference (use first successful prediction ID as reference)
    const firstSuccessfulResult = results.find(r => r.success)
    const referenceId = firstSuccessfulResult?.predictionId || `feed-${feedLayoutId}-${Date.now()}`
    
    const deductionResult = await deductCredits(
      neonUser.id,
      totalCreditsToDeduct,
      'image',
      `Feed Planner: ${successful} images (${classicSuccessful} Classic, ${proModeSuccessful} Pro)`,
      referenceId
    )
    
    if (!deductionResult.success) {
      console.error(`[v0] ❌ Failed to deduct credits: ${deductionResult.error}`)
      // Log error but don't throw - posts are already queued
    } else {
      console.log(`[v0] ✅ Credits deducted: ${totalCreditsToDeduct}, New balance: ${deductionResult.newBalance || "unknown"}`)
    }
  }

  const failed = results.length - successful

  console.log(`[v0] Queue complete: ${successful} successful, ${failed} failed`)

  return {
    success: true,
    queuedCount: successful,
    totalPosts: posts.length,
    failedCount: failed,
    message: `Queued ${successful} of ${posts.length} images for generation`,
  }
}


