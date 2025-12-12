import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"
import { generateText } from "ai"

const sql = getDbClient()

async function generatePhotoshootPoseVariations({
  basePrompt,
  baseSeed,
  triggerWord,
  numImages,
  ethnicity,
  physicalPreferences,
}: {
  basePrompt: string
  baseSeed: number
  triggerWord: string
  numImages: number
  ethnicity?: string | null
  physicalPreferences?: string | null
}) {
  console.log("[v0] 📸 Generating authentic lifestyle variations with Claude Sonnet 4.5...")
  console.log("[v0] Base prompt:", basePrompt)
  console.log("[v0] Base seed:", baseSeed)
  console.log("[v0] Ethnicity:", ethnicity || "not specified")
  console.log("[v0] Physical preferences:", physicalPreferences || "not specified")

  let characterDescriptor = ""
  if (ethnicity) {
    characterDescriptor += `${ethnicity} `
  }
  if (physicalPreferences) {
    // Remove instruction phrases - these are for Maya, not FLUX prompts
    let cleanedPreferences = physicalPreferences.trim()
    const instructionPhrases = [
      /\bAlways keep my\b/gi,
      /\bAlways\s+keep\s+my\s+natural\s+features\b/gi,
      /\bdont change\b/gi,
      /\bdon't change\b/gi,
      /\bdont\s+change\s+the\s+face\b/gi,
      /\bdon't\s+change\s+the\s+face\b/gi,
      /\bkeep my\b/gi,
      /\bkeep\s+my\s+natural\s+features\b/gi,
      /\bkeep\s+my\s+natural\s+eye\s+color\b/gi,
      /\bkeep\s+my\s+natural\s+eyes\b/gi,
      /\bpreserve my\b/gi,
      /\bmaintain my\b/gi,
      /\bdo not change\b/gi,
      /\bdo\s+not\s+change\s+the\s+face\b/gi,
      // Special handling for hair color - preserve intent
      /\bkeep\s+my\s+natural\s+hair\s+color\b/gi,  // Will preserve intent below
      /\bkeep\s+my\s+natural\s+hair\b/gi,  // Will preserve intent below
    ]
    
    // Check if user wants to preserve natural hair color
    const hasNaturalHairColor = /\b(?:keep\s+my\s+natural\s+hair\s+color|keep\s+my\s+natural\s+hair)\b/gi.test(cleanedPreferences)
    
    instructionPhrases.forEach((regex) => {
      cleanedPreferences = cleanedPreferences.replace(regex, "")
    })
    
    // If user specified "keep natural hair color" and no color is mentioned, preserve the intent
    if (hasNaturalHairColor && !/\b(blonde|brown|black|red|gray|grey|auburn|brunette|hair\s+color)\b/gi.test(cleanedPreferences)) {
      cleanedPreferences = "natural hair color, " + cleanedPreferences
    }
    
    // Clean up commas and spaces
    cleanedPreferences = cleanedPreferences
      .replace(/,\s*,/g, ",") // Remove double commas
      .replace(/,\s*,/g, ",") // Remove double commas again (in case of triple)
      .replace(/^,\s*/, "") // Remove leading comma
      .replace(/\s*,\s*$/, "") // Remove trailing comma
      .replace(/\s+/g, " ") // Normalize multiple spaces
      .trim() // Final trim
    
    // Only add if there's actual descriptive content left (not just instructions)
    if (cleanedPreferences && cleanedPreferences.length > 0) {
      characterDescriptor += cleanedPreferences
    }
  }

  const characterContext = characterDescriptor.trim()
    ? `\n**Character Consistency:** The person is ${characterDescriptor}. Include this in EVERY prompt variation.`
    : ""

  const mayaPrompt = `You are Maya, creating an authentic "day in the life" Instagram carousel for SSELFIE Studio.

**ORIGINAL CONCEPT PROMPT:**
"${basePrompt}"
${characterContext}

**🎯 CRITICAL CONSISTENCY RULES:**

1. **SAME SEED = SAME APPEARANCE** 
   - All ${numImages} images use IDENTICAL seed ${baseSeed}
   - This ensures consistent face, lighting style, overall aesthetic
   
2. **EXTRACT & REUSE EXACT OUTFIT**
   - Analyze original prompt and extract the EXACT outfit description
   - Use WORD-FOR-WORD identical outfit in all ${numImages} prompts
   - Example: If original says "oversized cream knit sweater, high-waisted jeans" → copy this EXACTLY in every variation
   
3. **ONLY VARY: Pose, Angle, Micro-Location**
   - Same outfit ✅
   - Same character${characterDescriptor ? ` (${characterDescriptor})` : ""} ✅
   - Same general location ✅
   - Different pose/action ✅
   - Different camera angle ✅
   - Different specific spot within location ✅

**📏 PROMPT LENGTH: 25-35 words MAX**

Shorter prompts = better facial consistency. The user's LoRA knows their face - don't overwhelm it!

**EXTRACTION PHASE:**

First, extract from original prompt:
- **Exact outfit** (word-for-word, typically 4-8 words)
- **Location type** (cafe, street, beach, etc.)
- **Lighting** (golden hour, soft natural, morning light, etc.)
- **Aesthetic keywords** (1-2 words: cozy, minimal, editorial, etc.)

**VARIATION STRATEGY:**

Think like a real photographer shooting ${numImages} frames in ONE session:
- Frame 1: Wide establishing shot
- Frame 2: Medium walking towards camera
- Frame 3: Close-up candid moment
- Frame 4: Side angle action (sipping, adjusting, etc.)
- Frame 5: Over-shoulder perspective
- Frame 6-9: Natural activity variations

**CRITICAL: USE EXACT SAME OUTFIT DESCRIPTION IN EVERY PROMPT**

**PROMPT STRUCTURE (25-35 words):**
"${triggerWord}, ${characterDescriptor ? characterDescriptor + ", " : ""}[exact_outfit_from_original], [simple_action], [micro_location], [lighting], shot on iPhone 15 Pro, [lens], natural skin texture"

**CAPTION EXAMPLES:**
✅ "Cozy fall vibes in my favorite sweater"
✅ "Living for this effortless minimalist moment"
✅ "City streets and coffee dates"
✅ "That golden hour glow hits different"
❌ "White woman, Long dark knit texture..." (too technical)
❌ "Beautiful woman in oversized sweater..." (too generic)

**WHAT TO EXCLUDE:**
- NO "beautiful", "stunning", "gorgeous" 
- NO detailed environmental descriptions
- NO complex pose instructions
- Keep it MINIMAL for face preservation

**OUTPUT - RETURN ONLY THIS JSON:**

{
  "extractedOutfit": "exact outfit description copied word-for-word from original (no changes)",
  "locationTheme": "general location type",
  "lightingStyle": "lighting description",
  "baseSeed": ${baseSeed},
  "poses": [
    {
      "title": "Brief Pose Name (2-4 words)",
      "caption": "Trendy Instagram-style caption (8-12 words max, everyday language, mood/vibe focused, NO technical descriptions)",
      "shotType": "full body" | "medium shot" | "close-up",
      "scenery": "specific micro-location",
      "action": "simple activity (2-4 words)",
      "cameraAngle": "straight" | "side" | "above" | "over shoulder",
      "lensChoice": "35mm" | "50mm" | "85mm",
      "prompt": "${triggerWord}, ${characterDescriptor ? characterDescriptor + ", " : ""}[exact_outfit], [action], [micro_location], [lighting], shot on iPhone 15 Pro, [lens], natural skin texture"
    }
  ]
}

**VALIDATION CHECKS:**
✅ extractedOutfit is IDENTICAL to original (word-for-word)
✅ Every pose uses EXACT SAME outfit description
✅ Every prompt is 25-35 words
✅ Every caption is 8-12 words, trendy, everyday language
✅ Only pose/angle/micro-location vary

Generate ${numImages} lifestyle variations. Return ONLY valid JSON.`

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    prompt: mayaPrompt,
    maxOutputTokens: 4000,
    temperature: 0.7, // Reduced from 0.85 for more consistency
  })

  console.log("[v0] 📸 Claude response length:", text.length)
  console.log("[v0] 📸 Claude response preview:", text.substring(0, 200))

  let jsonText = text

  if (text.includes("```json")) {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }
  } else if (text.includes("```")) {
    const jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error("[v0] ❌ No JSON found in response:", text.substring(0, 500))
    throw new Error("No JSON found in Maya response")
  }

  try {
    const photoshootPlan = JSON.parse(jsonMatch[0])

    console.log("[v0] 📸 Lifestyle variations created:", {
      extractedOutfit: photoshootPlan.extractedOutfit?.substring(0, 50) + "...",
      baseSeed: photoshootPlan.baseSeed,
      locationTheme: photoshootPlan.locationTheme,
      numPoses: photoshootPlan.poses?.length,
    })

    if (!photoshootPlan.poses || photoshootPlan.poses.length === 0) {
      throw new Error("No poses generated in response")
    }

    const firstOutfit = photoshootPlan.extractedOutfit
    const inconsistentPoses = photoshootPlan.poses.filter((pose: any) => !pose.prompt.includes(firstOutfit))

    if (inconsistentPoses.length > 0) {
      console.warn("[v0] ⚠️ Some poses missing exact outfit, will use base photoshoot outfit")
    }

    const captionValidation = photoshootPlan.poses.every((pose: any) => {
      return pose.caption && pose.caption.length >= 8 && pose.caption.length <= 12
    })

    if (!captionValidation) {
      console.warn("[v0] ⚠️ Some captions are not within the 8-12 words range or are not trendy")
    }

    return photoshootPlan
  } catch (parseError) {
    console.error("[v0] ❌ JSON parsing failed:", parseError)
    console.error("[v0] ❌ Attempted to parse:", jsonMatch[0].substring(0, 500))
    throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`)
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 10,
    windowMs: 60000,
  })

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: "Too many photoshoot requests. Please wait a moment.",
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 },
    )
  }

  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { heroImageUrl, heroPrompt, heroSeed, conceptTitle, conceptDescription, category, chatId, customSettings } =
      body

    if (!heroImageUrl || !heroPrompt) {
      return NextResponse.json({ error: "Hero image and prompt are required" }, { status: 400 })
    }

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    const NUM_IMAGES = Math.floor(Math.random() * 4) + 6 // Random between 6-9
    const totalCreditsRequired = CREDIT_COSTS.IMAGE * NUM_IMAGES

    console.log("[v0] 📸 Creating photoshoot from original image:", {
      numImages: NUM_IMAGES,
      originalPrompt: heroPrompt.substring(0, 100) + "...",
      originalSeed: heroSeed,
      customSettings: customSettings || "using presets",
    })

    const hasEnoughCredits = await checkCredits(neonUser.id, totalCreditsRequired)

    if (!hasEnoughCredits) {
      const currentBalance = await getUserCredits(neonUser.id)
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: totalCreditsRequired,
          current: currentBalance,
          message: `Photoshoot creation requires ${totalCreditsRequired} credits (${NUM_IMAGES} images). You have ${currentBalance} credits. Please purchase more credits.`,
        },
        { status: 402 },
      )
    }

    const userDataResult = await sql`
      SELECT 
        u.gender,
        u.ethnicity,
        um.trigger_word,
        um.replicate_version_id,
        um.replicate_model_id,
        um.training_status,
        um.lora_scale,
        um.lora_weights_url,
        upb.physical_preferences
      FROM users u
      LEFT JOIN user_models um ON u.id = um.user_id
      LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
      WHERE u.id = ${neonUser.id}
      AND um.training_status = 'completed'
      ORDER BY um.created_at DESC
      LIMIT 1
    `

    if (userDataResult.length === 0) {
      return NextResponse.json({ error: "No trained model found. Please complete training first." }, { status: 400 })
    }

    const userData = userDataResult[0]

    let userGender = "person"
    if (userData.gender) {
      const dbGender = userData.gender.toLowerCase().trim()
      if (dbGender === "woman" || dbGender === "female") {
        userGender = "woman"
      } else if (dbGender === "man" || dbGender === "male") {
        userGender = "man"
      }
    }

    const triggerWord = userData.trigger_word || `user${neonUser.id}`
    const replicateVersionId = userData.replicate_version_id
    const replicateModelId = userData.replicate_model_id
    const userLoraScale = userData.lora_scale
    const loraWeightsUrl = userData.lora_weights_url
    const ethnicity = userData.ethnicity
    const physicalPreferences = userData.physical_preferences

    let versionHash = replicateVersionId
    if (replicateVersionId && replicateVersionId.includes(":")) {
      versionHash = replicateVersionId.split(":").pop()
    }

    const userLoraPath = replicateModelId && versionHash ? `${replicateModelId}:${versionHash}` : loraWeightsUrl

    if (!userLoraPath || userLoraPath.trim() === "") {
      return NextResponse.json(
        { error: "LoRA model not found. Please contact support to fix your model." },
        { status: 400 },
      )
    }

    const consistencySeed = heroSeed || Math.floor(Math.random() * 1000000)

    console.log("[v0] 📸 Using SAME seed for all images (consistency mode):", consistencySeed)

    const photoshootPlan = await generatePhotoshootPoseVariations({
      basePrompt: heroPrompt,
      baseSeed: consistencySeed,
      triggerWord,
      numImages: NUM_IMAGES,
      ethnicity,
      physicalPreferences,
    })

    const replicate = getReplicateClient()

    let finalSettings
    if (customSettings) {
      console.log("[v0] 📸 Using custom settings from hero image:", customSettings)
      const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
      const categoryKey = category as keyof typeof MAYA_QUALITY_PRESETS
      const presetSettings = MAYA_QUALITY_PRESETS[categoryKey] || MAYA_QUALITY_PRESETS.default

      finalSettings = {
        guidance_scale: customSettings.promptAccuracy || presetSettings.guidance_scale,
        lora_scale: customSettings.styleStrength || Number(userLoraScale || presetSettings.lora_scale),
        extra_lora_scale: customSettings.realismStrength || 0.2,
        num_inference_steps: presetSettings.num_inference_steps,
        megapixels: presetSettings.megapixels,
        output_format: presetSettings.output_format,
        output_quality: presetSettings.output_quality,
      }
    } else {
      const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
      const categoryKey = category as keyof typeof MAYA_QUALITY_PRESETS
      const presetSettings = MAYA_QUALITY_PRESETS[categoryKey] || MAYA_QUALITY_PRESETS.default
      finalSettings = {
        guidance_scale: presetSettings.guidance_scale,
        lora_scale: Number(userLoraScale || presetSettings.lora_scale),
        extra_lora_scale: 0.2,
        num_inference_steps: presetSettings.num_inference_steps,
        megapixels: presetSettings.megapixels,
        output_format: presetSettings.output_format,
        output_quality: presetSettings.output_quality,
      }
    }

    const REALISM_LORA_URL =
      customSettings?.extraLora ||
      "https://huggingface.co/strangerzonehf/Flux-Super-Realism-LoRA/resolve/main/super-realism.safetensors"

    console.log("[v0] 📸 Final settings:", finalSettings)

    const predictions: Array<{
      predictionId: string
      title: string
      description: string
      pose: string
      location: string
      seed: number
      index: number
      shotDistance?: string
      energyLevel?: string
      caption: string
    }> = []

    console.log("[v0] 📸 Creating", NUM_IMAGES, "predictions with SAME seed for consistency:", consistencySeed)

    for (let i = 0; i < NUM_IMAGES; i++) {
      const pose = photoshootPlan.poses[i]
      const sameSeed = consistencySeed

      console.log(`[v0] 📸 Creating Image ${i + 1}/${NUM_IMAGES}:`, {
        title: pose.title,
        seed: sameSeed,
        sameForAll: true, // Indicating all use same seed
        shotType: pose.shotType,
        scenery: pose.scenery,
        promptPreview: pose.prompt.substring(0, 100) + "...",
        caption: pose.caption,
      })

      let retries = 0
      const maxRetries = 3
      let prediction: any = null

      while (retries < maxRetries) {
        try {
          prediction = await replicate.predictions.create({
            version: replicateVersionId,
            input: {
              prompt: pose.prompt,
              guidance_scale: finalSettings.guidance_scale,
              num_inference_steps: finalSettings.num_inference_steps,
              aspect_ratio: "4:5",
              megapixels: finalSettings.megapixels,
              output_format: finalSettings.output_format,
              output_quality: finalSettings.output_quality,
              lora_scale: finalSettings.lora_scale,
              hf_lora: userLoraPath,
              extra_lora: REALISM_LORA_URL,
              extra_lora_scale: finalSettings.extra_lora_scale,
              seed: sameSeed, // Using same seed for character consistency
              disable_safety_checker: true,
              go_fast: false,
              num_outputs: 1,
              model: "dev",
            },
          })
          break
        } catch (error: any) {
          if (error.response?.status === 429 || error.message?.includes("throttled")) {
            const retryAfter = error.response?.data?.retry_after || 10
            retries++
            if (retries >= maxRetries) {
              throw new Error(`Rate limit exceeded after ${maxRetries} retries. Please try again in a few minutes.`)
            }
            console.log(
              `[v0] ⚠️ Rate limited, retrying in ${retryAfter + 2} seconds (attempt ${retries}/${maxRetries})...`,
            )
            await new Promise((resolve) => setTimeout(resolve, (retryAfter + 2) * 1000))
          } else {
            throw error
          }
        }
      }

      predictions.push({
        predictionId: prediction.id,
        title: pose.title,
        description: pose.action,
        pose: pose.action,
        location: pose.scenery,
        seed: sameSeed, // Storing same seed for all
        index: i,
        shotDistance: pose.shotType,
        caption: pose.caption,
      })

      console.log(`[v0] ✅ Prediction ${i + 1} created:`, prediction.id, "with seed:", sameSeed)

      if (i < NUM_IMAGES - 1) {
        console.log(`[v0] ⏳ Waiting 11 seconds before creating next prediction...`)
        await new Promise((resolve) => setTimeout(resolve, 11000))
      }
    }

    const insertResult = await sql`
      INSERT INTO generated_images (
        user_id,
        prompt,
        description,
        category,
        subcategory,
        image_urls,
        created_at
      ) VALUES (
        ${String(neonUser.id)},
        ${heroPrompt},
        ${`Photoshoot: ${predictions.map((p) => p.title).join(", ")}`},
        ${category},
        ${conceptTitle},
        ${JSON.stringify({
          predictions: predictions,
          baseOutfit: photoshootPlan.extractedOutfit,
          status: "processing",
          total_images: NUM_IMAGES,
          base_seed: consistencySeed,
          hero_image: heroImageUrl,
          generation_type: "photoshoot_single_predictions",
          user_id: String(neonUser.id),
          custom_settings: finalSettings,
        })},
        NOW()
      )
      RETURNING id
    `

    const deductionResult = await deductCredits(
      neonUser.id,
      totalCreditsRequired,
      "image",
      `Photoshoot: ${conceptTitle} (${NUM_IMAGES} images)`,
      predictions[0].predictionId,
    )

    console.log("[v0] ✅ Photoshoot created with seed variations:", {
      totalImages: NUM_IMAGES,
      predictions: predictions.length,
      baseSeed: consistencySeed,
      seedRange: `${consistencySeed} to ${consistencySeed + NUM_IMAGES - 1}`,
      basePrompt: heroPrompt.substring(0, 80) + "...",
      creditsDeducted: totalCreditsRequired,
      newBalance: deductionResult.newBalance,
      ethnicity: ethnicity || "not specified",
      physicalPreferences: physicalPreferences || "not specified",
    })

    return NextResponse.json({
      success: true,
      photoshootId: insertResult[0].id,
      predictions: predictions,
      totalImages: NUM_IMAGES,
      baseOutfit: photoshootPlan.extractedOutfit,
      baseSeed: consistencySeed,
      creditsDeducted: totalCreditsRequired,
      newBalance: deductionResult.success ? deductionResult.newBalance : undefined,
      userId: String(neonUser.id),
    })
  } catch (error) {
    console.error("[v0] Error creating photoshoot:", error)
    return NextResponse.json(
      {
        error: "Failed to create photoshoot",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
