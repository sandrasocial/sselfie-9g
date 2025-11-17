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

  const mayaPrompt = `You are a professional photoshoot director creating an authentic "day in the life" Instagram carousel. Extract the exact outfit and styling from the original prompt, then create ${numImages} lifestyle variations with different poses, angles, AND scenery.

**ORIGINAL PROMPT:**
"${basePrompt}"

**TASK:**
1. Extract EXACT outfit/styling details from original (keep IDENTICAL - same clothes, hair, accessories)
2. Identify the original location THEME (e.g., "Paris cafe area", "beach club", "city streets")
3. Create ${numImages} authentic influencer lifestyle moments with:
   - Same outfit & styling (consistency anchor)
   - Varied scenery within the same theme (different spots in the area)
   - Different poses and camera angles
   - Natural, candid actions and movements

**SHOT VARIETY (use this mix):**
- 2 full body shots (walking, standing, sitting)
- 2 medium shots (waist up, three-quarter angle)
- 2 close-up shots (shoulders up, face focus)

**AUTHENTIC ACTIONS/MOMENTS:**
- Walking across street, past storefront, between tables
- Standing against wall, by window, adjusting outfit
- Sitting at table with coffee/phone, on steps
- Profile shots captured mid-stride or looking away
- Playful candid moments (laughing, fixing hair, looking at phone)

**OUTPUT FORMAT (JSON):**

\`\`\`json
{
  "baseOutfit": "exact outfit description from original - include every detail",
  "locationTheme": "the general area/theme",
  "poses": [
    {
      "title": "Walking Past Storefront",
      "shotType": "full body | medium | close-up",
      "scenery": "specific location variation within theme",
      "action": "specific pose/movement/gesture",
      "cameraAngle": "straight on | profile | three-quarter | from above | etc",
      "prompt": "${triggerWord}, [gender], wearing the exact same [COMPLETE outfit from original with ALL details], [scenery description], [specific action/pose], [camera angle], [same lighting style and camera from original]"
    }
  ]
}
\`\`\`

**IMPORTANT:**
- Keep prompts 50-70 words, similar to original style
- Use EXACT same outfit details in every prompt
- Vary ONLY: scenery location, pose/action, camera angle
- Make it feel like authentic lifestyle content, not staged photoshoot
- Include natural details like "hair flowing from movement", "bag swaying", "looking at phone"

Generate ${numImages} variations now.`

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

    console.log("[v0] 📸 Using ONLY user's trained LoRA (no extra_lora)")

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

    console.log("[v0] 📸 Creating", NUM_IMAGES, "predictions with SAME seed:", consistencySeed)

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
        await new Promise(resolve => setTimeout(resolve, 100))
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
        ${neonUser.id},
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
