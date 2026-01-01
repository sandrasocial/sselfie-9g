import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/user/setup-status
 * 
 * Returns user's setup status for Classic and Pro Mode:
 * - hasTrainedModel: Whether user has a completed trained model
 * - hasReferenceImages: Whether user has 3+ avatar images for Pro Mode
 * - avatarImages: Array of avatar image URLs
 * - avatarCount: Number of avatar images
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check trained model status
    const [model] = await sql`
      SELECT id, training_status
      FROM user_models
      WHERE user_id = ${neonUser.id}
      AND training_status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `
    const hasTrainedModel = !!model

    // Check reference images (avatar images for Pro Mode)
    const avatarImages = await sql`
      SELECT image_url, display_order, uploaded_at
      FROM user_avatar_images
      WHERE user_id = ${neonUser.id}
      AND is_active = true
      ORDER BY display_order ASC, uploaded_at ASC
    `
    const hasReferenceImages = avatarImages.length >= 3

    return NextResponse.json({
      hasTrainedModel,
      hasReferenceImages,
      avatarImages: avatarImages.map((row: any) => row.image_url),
      avatarCount: avatarImages.length,
      modelId: model?.id || null,
      trainingStatus: model?.training_status || null,
    })
  } catch (error) {
    console.error("[v0] Setup status error:", error)
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 }
    )
  }
}

