import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { createCronLogger } from "@/lib/cron-logger"
import { logAdminError } from "@/lib/admin-error-log"
import { getReplicateClient } from "@/lib/replicate-client"
import { put } from "@vercel/blob"


type SourceHint = "maya_chat" | "studio" | "unknown"

let reconcileStateTableReady: boolean | null = null

function toInt(v: string | undefined, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function parseTerminalStatusSet(raw: string | undefined): Set<number> {
  const out = new Set<number>()
  const src = String(raw || "400,401,403,404,410")
  for (const token of src.split(",")) {
    const n = Number(token.trim())
    if (Number.isFinite(n) && n >= 400 && n <= 599) out.add(n)
  }
  if (out.size === 0) {
    out.add(400)
    out.add(401)
    out.add(403)
    out.add(404)
    out.add(410)
  }
  return out
}

function getErrorStatusCode(error: unknown): number | null {
  const anyErr = error as any
  if (typeof anyErr?.status === "number") return anyErr.status
  if (typeof anyErr?.statusCode === "number") return anyErr.statusCode
  if (typeof anyErr?.response?.status === "number") return anyErr.response.status

  const msg = error instanceof Error ? error.message : String(error || "")
  const match = msg.match(/\((\d{3})\s+[A-Za-z]/) || msg.match(/\bstatus(?:\s*code)?[:=]?\s*(\d{3})\b/i)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function isTerminalFetchError(error: unknown, terminalHttpStatuses: Set<number>) {
  const statusCode = getErrorStatusCode(error)
  if (statusCode && terminalHttpStatuses.has(statusCode)) return true

  const msg = (error instanceof Error ? error.message : String(error || "")).toLowerCase()
  if (msg.includes("not found") || msg.includes("prediction not found")) return true
  if (msg.includes("invalid prediction")) return true
  return false
}

async function ensureReconcileStateTable(): Promise<boolean> {
  if (reconcileStateTableReady !== null) return reconcileStateTableReady

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS generated_image_reconcile_state (
        generated_image_id INTEGER PRIMARY KEY,
        retry_count INTEGER NOT NULL DEFAULT 0,
        terminal BOOLEAN NOT NULL DEFAULT false,
        terminal_reason TEXT,
        last_error_message TEXT,
        last_http_status INTEGER,
        last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_generated_image_reconcile_state_terminal_attempt
      ON generated_image_reconcile_state (terminal, last_attempt_at DESC)
    `
    reconcileStateTableReady = true
  } catch (err) {
    reconcileStateTableReady = false
    await logAdminError({
      toolName: "cron:reconcile-generations:state-table",
      error: err instanceof Error ? err : new Error(String(err)),
      context: { reason: "Failed to ensure generated_image_reconcile_state table" },
    }).catch(() => {})
  }

  return reconcileStateTableReady
}

async function clearReconcileFailureState(generatedImageId: number, enabled: boolean): Promise<void> {
  if (!enabled) return
  await sql`
    DELETE FROM generated_image_reconcile_state
    WHERE generated_image_id = ${generatedImageId}
  `
}

async function upsertReconcileFailureState(input: {
  generatedImageId: number
  reason: string
  errorMessage: string
  httpStatus: number | null
  terminal: boolean
  maxRetries: number
  enabled: boolean
}): Promise<void> {
  if (!input.enabled) return

  await sql`
    INSERT INTO generated_image_reconcile_state (
      generated_image_id,
      retry_count,
      terminal,
      terminal_reason,
      last_error_message,
      last_http_status,
      last_attempt_at,
      updated_at
    )
    VALUES (
      ${input.generatedImageId},
      1,
      ${input.terminal},
      ${input.terminal ? input.reason : null},
      ${input.errorMessage.slice(0, 600)},
      ${input.httpStatus},
      NOW(),
      NOW()
    )
    ON CONFLICT (generated_image_id)
    DO UPDATE SET
      retry_count = generated_image_reconcile_state.retry_count + 1,
      terminal = CASE
        WHEN ${input.terminal} THEN true
        WHEN generated_image_reconcile_state.retry_count + 1 >= ${input.maxRetries} THEN true
        ELSE generated_image_reconcile_state.terminal
      END,
      terminal_reason = CASE
        WHEN ${input.terminal} THEN ${input.reason}
        WHEN generated_image_reconcile_state.retry_count + 1 >= ${input.maxRetries} THEN 'max_retries_exceeded'
        ELSE generated_image_reconcile_state.terminal_reason
      END,
      last_error_message = ${input.errorMessage.slice(0, 600)},
      last_http_status = ${input.httpStatus},
      last_attempt_at = NOW(),
      updated_at = NOW()
  `
}

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

function isInvalidLegacyImageUrl(url: string): boolean {
  const v = String(url || "").trim().toLowerCase()
  if (!v.startsWith("https://")) return true
  if (v.includes("/undefined/")) return true
  if (v.includes("undefined_")) return true
  return false
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
  const maxAgeHours = toInt(process.env.RECONCILE_GENERATIONS_MAX_AGE_HOURS, 48)
  const maxRetries = Math.max(1, toInt(process.env.RECONCILE_GENERATIONS_MAX_RETRIES, 6))
  const retryBackoffMinutes = Math.max(1, toInt(process.env.RECONCILE_GENERATIONS_RETRY_BACKOFF_MINUTES, 30))
  const terminalHttpStatuses = parseTerminalStatusSet(process.env.RECONCILE_GENERATIONS_TERMINAL_HTTP_STATUSES)
  const stateEnabled = await ensureReconcileStateTable()

  const rows = stateEnabled
    ? await sql`
        SELECT gi.id, gi.user_id, gi.image_urls, gi.prompt, gi.description, gi.category, gi.subcategory, gi.created_at
        FROM generated_images gi
        LEFT JOIN generated_image_reconcile_state rs ON rs.generated_image_id = gi.id
        WHERE gi.created_at < NOW() - INTERVAL '5 minutes'
          AND (${maxAgeHours} <= 0 OR gi.created_at > NOW() - ${maxAgeHours} * INTERVAL '1 hour')
          AND gi.image_urls IS NOT NULL
          AND gi.image_urls NOT LIKE 'https://%'
          AND COALESCE(rs.terminal, false) = false
          AND (
            rs.last_attempt_at IS NULL
            OR rs.last_attempt_at < NOW() - ${retryBackoffMinutes} * INTERVAL '1 minute'
          )
        -- Process oldest pending rows first to prevent starvation when volume exceeds per-run limit.
        ORDER BY gi.created_at ASC
        LIMIT ${limit}
      `
    : await sql`
        SELECT id, user_id, image_urls, prompt, description, category, subcategory, created_at
        FROM generated_images
        WHERE created_at < NOW() - INTERVAL '5 minutes'
          AND (${maxAgeHours} <= 0 OR created_at > NOW() - ${maxAgeHours} * INTERVAL '1 hour')
          AND image_urls IS NOT NULL
          AND image_urls NOT LIKE 'https://%'
        -- Process oldest pending rows first to prevent starvation when volume exceeds per-run limit.
        ORDER BY created_at ASC
        LIMIT ${limit}
      `

  const replicate = getReplicateClient()

  let attempted = 0
  let completed = 0
  let failed = 0
  let skipped = 0
  let terminalized = 0

  for (const row of rows as any[]) {
    attempted += 1
    const generatedImageId = Number(row.id)

    const parsed = parsePredictionRef(row.image_urls)
    const { predictionId, sourceHint } = parsed

    if (parsed.kind === "urls") {
      try {
        const legacyUrls = parsed.urls.map((u) => String(u || "").trim()).filter(Boolean)
        const validLegacyUrls = legacyUrls.filter((u) => !isInvalidLegacyImageUrl(u))
        if (legacyUrls.length > 0 && validLegacyUrls.length === 0) {
          terminalized += 1
          await upsertReconcileFailureState({
            generatedImageId,
            reason: "legacy_url_invalid_source",
            errorMessage: "All legacy URLs are invalid placeholders (undefined path values).",
            httpStatus: null,
            terminal: true,
            maxRetries,
            enabled: stateEnabled,
          }).catch(() => {})
          await logAdminError({
            toolName: "cron:reconcile-generations:generated-images",
            error: new Error("Invalid legacy image URLs (undefined placeholders)"),
            context: { generatedImageId, predictionId: null, legacyUrls: legacyUrls.slice(0, 2), terminal: true },
          }).catch(() => {})
          continue
        }

        const urls: string[] = []
        const srcUrls = validLegacyUrls.length > 0 ? validLegacyUrls : legacyUrls
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
          WHERE id = ${generatedImageId}
        `
        await clearReconcileFailureState(generatedImageId, stateEnabled).catch(() => {})
        completed += 1
        continue
      } catch (err) {
        const statusCode = getErrorStatusCode(err)
        const terminal = isTerminalFetchError(err, terminalHttpStatuses)
        if (terminal) terminalized += 1
        else failed += 1
        await upsertReconcileFailureState({
          generatedImageId,
          reason: terminal ? `legacy_url_terminal_${statusCode || "error"}` : `legacy_url_retry_${statusCode || "error"}`,
          errorMessage: err instanceof Error ? err.message : String(err),
          httpStatus: statusCode,
          terminal,
          maxRetries,
          enabled: stateEnabled,
        }).catch(() => {})
        await logAdminError({
          toolName: "cron:reconcile-generations:generated-images",
          error: err instanceof Error ? err : new Error(String(err)),
          context: { generatedImageId, predictionId: null, legacyUrls: parsed.urls.slice(0, 2), terminal },
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
          WHERE id = ${generatedImageId}
        `
        await clearReconcileFailureState(generatedImageId, stateEnabled).catch(() => {})

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
        terminalized += 1
        await upsertReconcileFailureState({
          generatedImageId,
          reason: `prediction_${prediction.status}`,
          errorMessage: `Prediction terminal status: ${prediction.status}`,
          httpStatus: null,
          terminal: true,
          maxRetries,
          enabled: stateEnabled,
        }).catch(() => {})
        continue
      }

      skipped += 1
    } catch (err) {
      const statusCode = getErrorStatusCode(err)
      const terminal = isTerminalFetchError(err, terminalHttpStatuses)
      if (terminal) terminalized += 1
      else failed += 1
      await upsertReconcileFailureState({
        generatedImageId,
        reason: terminal ? `prediction_terminal_${statusCode || "error"}` : `prediction_retry_${statusCode || "error"}`,
        errorMessage: err instanceof Error ? err.message : String(err),
        httpStatus: statusCode,
        terminal,
        maxRetries,
        enabled: stateEnabled,
      }).catch(() => {})
      await logAdminError({
        toolName: "cron:reconcile-generations:generated-images",
        error: err instanceof Error ? err : new Error(String(err)),
        context: { generatedImageId, predictionId, terminal },
      }).catch(() => {})
    }
  }

  return { attempted, completed, failed, skipped, terminalized, stateTracking: stateEnabled }
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
 * - Feed planner reconciliation is handled by /api/cron/reconcile-generation-assets to avoid duplicate Replicate polling.
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
