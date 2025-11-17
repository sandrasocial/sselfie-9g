import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkCredits, deductCredits, getUserCredits, CREDIT_COSTS } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { rateLimit } from "@/lib/rate-limit-api"

const sql = getDbClient()

const STORYTELLING_SEQUENCES = {
  cafe: [
    "sitting at outdoor cafe table with espresso cup, hand resting on cup naturally, looking away candidly",
    "standing up from table, grabbing designer handbag from chair, mid-motion capture",
    "walking on cobblestone street outside cafe, natural confident stride, candid street shot",
    "sitting indoors at a cafe table with a laptop, looking focused and relaxed",
  ],
  street: [
    "leaning casually against urban wall, one foot crossed naturally, relaxed influencer pose",
    "walking down city street mid-stride, natural movement, authentic street style capture",
    "pausing on sidewalk, adjusting sunglasses naturally, candid urban lifestyle moment",
    "standing in front of a graffiti wall, looking contemplative and cool",
  ],
  indoor: [
    "sitting elegantly on modern furniture, legs crossed naturally, soft window lighting",
    "standing by large window looking outside, natural contemplative pose, editorial feel",
    "walking through interior space, mid-motion capture, elegant lifestyle aesthetic",
    "sitting on a couch with a book, looking calm and content",
  ],
  outdoor: [
    "standing in natural outdoor setting, soft breeze in hair, looking away naturally",
    "walking on outdoor path mid-stride, authentic movement capture, natural environment",
    "sitting relaxed in natural setting, engaged with surroundings, peaceful lifestyle moment",
    "laying on grass with a picnic blanket, looking happy and carefree",
  ],
}

function detectLocationStyle(prompt: string): keyof typeof STORYTELLING_SEQUENCES {
  const promptLower = prompt.toLowerCase()
  if (promptLower.includes("cafe") || promptLower.includes("coffee") || promptLower.includes("restaurant"))
    return "cafe"
  if (promptLower.includes("street") || promptLower.includes("urban") || promptLower.includes("city")) return "street"
  if (promptLower.includes("indoor") || promptLower.includes("room") || promptLower.includes("interior"))
    return "indoor"
  return "outdoor"
}

function extractOutfitDetails(prompt: string): string {
  const removePatterns = [
    /\b(sitting|standing|walking|looking|holding|grabbing|adjusting|leaning|crossing|pausing|turning|checking|resting|preparing|mid-motion|capture)\b[^,.]*/gi,
    /\bat\s+(outdoor\s+)?cafe\s+table[^,.]*/gi,
    /\bon\s+(cobblestone\s+)?street[^,.]*/gi,
    /\bwith\s+(espresso\s+)?cup[^,.]*/gi,
    /\bfrom\s+table[^,.]*/gi,
    /\bwhile\s+walking[^,.]*/gi,
    /\bover\s+shoulder[^,.]*/gi,
  ]
  
  let cleanedPrompt = prompt
  removePatterns.forEach(pattern => {
    cleanedPrompt = cleanedPrompt.replace(pattern, '')
  })
  
  cleanedPrompt = cleanedPrompt
    .replace(/,\s*,+/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/,\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
  
  if (cleanedPrompt.startsWith(',')) cleanedPrompt = cleanedPrompt.substring(1).trim()
  if (cleanedPrompt.endsWith(',')) cleanedPrompt = cleanedPrompt.substring(0, cleanedPrompt.length - 1).trim()
  
  return cleanedPrompt || "stylish outfit, natural aesthetic"
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
    const { heroImageUrl, heroPrompt, conceptTitle, conceptDescription, category, chatId } = body

    if (!heroImageUrl || !heroPrompt) {
      return NextResponse.json({ error: "Hero image and prompt are required" }, { status: 400 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    const IMAGES_PER_BATCH = 3
    const NUM_BATCHES = 2
    const TOTAL_IMAGES = IMAGES_PER_BATCH * NUM_BATCHES
    const totalCreditsRequired = CREDIT_COSTS.IMAGE * TOTAL_IMAGES

    const locationType = detectLocationStyle(heroPrompt)
    const storySequence = STORYTELLING_SEQUENCES[locationType]

    console.log("[v0] 📸 Creating photoshoot with seed reuse strategy:", {
      locationType,
      imagesPerBatch: IMAGES_PER_BATCH,
      numBatches: NUM_BATCHES,
      totalImages: TOTAL_IMAGES
    })

    const hasEnoughCredits = await checkCredits(neonUser.id, totalCreditsRequired)

    if (!hasEnoughCredits) {
      const currentBalance = await getUserCredits(neonUser.id)
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: totalCreditsRequired,
          current: currentBalance,
          message: `Photoshoot creation requires ${totalCreditsRequired} credits (${TOTAL_IMAGES} images). You have ${currentBalance} credits. Please purchase more credits.`,
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

    console.log("[v0] 📸 Creating photoshoot with batch generation:", {
      locationType,
      imagesPerBatch: IMAGES_PER_BATCH,
      totalImages: TOTAL_IMAGES
    })

    const outfitDetails = extractOutfitDetails(heroPrompt)
    console.log("[v0] 📸 Base outfit details:", outfitDetails)

    const baseSeed = Math.floor(Math.random() * 1000000)
    const seeds = [baseSeed, baseSeed + 1, baseSeed + 2] // Only 3 seeds for maximum consistency
    
    const replicate = getReplicateClient()
    const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
    const categoryKey = category as keyof typeof MAYA_QUALITY_PRESETS
    const presetSettings = MAYA_QUALITY_PRESETS[categoryKey] || MAYA_QUALITY_PRESETS.default

    const negativePrompt = "different outfit, clothing change, different clothes, wardrobe change, different accessories, different jewelry, outfit variation, style inconsistency, multiple people, duplicate person, different hairstyle, hair color change"

    const batch1Actions = storySequence.slice(0, IMAGES_PER_BATCH)
    const batch2Actions = storySequence.slice(IMAGES_PER_BATCH, IMAGES_PER_BATCH * 2)
    
    const batch1Prompt = `${outfitDetails}, photoshoot sequence: ${batch1Actions[0]}; next shot: ${batch1Actions[1]}; next shot: ${batch1Actions[2]}, natural lighting, professional photography, shot on iPhone 15, 8K quality, natural skin texture, lifestyle aesthetic`

    console.log(`[v0] 📸 Batch 1 (3 images):`, { seed: baseSeed, actions: batch1Actions })

    const batch1Prediction = await replicate.predictions.create({
      version: replicateVersionId,
      input: {
        prompt: batch1Prompt,
        negative_prompt: negativePrompt,
        guidance_scale: presetSettings.guidance_scale,
        num_inference_steps: presetSettings.num_inference_steps,
        aspect_ratio: presetSettings.aspect_ratio,
        megapixels: presetSettings.megapixels,
        output_format: presetSettings.output_format,
        output_quality: presetSettings.output_quality,
        lora_scale: Number(userLoraScale || presetSettings.lora_scale),
        hf_lora: userLoraPath,
        seed: baseSeed, // Replicate will auto-increment to baseSeed+1, baseSeed+2
        disable_safety_checker: true,
        go_fast: false,
        num_outputs: 3, // Generate 3 images in one call
        model: "dev",
      },
    })

    const batch2Prompt = `${outfitDetails}, photoshoot sequence: ${batch2Actions[0]}; next shot: ${batch2Actions[1]}; next shot: ${batch2Actions[2]}, natural lighting, professional photography, shot on iPhone 15, 8K quality, natural skin texture, lifestyle aesthetic`

    console.log(`[v0] 📸 Batch 2 (3 images, REUSING seeds):`, { seed: baseSeed, actions: batch2Actions })

    const batch2Prediction = await replicate.predictions.create({
      version: replicateVersionId,
      input: {
        prompt: batch2Prompt,
        negative_prompt: negativePrompt,
        guidance_scale: presetSettings.guidance_scale,
        num_inference_steps: presetSettings.num_inference_steps,
        aspect_ratio: presetSettings.aspect_ratio,
        megapixels: presetSettings.megapixels,
        output_format: presetSettings.output_format,
        output_quality: presetSettings.output_quality,
        lora_scale: Number(userLoraScale || presetSettings.lora_scale),
        hf_lora: userLoraPath,
        seed: baseSeed, // REUSE same baseSeed for outfit consistency
        disable_safety_checker: true,
        go_fast: false,
        num_outputs: 3, // Generate 3 images in one call
        model: "dev",
      },
    })

    const batches = [
      {
        predictionId: batch1Prediction.id,
        actions: batch1Actions,
        seeds: [baseSeed, baseSeed + 1, baseSeed + 2],
        batchIndex: 0,
      },
      {
        predictionId: batch2Prediction.id,
        actions: batch2Actions,
        seeds: [baseSeed, baseSeed + 1, baseSeed + 2], // Same seeds reused
        batchIndex: 1,
      },
    ]

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
        ${`${outfitDetails}, photoshoot sequence`},
        ${`Photoshoot: ${[...batch1Actions, ...batch2Actions].join(", ")}`},
        ${category},
        ${conceptTitle},
        ${JSON.stringify({
          batches: batches,
          status: "processing",
          total_images: TOTAL_IMAGES,
          seeds: seeds,
          hero_image: heroImageUrl,
        })},
        NOW()
      )
      RETURNING id
    `

    const deductionResult = await deductCredits(
      neonUser.id,
      totalCreditsRequired,
      "image",
      `Photoshoot: ${conceptTitle} (${TOTAL_IMAGES} images)`,
      batch1Prediction.id,
    )

    console.log("[v0] ✅ Photoshoot created with batch generation and seed reuse:", {
      totalImages: TOTAL_IMAGES,
      numBatches: batches.length,
      seeds: seeds,
      batch1Actions: batch1Actions,
      batch2Actions: batch2Actions,
      creditsDeducted: totalCreditsRequired,
      newBalance: deductionResult.newBalance,
    })

    return NextResponse.json({
      success: true,
      photoshootId: Date.now(),
      batches: batches,
      totalImages: TOTAL_IMAGES,
      locationType: locationType,
      seeds: seeds,
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
