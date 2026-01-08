import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { checkNanoBananaPrediction } from "@/lib/nano-banana-client"
import { put } from "@vercel/blob"
import sharp from "sharp"

const sql = neon(process.env.DATABASE_URL!)

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

export async function POST(req: NextRequest) {
  try {
    const { predictionId, email } = await req.json()

    if (!predictionId || typeof predictionId !== "string") {
      return NextResponse.json({ error: "predictionId is required" }, { status: 400 })
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log(`[Blueprint] Checking grid status: ${predictionId}`)

    // Check prediction status with Replicate
    const status = await checkNanoBananaPrediction(predictionId)

    console.log(`[Blueprint] Prediction status: ${status.status}`)

    // If generation completed, process the grid
    if (status.status === "succeeded" && status.output) {
      console.log("[Blueprint] Grid generation completed, processing...")

      try {
        // Download grid image from Replicate
        const gridResponse = await fetch(status.output)
        if (!gridResponse.ok) {
          throw new Error(`Failed to download grid: ${gridResponse.statusText}`)
        }
        const gridBuffer = Buffer.from(await gridResponse.arrayBuffer())

        // Upload full grid to Blob
        const gridBlob = await put(
          `blueprint-photoshoot/grids/${predictionId}-full.png`,
          gridBuffer,
          {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: true,
          },
        )

        console.log("[Blueprint] Grid uploaded to Blob:", gridBlob.url)

        // Split grid into 9 frames
        const frameBuffers = await splitGridIntoFrames(gridBuffer)
        console.log("[Blueprint] Split into", frameBuffers.length, "frames")

        // Upload each frame and collect URLs
        const frameUrls: string[] = []
        for (let i = 0; i < frameBuffers.length; i++) {
          const frameNumber = i + 1
          const frameBuffer = frameBuffers[i]

          // Upload frame to Blob
          const frameBlob = await put(
            `blueprint-photoshoot/frames/${predictionId}-${frameNumber}.png`,
            frameBuffer,
            {
              access: "public",
              contentType: "image/png",
              addRandomSuffix: true,
            },
          )

          frameUrls.push(frameBlob.url)
          console.log(`[Blueprint] Frame ${frameNumber} uploaded: ${frameBlob.url}`)
        }

        // Save grid data to database
        try {
          await sql`
            UPDATE blueprint_subscribers
            SET grid_generated = TRUE,
                grid_generated_at = NOW(),
                grid_url = ${gridBlob.url},
                grid_frame_urls = ${JSON.stringify(frameUrls)},
                grid_prediction_id = ${predictionId}
            WHERE email = ${email}
          `
          console.log("[Blueprint] Grid data saved to database for email:", email)
        } catch (dbError) {
          console.error("[Blueprint] Error saving grid to database:", dbError)
          // Continue even if save fails - user still gets the grid
        }

        return NextResponse.json({
          success: true,
          status: "completed",
          gridUrl: gridBlob.url,
          frameUrls,
          framesCount: frameUrls.length,
        })
      } catch (error) {
        console.error("[Blueprint] Error processing completed grid:", error)
        return NextResponse.json(
          {
            success: false,
            status: "failed",
            error: error instanceof Error ? error.message : "Failed to process grid",
          },
          { status: 500 },
        )
      }
    }

    // If generation failed
    if (status.status === "failed") {
      return NextResponse.json({
        success: false,
        status: "failed",
        error: status.error || "Generation failed",
      })
    }

    // Still processing
    return NextResponse.json({
      success: true,
      status: status.status, // "starting" or "processing"
    })
  } catch (error) {
    console.error("[Blueprint] Error checking grid:", error)
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to check grid status",
      },
      { status: 500 },
    )
  }
}
