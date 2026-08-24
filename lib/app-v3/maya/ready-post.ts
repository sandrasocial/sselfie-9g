import "server-only"

import { createHash } from "node:crypto"
import { sql } from "@/lib/db/client"
import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { capturePersistedPostHogEvent } from "@/lib/analytics/events"

export interface MayaReadyPostInput {
  userId: string
  assetIds: number[]
  finishedCaption: string
  conceptTitle?: string | null
  periodMonth: string
  feedStyle: string
  feedStyleVariationId?: string | number | null
}

export interface MayaReadyPostReceipt {
  position: number
  scheduledAt: string
  caption: string
  alreadyPlaced: boolean
}

type ReadyPostQueryTag<T> = (strings: TemplateStringsArray, ...values: unknown[]) => T

function firstRow(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const row = value[0]
  return row && typeof row === "object" ? (row as Record<string, unknown>) : null
}

export function normalizeReadyPostInput(input: MayaReadyPostInput): {
  assetIds: number[]
  caption: string
  contentPillar: string
  readyPostKey: string
} {
  const assetIds = input.assetIds
  if (
    !Array.isArray(assetIds) ||
    assetIds.length < 1 ||
    assetIds.length > 10 ||
    new Set(assetIds).size !== assetIds.length ||
    assetIds.some(id => !Number.isInteger(id) || id <= 0)
  ) {
    throw new Error("A ready post needs one to ten distinct owned images")
  }
  const caption = input.finishedCaption.trim()
  if (!caption || caption.length > 5000) {
    throw new Error("A ready post needs the finished caption")
  }
  const contentPillar =
    typeof input.conceptTitle === "string" && input.conceptTitle.trim()
      ? input.conceptTitle.trim().slice(0, 160)
      : "From Maya"
  const readyPostKey = createHash("sha256")
    .update(JSON.stringify({ userId: input.userId, assetIds, caption }))
    .digest("hex")

  return { assetIds, caption, contentPillar, readyPostKey }
}

/**
 * Keep the production transaction and the real-PostgreSQL regression fixture on the exact same
 * statements. The layout insert is deliberately its own statement: after it runs, the placement
 * statement gets a fresh READ COMMITTED snapshot and can always see the resolved layout.
 */
export function buildMayaReadyPostTransactionQueries<T>(
  tx: ReadyPostQueryTag<T>,
  input: MayaReadyPostInput,
  normalized: ReturnType<typeof normalizeReadyPostInput>
): T[] {
  const lockKey = `maya-ready-post:${input.userId}`
  const title = `Feed plan - ${input.periodMonth}`
  const assetIds = normalized.assetIds

  return [
    tx`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    tx`
      INSERT INTO feed_layouts (
        user_id, title, layout_type, status, feed_style, feed_style_variation_id, period_month
      )
      SELECT
        ${input.userId}, ${title}, 'grid_3x3', 'draft', ${input.feedStyle},
        ${input.feedStyleVariationId ?? null}, ${input.periodMonth}
      WHERE NOT EXISTS (
        SELECT 1 FROM feed_layouts WHERE user_id = ${input.userId}
      )
        AND (
          SELECT COUNT(*)::int
          FROM ai_images
          WHERE user_id = ${input.userId}
            AND image_url IS NOT NULL
            AND id = ANY(${assetIds}::bigint[])
        ) = ${assetIds.length}
      RETURNING id
    `,
    tx`
      WITH requested_assets AS (
        SELECT requested.id, requested.ordinality
        FROM unnest(${assetIds}::bigint[]) WITH ORDINALITY AS requested(id, ordinality)
      ), owned_assets AS (
        SELECT requested.ordinality, image.id, image.image_url
        FROM requested_assets requested
        INNER JOIN ai_images image
          ON image.id = requested.id
         AND image.user_id = ${input.userId}
         AND image.image_url IS NOT NULL
      ), validated_assets AS (
        SELECT
          MIN(id) FILTER (WHERE ordinality = 1)::int AS primary_asset_id,
          MIN(image_url) FILTER (WHERE ordinality = 1) AS primary_image_url,
          jsonb_agg(image_url ORDER BY ordinality) AS media_urls,
          COUNT(*)::int AS media_count
        FROM owned_assets
        HAVING COUNT(*) = ${assetIds.length}
      ), existing_event AS (
        SELECT post.position, post.scheduled_at::text AS scheduled_at
        FROM analytics_events event
        INNER JOIN feed_posts post
          ON post.id = CASE
            WHEN event.properties->>'feed_post_id' ~ '^[0-9]+$'
              THEN (event.properties->>'feed_post_id')::bigint
            ELSE NULL
          END
        CROSS JOIN validated_assets assets
        WHERE event.event_name = 'suite_ready_post_saved'
          AND event.user_id = ${input.userId}
          AND event.properties->>'ready_post_key' = ${normalized.readyPostKey}
          AND post.user_id = ${input.userId}
          AND post.generation_status = 'completed'
          AND post.caption = ${normalized.caption}
          AND post.ai_image_id = assets.primary_asset_id
          AND post.image_url = assets.primary_image_url
          AND COALESCE(post.media_urls, '[]'::jsonb) = assets.media_urls
        ORDER BY event.created_at ASC
        LIMIT 1
      ), current_layout AS (
        SELECT id, feed_style
        FROM feed_layouts
        WHERE user_id = ${input.userId} AND period_month = ${input.periodMonth}
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ), fallback_layout AS (
        SELECT id, feed_style
        FROM feed_layouts
        WHERE user_id = ${input.userId}
          AND NOT EXISTS (SELECT 1 FROM current_layout)
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ), resolved_layout AS (
        SELECT id, feed_style FROM current_layout
        UNION ALL
        SELECT id, feed_style FROM fallback_layout
        LIMIT 1
      ), open_slot AS (
        SELECT post.id, post.position, post.scheduled_at
        FROM feed_posts post
        CROSS JOIN resolved_layout layout
        WHERE post.feed_layout_id = layout.id
          AND post.image_url IS NULL
          AND post.scheduled_at >= CURRENT_DATE
          AND COALESCE(post.post_type, 'selfie') NOT IN ('flatlay', 'detail')
          AND NOT EXISTS (SELECT 1 FROM existing_event)
          AND EXISTS (SELECT 1 FROM validated_assets)
        ORDER BY post.scheduled_at ASC, post.position ASC
        LIMIT 1
        FOR UPDATE OF post SKIP LOCKED
      ), latest_slot AS (
        SELECT
          COALESCE(MAX(post.position), 0)::int AS max_position,
          MAX(post.scheduled_at)::date AS max_date
        FROM feed_posts post
        CROSS JOIN resolved_layout layout
        WHERE post.feed_layout_id = layout.id
      ), updated_post AS (
        UPDATE feed_posts post
        SET
          image_url = assets.primary_image_url,
          ai_image_id = assets.primary_asset_id,
          generation_status = 'completed',
          caption = ${normalized.caption},
          content_pillar = ${normalized.contentPillar},
          media_urls = assets.media_urls
        FROM open_slot target
        CROSS JOIN validated_assets assets
        WHERE post.id = target.id
          AND post.user_id = ${input.userId}
          AND post.image_url IS NULL
        RETURNING post.id, post.position, post.scheduled_at, assets.media_count
      ), inserted_post AS (
        INSERT INTO feed_posts (
          feed_layout_id, user_id, position, post_type, content_pillar, scheduled_at,
          generation_status, image_url, ai_image_id, caption, media_urls
        )
        SELECT
          layout.id, ${input.userId}, latest.max_position + 1, 'selfie',
          ${normalized.contentPillar},
          GREATEST(CURRENT_DATE, COALESCE(latest.max_date + 1, CURRENT_DATE)),
          'completed', assets.primary_image_url, assets.primary_asset_id,
          ${normalized.caption}, assets.media_urls
        FROM resolved_layout layout
        CROSS JOIN latest_slot latest
        CROSS JOIN validated_assets assets
        WHERE NOT EXISTS (SELECT 1 FROM existing_event)
          AND NOT EXISTS (SELECT 1 FROM open_slot)
        RETURNING id, position, scheduled_at, jsonb_array_length(media_urls)::int AS media_count
      ), stored_post AS (
        SELECT id, position, scheduled_at, media_count FROM updated_post
        UNION ALL
        SELECT id, position, scheduled_at, media_count FROM inserted_post
        LIMIT 1
      ), stored_event AS (
        INSERT INTO analytics_events (user_id, event_name, path, properties)
        SELECT
          ${input.userId}, 'suite_ready_post_saved', '/app',
          jsonb_build_object(
            'contract_version', 1,
            'source', 'maya_ready_post',
            'ready_post_key', ${normalized.readyPostKey}::text,
            'feed_post_id', stored.id,
            'media_count', stored.media_count,
            'calendar_position', stored.position,
            'scheduled_at', stored.scheduled_at::text
          )
        FROM stored_post stored
        RETURNING
          (properties->>'calendar_position')::int AS position,
          properties->>'scheduled_at' AS scheduled_at
      ), receipt AS (
        SELECT position, scheduled_at, TRUE AS already_placed FROM existing_event
        UNION ALL
        SELECT position, scheduled_at, FALSE AS already_placed FROM stored_event
        LIMIT 1
      )
      SELECT position, scheduled_at, already_placed FROM receipt
    `,
  ]
}

/**
 * Persist Maya's exact finished media + caption and its completion fact in one transaction.
 * The first statement owns the member-wide Calendar placement lock; the second receives a fresh
 * READ COMMITTED snapshot after waiting. No provider call or caption generation occurs here.
 */
export async function saveMayaReadyPost(
  input: MayaReadyPostInput
): Promise<MayaReadyPostReceipt | null> {
  const normalized = normalizeReadyPostInput(input)
  await ensureAnalyticsSchema()
  const transactionRows = (await sql.transaction(tx =>
    buildMayaReadyPostTransactionQueries(tx, input, normalized)
  )) as unknown[]

  const row = firstRow(transactionRows[transactionRows.length - 1])
  if (!row) return null
  const position = Number(row.position)
  const scheduledAt = typeof row.scheduled_at === "string" ? row.scheduled_at.slice(0, 10) : ""
  if (!Number.isInteger(position) || position < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledAt)) {
    throw new Error("Calendar returned an invalid ready-post receipt")
  }
  const alreadyPlaced = row.already_placed === true
  if (!alreadyPlaced) {
    capturePersistedPostHogEvent({
      eventName: "suite_ready_post_saved",
      userId: input.userId,
      path: "/app",
      properties: { image_count: normalized.assetIds.length },
    })
  }
  return {
    position,
    scheduledAt,
    caption: normalized.caption,
    alreadyPlaced,
  }
}
