import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits"
import { getAuthenticatedUser } from "@/lib/auth-helper"

const sql = neon(process.env.DATABASE_URL || "")

function enhanceMotionPrompt(userPrompt: string | undefined, imageDescription?: string): string {
  // If user provided a creative motion prompt, use it directly
  if (userPrompt && userPrompt !== "natural movement, cinematic motion" && userPrompt.length > 20) {
    return userPrompt
  }

  const storyDrivenPrompts = [
    // CONFIDENT & POWERFUL
    "She locks eyes with the camera, her gaze unwavering and magnetic. A slow, confident smile spreads across her face as she tilts her chin up slightly, owning her space. Her shoulders roll back naturally, chest rising with a deep, powerful breath. Hair catches movement, flowing with intention as she shifts her weight. The energy is commanding yet effortless - this is someone who knows exactly who she is. Her presence fills the frame, radiating quiet power and unshakeable confidence that stops the scroll instantly.",

    // PLAYFUL & MAGNETIC
    "A spontaneous laugh bubbles up as she glances away, then back with sparkling eyes and a mischievous grin. Her head tilts playfully to one side, hair cascading naturally as she moves. She bites her lip briefly, suppressing a smile that breaks through anyway. Her whole energy is infectious - carefree, joyful, magnetic. Shoulders lift in a light, teasing shrug. The moment feels stolen, candid, like catching someone in their most genuine, playful state. Pure charisma that makes you want to know their story.",

    // MYSTERIOUS & ALLURING
    "She turns her head slowly, deliberately, revealing her profile in dramatic shadows and light. Eyes half-lidded, she looks back over her shoulder with an enigmatic expression that hints at secrets untold. Her breathing is slow, measured, creating subtle chest movement. Hair flows like silk as she moves through the moment. There's an intensity here - captivating, hypnotic, impossible to look away from. The mood is cinematic, like a pivotal scene where everything changes. Scroll-stopping mystery.",

    // EDITORIAL & ELEVATED
    "Her gaze sweeps across the scene with editorial precision, then lands directly on camera with striking intensity. She takes a slow, intentional breath, posture elongating naturally as she settles into her power. Hair moves as if styled by an invisible wind, perfectly tousled. Her expression transitions from contemplative to engaging - subtle but transformative. Every micro-movement is purposeful, elevated, sophisticated. This is high fashion energy meeting authentic presence. The moment feels luxurious, aspirational, yet genuinely human.",

    // SOFT & INTIMATE
    "She closes her eyes briefly, a peaceful smile forming as she breathes deeply, savoring the moment. When her eyes open, there's warmth and vulnerability - a genuine, tender expression. Her head tilts gently, hair falling naturally across one shoulder. Lips part slightly as if about to share something meaningful. The movement is subtle, intimate, like being let into a private moment of joy or reflection. Soft, authentic, deeply relatable. The kind of human connection that makes people pause and feel something real.",

    // BOLD & EDGY
    "She whips her head around sharply, hair flying dramatically as her expression shifts to bold confidence. Eyes narrow with fierce determination, jaw set with attitude. A smirk plays at the corners of her mouth - she knows she's got it. Her breathing quickens slightly, energy ramping up. This is unapologetic, boundary-pushing presence. She owns every second, every angle, every frame. The vibe is rebellious luxury, fashion-forward edge. Impossible to scroll past without stopping to stare.",

    // DREAMY & CINEMATIC
    "Soft morning light catches her profile as she turns slowly, lost in thought, eyes distant and dreamy. A gentle breeze moves her hair in slow, romantic waves. She bites her lip softly, a small smile emerging as if remembering something beautiful. Her breathing is deep and peaceful, chest rising and falling rhythmically. The moment feels suspended in time - ethereal, poetic, like a memory you can't quite place but makes you feel everything. Pure cinematic magic that commands attention.",

    // FIERCE & UNSTOPPABLE
    "She strides forward with purpose, each step radiating unstoppable energy and determination. Her jaw is set, eyes laser-focused ahead with fierce intensity. Hair flows dramatically behind her with the motion. She doesn't just walk - she conquers space. A slight smirk crosses her face, confidence radiating from every movement. This is power in motion, ambition visualized, strength personified. The energy is electric, dynamic, absolutely magnetic. You can't look away from someone moving through the world like this.",
  ]

  // Select a random story-driven prompt for variety
  const selectedPrompt = storyDrivenPrompts[Math.floor(Math.random() * storyDrivenPrompts.length)]

  return selectedPrompt
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      console.log("[v0] ❌ No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { imageUrl, imageId, motionPrompt, imageDescription } = body

    console.log("[v0] ========== VIDEO GENERATION REQUEST ==========")
    console.log("[v0] User ID:", user.id)
    console.log("[v0] Image URL:", imageUrl)
    console.log("[v0] Image ID:", imageId)
    console.log("[v0] Motion prompt:", motionPrompt)
    console.log("[v0] Image description:", imageDescription)
    console.log("[v0] ================================================")

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      console.log("[v0] ❌ User not found in Neon database")
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    console.log("[v0] ✅ Neon user found:", neonUser.id)

    const hasEnoughCredits = await checkCredits(neonUser.id, CREDIT_COSTS.ANIMATION)
    if (!hasEnoughCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: CREDIT_COSTS.ANIMATION,
          message: `Video generation requires ${CREDIT_COSTS.ANIMATION} credits. Please purchase more credits or upgrade your plan.`,
        },
        { status: 402 },
      )
    }

    // Get user's trained LoRA model
    const userDataResult = await sql`
      SELECT 
        um.lora_weights_url,
        um.trigger_word,
        um.training_status
      FROM user_models um
      WHERE um.user_id = ${neonUser.id}
      AND um.training_status = 'completed'
      ORDER BY um.created_at DESC
      LIMIT 1
    `

    console.log("[v0] ========== DATABASE QUERY RESULT ==========")
    console.log("[v0] Query returned rows:", userDataResult.length)
    if (userDataResult.length > 0) {
      console.log("[v0] User model data:", JSON.stringify(userDataResult[0], null, 2))
    }
    console.log("[v0] ================================================")

    if (userDataResult.length === 0) {
      console.log("[v0] ❌ No trained model found for user")
      return NextResponse.json({ error: "No trained model found. Please complete training first." }, { status: 400 })
    }

    const userData = userDataResult[0]
    const loraWeightsUrl = userData.lora_weights_url

    if (!loraWeightsUrl || loraWeightsUrl.trim() === "") {
      console.log("[v0] ❌ LoRA weights URL is null or empty")
      console.log("[v0] User data:", JSON.stringify(userData, null, 2))
      return NextResponse.json({ error: "LoRA weights URL not found. Please retrain your model." }, { status: 400 })
    }

    console.log("[v0] ========== USER LORA DATA ==========")
    console.log("[v0] ✅ LoRA weights URL:", loraWeightsUrl)
    console.log("[v0] Trigger word:", userData.trigger_word)
    console.log("[v0] Training status:", userData.training_status)
    console.log("[v0] ========================================")

    const replicate = getReplicateClient()

    const predictionInput = {
      image: imageUrl,
      prompt: enhanceMotionPrompt(motionPrompt, imageDescription),
      resolution: "720p", // 720p for better quality (1280x720), 480p for faster generation (832x480)
      go_fast: true, // Enable fast generation mode
      num_frames: 101, // 6.25 seconds (101 frames) - optimal for scroll-stopping engagement
      frames_per_second: 16, // Standard frame rate (pricing based on this)
      sample_shift: 12, // Sample shift factor for quality (default: 12, range: 1-20)
      interpolate_output: true, // Interpolate to 30 FPS for smooth playback
      disable_safety_checker: false, // Keep safety checker enabled
      lora_weights_transformer: loraWeightsUrl, // HIGH transformer LoRA for character consistency
      lora_weights_transformer_2: loraWeightsUrl, // LOW transformer_2 LoRA for character consistency
      lora_scale_transformer: 1.3, // Increased LoRA strength from 1.0 to 1.3 for stronger character consistency in videos
      lora_scale_transformer_2: 1.3,
    }

    console.log("[v0] ========== WAN-2.2-I2V-FAST INPUT ==========")
    console.log("[v0] Model: wan-video/wan-2.2-i2v-fast")
    console.log("[v0] Image URL:", predictionInput.image)
    console.log("[v0] Enhanced motion prompt:", predictionInput.prompt)
    console.log("[v0] Resolution:", predictionInput.resolution)
    console.log("[v0] Go fast:", predictionInput.go_fast)
    console.log("[v0] Num frames:", predictionInput.num_frames, "(6.25 seconds for scroll-stopping engagement)")
    console.log("[v0] FPS:", predictionInput.frames_per_second)
    console.log("[v0] Sample shift:", predictionInput.sample_shift)
    console.log("[v0] Interpolate output:", predictionInput.interpolate_output)
    console.log("[v0] ✅ LoRA weights (transformer):", predictionInput.lora_weights_transformer)
    console.log("[v0] ✅ LoRA weights (transformer_2):", predictionInput.lora_weights_transformer_2)
    console.log(
      "[v0] ✅ LoRA scale (transformer):",
      predictionInput.lora_scale_transformer,
      "(1.3 for strong character consistency)",
    )
    console.log(
      "[v0] ✅ LoRA scale (transformer_2):",
      predictionInput.lora_scale_transformer_2,
      "(1.3 for strong character consistency)",
    )
    console.log("[v0] Full prediction input:", JSON.stringify(predictionInput, null, 2))
    console.log("[v0] ================================================")

    const prediction = await replicate.predictions.create({
      model: "wan-video/wan-2.2-i2v-fast",
      input: predictionInput,
    })

    console.log("[v0] ========== REPLICATE VIDEO RESPONSE ==========")
    console.log("[v0] ✅ Prediction created successfully")
    console.log("[v0] Prediction ID:", prediction.id)
    console.log("[v0] Prediction status:", prediction.status)
    console.log("[v0] Full prediction:", JSON.stringify(prediction, null, 2))
    console.log("[v0] ================================================")

    await deductCredits(neonUser.id, CREDIT_COSTS.ANIMATION, "animation", `Animated image: ${imageId}`)
    console.log("[v0] Deducted", CREDIT_COSTS.ANIMATION, "credits for video generation")

    // Store video generation in database
    const insertResult = await sql`
      INSERT INTO generated_videos (
        user_id,
        image_id,
        image_source,
        motion_prompt,
        job_id,
        status,
        progress,
        created_at
      ) VALUES (
        ${neonUser.id},
        ${imageId},
        ${imageUrl},
        ${predictionInput.prompt},
        ${prediction.id},
        'processing',
        0,
        NOW()
      )
      RETURNING id
    `

    const videoId = insertResult[0].id

    console.log("[v0] ✅ Video record created in database, ID:", videoId)

    return NextResponse.json({
      success: true,
      videoId,
      predictionId: prediction.id,
      status: "processing",
      estimatedTime: "40-60 seconds",
      creditsDeducted: CREDIT_COSTS.ANIMATION,
    })
  } catch (error) {
    console.error("[v0] ========== VIDEO GENERATION ERROR ==========")
    console.error("[v0] ❌ Error:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    console.error("[v0] ================================================")

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json(
      {
        error: "Failed to generate video",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
