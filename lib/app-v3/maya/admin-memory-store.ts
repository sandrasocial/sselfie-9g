import { sql } from "@/lib/db/client"

export type AdminMemoryKind = "approval" | "rejection" | "preference" | "voice" | "workflow" | "content_signal"

export type AdminMemorySourceType = "maya_chat" | "shoot" | "shot" | "carousel" | "story" | "vault_drop" | "manual"

export type AdminMemoryNoteInput = {
  adminUserId?: string | null
  kind: AdminMemoryKind
  note: string
  sourceType?: AdminMemorySourceType
  sourceId?: string | number | null
  sourceTitle?: string | null
  metadata?: Record<string, unknown> | null
}

let ensured: Promise<void> | null = null

export function ensureAdminMemoryTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS app_v3_admin_memory (
          id             bigserial PRIMARY KEY,
          admin_user_id  text,
          kind           text NOT NULL,
          source_type    text NOT NULL DEFAULT 'manual',
          source_id      text,
          source_title   text,
          note           text NOT NULL,
          metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at     timestamptz NOT NULL DEFAULT now()
        )
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_app_v3_admin_memory_created_at
        ON app_v3_admin_memory (created_at DESC)
      `
      await sql`
        CREATE INDEX IF NOT EXISTS idx_app_v3_admin_memory_kind
        ON app_v3_admin_memory (kind, created_at DESC)
      `
    })().catch((error) => {
      ensured = null
      throw error
    })
  }
  return ensured
}

function cleanText(value: string | null | undefined, max = 500): string | null {
  const text = value?.trim()
  if (!text) return null
  return text.replace(/\s+/g, " ").slice(0, max)
}

export async function addAdminMemoryNote(input: AdminMemoryNoteInput): Promise<{ saved: boolean; id?: number }> {
  const note = cleanText(input.note, 900)
  if (!note) return { saved: false }

  await ensureAdminMemoryTable()
  const sourceType = input.sourceType ?? "manual"
  const sourceId = input.sourceId == null ? null : String(input.sourceId)
  const sourceTitle = cleanText(input.sourceTitle, 180)
  const metadata = input.metadata ?? {}

  const duplicateRows = (await sql`
    SELECT id
    FROM app_v3_admin_memory
    WHERE kind = ${input.kind}
      AND note = ${note}
      AND COALESCE(source_type, '') = ${sourceType}
      AND COALESCE(source_id, '') = COALESCE(${sourceId}, '')
    LIMIT 1
  `) as Array<{ id: number }>

  if (duplicateRows[0]?.id) return { saved: false, id: Number(duplicateRows[0].id) }

  const rows = (await sql`
    INSERT INTO app_v3_admin_memory (
      admin_user_id,
      kind,
      source_type,
      source_id,
      source_title,
      note,
      metadata
    )
    VALUES (
      ${cleanText(input.adminUserId, 120)},
      ${input.kind},
      ${sourceType},
      ${sourceId},
      ${sourceTitle},
      ${note},
      ${JSON.stringify(metadata)}::jsonb
    )
    RETURNING id
  `) as Array<{ id: number }>

  return { saved: true, id: Number(rows[0]?.id || 0) || undefined }
}

export async function getAdminMemoryContext(limit = 14): Promise<string> {
  await ensureAdminMemoryTable()
  const rows = (await sql`
    SELECT kind, source_type, source_id, source_title, note, created_at
    FROM app_v3_admin_memory
    ORDER BY created_at DESC
    LIMIT ${Math.max(1, Math.min(limit, 30))}
  `) as Array<{
    kind: AdminMemoryKind
    source_type: string
    source_id: string | null
    source_title: string | null
    note: string
    created_at: Date | string
  }>

  if (!rows.length) return ""

  const lines = rows.map((row) => {
    const source = [row.source_type, row.source_title || row.source_id].filter(Boolean).join(": ")
    return `- ${row.kind}${source ? ` (${source})` : ""}: ${row.note}`
  })

  return [
    "---",
    "## ADMIN EDITORIAL MEMORY",
    "These are Sandra's recent approval, rejection, voice, and workflow signals. Use them as taste memory. Do not quote the list unless she asks.",
    lines.join("\n"),
  ].join("\n")
}
