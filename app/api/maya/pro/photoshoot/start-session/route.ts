import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { requireAdmin, isProPhotoshootEnabled } from "@/lib/admin-feature-flags"

const sql = getDbClient()

export async function POST(request: NextRequest) {
  try {
    // Check feature flag
    const featureEnabled = await isProPhotoshootEnabled()
    if (!featureEnabled) {
      return NextResponse.json({ error: "Feature not enabled" }, { status: 403 })
    }

    // Check admin access
    const adminCheck = await requireAdmin()
    if (!adminCheck.isAdmin || !adminCheck.userId) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { originalImageId, totalGrids = 8, avatarImages } = body

    if (!originalImageId) {
      return NextResponse.json({ error: "originalImageId is required" }, { status: 400 })
    }

    // Validate original image belongs to admin user
    const [imageCheck] = await sql`
      SELECT id, user_id, image_url FROM ai_images
      WHERE id = ${originalImageId} AND user_id = ${adminCheck.userId}
    `

    if (!imageCheck) {
      return NextResponse.json({ error: "Image not found or access denied" }, { status: 404 })
    }

    // CRITICAL FIX: Auto-derive avatarImages from originalImageId if missing (admin panel fallback)
    // Admin panel doesn't have concept card context, so we use the original image as avatar
    let finalAvatarImages: string[] = []
    if (avatarImages && Array.isArray(avatarImages) && avatarImages.length > 0) {
      // Use provided avatar images (from concept card)
      finalAvatarImages = avatarImages
    } else {
      // Fallback: Use original image as avatar (admin panel use case)
      if (imageCheck.image_url) {
        finalAvatarImages = [imageCheck.image_url]
        console.log("[ProPhotoshoot] ⚠️ avatarImages not provided, using original image as avatar:", imageCheck.image_url.substring(0, 60))
      } else {
        return NextResponse.json(
          { error: "Original image has no image_url and avatarImages not provided" },
          { status: 400 }
        )
      }
    }

    // Check for existing active session
    const [existingSession] = await sql`
      SELECT id, total_grids, session_status
      FROM pro_photoshoot_sessions
      WHERE user_id = ${adminCheck.userId}
        AND original_image_id = ${originalImageId}
        AND session_status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existingSession) {
      // Return existing session with avatar images info
      const [grids] = await sql`
        SELECT id, grid_number, generation_status, grid_url
        FROM pro_photoshoot_grids
        WHERE session_id = ${existingSession.id}
        ORDER BY grid_number
      `

      // Return existing session
      // Use provided avatarImages or fallback to original image
      const sessionAvatarImages = finalAvatarImages.length > 0 ? finalAvatarImages : [imageCheck.image_url]
      return NextResponse.json({
        success: true,
        sessionId: existingSession.id,
        totalGrids: existingSession.total_grids,
        status: existingSession.session_status,
        grids: grids || [],
        avatarImages: sessionAvatarImages, // Return avatar images for reference
      })
    }

    // Create new session
    // Note: We store avatarImages in the response, but could also store in a metadata JSONB column
    // For now, we'll rely on the frontend to pass avatarImages with each generate-grid request
    const [newSession] = await sql`
      INSERT INTO pro_photoshoot_sessions (
        user_id,
        original_image_id,
        total_grids,
        session_status
      ) VALUES (
        ${adminCheck.userId},
        ${originalImageId},
        ${totalGrids},
        'active'
      )
      RETURNING id, total_grids, session_status, created_at
    `

    console.log("[ProPhotoshoot] ✅ Session created:", newSession.id, "with", finalAvatarImages.length, "avatar images")

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
      totalGrids: newSession.total_grids,
      status: newSession.session_status,
      grids: [],
      avatarImages: finalAvatarImages, // Return avatar images for reference
    })
  } catch (error) {
    console.error("[ProPhotoshoot] ❌ Error starting session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start session" },
      { status: 500 }
    )
  }
}

