import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { checkNanoBananaPrediction } from "@/lib/nano-banana-client"
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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("predictionId")
    const gridId = searchParams.get("gridId")

    if (!predictionId || !gridId) {
      return NextResponse.json(
        { error: "predictionId and gridId are required" },
        { status: 400 }
      )
    }

    // Check prediction status
    const prediction = await checkNanoBananaPrediction(predictionId)

    if (prediction.status === "succeeded" && prediction.output) {
      console.log("[ProPhotoshoot] ✅ Grid generation completed, processing...")

      // Download grid image
      const gridResponse = await fetch(prediction.output)
      if (!gridResponse.ok) {
        throw new Error(`Failed to download grid: ${gridResponse.statusText}`)
      }
      const gridBuffer = Buffer.from(await gridResponse.arrayBuffer())

      // Upload full grid to Blob
      const gridBlob = await put(
        `pro-photoshoot/grids/${gridId}-full.png`,
        gridBuffer,
        {
          access: "public",
          contentType: "image/png",
          addRandomSuffix: true,
        }
      )

      console.log("[ProPhotoshoot] 📦 Grid uploaded:", gridBlob.url)

      // Split grid into 9 frames
      const frameBuffers = await splitGridIntoFrames(gridBuffer)
      console.log("[ProPhotoshoot] ✂️ Split into", frameBuffers.length, "frames")

      // Get grid info
      const [gridInfo] = await sql`
        SELECT session_id, grid_number FROM pro_photoshoot_grids
        WHERE id = ${parseInt(gridId)}
      `

      // Upload each frame and save to gallery
      const frameUrls: string[] = []
      for (let i = 0; i < frameBuffers.length; i++) {
        const frameNumber = i + 1
        const frameBuffer = frameBuffers[i]

        // Upload frame to Blob
        const frameBlob = await put(
          `pro-photoshoot/frames/${gridId}-${frameNumber}.png`,
          frameBuffer,
          {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: true,
          }
        )

        frameUrls.push(frameBlob.url)

        // Save to ai_images gallery
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
            ${`Pro Photoshoot Grid ${gridInfo.grid_number} - Frame ${frameNumber}`},
            'maya_pro',
            'pro_photoshoot',
            true,
            NOW()
          )
          RETURNING id
        `

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

      // Update grid record
      await sql`
        UPDATE pro_photoshoot_grids
        SET grid_url = ${gridBlob.url},
            generation_status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${parseInt(gridId)}
      `

      // Check if all grids are complete
      const [sessionInfo] = await sql`
        SELECT total_grids FROM pro_photoshoot_sessions
        WHERE id = ${gridInfo.session_id}
      `

      const [completedGrids] = await sql`
        SELECT COUNT(*) as count FROM pro_photoshoot_grids
        WHERE session_id = ${gridInfo.session_id}
          AND generation_status = 'completed'
      `

      if (completedGrids.count >= sessionInfo.total_grids) {
        // Mark session as completed
        await sql`
          UPDATE pro_photoshoot_sessions
          SET session_status = 'completed',
              completed_at = NOW(),
              updated_at = NOW()
          WHERE id = ${gridInfo.session_id}
        `
        console.log("[ProPhotoshoot] 🎉 Session completed!")
      }

      return NextResponse.json({
        success: true,
        status: "completed",
        gridUrl: gridBlob.url,
        frameUrls,
        framesCount: frameUrls.length,
      })
    } else if (prediction.status === "failed") {
      // Update grid status
      await sql`
        UPDATE pro_photoshoot_grids
        SET generation_status = 'failed',
            updated_at = NOW()
        WHERE id = ${parseInt(gridId)}
      `

      return NextResponse.json({
        success: false,
        status: "failed",
        error: prediction.error || "Generation failed",
      })
    }

    // Still processing
    return NextResponse.json({
      success: true,
      status: prediction.status,
    })
  } catch (error) {
    console.error("[ProPhotoshoot] ❌ Error checking grid:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check grid" },
      { status: 500 }
    )
  }
}

