import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@supabase/ssr"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { generateWithNanoBanana, getStudioProCreditCost } from "@/lib/nano-banana-client"
import { deductCredits } from "@/lib/credits"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    
    // Authenticate user
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUserId = await getUserIdFromSupabase(user.id)

    // Get request data
    const {
      sceneId,
      resolution = "1K",
      aspectRatio = "9:16",
    } = await req.json()

    if (!sceneId) {
      return NextResponse.json({ error: "Scene ID is required" }, { status: 400 })
    }

    // Get scene from database
    const [scene] = await sql`
      SELECT * FROM scene_composer_scenes
      WHERE id = ${sceneId} AND user_id = ${neonUserId}
    `

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 })
    }

    console.log("[SCENE-COMPOSER] Generating scene:", {
      sceneId,
      resolution,
      aspectRatio,
    })

    // Calculate credit cost
    const creditCost = getStudioProCreditCost(resolution as "1K" | "2K" | "4K")

    // Check user has enough credits (using existing credit system)
    const { getUserCredits } = await import("@/lib/credits")
    const currentBalance = await getUserCredits(neonUserId)

    if (currentBalance < creditCost) {
      return NextResponse.json(
        { 
          error: "Insufficient credits",
          required: creditCost,
          available: currentBalance,
        },
        { status: 402 }
      )
    }

    // CRITICAL: Deduct credits BEFORE starting generation to prevent free generations
    const deductionResult = await deductCredits(
      neonUserId,
      creditCost,
      "image",
      `Scene: ${scene.scene_title} - ${resolution}`,
      sceneId // Use sceneId as reference since prediction doesn't exist yet
    )

    if (!deductionResult.success) {
      console.error("[SCENE-COMPOSER] Credit deduction failed:", deductionResult.error)
      return NextResponse.json(
        { 
          error: "Failed to deduct credits",
          details: deductionResult.error || "Please try again"
        },
        { status: 500 }
      )
    }

    console.log("[SCENE-COMPOSER] Credits deducted:", {
      amount: creditCost,
      newBalance: deductionResult.newBalance,
    })

    // Build input images array: [base image, ...product images]
    const productImages = JSON.parse(scene.product_images || "[]")
    const inputImages = [
      scene.base_image_url,
      ...productImages.map((p: any) => p.url)
    ]

    // Generate with Nano Banana Pro
    let prediction
    try {
      prediction = await generateWithNanoBanana({
        inputImages,
        prompt: scene.maya_technical_prompt,
        aspectRatio: aspectRatio as any,
        resolution: resolution as any,
      })
    } catch (error) {
      console.error("[SCENE-COMPOSER] Nano Banana generation failed:", error)
      
      // Update scene status to failed
      await sql`
        UPDATE scene_composer_scenes
        SET 
          generation_status = 'failed',
          error_message = ${error instanceof Error ? error.message : "Generation failed"}
        WHERE id = ${sceneId}
      `
      
      // Refund credits since generation failed
      try {
        const { addCredits } = await import("@/lib/credits")
        await addCredits(
          neonUserId,
          creditCost,
          "refund",
          `Refund for failed scene generation: ${scene.scene_title}`,
          undefined,
          false
        )
        console.log("[SCENE-COMPOSER] Credits refunded due to generation failure")
      } catch (refundError) {
        console.error("[SCENE-COMPOSER] Failed to refund credits:", refundError)
        // Non-fatal, log and continue
      }
      
      return NextResponse.json(
        { error: "Failed to start generation" },
        { status: 500 }
      )
    }

    // Update scene with prediction info
    await sql`
      UPDATE scene_composer_scenes
      SET 
        prediction_id = ${prediction.id},
        generation_status = 'processing',
        aspect_ratio = ${aspectRatio},
        resolution = ${resolution},
        credits_used = ${creditCost}
      WHERE id = ${sceneId}
    `

    console.log("[SCENE-COMPOSER] Generation started:", prediction.id)

    return NextResponse.json({
      success: true,
      sceneId,
      predictionId: prediction.id,
      creditsDeducted: creditCost,
      status: "processing",
    })
  } catch (error) {
    console.error("[SCENE-COMPOSER] Error generating scene:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate scene",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
