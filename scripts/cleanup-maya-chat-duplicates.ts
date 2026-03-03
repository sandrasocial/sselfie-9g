/**
 * Cleanup duplicate Maya chat messages created by overlapping save paths.
 *
 * Default mode is dry-run:
 *   pnpm tsx scripts/cleanup-maya-chat-duplicates.ts
 *
 * Apply cleanup:
 *   pnpm tsx scripts/cleanup-maya-chat-duplicates.ts --apply
 *
 * Optional knobs:
 *   --window-seconds <n>   // default 120
 *   --max-delete <n>       // cap rows deleted in one run (default 5000)
 */

import { neon } from "@neondatabase/serverless"
import { config as loadEnv } from "dotenv"
import { resolve } from "node:path"

loadEnv({ path: resolve(process.cwd(), ".env.local") })
loadEnv({ path: resolve(process.cwd(), ".env") })

const APPLY = process.argv.includes("--apply")
const windowIndex = process.argv.indexOf("--window-seconds")
const maxDeleteIndex = process.argv.indexOf("--max-delete")

const parsedWindow =
  windowIndex > -1 ? Number.parseInt(process.argv[windowIndex + 1] || "", 10) : Number.NaN
const parsedMaxDelete =
  maxDeleteIndex > -1 ? Number.parseInt(process.argv[maxDeleteIndex + 1] || "", 10) : Number.NaN

const WINDOW_SECONDS = Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : 120
const MAX_DELETE = Number.isFinite(parsedMaxDelete) && parsedMaxDelete > 0 ? parsedMaxDelete : 5000

type DuplicateStatsRow = {
  total_rows: number
  duplicate_groups: number
  duplicate_rows: number
}

type DuplicateSampleRow = {
  chat_id: number
  role: "user" | "assistant"
  cnt: number
  first_at: string
  last_at: string
  sample_ids: number[]
  content_preview: string
}

function parseCount(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number.parseInt(value, 10) || 0
  return 0
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required")
  }

  const sql = neon(databaseUrl)
  const runId = `maya-dedupe-${new Date().toISOString()}`

  console.log(`[MayaDedupe] Mode: ${APPLY ? "APPLY" : "DRY RUN"}`)
  console.log(`[MayaDedupe] Window: ${WINDOW_SECONDS}s`)
  console.log(`[MayaDedupe] Max delete: ${MAX_DELETE}`)

  const [stats] = (await sql`
    WITH norm AS (
      SELECT
        m.id,
        m.chat_id,
        m.role,
        regexp_replace(trim(coalesce(m.content, '')), '\\s+', ' ', 'g') AS content_norm,
        coalesce((to_jsonb(m) -> 'concept_cards')::text, 'null') AS concept_norm,
        coalesce((to_jsonb(m) -> 'feed_cards')::text, (to_jsonb(m) -> 'styling_details')::text, 'null') AS feed_norm,
        m.created_at
      FROM maya_chat_messages m
    ),
    grouped AS (
      SELECT
        chat_id,
        role,
        content_norm,
        concept_norm,
        feed_norm,
        count(*)::int AS cnt,
        min(created_at) AS first_at,
        max(created_at) AS last_at
      FROM norm
      GROUP BY 1, 2, 3, 4, 5
      HAVING count(*) > 1
         AND EXTRACT(EPOCH FROM (max(created_at) - min(created_at))) <= ${WINDOW_SECONDS}
    )
    SELECT
      (SELECT count(*)::int FROM maya_chat_messages) AS total_rows,
      coalesce((SELECT count(*)::int FROM grouped), 0)::int AS duplicate_groups,
      coalesce((SELECT sum(cnt - 1)::int FROM grouped), 0)::int AS duplicate_rows
  `) as DuplicateStatsRow[]

  const sample = (await sql`
    WITH norm AS (
      SELECT
        m.id,
        m.chat_id,
        m.role,
        regexp_replace(trim(coalesce(m.content, '')), '\\s+', ' ', 'g') AS content_norm,
        coalesce((to_jsonb(m) -> 'concept_cards')::text, 'null') AS concept_norm,
        coalesce((to_jsonb(m) -> 'feed_cards')::text, (to_jsonb(m) -> 'styling_details')::text, 'null') AS feed_norm,
        m.created_at
      FROM maya_chat_messages m
    ),
    grouped AS (
      SELECT
        chat_id,
        role,
        content_norm,
        concept_norm,
        feed_norm,
        count(*)::int AS cnt,
        min(created_at) AS first_at,
        max(created_at) AS last_at,
        array_agg(id ORDER BY created_at ASC, id ASC) AS ids
      FROM norm
      GROUP BY 1, 2, 3, 4, 5
      HAVING count(*) > 1
         AND EXTRACT(EPOCH FROM (max(created_at) - min(created_at))) <= ${WINDOW_SECONDS}
    )
    SELECT
      chat_id,
      role,
      cnt,
      first_at::text,
      last_at::text,
      ids[1:5] AS sample_ids,
      left(content_norm, 120) AS content_preview
    FROM grouped
    ORDER BY cnt DESC, first_at DESC
    LIMIT 20
  `) as DuplicateSampleRow[]

  const totalRows = parseCount(stats?.total_rows)
  const duplicateGroups = parseCount(stats?.duplicate_groups)
  const duplicateRows = parseCount(stats?.duplicate_rows)

  console.log(`[MayaDedupe] Total rows: ${totalRows}`)
  console.log(`[MayaDedupe] Duplicate groups in window: ${duplicateGroups}`)
  console.log(`[MayaDedupe] Duplicate rows to remove: ${duplicateRows}`)

  if (sample.length > 0) {
    console.log("[MayaDedupe] Sample duplicate groups:")
    sample.slice(0, 10).forEach((row) => {
      console.log(
        `  - chat=${row.chat_id} role=${row.role} cnt=${row.cnt} ids=${row.sample_ids?.join(",")} preview="${row.content_preview || ""}"`,
      )
    })
  }

  if (!APPLY) {
    console.log("[MayaDedupe] Dry run complete. Re-run with --apply to execute cleanup.")
    return
  }

  if (duplicateRows === 0) {
    console.log("[MayaDedupe] Nothing to delete.")
    return
  }

  await sql`
    CREATE TABLE IF NOT EXISTS maya_chat_messages_dedupe_backups (
      id BIGSERIAL PRIMARY KEY,
      run_id TEXT NOT NULL,
      original_message_id INTEGER NOT NULL,
      row_data JSONB NOT NULL,
      backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (run_id, original_message_id)
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_maya_chat_messages_dedupe_backups_original
      ON maya_chat_messages_dedupe_backups (original_message_id)
  `

  const [result] = await sql`
    WITH norm AS (
      SELECT
        m.id,
        m.chat_id,
        m.role,
        regexp_replace(trim(coalesce(m.content, '')), '\\s+', ' ', 'g') AS content_norm,
        coalesce((to_jsonb(m) -> 'concept_cards')::text, 'null') AS concept_norm,
        coalesce((to_jsonb(m) -> 'feed_cards')::text, (to_jsonb(m) -> 'styling_details')::text, 'null') AS feed_norm,
        m.created_at
      FROM maya_chat_messages m
    ),
    grouped AS (
      SELECT
        chat_id,
        role,
        content_norm,
        concept_norm,
        feed_norm
      FROM norm
      GROUP BY 1, 2, 3, 4, 5
      HAVING count(*) > 1
         AND EXTRACT(EPOCH FROM (max(created_at) - min(created_at))) <= ${WINDOW_SECONDS}
    ),
    ranked AS (
      SELECT
        n.id,
        row_number() OVER (
          PARTITION BY n.chat_id, n.role, n.content_norm, n.concept_norm, n.feed_norm
          ORDER BY n.created_at ASC, n.id ASC
        ) AS rn
      FROM norm n
      JOIN grouped g
        ON g.chat_id = n.chat_id
       AND g.role = n.role
       AND g.content_norm = n.content_norm
       AND g.concept_norm = n.concept_norm
       AND g.feed_norm = n.feed_norm
    ),
    to_delete AS (
      SELECT id
      FROM ranked
      WHERE rn > 1
      ORDER BY id ASC
      LIMIT ${MAX_DELETE}
    ),
    backed_up AS (
      INSERT INTO maya_chat_messages_dedupe_backups (run_id, original_message_id, row_data)
      SELECT ${runId}, m.id, to_jsonb(m)
      FROM maya_chat_messages m
      JOIN to_delete d ON d.id = m.id
      ON CONFLICT (run_id, original_message_id) DO NOTHING
      RETURNING original_message_id
    ),
    deleted AS (
      DELETE FROM maya_chat_messages m
      WHERE m.id IN (SELECT original_message_id FROM backed_up)
      RETURNING m.id
    )
    SELECT
      (SELECT count(*)::int FROM to_delete) AS candidates,
      (SELECT count(*)::int FROM backed_up) AS backed_up,
      (SELECT count(*)::int FROM deleted) AS deleted
  `

  console.log(`[MayaDedupe] Run ID: ${runId}`)
  console.log(`[MayaDedupe] Candidates selected: ${parseCount(result?.candidates)}`)
  console.log(`[MayaDedupe] Backed up: ${parseCount(result?.backed_up)}`)
  console.log(`[MayaDedupe] Deleted: ${parseCount(result?.deleted)}`)

  const [after] = (await sql`
    WITH norm AS (
      SELECT
        m.chat_id,
        m.role,
        regexp_replace(trim(coalesce(m.content, '')), '\\s+', ' ', 'g') AS content_norm,
        coalesce((to_jsonb(m) -> 'concept_cards')::text, 'null') AS concept_norm,
        coalesce((to_jsonb(m) -> 'feed_cards')::text, (to_jsonb(m) -> 'styling_details')::text, 'null') AS feed_norm,
        m.created_at
      FROM maya_chat_messages m
    ),
    grouped AS (
      SELECT
        chat_id,
        role,
        content_norm,
        concept_norm,
        feed_norm,
        count(*)::int AS cnt
      FROM norm
      GROUP BY 1, 2, 3, 4, 5
      HAVING count(*) > 1
    )
    SELECT coalesce(sum(cnt - 1)::int, 0)::int AS duplicate_rows_remaining
    FROM grouped
  `) as Array<{ duplicate_rows_remaining: number }>

  console.log(`[MayaDedupe] Duplicate rows remaining (all windows): ${parseCount(after?.duplicate_rows_remaining)}`)
}

main().catch((error) => {
  console.error("[MayaDedupe] Failed:", error)
  process.exit(1)
})
