import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@supabase/ssr"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getSceneComposerSystemPrompt, buildScenePrompt } from "@/lib/maya/scene-composer-template"
import { generateText } from "ai"
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
      baseImageId,
      baseImageUrl,
      productImages, // [{url, label}]
      userRequest,
    } = await req.json()

    // Validate inputs
    if (!baseImageId || !baseImageUrl) {
      return NextResponse.json({ error: "Base image is required" }, { status: 400 })
    }

    if (!productImages || productImages.length === 0) {
      return NextResponse.json({ error: "At least one product is required" }, { status: 400 })
    }

    if (productImages.length > 3) {
      return NextResponse.json({ error: "Maximum 3 products allowed" }, { status: 400 })
    }

    if (!userRequest || userRequest.trim().length === 0) {
      return NextResponse.json({ error: "Scene description is required" }, { status: 400 })
    }

    console.log("[SCENE-COMPOSER] Generating scene concept:", {
      userId: neonUserId,
      baseImageId,
      numProducts: productImages.length,
    })

    // Get user context (reuse existing system)
    // getUserContextForMaya expects Supabase auth ID, not Neon user ID
    const userContext = await getUserContextForMaya(user.id)

    // Build Maya's prompt
    const systemPrompt = getSceneComposerSystemPrompt(userContext)
    const userPrompt = buildScenePrompt(baseImageUrl, productImages, userRequest, userContext)

    // Generate scene concept with Maya (same pattern as concept cards)
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 1000,
    })

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("[SCENE-COMPOSER] Failed to parse JSON from Maya response:", text.substring(0, 200))
      throw new Error("Failed to parse scene concept from Maya")
    }

    let sceneConcept
    try {
      sceneConcept = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("[SCENE-COMPOSER] JSON parse error:", parseError, "Text:", text.substring(0, 200))
      throw new Error("Invalid response format from Maya")
    }

    // Validate response structure
    if (!sceneConcept.sceneTitle || !sceneConcept.sceneDescription || !sceneConcept.technicalPrompt) {
      console.error("[SCENE-COMPOSER] Invalid scene concept structure:", sceneConcept)
      throw new Error("Invalid scene concept structure from Maya")
    }

    console.log("[SCENE-COMPOSER] Scene concept generated:", sceneConcept.sceneTitle)

    // Save scene to database (pending generation)
    const [scene] = await sql`
      INSERT INTO scene_composer_scenes (
        user_id,
        base_image_id,
        base_image_url,
        product_images,
        user_request,
        scene_title,
        scene_description,
        maya_technical_prompt,
        generation_status
      ) VALUES (
        ${neonUserId},
        ${baseImageId},
        ${baseImageUrl},
        ${JSON.stringify(productImages)},
        ${userRequest},
        ${sceneConcept.sceneTitle},
        ${sceneConcept.sceneDescription},
        ${sceneConcept.technicalPrompt},
        'pending'
      )
      RETURNING id, scene_title, scene_description, maya_technical_prompt
    `

    console.log("[SCENE-COMPOSER] Scene saved to database:", scene.id)

    return NextResponse.json({
      success: true,
      sceneId: scene.id,
      sceneTitle: scene.scene_title,
      sceneDescription: scene.scene_description,
      technicalPrompt: scene.maya_technical_prompt,
    })
  } catch (error) {
    console.error("[SCENE-COMPOSER] Error creating scene:", error)
    return NextResponse.json(
      { 
        error: "Failed to create scene concept",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
