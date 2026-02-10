import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import { getReplicateClient } from "@/lib/replicate-client"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL!)

type SourceHint = "maya_chat" | "studio" | "unknown"

function tryParseUrlArray(raw: string): string[] | null {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const urls = parsed.filter((x) => typeof x === "string" && x.startsWith("https://")) as string[]
    return urls.length > 0 ? urls : null
  } catch {
    return null
  }
}

function parsePredictionRef(imageUrlsRaw: string | null | undefined): {
  kind: "prediction" | "urls" | "none"
  predictionId: string | null
  urls: string[]
  sourceHint: SourceHint
} {
  const v = (imageUrlsRaw || "").trim()
  if (!v) return { kind: "none", predictionId: null, urls: [], sourceHint: "unknown" }

  // Completed: single or comma-separated blob URLs.
  if (v.startsWith("https://")) {
    const urls = v.split(",").map((s) => s.trim()).filter((s) => s.startsWith("https://"))
    return { kind: "urls", predictionId: null, urls, sourceHint: "unknown" }
  }

  // Some legacy records store a JSON array of URLs (not a Replicate prediction id).
  if (v.startsWith("[")) {
    const urls = tryParseUrlArray(v)
    if (urls) return { kind: "urls", predictionId: null, urls, sourceHint: "unknown" }
  }

  // Some rows appear to store a URL-encoded JSON array, e.g. `[%22https://...%22]`.
  if (v.startsWith("[") && v.includes("%22")) {
    try {
      const decoded = decodeURIComponent(v)
      const urls = decoded.startsWith("[") ? tryParseUrlArray(decoded) : null
      if (urls) return { kind: "urls", predictionId: null, urls, sourceHint: "unknown" }
    } catch {
      // fall through
    }
  }

  // Maya classic mode stores JSON in generated_images.image_urls.
  if (v.startsWith("{")) {
    try {
      const parsed = JSON.parse(v)
      const predictionId = typeof parsed?.prediction_id === "string" ? parsed.prediction_id : null
      return { kind: predictionId ? "prediction" : "none", predictionId, urls: [], sourceHint: "maya_chat" }
    } catch {
      return { kind: "none", predictionId: null, urls: [], sourceHint: "unknown" }
    }
  }

  // Otherwise treat it as a Replicate prediction id (older studio flow).
  return { kind: "prediction", predictionId: v, urls: [], sourceHint: "studio" }
}

async function uploadImageFromUrlToBlob(input: { url: string; key: string }) {
  const host = (() => {
    try {
      return new URL(input.url).host
    } catch {
      return "unknown-host"
    }
  })()

  const baseHeaders: Record<string, string> = {
    Accept: "image/*,*/*;q=0.8",
    "User-Agent": "sselfie-cron/1.0",
  }

  let res = await fetch(input.url, { headers: baseHeaders, redirect: "follow", cache: "no-store" })
  if (!res.ok && (res.status === 401 || res.status === 403)) {
    // Some CDNs block non-browser UAs; retry once with a common browser UA + browser-like headers.
    res = await fetch(input.url, {
      headers: {
        ...baseHeaders,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        // Some hosts gate image delivery by referer/origin.
        Referer: "https://replicate.com/",
        Origin: "https://replicate.com",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      cache: "no-store",
    })
  }
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status} ${res.statusText}) host=${host}`)
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
  const maxAgeHours = Number(process.env.RECONCILE_GENERATIONS_MAX_AGE_HOURS || 48)
  const rows = await sql`
    SELECT id, user_id, image_urls, prompt, description, category, subcategory, created_at
    FROM generated_images
    WHERE created_at < NOW() - INTERVAL '5 minutes'
      AND (${maxAgeHours} <= 0 OR created_at > NOW() - ${maxAgeHours} * INTERVAL '1 hour')
      AND image_urls IS NOT NULL
      AND (
        image_urls NOT LIKE 'https://%'
      )
    -- Process oldest pending rows first to prevent starvation when volume exceeds per-run limit.
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

    const parsed = parsePredictionRef(row.image_urls)
    const { predictionId, sourceHint } = parsed

    if (parsed.kind === "urls") {
      try {
        const urls: string[] = []
        const srcUrls = parsed.urls
        for (let i = 0; i < Math.min(srcUrls.length, 6); i++) {
          const u = srcUrls[i]
          const blobUrl = await uploadImageFromUrlToBlob({
            url: u,
            key: `reconciled/legacy/${row.id}-${i}.png`,
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
              selected_url = ${urls[0]}
          WHERE id = ${row.id}
        `
        completed += 1
        continue
      } catch (err) {
        failed += 1
        await logAdminError({
          toolName: "cron:reconcile-generations:generated-images",
          error: err instanceof Error ? err : new Error(String(err)),
          context: { generatedImageId: row.id, predictionId: null, legacyUrls: parsed.urls.slice(0, 2) },
        }).catch(() => {})
        continue
      }
    }

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
              selected_url = ${urls[0]}
          WHERE id = ${row.id}
        `

        // Best-effort gallery write.
        try {
          // If there's an existing row (common in Pro / gallery-first flows) with this prediction_id but no URL yet,
          // update it rather than skipping. This helps prevent "stuck generating" rows.
          const [existingByPrediction] = await sql`
            SELECT id, image_url, generation_status
            FROM ai_images
            WHERE prediction_id = ${predictionId}
            ORDER BY created_at ASC
            LIMIT 1
          `

          for (let i = 0; i < urls.length; i++) {
            const imageUrl = urls[i]

            const [existingByUrl] = await sql`
              SELECT id FROM ai_images
              WHERE image_url = ${imageUrl}
              LIMIT 1
            `
            if (existingByUrl) continue

            if (
              i === 0 &&
              existingByPrediction &&
              (!existingByPrediction.image_url || !String(existingByPrediction.image_url || "").startsWith("http")) &&
              String(existingByPrediction.generation_status || "") !== "completed"
            ) {
              await sql`
                UPDATE ai_images
                SET image_url = ${imageUrl},
                    generation_status = 'completed'
                WHERE id = ${existingByPrediction.id}
              `
              continue
            }

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
 * - Feed planner reconciliation is handled by /api/cron/reconcile-feed-posts to avoid duplicate Replicate polling.
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

    const legacyEnabled = process.env.RECONCILE_LEGACY_GENERATION_TRACKERS === "true"
    const legacy = legacyEnabled
      ? await reconcileLegacyGenerationTrackers(Number(process.env.RECONCILE_LEGACY_LIMIT || 3))
      : { attempted: 0, completed: 0, failed: 0, skipped: 0 }

    const summary = { generatedImages, legacyEnabled, legacy }
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
