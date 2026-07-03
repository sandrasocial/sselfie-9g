import "server-only"

import { getDb } from "@/lib/db/client"

export type ContentBriefJobStatus = "queued" | "running" | "completed" | "failed"
export type ContentBriefJobPhase = "queued" | "research" | "build" | "stories" | "completed" | "failed"

export type ContentBriefJob = {
  id: number
  status: ContentBriefJobStatus
  phase: ContentBriefJobPhase
  requested_by: string | null
  error: string | null
  result_report_id: number | null
  payload: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

function normalizeJob(row: Record<string, unknown>): ContentBriefJob {
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {}

  return {
    id: Number(row.id),
    status: row.status as ContentBriefJobStatus,
    phase: row.phase as ContentBriefJobPhase,
    requested_by: typeof row.requested_by === "string" ? row.requested_by : null,
    error: typeof row.error === "string" ? row.error : null,
    result_report_id: row.result_report_id == null ? null : Number(row.result_report_id),
    payload,
    started_at: row.started_at ? new Date(String(row.started_at)).toISOString() : null,
    completed_at: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
    created_at: new Date(String(row.created_at)).toISOString(),
    updated_at: new Date(String(row.updated_at)).toISOString(),
  }
}

export async function ensureContentBriefJobSchema() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS content_brief_jobs (
      id BIGSERIAL PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
      phase TEXT NOT NULL DEFAULT 'queued' CHECK (phase IN ('queued', 'research', 'build', 'stories', 'completed', 'failed')),
      requested_by TEXT,
      error TEXT,
      result_report_id BIGINT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  await sql`
    CREATE INDEX IF NOT EXISTS content_brief_jobs_status_created_idx
    ON content_brief_jobs (status, created_at DESC);
  `
  await sql`
    CREATE INDEX IF NOT EXISTS content_brief_jobs_created_idx
    ON content_brief_jobs (created_at DESC);
  `
}

export async function getLatestContentBriefJob(): Promise<ContentBriefJob | null> {
  await ensureContentBriefJobSchema()
  const sql = getDb()
  const rows = await sql`
    SELECT *
    FROM content_brief_jobs
    ORDER BY created_at DESC
    LIMIT 1
  `
  return rows[0] ? normalizeJob(rows[0]) : null
}

export async function queueContentBriefJob(input: {
  requestedBy?: string | null
} = {}): Promise<{ job: ContentBriefJob; created: boolean }> {
  await ensureContentBriefJobSchema()
  const sql = getDb()
  const activeRows = await sql`
    SELECT *
    FROM content_brief_jobs
    WHERE status IN ('queued', 'running')
    ORDER BY created_at DESC
    LIMIT 1
  `
  if (activeRows[0]) return { job: normalizeJob(activeRows[0]), created: false }

  const rows = await sql`
    INSERT INTO content_brief_jobs (requested_by, payload)
    VALUES (${input.requestedBy ?? null}, ${{
      source: "admin",
      queuedAt: new Date().toISOString(),
    }})
    RETURNING *
  `
  return { job: normalizeJob(rows[0]), created: true }
}

export async function claimNextContentBriefJob(): Promise<ContentBriefJob | null> {
  await ensureContentBriefJobSchema()
  const sql = getDb()
  const rows = await sql`
    WITH next_job AS (
      SELECT id
      FROM content_brief_jobs
      WHERE status = 'queued'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE content_brief_jobs job
    SET status = 'running',
        phase = 'research',
        started_at = COALESCE(job.started_at, NOW()),
        updated_at = NOW()
    FROM next_job
    WHERE job.id = next_job.id
    RETURNING job.*
  `
  return rows[0] ? normalizeJob(rows[0]) : null
}

export async function markContentBriefJobPhase(
  jobId: number,
  phase: Exclude<ContentBriefJobPhase, "queued" | "completed" | "failed">,
  payloadPatch: Record<string, unknown> = {}
) {
  await ensureContentBriefJobSchema()
  const sql = getDb()
  const patch = JSON.stringify(payloadPatch)
  await sql`
    UPDATE content_brief_jobs
    SET phase = ${phase},
        payload = payload || ${patch}::jsonb,
        updated_at = NOW()
    WHERE id = ${jobId}
  `
}

export async function completeContentBriefJob(
  jobId: number,
  input: { resultReportId?: number | null; payloadPatch?: Record<string, unknown> } = {}
) {
  await ensureContentBriefJobSchema()
  const sql = getDb()
  const patch = JSON.stringify(input.payloadPatch ?? {})
  await sql`
    UPDATE content_brief_jobs
    SET status = 'completed',
        phase = 'completed',
        result_report_id = ${input.resultReportId ?? null},
        payload = payload || ${patch}::jsonb,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${jobId}
  `
}

export async function failContentBriefJob(
  jobId: number,
  input: { error: string; payloadPatch?: Record<string, unknown> }
) {
  await ensureContentBriefJobSchema()
  const sql = getDb()
  const patch = JSON.stringify(input.payloadPatch ?? {})
  await sql`
    UPDATE content_brief_jobs
    SET status = 'failed',
        phase = 'failed',
        error = ${input.error},
        payload = payload || ${patch}::jsonb,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${jobId}
  `
}
