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
}: {
  basePrompt: string
  baseSeed: number
  triggerWord: string
  numImages: number
}) {
  console.log("[v0] 📸 Generating authentic lifestyle variations from original prompt...")
  console.log("[v0] Base prompt:", basePrompt)
  console.log("[v0] Base seed:", baseSeed)

  const mayaPrompt = `You are a professional photoshoot director creating an authentic "day in the life" Instagram carousel. Extract the exact outfit and styling from the original prompt, then create ${numImages} HIGHLY VARIED lifestyle variations with different poses, angles, AND scenery.

**ORIGINAL PROMPT:**
"${basePrompt}"

**CRITICAL: MAINTAIN THESE IN EVERY PROMPT:**
1. iPhone Photography: "shot on iPhone 15 Pro" (or specific iPhone model from original)
2. Lens Specs: "85mm lens" or "35mm lens" (match original or use appropriate for shot type)
3. Texture: "natural skin texture" (prevents over-smoothing)
4. Film Quality: "film grain" or "subtle grain" (authentic amateur quality)
5. Technical Details: "shallow depth of field, f/1.8" for portraits

**INSTAGRAM AUTHENTICITY (ALWAYS INCLUDE):**
- Shot on iPhone 15 Pro (or match original iPhone model)
- Natural skin texture (no over-smoothing)
- Film grain or subtle grain
- 85mm lens for close-ups, 35mm for full body
- Shallow depth of field, f/1.8-f/2.8
- Natural lighting details (golden hour, window light, overcast, etc.)

**TASK:**
1. Extract EXACT outfit/styling details from original (keep IDENTICAL - same clothes, hair, accessories)
2. Extract EXACT iPhone/camera specifications from original (keep these in EVERY prompt)
3. Identify the original location THEME (e.g., "Paris cafe area", "beach club", "city streets")
4. Identify the original lighting style (e.g., "soft window light", "golden hour", "overcast")
5. Create ${numImages} MAXIMALLY DIFFERENT authentic influencer lifestyle moments

**MANDATORY: EACH IMAGE MUST BE DRAMATICALLY DIFFERENT**
- DO NOT repeat similar actions (if one is "looking at phone", others can't be "checking phone")
- DO NOT repeat similar poses (if one is "standing", vary the next ones significantly)
- DO NOT repeat similar scenery (each must be a DIFFERENT location within the theme)
- MUST use diverse camera angles (don't repeat angles)
- MUST alternate between full body, medium, and close-up shots

**SHOT VARIETY (STRICTLY FOLLOW THIS MIX):**
- Image 1: Full body walking or moving → "35mm lens"
- Image 2: Close-up face/expression → "85mm lens, f/1.8, shallow depth of field"
- Image 3: Medium shot casual action → "50mm lens"
- Image 4: Full body different scenery → "35mm lens"
- Image 5: Close-up detail (hands, outfit) → "85mm lens, f/1.8"
- Image 6: Medium shot different action → "50mm lens"
- Image 7+: Alternate between full/medium/close

**REQUIRED AUTHENTIC ACTIONS (USE EACH ONLY ONCE - NO REPEATS):**
1. Looking at phone with neutral expression
2. Adjusting shoes or fixing sock
3. Walking with arms swinging naturally
4. Looking over shoulder while walking
5. Fixing hair or running hand through hair
6. Holding coffee cup, gazing into distance
7. Checking watch or time
8. Adjusting bag strap or rearranging bag
9. Standing against wall, looking away
10. Sitting casually on ledge or bench
11. Looking down at ground thoughtfully
12. Profile shot looking to the side
13. Brushing off clothing or adjusting jacket
14. Reaching for door handle
15. Mid-stride walking away from camera

**SCENERY VARIETY (EACH MUST BE DIFFERENT LOCATION):**
Within the same theme area, use COMPLETELY DIFFERENT spots:
- In front of storefront window
- Walking past outdoor cafe tables
- Against colorful door or wall
- On cobblestone street corner
- Near flower stand or market stall
- By fountain or architectural feature
- Under awning or archway
- At intersection crossing
- By park entrance or greenery
- Near vintage lamppost or street sign

**CAMERA ANGLE VARIETY (ROTATE THROUGH THESE):**
- Straight on eye level
- Profile from the side
- Three-quarter angle
- From slightly above
- From below looking up
- Over the shoulder perspective
- Wide environmental shot
- Tight intimate framing

**AVOID AT ALL COSTS:**
- Smiling or laughing (feels staged)
- Direct eye contact (too posed)
- Repeated actions (each must be unique)
- Similar poses (maximize difference)
- Same camera angles (vary constantly)
- Peace signs or hand gestures

**OUTPUT FORMAT (JSON):**

\`\`\`json
{
  "baseOutfit": "exact outfit description from original - include every detail",
  "locationTheme": "the general area/theme",
  "lightingStyle": "exact lighting from original (soft window light, golden hour, etc.)",
  "cameraSpecs": "iPhone model and lens details from original",
  "poses": [
    {
      "title": "Adjusting Shoe by Storefront",
      "shotType": "full body | medium | close-up",
      "scenery": "SPECIFIC and UNIQUE location (different from all others)",
      "action": "SPECIFIC and UNIQUE action (different from all others - NO smiling)",
      "cameraAngle": "UNIQUE angle (different from previous poses)",
      "lensChoice": "35mm | 50mm | 85mm (based on shot type)",
      "prompt": "${triggerWord}, [gender], wearing the exact same [COMPLETE outfit], [UNIQUE scenery], [UNIQUE action - NO smiling], [UNIQUE camera angle], [lighting style], shot on iPhone 15 Pro, [lens choice], natural skin texture, film grain, shallow depth of field, f/1.8"
    }
  ]
}
\`\`\`

**CRITICAL REQUIREMENTS:**
- EVERY image must have a COMPLETELY DIFFERENT action/pose
- EVERY image must be in a DIFFERENT location/scenery
- EVERY image must use a DIFFERENT camera angle
- NO TWO IMAGES should look similar
- Create MAXIMUM VARIETY while keeping outfit/styling identical
- Make it feel like scrolling through an influencer's diverse lifestyle content
- Think: "What would make someone swipe through the full carousel?"

Generate ${numImages} MAXIMALLY DIFFERENT variations now with ALL technical photography details.`

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4",
    prompt: mayaPrompt,
    maxOutputTokens: 2000,
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("No JSON found in Maya response")
  }

  const photoshootPlan = JSON.parse(jsonMatch[0])
  
  console.log("[v0] 📸 Lifestyle variations created:", {
    baseOutfit: photoshootPlan.baseOutfit.substring(0, 50) + "...",
    locationTheme: photoshootPlan.locationTheme,
    numPoses: photoshootPlan.poses.length,
  })

  return photoshootPlan
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
    const { heroImageUrl, heroPrompt, heroSeed, conceptTitle, conceptDescription, category, chatId } = body

    if (!heroImageUrl || !heroPrompt) {
      return NextResponse.json({ error: "Hero image and prompt are required" }, { status: 400 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    const NUM_IMAGES = Math.floor(Math.random() * 4) + 6 // Random between 6-9
    const totalCreditsRequired = CREDIT_COSTS.IMAGE * NUM_IMAGES

    console.log("[v0] 📸 Creating photoshoot from original image:", {
      numImages: NUM_IMAGES,
      originalPrompt: heroPrompt.substring(0, 100) + "...",
      originalSeed: heroSeed,
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
        um.trigger_word,
        um.replicate_version_id,
        um.replicate_model_id,
        um.training_status,
        um.lora_scale,
        um.lora_weights_url
      FROM users u
      LEFT JOIN user_models um ON u.id = um.user_id
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
    
    console.log("[v0] 📸 Using seed for all images:", consistencySeed)

    const photoshootPlan = await generatePhotoshootPoseVariations({
      basePrompt: heroPrompt,
      baseSeed: consistencySeed,
      triggerWord,
      numImages: NUM_IMAGES,
    })

    const replicate = getReplicateClient()
    const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
    const categoryKey = category as keyof typeof MAYA_QUALITY_PRESETS
    const presetSettings = MAYA_QUALITY_PRESETS[categoryKey] || MAYA_QUALITY_PRESETS.default

    const REALISM_LORA_URL = "https://huggingface.co/strangerzonehf/Flux-Super-Realism-LoRA/resolve/main/super-realism.safetensors"
    const REALISM_LORA_SCALE = 0.4 // Lowered from 0.6 to 0.4 to improve face likeness - user's custom LoRA now has more influence
    console.log("[v0] 📸 Using user's trained LoRA + Super Realism LoRA (0.4 scale)")

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
    }> = []

    console.log("[v0] 📸 Creating", NUM_IMAGES, "predictions SEQUENTIALLY with SAME seed:", consistencySeed)

    for (let i = 0; i < NUM_IMAGES; i++) {
      const pose = photoshootPlan.poses[i]

      console.log(`[v0] 📸 Creating Image ${i + 1}/${NUM_IMAGES}:`, {
        title: pose.title,
        seed: consistencySeed,
        shotType: pose.shotType,
        scenery: pose.scenery,
        promptPreview: pose.prompt.substring(0, 100) + "...",
      })

      const prediction = await replicate.predictions.create({
        version: replicateVersionId,
        input: {
          prompt: pose.prompt,
          guidance_scale: presetSettings.guidance_scale,
          num_inference_steps: presetSettings.num_inference_steps,
          aspect_ratio: "4:5",
          megapixels: presetSettings.megapixels,
          output_format: presetSettings.output_format,
          output_quality: presetSettings.output_quality,
          lora_scale: Number(userLoraScale || presetSettings.lora_scale),
          hf_lora: userLoraPath,
          extra_lora: REALISM_LORA_URL,
          extra_lora_scale: REALISM_LORA_SCALE,
          seed: consistencySeed, // SAME seed for all images
          disable_safety_checker: true,
          go_fast: false,
          num_outputs: 1,
          model: "dev",
        },
      })

      predictions.push({
        predictionId: prediction.id,
        title: pose.title,
        description: pose.action,
        pose: pose.action,
        location: pose.scenery,
        seed: consistencySeed,
        index: i,
        shotDistance: pose.shotType,
      })

      console.log(`[v0] ✅ Prediction ${i + 1} created:`, prediction.id)

      if (i < NUM_IMAGES - 1) {
        console.log(`[v0] ⏳ Waiting 5 seconds before creating next prediction...`)
        await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second delay between predictions
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
        ${`Photoshoot: ${predictions.map(p => p.title).join(", ")}`},
        ${category},
        ${conceptTitle},
        ${JSON.stringify({
          predictions: predictions,
          baseOutfit: photoshootPlan.baseOutfit,
          status: "processing",
          total_images: NUM_IMAGES,
          consistency_seed: consistencySeed,
          hero_image: heroImageUrl,
          generation_type: "photoshoot_single_predictions",
          user_id: String(neonUser.id), // Include user_id for gallery saves
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

    console.log("[v0] ✅ Photoshoot created with consistency:", {
      totalImages: NUM_IMAGES,
      predictions: predictions.length,
      consistencySeed: consistencySeed,
      basePrompt: heroPrompt.substring(0, 80) + "...",
      creditsDeducted: totalCreditsRequired,
      newBalance: deductionResult.newBalance,
    })

    return NextResponse.json({
      success: true,
      photoshootId: insertResult[0].id,
      predictions: predictions,
      totalImages: NUM_IMAGES,
      baseOutfit: photoshootPlan.baseOutfit,
      consistencySeed: consistencySeed,
      creditsDeducted: totalCreditsRequired,
      newBalance: deductionResult.success ? deductionResult.newBalance : undefined,
      userId: String(neonUser.id), // Return user_id for gallery saves
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
