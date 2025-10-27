import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL || "")

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { conceptTitle, conceptDescription, conceptPrompt, category, chatId } = body

    console.log("[v0] Generating image for concept:", { conceptTitle, category })

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    console.log("[v0] Neon user ID:", neonUser.id)

    const userDataResult = await sql`
      SELECT 
        u.gender,
        um.trigger_word,
        um.replicate_version_id,
        um.training_status
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
    const triggerWord = userData.trigger_word || "person"
    const gender = userData.gender
    const replicateVersionId = userData.replicate_version_id

    console.log("[v0] User training data:", { triggerWord, gender, replicateVersionId })

    let finalPrompt = conceptPrompt

    if (!finalPrompt.toLowerCase().includes(triggerWord.toLowerCase())) {
      finalPrompt = `${triggerWord}, ${finalPrompt}`
    }

    const genderToken = gender === "woman" ? "woman" : gender === "man" ? "man" : "person"
    if (!finalPrompt.toLowerCase().includes(genderToken)) {
      finalPrompt = finalPrompt.replace(triggerWord, `${triggerWord}, ${genderToken}`)
    }

    console.log("[v0] Final FLUX prompt with user data:", finalPrompt)

    const qualitySettings =
      MAYA_QUALITY_PRESETS[category as keyof typeof MAYA_QUALITY_PRESETS] || MAYA_QUALITY_PRESETS.default

    console.log("[v0] Initializing Replicate client...")
    let replicate
    try {
      replicate = getReplicateClient()
      console.log("[v0] Replicate client initialized successfully")
    } catch (error) {
      console.error("[v0] Failed to initialize Replicate client:", error)
      return NextResponse.json(
        {
          error: "Replicate API configuration error",
          details:
            error instanceof Error
              ? error.message
              : "Please check your REPLICATE_API_TOKEN in the Vars section. Get a valid token from https://replicate.com/account/api-tokens",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Creating prediction with version:", replicateVersionId)
    console.log("[v0] Quality settings:", qualitySettings)

    const prediction = await replicate.predictions.create({
      version: replicateVersionId,
      input: {
        prompt: finalPrompt,
        ...qualitySettings,
      },
    })

    console.log("[v0] Replicate prediction started:", prediction.id)

    const insertResult = await sql`
      INSERT INTO generated_images (
        user_id,
        prompt,
        category,
        subcategory,
        image_urls,
        created_at
      ) VALUES (
        ${neonUser.id},
        ${finalPrompt},
        ${category},
        ${conceptTitle},
        ${JSON.stringify({ prediction_id: prediction.id, status: "processing" })},
        NOW()
      )
      RETURNING id
    `

    const generationId = insertResult[0].id

    return NextResponse.json({
      success: true,
      generationId,
      predictionId: prediction.id,
      status: "processing",
      fluxPrompt: finalPrompt,
    })
  } catch (error) {
    console.error("[v0] Error generating image:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const is401Error = errorMessage.includes("401") || errorMessage.includes("Unauthenticated")

    return NextResponse.json(
      {
        error: is401Error ? "Replicate authentication failed" : "Failed to generate image",
        details: is401Error
          ? "Your REPLICATE_API_TOKEN is invalid or expired. Please update it in the Vars section. Get a new token from https://replicate.com/account/api-tokens"
          : errorMessage,
      },
      { status: 500 },
    )
  }
}
