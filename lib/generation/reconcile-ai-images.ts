import "server-only"

import { getDb } from "@/lib/db"
import { getReplicateClient } from "@/lib/replicate-client"
import { finalizeReplicateImageToBlob } from "@/lib/feed/finalize-replicate-image"
import { acquireKvLock, releaseKvLock } from "@/lib/cache"

export async function reconcileAiImages(input?: {
  limit?: number
  minAgeMinutes?: number
  lockTtlMs?: number
}): Promise<{
  locked: boolean
  scanned: number
  completed: number
  failed: number
  stillProcessing: number
  errors: number
}> {
  const limit = input?.limit ?? 25
  const minAgeMinutes = input?.minAgeMinutes ?? 5
  const lockTtlMs = input?.lockTtlMs ?? 240_000

  const lock = await acquireKvLock({
    key: "lock:generation:reconcile:ai-images",
    ttlMs: lockTtlMs,
  })
  if (!lock.acquired) {
    return { locked: false, scanned: 0, completed: 0, failed: 0, stillProcessing: 0, errors: 0 }
  }

  const sql = getDb()
  const replicate = getReplicateClient()

  let scanned = 0
  let completed = 0
  let failed = 0
  let stillProcessing = 0
  let errors = 0

  try {
    const rows = await sql`
      SELECT id, prediction_id, image_url, generation_status, created_at
      FROM ai_images
      WHERE prediction_id IS NOT NULL
        AND (generation_status IS NULL OR generation_status IN ('generating', 'processing'))
        AND (image_url IS NULL OR BTRIM(image_url) = '' OR image_url NOT LIKE 'http%')
        AND created_at < NOW() - make_interval(mins => ${minAgeMinutes})
      ORDER BY created_at ASC
      LIMIT ${limit}
    `

    scanned = (rows as any[])?.length || 0

    for (const row of rows as any[]) {
      const imageId = Number(row.id)
      const predictionId = String(row.prediction_id || "").trim()
      if (!predictionId) continue

      try {
        const prediction = await replicate.predictions.get(predictionId)
        const status = String(prediction.status || "")

        if (status === "succeeded" && prediction.output) {
          const rawUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
          const imageUrl = typeof rawUrl === "string" ? rawUrl : String(rawUrl || "")
          if (!imageUrl || !imageUrl.startsWith("http")) {
            stillProcessing++
            continue
          }

          const finalized = await finalizeReplicateImageToBlob({
            imageUrl,
            blobPath: `maya-pro-generations/${predictionId}.png`,
          })

          await sql`
            UPDATE ai_images
            SET image_url = ${finalized.finalUrl},
                generation_status = 'completed'
            WHERE id = ${imageId}
          `

          completed++
        } else if (status === "failed") {
          await sql`
            UPDATE ai_images
            SET generation_status = 'failed'
            WHERE id = ${imageId}
          `
          failed++
        } else {
          stillProcessing++
        }
      } catch (e) {
        errors++
        console.error("[v0] [RECONCILE] Error reconciling ai_images:", { imageId, predictionId, error: e })
      }

      await new Promise((r) => setTimeout(r, 120))
    }
  } finally {
    await releaseKvLock({ key: "lock:generation:reconcile:ai-images", value: lock.value }).catch(() => {})
  }

  return {
    locked: true,
    scanned,
    completed,
    failed,
    stillProcessing,
    errors,
  }
}

