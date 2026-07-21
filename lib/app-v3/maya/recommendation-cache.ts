import { createHash } from "node:crypto"

import { sql } from "@/lib/db/client"

export type CachedRecommendationPayload = {
  greeting: string
  recommendations: Array<{
    title: string
    rationale: string
    format: string
    imageUrl?: string | null
    imageReason?: string | null
  }>
}

let tableReady: Promise<void> | null = null

async function ensureRecommendationCacheTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS app_v3_maya_recommendation_cache (
          user_id TEXT NOT NULL,
          cache_day DATE NOT NULL DEFAULT CURRENT_DATE,
          context_fingerprint TEXT NOT NULL,
          payload JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, cache_day, context_fingerprint)
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS idx_maya_recommendation_cache_created ON app_v3_maya_recommendation_cache(created_at DESC)`
    })().catch(error => {
      tableReady = null
      throw error
    })
  }
  return tableReady
}

export function getRecommendationContextFingerprint(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex")
}

export async function getCachedRecommendations(
  userId: string,
  contextFingerprint: string
): Promise<CachedRecommendationPayload | null> {
  try {
    await ensureRecommendationCacheTable()
    const rows = await sql`
      SELECT payload
      FROM app_v3_maya_recommendation_cache
      WHERE user_id = ${userId}
        AND cache_day = CURRENT_DATE
        AND context_fingerprint = ${contextFingerprint}
      LIMIT 1
    `
    const payload = rows[0]?.payload
    if (!payload || typeof payload !== "object") return null
    return payload as CachedRecommendationPayload
  } catch (error) {
    console.warn("[maya-recommendations] cache read skipped:", error)
    return null
  }
}

export async function saveCachedRecommendations(
  userId: string,
  contextFingerprint: string,
  payload: CachedRecommendationPayload
): Promise<void> {
  try {
    await ensureRecommendationCacheTable()
    await sql`
      INSERT INTO app_v3_maya_recommendation_cache (
        user_id, cache_day, context_fingerprint, payload
      ) VALUES (
        ${userId}, CURRENT_DATE, ${contextFingerprint}, ${JSON.stringify(payload)}::jsonb
      )
      ON CONFLICT (user_id, cache_day, context_fingerprint)
      DO UPDATE SET payload = EXCLUDED.payload, created_at = NOW()
    `
  } catch (error) {
    console.warn("[maya-recommendations] cache write skipped:", error)
  }
}
