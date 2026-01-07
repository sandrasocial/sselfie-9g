import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { requireAdmin, isProPhotoshootEnabled } from "@/lib/admin-feature-flags"

const sql = getDbClient()

// CRITICAL FIX: Removed splitGridIntoFrames function
// create-carousel no longer creates frames - it only reads existing ones
// Frames are created by check-grid when grid completes

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
    const { gridId } = body

    if (!gridId) {
      return NextResponse.json(
        { error: "gridId is required" },
        { status: 400 }
      )
    }

    // Get grid info
    const [grid] = await sql`
      SELECT 
        id,
        session_id,
        grid_number,
        grid_url,
        generation_status
      FROM pro_photoshoot_grids
      WHERE id = ${parseInt(gridId)}
        AND session_id IN (
          SELECT id FROM pro_photoshoot_sessions
          WHERE user_id = ${adminCheck.userId}
        )
    `

    if (!grid) {
      return NextResponse.json({ error: "Grid not found or access denied" }, { status: 404 })
    }

    if (grid.generation_status !== "completed") {
      return NextResponse.json(
        { error: "Grid must be completed before creating carousel" },
        { status: 400 }
      )
    }

    if (!grid.grid_url) {
      return NextResponse.json(
        { error: "Grid image URL not found" },
        { status: 404 }
      )
    }

    // CRITICAL FIX: create-carousel ONLY reads existing frames, never creates them
    // Frames are created by check-grid when grid completes
    // This prevents duplicate frame creation and ensures consistent source field
    const existingFrames = await sql`
      SELECT id, frame_number, frame_url, gallery_image_id
      FROM pro_photoshoot_frames
      WHERE grid_id = ${parseInt(gridId)}
      ORDER BY frame_number
    `

    if (existingFrames.length !== 9) {
      // Frames don't exist yet - this should not happen if grid is completed
      // But if it does, return error instead of creating duplicates
      console.error(`[ProPhotoshoot] ❌ Expected 9 frames, found ${existingFrames.length}. Frames must be created by check-grid first.`)
      return NextResponse.json(
        { 
          error: `Frames not ready. Expected 9 frames, found ${existingFrames.length}. Please wait for grid processing to complete.`,
          framesFound: existingFrames.length
        },
        { status: 400 }
      )
    }

    // Frames exist, use them (validate gallery_image_id exists)
    console.log("[ProPhotoshoot] ✅ Using existing frames for carousel (created by check-grid)")
    
    const frameUrls: string[] = []
    const galleryImageIds: number[] = []
    
    for (const frame of existingFrames) {
      frameUrls.push(frame.frame_url)
      if (frame.gallery_image_id) {
        // Validate gallery_image_id exists in ai_images
        const [galleryImage] = await sql`
          SELECT id FROM ai_images
          WHERE id = ${frame.gallery_image_id}
          LIMIT 1
        `
        if (galleryImage) {
          galleryImageIds.push(frame.gallery_image_id)
        } else {
          console.warn(`[ProPhotoshoot] ⚠️ Gallery image ID ${frame.gallery_image_id} not found in ai_images for frame ${frame.frame_number}`)
        }
      }
    }

    // Ensure we have 9 gallery IDs (critical for frontend)
    if (galleryImageIds.length !== 9) {
      console.error(`[ProPhotoshoot] ❌ Expected 9 gallery image IDs, found ${galleryImageIds.length}`)
      return NextResponse.json(
        { 
          error: `Gallery image IDs incomplete. Expected 9, found ${galleryImageIds.length}. Please regenerate grid.`,
          galleryIdsFound: galleryImageIds.length
        },
        { status: 500 }
      )
    }

    console.log(`[ProPhotoshoot] 🎠 Carousel created for Grid ${grid.grid_number} with ${frameUrls.length} frames`)

    return NextResponse.json({
      success: true,
      carouselId: `grid-${gridId}`, // Simple identifier
      gridId: parseInt(gridId),
      gridNumber: grid.grid_number,
      frames: frameUrls,
      galleryImageIds,
      framesCount: frameUrls.length,
    })
  } catch (error) {
    console.error("[ProPhotoshoot] ❌ Error creating carousel:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create carousel" },
      { status: 500 }
    )
  }
}

