import "server-only"

import { getDb } from "@/lib/db/client"
import { getReplicateClient } from "@/lib/replicate-client"
import { finalizeReplicateImageToBlob } from "@/lib/feed/finalize-replicate-image"
import { hookFeedPostGeneration } from "@/lib/quality/hooks"
import { acquireKvLock, releaseKvLock } from "@/lib/cache"

export async function reconcileFeedPosts(input?: {
  limit?: number
  minAgeMinutes?: number
  lockTtlMs?: number
}): Promise<{
  locked: boolean
  scanned: number
  completed: number
  failed: number
  stillProcessing: number
  fixedInconsistentCompleted: number
  errors: number
}> {
  const limit = input?.limit ?? 25
  const minAgeMinutes = input?.minAgeMinutes ?? 5
  const lockTtlMs = input?.lockTtlMs ?? 240_000

  const lock = await acquireKvLock({
    key: "lock:generation:reconcile:feed-posts",
    ttlMs: lockTtlMs,
  })
  if (!lock.acquired) {
    return {
      locked: false,
      scanned: 0,
      completed: 0,
      failed: 0,
      stillProcessing: 0,
      fixedInconsistentCompleted: 0,
      errors: 0,
    }
  }

  const sql = getDb()
  const replicate = getReplicateClient()

  let scanned = 0
  let completed = 0
  let failed = 0
  let stillProcessing = 0
  let fixedInconsistentCompleted = 0
  let errors = 0

  try {
    const fixed = await sql`
      UPDATE feed_posts
      SET generation_status = 'completed', updated_at = NOW()
      WHERE image_url IS NOT NULL
        AND generation_status IS DISTINCT FROM 'completed'
      RETURNING id
    `
    fixedInconsistentCompleted = (fixed as any[])?.length || 0

    const rows = await sql`
      SELECT
        id,
        user_id,
        post_type,
        prompt,
        caption,
        position,
        prediction_id,
        generation_status,
        text_overlay,
        updated_at
      FROM feed_posts
      WHERE prediction_id IS NOT NULL
        AND image_url IS NULL
        AND (generation_status IS NULL OR generation_status IN ('pending', 'generating'))
        AND updated_at < NOW() - make_interval(mins => ${minAgeMinutes})
      ORDER BY updated_at ASC
      LIMIT ${limit}
    `

    scanned = (rows as any[])?.length || 0

    for (const post of rows as any[]) {
      const postId = Number(post.id)
      const predictionId = String(post.prediction_id || "").trim()
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
            blobPath: `feed-posts/${postId}.png`,
            textOverlay: post.text_overlay || null,
          })

          await sql`
            UPDATE feed_posts
            SET
              image_url = ${finalized.finalUrl},
              generation_status = 'completed',
              updated_at = NOW()
            WHERE id = ${postId}
          `

          hookFeedPostGeneration({
            imageUrl: finalized.finalUrl,
            prompt: String(post.prompt || post.caption || ""),
            userId: String(post.user_id),
            postId: String(postId),
            predictionId,
            category: "feed-post",
          }).catch(() => {})

          try {
            const [existing] = await sql`
              SELECT id, image_url, generation_status FROM ai_images
              WHERE prediction_id = ${predictionId}
                 OR image_url = ${finalized.finalUrl}
              LIMIT 1
            `
            if (existing) {
              if (
                (!existing.image_url || !String(existing.image_url || "").startsWith("http")) &&
                String(existing.generation_status || "") !== "completed"
              ) {
                await sql`
                  UPDATE ai_images
                  SET image_url = ${finalized.finalUrl},
                      generation_status = 'completed'
                  WHERE id = ${existing.id}
                `
              }
            } else {
              const displayCaption = String(post.caption || `Feed post ${post.position || ""}`) || null
              const fluxPrompt = String(post.prompt || "") || null
              await sql`
                INSERT INTO ai_images (
                  user_id,
                  image_url,
                  prompt,
                  generated_prompt,
                  prediction_id,
                  generation_status,
                  source,
                  category,
                  created_at
                ) VALUES (
                  ${String(post.user_id)},
                  ${finalized.finalUrl},
                  ${displayCaption},
                  ${fluxPrompt},
                  ${predictionId},
                  'completed',
                  'feed_planner',
                  ${String(post.post_type || "feed_post")},
                  NOW()
                )
              `
            }
          } catch (galleryError) {
            console.error("[v0] [RECONCILE] Failed to insert ai_images (non-fatal):", galleryError)
          }

          completed++
        } else if (status === "failed") {
          await sql`
            UPDATE feed_posts
            SET generation_status = 'failed', updated_at = NOW()
            WHERE id = ${postId}
          `
          failed++
        } else {
          stillProcessing++
        }
      } catch (e: any) {
        errors++
        console.error("[v0] [RECONCILE] Error reconciling feed post:", { postId, predictionId, error: e })

        // If Replicate returns 404 (prediction not found / expired) or the post is very old
        // (> 24 hours), mark it as failed so it doesn't stay stuck forever.
        const isNotFound = e?.status === 404 || e?.message?.includes("not found") || e?.message?.includes("404")
        const postAge = Date.now() - new Date(post.updated_at).getTime()
        const isStale = postAge > 24 * 60 * 60 * 1000 // older than 24h

        if (isNotFound || isStale) {
          try {
            await sql`
              UPDATE feed_posts
              SET generation_status = 'failed', updated_at = NOW()
              WHERE id = ${postId}
                AND generation_status IN ('pending', 'generating')
                AND image_url IS NULL
            `
            failed++
          } catch (markErr) {
            console.error("[v0] [RECONCILE] Failed to mark stale post as failed:", { postId, markErr })
          }
        }
      }

      // Small spacing to reduce burst rate on Replicate status checks.
      await new Promise((r) => setTimeout(r, 120))
    }
  } finally {
    await releaseKvLock({ key: "lock:generation:reconcile:feed-posts", value: lock.value }).catch(() => {})
  }

  return {
    locked: true,
    scanned,
    completed,
    failed,
    stillProcessing,
    fixedInconsistentCompleted,
    errors,
  }
}
