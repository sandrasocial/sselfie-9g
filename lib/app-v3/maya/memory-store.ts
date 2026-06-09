// SSELFIE Studio 3.0 — /app cross-session memory store (MAYA-REBUILD-05 Phase E).
// One row per user: agent name + what Maya should remember about their brand/style. This is
// the North Star differentiator ("the AI that already knows your brand"). Member-ready schema,
// admin-gated UI for now. Guarded lazy CREATE TABLE IF NOT EXISTS (repo precedent); the formal
// record is migrations/20260609_app_v3_memory.sql. Isolated and additive.

import { sql } from "@/lib/db/client"

export interface AppV3Memory {
  agentName: string | null
  brandNotes: string | null
  preferences: string | null
  userAvatarUrl: string | null
}

const EMPTY: AppV3Memory = { agentName: null, brandNotes: null, preferences: null, userAvatarUrl: null }

let ensured: Promise<void> | null = null

export function ensureMemoryTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS app_v3_memory (
          user_id     text PRIMARY KEY,
          agent_name  text,
          brand_notes text,
          preferences text,
          updated_at  timestamptz NOT NULL DEFAULT now()
        )
      `
      // Added after the initial Phase E table; ADD COLUMN IF NOT EXISTS is idempotent.
      await sql`ALTER TABLE app_v3_memory ADD COLUMN IF NOT EXISTS user_avatar_url text`
    })().catch((e) => {
      ensured = null
      throw e
    })
  }
  return ensured
}

/** Read a user's memory. Returns all-null when there's no row yet. */
export async function getMemory(userId: string): Promise<AppV3Memory> {
  await ensureMemoryTable()
  const rows = await sql`
    SELECT agent_name, brand_notes, preferences, user_avatar_url
    FROM app_v3_memory
    WHERE user_id = ${userId}
    LIMIT 1
  `
  const row = rows[0] as
    | {
        agent_name: string | null
        brand_notes: string | null
        preferences: string | null
        user_avatar_url: string | null
      }
    | undefined
  if (!row) return { ...EMPTY }
  return {
    agentName: row.agent_name ?? null,
    brandNotes: row.brand_notes ?? null,
    preferences: row.preferences ?? null,
    userAvatarUrl: row.user_avatar_url ?? null,
  }
}

/**
 * Resolve one patch field against the current value.
 * - undefined  -> leave unchanged
 * - null or "" -> clear
 * - text       -> trimmed (capped)
 */
function resolve(patchVal: string | null | undefined, currentVal: string | null): string | null {
  if (patchVal === undefined) return currentVal
  if (patchVal === null) return null
  const t = patchVal.trim()
  return t.length > 0 ? t.slice(0, 2000) : null
}

/**
 * Upsert memory with patch semantics. Read-merge-write (no driver-specific SQL fragment
 * composition): only provided fields change; the rest are preserved.
 */
export async function saveMemory(
  userId: string,
  patch: {
    agentName?: string | null
    brandNotes?: string | null
    preferences?: string | null
    userAvatarUrl?: string | null
  },
): Promise<void> {
  await ensureMemoryTable()
  const current = await getMemory(userId)
  const agentName = resolve(patch.agentName, current.agentName)
  const brandNotes = resolve(patch.brandNotes, current.brandNotes)
  const preferences = resolve(patch.preferences, current.preferences)
  const userAvatarUrl = resolve(patch.userAvatarUrl, current.userAvatarUrl)

  await sql`
    INSERT INTO app_v3_memory (user_id, agent_name, brand_notes, preferences, user_avatar_url, updated_at)
    VALUES (${userId}, ${agentName}, ${brandNotes}, ${preferences}, ${userAvatarUrl}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      agent_name      = EXCLUDED.agent_name,
      brand_notes     = EXCLUDED.brand_notes,
      preferences     = EXCLUDED.preferences,
      user_avatar_url = EXCLUDED.user_avatar_url,
      updated_at      = now()
  `
}
