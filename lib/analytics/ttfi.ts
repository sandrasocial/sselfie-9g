import { getDb } from "@/lib/db"
import { logAnalyticsEvent } from "@/lib/analytics/events"

type AnalyticsEventRow = {
  created_at?: string | Date | null
  properties?: Record<string, unknown> | null
}

const SIGNUP_TO_FIRST_GEN_EVENT = "signup_to_first_gen"

function toDate(value: unknown): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

export function extractLatestTtfiStartTimestamp(rows: AnalyticsEventRow[]): Date | null {
  let latest: Date | null = null

  for (const row of rows) {
    const stage = row?.properties?.stage
    if (stage !== "start") continue

    const timestamp = toDate(row.created_at)
    if (!timestamp) continue
    if (!latest || timestamp.getTime() > latest.getTime()) {
      latest = timestamp
    }
  }

  return latest
}

export function buildTtfiCompletionMetrics(input: { startAt: Date; endAt: Date }) {
  const elapsedMs = Math.max(0, input.endAt.getTime() - input.startAt.getTime())
  const ttfiSeconds = Math.round(elapsedMs / 1000)

  return {
    ttfi_seconds: ttfiSeconds,
    ttfi_minutes: Number((ttfiSeconds / 60).toFixed(2)),
  }
}

export async function logTtfiCompletionOnFirstGallerySave(input: {
  userId: string
  source: string
  isFirstGalleryImage: boolean
  imageSource?: string | null
  predictionId?: string | null
  endAt?: Date
}): Promise<boolean> {
  if (!input.isFirstGalleryImage) return false

  const sql = getDb()
  const startRows = (await sql`
    SELECT created_at, properties
    FROM analytics_events
    WHERE user_id = ${input.userId}
      AND event_name = ${SIGNUP_TO_FIRST_GEN_EVENT}
    ORDER BY created_at DESC
    LIMIT 25
  `) as AnalyticsEventRow[]

  const startAt = extractLatestTtfiStartTimestamp(startRows)
  const completedAt = input.endAt ?? new Date()
  const metrics = startAt ? buildTtfiCompletionMetrics({ startAt, endAt: completedAt }) : null

  await logAnalyticsEvent({
    eventName: SIGNUP_TO_FIRST_GEN_EVENT,
    userId: input.userId,
    properties: {
      stage: "complete",
      source: input.source,
      trigger: "first_gallery_save",
      image_source: input.imageSource ?? null,
      prediction_id: input.predictionId ?? null,
      started_at: startAt ? startAt.toISOString() : null,
      completed_at: completedAt.toISOString(),
      ...(metrics ?? {}),
    },
  })

  return true
}
