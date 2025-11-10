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
    // CONFIDENT STREET STYLE
    "She walks down the urban street with effortless confidence, mid-stride movement natural and fluid. One hand adjusts designer sunglasses as she glances back over her shoulder with a knowing look. Her coat flows behind her with each step, hair catching the breeze naturally. The energy is editorial street style - confident, intentional, magnetic. Overcast light creates that moody Instagram aesthetic. This is the kind of content that stops the scroll - real life luxury meets candid moment.",

    // COFFEE CULTURE MOMENT
    "Sitting casually on concrete steps with iced coffee in hand, she scrolls her phone then looks up with genuine warmth. A natural smile spreads across her face as she tilts her head slightly, hair falling over one shoulder. She takes a sip, the movement unhurried and authentic. The vibe is elevated casual - that perfect Instagram lifestyle moment captured in real time. Architectural shadows play across the scene, moody and minimal.",

    // QUIET LUXURY ELEGANCE
    "She stands against brutalist architecture, hand sliding into her oversized coat pocket as she shifts her weight naturally. Head turns slowly to reveal her profile in soft overcast light. Hair moves like silk with the motion, perfectly imperfect. Eyes connect with camera briefly - powerful, present, elevated. This is The Row energy, Toteme sophistication. Minimal, intentional, expensive-looking without trying. Pure high-end influencer aesthetic.",

    // ATHLEISURE CHIC MOVEMENT
    "Walking away from camera in chunky white sneakers and wide-leg pants, she looks back over her shoulder with a playful confidence. Baseball cap catches the light as she adjusts her crossbody bag naturally. Movement is casual but captivating - that effortless athleisure vibe mixing luxury and comfort. Urban concrete backdrop, moody lighting. This is how modern influencers move through cities.",

    // EDITORIAL POWER STANCE
    "She takes a slow, intentional breath, shoulders rolling back as she settles into her power pose against clean architecture. Gaze sweeps across then locks onto camera with striking intensity. Head tilts ever so slightly, expression shifting from contemplative to engaging. Every micro-movement screams editorial sophistication. This is high fashion meets authentic presence - aspirational yet genuinely human. Scroll-stopping luxury aesthetic.",

    // WINDOW LIGHT CONTEMPLATION
    "Standing by large windows with coffee cup in hand, soft natural light illuminating her profile. She turns slowly from the view to face camera, expression warm and inviting. Hair catches the morning light naturally. The moment feels intimate, like being let into a private morning ritual. Quiet luxury aesthetic with architectural interiors. That coveted golden hour content creators dream of.",

    // CASUAL SEATED CONFIDENCE
    "Sitting cross-legged on marble steps in oversized knitwear, she glances up from her phone with genuine engagement. One hand moves naturally through hair as she shifts position slightly. The movement is unhurried, authentic, magnetic. Sunglasses rest nearby, iced coffee on the step beside her. This is elevated casual lifestyle content - the kind that builds a following.",

    // URBAN MINIMALIST STRIDE
    "Mid-stride walking through concrete architecture, long coat flowing dramatically with purposeful movement. She adjusts something on her wrist - watch or bracelet - without breaking pace. Hair moves naturally with each confident step. The energy is unstoppable, ambitious, fashion-forward. Clean minimal backdrop, overcast moody lighting. GQ-level editorial content but for the Instagram age.",
  ]

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
