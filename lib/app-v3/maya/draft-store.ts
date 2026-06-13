import { sql } from "@/lib/db/client"
import { sanitizeServerMayaDraftSnapshot, type ServerMayaDraftSnapshot } from "./draft-snapshot"

let ensured: Promise<void> | null = null

export function ensureDraftsTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS app_v3_maya_drafts (
          user_id    text PRIMARY KEY,
          chat_id    text NOT NULL,
          snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          cleared_at timestamptz
        )
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_app_v3_maya_drafts_updated
          ON app_v3_maya_drafts (updated_at DESC)
          WHERE cleared_at IS NULL
      `
    })().catch(error => {
      ensured = null
      throw error
    })
  }
  return ensured
}

export async function loadActiveDraft(userId: string): Promise<ServerMayaDraftSnapshot | null> {
  await ensureDraftsTable()
  const rows = await sql`
    SELECT snapshot
    FROM app_v3_maya_drafts
    WHERE user_id = ${userId} AND cleared_at IS NULL
    LIMIT 1
  `
  const row = rows[0] as { snapshot: unknown } | undefined
  return sanitizeServerMayaDraftSnapshot(row?.snapshot)
}

export async function saveActiveDraft(
  userId: string,
  snapshot: ServerMayaDraftSnapshot
): Promise<void> {
  await ensureDraftsTable()
  await sql`
    INSERT INTO app_v3_maya_drafts (user_id, chat_id, snapshot, updated_at, cleared_at)
    VALUES (${userId}, ${snapshot.chatId}, ${JSON.stringify(snapshot)}::jsonb, now(), NULL)
    ON CONFLICT (user_id) DO UPDATE
      SET chat_id = EXCLUDED.chat_id,
          snapshot = EXCLUDED.snapshot,
          updated_at = now(),
          cleared_at = NULL
  `
}

export async function clearActiveDraft(userId: string): Promise<void> {
  await ensureDraftsTable()
  await sql`
    UPDATE app_v3_maya_drafts
    SET cleared_at = now(), updated_at = now()
    WHERE user_id = ${userId}
  `
}
