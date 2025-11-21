import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

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
  console.log("[v0] 📸 Generating authentic lifestyle variations with Claude Sonnet 4.5...")
  console.log("[v0] Base prompt:", basePrompt)
  console.log("[v0] Base seed:", baseSeed)

  const mayaPrompt = `You are Maya, creating an authentic "day in the life" Instagram carousel for SSELFIE Studio. 

**ORIGINAL CONCEPT PROMPT:**
"${basePrompt}"

**⚠️ CRITICAL: Prompt Length Optimization for Face Preservation**

Each variation prompt must be 30-40 words to preserve facial likeness. The user's trained LoRA knows their face - don't dilute the trigger word with excessive details!

**Word Economy Guidelines:**
- Outfit: Use SAME concise description from original (2-4 words per item)
- Action: Simple, natural (2-4 words)
- Location: Specific spot variation (2-3 words)
- Lighting: Brief (1-2 words if needed)
- Technical specs: "shot on iPhone 15 Pro, [lens], natural skin texture, film grain" (10 words - mandatory)

**YOUR MISSION:**

Analyze the original prompt to extract:
1. **Core outfit** (keep descriptions concise: "black corset top, ice blue jeans" not full details)
2. **Location type** (cafe, street, beach, etc.)
3. **Vibe & aesthetic** (use 1-2 keywords max)
4. **Lighting style** (1-2 words)

Then create ${numImages} VARIED POSES for ONE cohesive photoshoot session:
- SAME outfit in every variation (use concise description)
- SAME location type (vary specific spots only)
- SAME overall aesthetic
- ONLY poses, angles, and activities change

**Photoshoot Variation Strategy:**

Think like a real influencer shooting ${numImages} photos in one location:
- Wide establishing shot
- Medium detail shots
- Close-up moments  
- Different angles (straight, side, over shoulder)
- Natural activities (sipping, walking, checking phone, adjusting outfit)
- Candid captures

**PROMPT LENGTH TARGET: 30-40 words per variation**

**Structure for Each Variation:**
"${triggerWord}, person in [outfit_concise_same_for_all], [specific_action], [location_spot_variation], [lighting_brief], [aesthetic_keyword], shot on iPhone 15 Pro, [lens], natural skin texture, film grain, [optional_depth]"

**Example Variation (35 words):**
"${triggerWord}, woman in black corset top, ice blue wide-leg jeans, bringing coffee to lips at cafe counter, soft window light from left, candid moment, shot on iPhone 15 Pro, 85mm, natural skin texture, film grain, shallow depth"

**CRITICAL RULES:**
- Each prompt 30-40 words
- Keep outfit description brief and IDENTICAL across all
- Vary only: action, specific spot, camera angle
- NO long-winded descriptions
- NO "beautiful", "stunning", "gorgeous" filler words
- Use word economy!

**OUTPUT - RETURN ONLY THIS JSON:**

{
  "baseOutfit": "concise outfit from original (10 words max)",
  "locationTheme": "general area type",
  "lightingStyle": "brief lighting description",
  "cameraSpecs": "iPhone 15 Pro + lens range",
  "poses": [
    {
      "title": "Brief Pose Name",
      "shotType": "full body" | "medium shot" | "close-up",
      "scenery": "specific spot within location",
      "action": "simple activity (5 words max)",
      "cameraAngle": "straight on" | "side angle" | "over shoulder" | "slightly above",
      "lensChoice": "35mm" | "50mm" | "85mm",
      "prompt": "${triggerWord}, person, [concise_outfit], [action], [scenery_spot], [lighting_brief], [aesthetic], shot on iPhone 15 Pro, [lens], natural skin texture, film grain, [optional_depth]"
    }
  ]
}

**Word Count Check:**
After generating each prompt, count the words. Target 30-40, never exceed 45.

Generate ${numImages} varied poses with CONCISE prompts that preserve facial likeness. Return ONLY valid JSON.`

  const { text } = await generateText({
    model: anthropic("claude-3-5-sonnet-20241022"),
    prompt: mayaPrompt,
    temperature: 0.85,
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
      baseOutfit: photoshootPlan.baseOutfit?.substring(0, 50) + "...",
      locationTheme: photoshootPlan.locationTheme,
      numPoses: photoshootPlan.poses?.length,
    })

    if (!photoshootPlan.poses || photoshootPlan.poses.length === 0) {
      throw new Error("No poses generated in response")
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

    const REALISM_LORA_URL =
      "https://huggingface.co/strangerzonehf/Flux-Super-Realism-LoRA/resolve/main/super-realism.safetensors"
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

      let retries = 0
      const maxRetries = 3
      let prediction: any = null

      while (retries < maxRetries) {
        try {
          prediction = await replicate.predictions.create({
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
          break // Success, exit retry loop
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
            throw error // Non-rate-limit error, throw immediately
          }
        }
      }

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
        console.log(`[v0] ⏳ Waiting 11 seconds before creating next prediction...`)
        await new Promise((resolve) => setTimeout(resolve, 11000)) // 11 seconds between predictions
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
