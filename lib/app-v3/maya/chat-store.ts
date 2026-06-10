// SSELFIE Studio 3.0 — /app chat persistence store (MAYA-REBUILD-05 Phase C).
// Single source for the app_v3_chats table queries. Schema carries user_id so it is
// member-ready; UI stays admin-gated for now. Isolated and additive; no legacy table touched.
//
// Uses a guarded lazy CREATE TABLE IF NOT EXISTS (an established pattern in this repo) so the
// staging preview works without a manual migration. migrations/20260609_app_v3_chats.sql is the
// canonical record for the formal production apply.

import { sql } from "@/lib/db/client"

let ensured: Promise<void> | null = null

/** Create the table + index once per server instance (best-effort, retries on failure). */
export function ensureChatsTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS app_v3_chats (
          id          text PRIMARY KEY,
          user_id     text NOT NULL,
          title       text,
          messages    jsonb NOT NULL DEFAULT '[]'::jsonb,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now(),
          archived_at timestamptz
        )
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_app_v3_chats_user
          ON app_v3_chats (user_id, updated_at DESC)
          WHERE archived_at IS NULL
      `
    })().catch((e) => {
      ensured = null // allow a later retry if the first attempt failed
      throw e
    })
  }
  return ensured
}

export interface ChatListItem {
  id: string
  title: string | null
  updatedAt: string
}

export async function listChats(userId: string): Promise<ChatListItem[]> {
  await ensureChatsTable()
  const rows = await sql`
    SELECT id, title, updated_at
    FROM app_v3_chats
    WHERE user_id = ${userId} AND archived_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 50
  `
  return rows.map((r) => ({
    id: String(r.id),
    title: (r.title ?? null) as string | null,
    updatedAt: String(r.updated_at),
  }))
}

export async function loadChat(
  userId: string,
  id: string,
): Promise<{ id: string; messages: unknown[] } | null> {
  await ensureChatsTable()
  const rows = await sql`
    SELECT id, messages
    FROM app_v3_chats
    WHERE id = ${id} AND user_id = ${userId} AND archived_at IS NULL
    LIMIT 1
  `
  const row = rows[0] as { id: string; messages: unknown } | undefined
  if (!row) return null
  return { id: row.id, messages: Array.isArray(row.messages) ? row.messages : [] }
}

/** Upsert a conversation. Ownership-guarded so one user can never overwrite another's row. */
export async function saveChat(
  userId: string,
  id: string,
  messages: unknown[],
  title: string | null,
): Promise<void> {
  await ensureChatsTable()
  await sql`
    INSERT INTO app_v3_chats (id, user_id, title, messages, updated_at)
    VALUES (${id}, ${userId}, ${title}, ${JSON.stringify(messages)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
      SET messages = EXCLUDED.messages,
          title = COALESCE(app_v3_chats.title, EXCLUDED.title),
          updated_at = now()
      WHERE app_v3_chats.user_id = ${userId}
  `
}

/** Soft-archive (never hard delete). */
export async function archiveChat(userId: string, id: string): Promise<void> {
  await ensureChatsTable()
  await sql`
    UPDATE app_v3_chats
    SET archived_at = now(), updated_at = now()
    WHERE id = ${id} AND user_id = ${userId}
  `
}
