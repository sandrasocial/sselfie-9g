import "server-only"

import { getDbClient } from "@/lib/db/client"
import { isProPhotoshootEnabled } from "@/lib/admin-feature-flags"
import { checkNanoBananaPrediction } from "@/lib/nano-banana-client"
import { acquireKvLock, releaseKvLock } from "@/lib/cache"
import { put } from "@vercel/blob"
import sharp from "sharp"

const sql = getDbClient()

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
        .extract({ left, top, width: frameWidth, height: frameHeight })
        .png()
        .toBuffer()
      frames.push(frame)
    }
  }
  return frames
}

export async function reconcileProPhotoshootGrids(input?: {
  limit?: number
  minAgeMinutes?: number
  lockTtlMs?: number
}): Promise<{
  locked: boolean
  featureEnabled: boolean
  scanned: number
  completed: number
  failed: number
  stillProcessing: number
  framesCreated: number
  errors: number
}> {
  const limit = input?.limit ?? 10
  const minAgeMinutes = input?.minAgeMinutes ?? 5
  const lockTtlMs = input?.lockTtlMs ?? 300_000

  const featureEnabled = await isProPhotoshootEnabled().catch(() => false)
  if (!featureEnabled) {
    return {
      locked: true,
      featureEnabled: false,
      scanned: 0,
      completed: 0,
      failed: 0,
      stillProcessing: 0,
      framesCreated: 0,
      errors: 0,
    }
  }

  const lock = await acquireKvLock({
    key: "lock:generation:reconcile:pro-photoshoot-grids",
    ttlMs: lockTtlMs,
  })
  if (!lock.acquired) {
    return {
      locked: false,
      featureEnabled: true,
      scanned: 0,
      completed: 0,
      failed: 0,
      stillProcessing: 0,
      framesCreated: 0,
      errors: 0,
    }
  }

  let scanned = 0
  let completed = 0
  let failed = 0
  let stillProcessing = 0
  let framesCreated = 0
  let errors = 0

  try {
    const grids = await sql`
      SELECT
        g.id,
        g.session_id,
        g.grid_number,
        g.prediction_id,
        g.grid_url,
        g.generation_status,
        g.updated_at,
        s.user_id
      FROM pro_photoshoot_grids g
      INNER JOIN pro_photoshoot_sessions s ON s.id = g.session_id
      WHERE g.prediction_id IS NOT NULL
        AND g.grid_url IS NULL
        AND g.generation_status = 'generating'
        AND g.updated_at < NOW() - make_interval(mins => ${minAgeMinutes})
      ORDER BY g.updated_at ASC
      LIMIT ${limit}
    `

    scanned = (grids as any[])?.length || 0

    for (const grid of grids as any[]) {
      const gridId = Number(grid.id)
      const predictionId = String(grid.prediction_id || "").trim()
      const userId = String(grid.user_id || "").trim()

      if (!gridId || !predictionId || !userId) continue

      try {
        const prediction = await checkNanoBananaPrediction(predictionId)

        if (prediction.status === "succeeded" && prediction.output) {
          const outputUrl = String(prediction.output || "")
          const gridResponse = await fetch(outputUrl)
          if (!gridResponse.ok) throw new Error(`Failed to download grid: ${gridResponse.statusText}`)
          const gridBuffer = Buffer.from(await gridResponse.arrayBuffer())

          const gridBlob = await put(`pro-photoshoot/grids/${gridId}-full.png`, gridBuffer, {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: true,
          })

          const existingFrames = await sql`
            SELECT frame_number, frame_url, gallery_image_id
            FROM pro_photoshoot_frames
            WHERE grid_id = ${gridId}
            ORDER BY frame_number
          `
          const existingByNumber = new Map<number, any>()
          for (const f of existingFrames as any[]) existingByNumber.set(Number(f.frame_number), f)

          const frameBuffers = await splitGridIntoFrames(gridBuffer)

          for (let i = 0; i < frameBuffers.length; i++) {
            const frameNumber = i + 1
            if (existingByNumber.has(frameNumber)) continue

            const frameBlob = await put(`pro-photoshoot/frames/${gridId}-${frameNumber}.png`, frameBuffers[i], {
              access: "public",
              contentType: "image/png",
              addRandomSuffix: true,
            })

            const [existingGalleryImage] = await sql`
              SELECT id FROM ai_images
              WHERE image_url = ${frameBlob.url}
              LIMIT 1
            `

            let galleryImageId: number
            if (existingGalleryImage) {
              galleryImageId = existingGalleryImage.id
            } else {
              const [galleryImage] = await sql`
                INSERT INTO ai_images (
                  user_id,
                  image_url,
                  prompt,
                  prediction_id,
                  source,
                  category,
                  saved,
                  created_at
                ) VALUES (
                  ${userId},
                  ${frameBlob.url},
                  ${`Pro Photoshoot Grid ${grid.grid_number} - Frame ${frameNumber}`},
                  ${predictionId},
                  'pro_photoshoot',
                  'pro_photoshoot',
                  true,
                  NOW()
                )
                RETURNING id
              `
              galleryImageId = galleryImage.id
            }

            await sql`
              INSERT INTO pro_photoshoot_frames (
                grid_id,
                frame_number,
                frame_url,
                gallery_image_id
              ) VALUES (
                ${gridId},
                ${frameNumber},
                ${frameBlob.url},
                ${galleryImageId}
              )
              ON CONFLICT (grid_id, frame_number) DO UPDATE SET
                frame_url = ${frameBlob.url},
                gallery_image_id = ${galleryImageId}
            `

            framesCreated++
          }

          await sql`
            UPDATE pro_photoshoot_grids
            SET grid_url = ${gridBlob.url},
                generation_status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = ${gridId}
          `

          // Mark session as completed if all grids are completed.
          const [sessionInfo] = await sql`
            SELECT total_grids FROM pro_photoshoot_sessions
            WHERE id = ${grid.session_id}
          `
          const [completedGrids] = await sql`
            SELECT COUNT(*) as count FROM pro_photoshoot_grids
            WHERE session_id = ${grid.session_id}
              AND generation_status = 'completed'
          `
          if (Number(completedGrids?.count || 0) >= Number(sessionInfo?.total_grids || 0)) {
            await sql`
              UPDATE pro_photoshoot_sessions
              SET session_status = 'completed',
                  completed_at = NOW(),
                  updated_at = NOW()
              WHERE id = ${grid.session_id}
            `
          }

          completed++
        } else if (prediction.status === "failed") {
          await sql`
            UPDATE pro_photoshoot_grids
            SET generation_status = 'failed',
                updated_at = NOW()
            WHERE id = ${gridId}
          `
          failed++
        } else {
          stillProcessing++
        }
      } catch (e) {
        errors++
        console.error("[v0] [RECONCILE] Error reconciling pro photoshoot grid:", { gridId, predictionId, error: e })
      }

      await new Promise((r) => setTimeout(r, 150))
    }
  } finally {
    await releaseKvLock({ key: "lock:generation:reconcile:pro-photoshoot-grids", value: lock.value }).catch(() => {})
  }

  return {
    locked: true,
    featureEnabled: true,
    scanned,
    completed,
    failed,
    stillProcessing,
    framesCreated,
    errors,
  }
}

