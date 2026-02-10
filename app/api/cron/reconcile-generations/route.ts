import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import { getReplicateClient } from "@/lib/replicate-client"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

type SourceHint = "maya_chat" | "studio" | "unknown"

function parsePredictionRef(imageUrlsRaw: string | null | undefined): {
  predictionId: string | null
  sourceHint: SourceHint
} {
  const v = (imageUrlsRaw || "").trim()
  if (!v) return { predictionId: null, sourceHint: "unknown" }

  // Completed: single or comma-separated blob URLs.
  if (v.startsWith("https://")) return { predictionId: null, sourceHint: "unknown" }

  // Maya classic mode stores JSON in generated_images.image_urls.
  if (v.startsWith("{")) {
    try {
      const parsed = JSON.parse(v)
      const predictionId = typeof parsed?.prediction_id === "string" ? parsed.prediction_id : null
      return { predictionId, sourceHint: "maya_chat" }
    } catch {
      return { predictionId: null, sourceHint: "unknown" }
    }
  }

  // Otherwise treat it as a Replicate prediction id (older studio flow).
  return { predictionId: v, sourceHint: "studio" }
}

async function uploadImageFromUrlToBlob(input: { url: string; key: string }) {
  const res = await fetch(input.url)
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status} ${res.statusText})`)
  }
  const blob = await res.blob()
  if (blob.size === 0) throw new Error("Fetched image blob is empty (0 bytes)")

  const out = await put(input.key, blob, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  })
  return out.url
}

async function reconcileGeneratedImages(limit: number) {
  // generated_images.image_urls is overloaded:
  // - studio: prediction id (string)
  // - maya classic: JSON string containing prediction_id + status
  // - completed: https://... (or comma-separated https://... urls)
  const rows = await sql`
    SELECT id, user_id, image_urls, prompt, description, category, subcategory, created_at
    FROM generated_images
    WHERE created_at < NOW() - INTERVAL '5 minutes'
      AND image_urls IS NOT NULL
      AND (
        image_urls NOT LIKE 'https://%'
      )
    ORDER BY created_at ASC
    LIMIT ${limit}
  `

  const replicate = getReplicateClient()

  let attempted = 0
  let completed = 0
  let failed = 0
  let skipped = 0

  for (const row of rows as any[]) {
    attempted += 1

    const { predictionId, sourceHint } = parsePredictionRef(row.image_urls)
    if (!predictionId) {
      skipped += 1
      continue
    }

    try {
      const prediction = await replicate.predictions.get(predictionId)

      if (prediction.status === "succeeded" && prediction.output) {
        const outputs = Array.isArray(prediction.output) ? prediction.output : [prediction.output]
        const urls: string[] = []

        // Cap uploads per record to avoid timeouts if a model returns huge arrays unexpectedly.
        for (let i = 0; i < Math.min(outputs.length, 6); i++) {
          const u = outputs[i]
          if (!u || typeof u !== "string") continue
          const blobUrl = await uploadImageFromUrlToBlob({
            url: u,
            key: `reconciled/${sourceHint}/${row.id}-${i}.png`,
          })
          urls.push(blobUrl)
        }

        if (urls.length === 0) {
          skipped += 1
          continue
        }

        const stored = urls.length === 1 ? urls[0] : urls.join(",")

        await sql`
          UPDATE generated_images
          SET image_urls = ${stored},
              selected_url = ${urls[0]},
          WHERE id = ${row.id}
        `

        // Best-effort gallery write.
        try {
          for (const imageUrl of urls) {
            const [existing] = await sql`
              SELECT id FROM ai_images
              WHERE image_url = ${imageUrl}
                 OR prediction_id = ${predictionId}
              LIMIT 1
            `
            if (existing) continue

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
                ${row.user_id},
                ${imageUrl},
                ${row.description || row.subcategory || ""},
                ${row.prompt || ""},
                ${predictionId},
                'completed',
                ${sourceHint},
                ${row.category || "concept"},
                NOW()
              )
            `
          }
        } catch (galleryErr) {
          await logAdminError({
            toolName: "cron:reconcile-generations:gallery",
            error: galleryErr instanceof Error ? galleryErr : new Error(String(galleryErr)),
            context: { generatedImageId: row.id, predictionId },
          }).catch(() => {})
        }

        completed += 1
        continue
      }

      if (prediction.status === "failed" || prediction.status === "canceled") {
        failed += 1
        continue
      }

      skipped += 1
    } catch (err) {
      failed += 1
      await logAdminError({
        toolName: "cron:reconcile-generations:generated-images",
        error: err instanceof Error ? err : new Error(String(err)),
        context: { generatedImageId: row.id, predictionId },
      }).catch(() => {})
    }
  }

  return { attempted, completed, failed, skipped }
}

async function reconcileFeedPosts(limit: number) {
  const rows = await sql`
    SELECT id, user_id, prediction_id, text_overlay
    FROM feed_posts
    WHERE prediction_id IS NOT NULL
      AND (image_url IS NULL OR image_url = '')
      AND generation_status IN ('pending', 'generating', 'processing')
      AND updated_at < NOW() - INTERVAL '5 minutes'
    ORDER BY updated_at ASC
    LIMIT ${limit}
  `

  const replicate = getReplicateClient()
  let attempted = 0
  let completed = 0
  let failed = 0
  let skipped = 0

  for (const row of rows as any[]) {
    attempted += 1
    const predictionId = String(row.prediction_id || "")
    if (!predictionId) {
      skipped += 1
      continue
    }

    // Avoid heavy canvas work in cron for now; the normal polling endpoints handle overlays.
    if (row.text_overlay) {
      skipped += 1
      continue
    }

    try {
      const prediction = await replicate.predictions.get(predictionId)
      if (prediction.status === "succeeded" && prediction.output) {
        const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
        if (!imageUrl || typeof imageUrl !== "string") {
          skipped += 1
          continue
        }

        let finalUrl = imageUrl
        try {
          finalUrl = await uploadImageFromUrlToBlob({
            url: imageUrl,
            key: `reconciled/feed-posts/${row.id}.png`,
          })
        } catch (blobErr) {
          // Fallback: keep Replicate URL (temporary) rather than blocking completion.
          await logAdminError({
            toolName: "cron:reconcile-generations:feed-posts:blob",
            error: blobErr instanceof Error ? blobErr : new Error(String(blobErr)),
            context: { postId: row.id, predictionId },
          }).catch(() => {})
        }

        await sql`
          UPDATE feed_posts
          SET image_url = ${finalUrl},
              generation_status = 'completed',
              updated_at = NOW()
          WHERE id = ${row.id}
        `

        // Best-effort gallery write.
        try {
          const [existing] = await sql`
            SELECT id FROM ai_images
            WHERE prediction_id = ${predictionId}
               OR image_url = ${finalUrl}
            LIMIT 1
          `
          if (!existing) {
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
                ${row.user_id},
                ${finalUrl},
                ${""},
                ${""},
                ${predictionId},
                'completed',
                'feed_planner',
                'feed_post',
                NOW()
              )
            `
          }
        } catch (galleryErr) {
          await logAdminError({
            toolName: "cron:reconcile-generations:feed-posts:gallery",
            error: galleryErr instanceof Error ? galleryErr : new Error(String(galleryErr)),
            context: { postId: row.id, predictionId },
          }).catch(() => {})
        }

        completed += 1
      } else if (prediction.status === "failed" || prediction.status === "canceled") {
        await sql`
          UPDATE feed_posts
          SET generation_status = 'failed',
              updated_at = NOW()
          WHERE id = ${row.id}
        `
        failed += 1
      } else {
        skipped += 1
      }
    } catch (err) {
      failed += 1
      await logAdminError({
        toolName: "cron:reconcile-generations:feed-posts",
        error: err instanceof Error ? err : new Error(String(err)),
        context: { postId: row.id, predictionId },
      }).catch(() => {})
    }
  }

  return { attempted, completed, failed, skipped }
}

async function reconcileLegacyGenerationTrackers(limit: number) {
  const rows = await sql`
    SELECT id, user_id, prediction_id, status, created_at
    FROM generation_trackers
    WHERE created_at < NOW() - INTERVAL '30 minutes'
      AND status IN ('queued', 'starting', 'processing', 'running', 'in_progress', 'pending')
      AND prediction_id IS NOT NULL
    ORDER BY created_at ASC
    LIMIT ${limit}
  `

  const replicate = getReplicateClient()
  let attempted = 0
  let completed = 0
  let failed = 0
  let skipped = 0

  for (const row of rows as any[]) {
    attempted += 1
    const predictionId = String(row.prediction_id || "")
    if (!predictionId) {
      skipped += 1
      continue
    }

    try {
      const prediction = await replicate.predictions.get(predictionId)
      if (prediction.status === "succeeded" && prediction.output) {
        const outputs = Array.isArray(prediction.output) ? prediction.output : [prediction.output]
        const urls: string[] = []
        for (let i = 0; i < Math.min(outputs.length, 6); i++) {
          const u = outputs[i]
          if (!u || typeof u !== "string") continue
          const blobUrl = await uploadImageFromUrlToBlob({
            url: u,
            key: `reconciled/legacy/${row.id}-${i}.png`,
          })
          urls.push(blobUrl)
        }

        await sql`
          UPDATE generation_trackers
          SET status = 'succeeded',
              image_urls = ${urls.join(",")},
              updated_at = NOW()
          WHERE id = ${row.id}
        `
        completed += 1
      } else if (prediction.status === "failed" || prediction.status === "canceled") {
        await sql`
          UPDATE generation_trackers
          SET status = ${prediction.status},
              updated_at = NOW()
          WHERE id = ${row.id}
        `
        failed += 1
      } else {
        skipped += 1
      }
    } catch (err) {
      failed += 1
      await logAdminError({
        toolName: "cron:reconcile-generations:generation-trackers",
        error: err instanceof Error ? err : new Error(String(err)),
        context: { generationTrackerId: row.id, predictionId },
      }).catch(() => {})
    }
  }

  return { attempted, completed, failed, skipped }
}

/**
 * GET /api/cron/reconcile-generations
 *
 * Background reconciliation so users don't lose generations if they close the tab:
 * - Persist Replicate outputs to Vercel Blob for:
 *   - generated_images rows that still store prediction IDs (studio + maya classic)
 *   - feed_posts rows still generating (best-effort, no text overlay)
 * - Optionally: clean up legacy generation_trackers (best-effort)
 */
export async function GET(request: NextRequest) {
  const cronLogger = createCronLogger("reconcile-generations")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      await cronLogger.error(new Error("Cron secret not configured"), { reason: "Missing CRON_SECRET" })
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const generatedImages = await reconcileGeneratedImages(Number(process.env.RECONCILE_GENERATIONS_LIMIT || 4))
    const feedPosts = await reconcileFeedPosts(Number(process.env.RECONCILE_FEED_POSTS_LIMIT || 4))

    const legacyEnabled = process.env.RECONCILE_LEGACY_GENERATION_TRACKERS === "true"
    const legacy = legacyEnabled
      ? await reconcileLegacyGenerationTrackers(Number(process.env.RECONCILE_LEGACY_LIMIT || 3))
      : { attempted: 0, completed: 0, failed: 0, skipped: 0 }

    const summary = { generatedImages, feedPosts, legacyEnabled, legacy }
    await cronLogger.success(summary)
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    await cronLogger.error(error, { reason: "Unhandled reconcile-generations error" })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reconcile generations" },
      { status: 500 },
    )
  }
}
