import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { requireAdmin, isProPhotoshootEnabled } from "@/lib/admin-feature-flags"
import { put } from "@vercel/blob"
import sharp from "sharp"

const sql = getDbClient()

/**
 * Split 3x3 grid into 9 individual frames using Sharp
 */
async function splitGridIntoFrames(gridBuffer: Buffer): Promise<Buffer[]> {
  const metadata = await sharp(gridBuffer).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error("Invalid grid image dimensions")
  }

  const frameWidth = Math.floor(metadata.width / 3)
  const frameHeight = Math.floor(metadata.height / 3)

  const frames: Buffer[] = []

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const left = col * frameWidth
      const top = row * frameHeight

      const frame = await sharp(gridBuffer)
        .extract({
          left,
          top,
          width: frameWidth,
          height: frameHeight,
        })
        .png()
        .toBuffer()

      frames.push(frame)
    }
  }

  return frames
}

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

    // Check if frames already exist (carousel might already be created)
    const existingFrames = await sql`
      SELECT id, frame_number, frame_url, gallery_image_id
      FROM pro_photoshoot_frames
      WHERE grid_id = ${parseInt(gridId)}
      ORDER BY frame_number
    `

    let frameUrls: string[] = []
    let galleryImageIds: number[] = []

    if (existingFrames.length === 9) {
      // Frames already exist, use them
      console.log("[ProPhotoshoot] ✅ Using existing frames for carousel")
      frameUrls = existingFrames.map((f: any) => f.frame_url)
      galleryImageIds = existingFrames.map((f: any) => f.gallery_image_id).filter((id: any) => id !== null)
    } else {
      // Download grid image
      console.log("[ProPhotoshoot] 📥 Downloading grid image...")
      const gridResponse = await fetch(grid.grid_url)
      if (!gridResponse.ok) {
        throw new Error(`Failed to download grid: ${gridResponse.statusText}`)
      }
      const gridBuffer = Buffer.from(await gridResponse.arrayBuffer())

      // Split grid into 9 frames
      console.log("[ProPhotoshoot] ✂️ Splitting grid into 9 frames...")
      const frameBuffers = await splitGridIntoFrames(gridBuffer)

      // Upload each frame and save to gallery
      for (let i = 0; i < frameBuffers.length; i++) {
        const frameNumber = i + 1
        const frameBuffer = frameBuffers[i]

        // Upload frame to Blob
        const frameBlob = await put(
          `pro-photoshoot/carousel/${gridId}-${frameNumber}.png`,
          frameBuffer,
          {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: true,
          }
        )

        frameUrls.push(frameBlob.url)

        // Save to ai_images gallery (with carousel source)
        const [galleryImage] = await sql`
          INSERT INTO ai_images (
            user_id,
            image_url,
            prompt,
            source,
            category,
            saved,
            created_at
          ) VALUES (
            ${adminCheck.userId},
            ${frameBlob.url},
            ${`Pro Photoshoot Grid ${grid.grid_number} - Frame ${frameNumber}`},
            'carousel',
            'pro_photoshoot',
            true,
            NOW()
          )
          RETURNING id
        `

        galleryImageIds.push(galleryImage.id)

        // Save frame record
        await sql`
          INSERT INTO pro_photoshoot_frames (
            grid_id,
            frame_number,
            frame_url,
            gallery_image_id
          ) VALUES (
            ${parseInt(gridId)},
            ${frameNumber},
            ${frameBlob.url},
            ${galleryImage.id}
          )
          ON CONFLICT (grid_id, frame_number) DO UPDATE SET
            frame_url = ${frameBlob.url},
            gallery_image_id = ${galleryImage.id}
        `

        console.log(`[ProPhotoshoot] ✅ Frame ${frameNumber} saved (gallery ID: ${galleryImage.id})`)
      }
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

