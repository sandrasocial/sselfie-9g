import "server-only"

import { sql } from "@/lib/db/client"
import { signAdminActionToken, verifyAdminActionToken } from "@/lib/admin/action-token"

export type AdminActionKind = "send_ig_reply" | "send_resend_broadcast"
export type AdminActionStatus = "pending" | "executing" | "completed" | "dismissed" | "failed"

export type AdminActionRow = {
  id: number
  kind: AdminActionKind
  title: string
  summary: string
  source: string
  idempotency_key: string
  payload: Record<string, unknown>
  status: AdminActionStatus
  expires_at: Date | string
  acted_at: Date | string | null
  review_note: string | null
  last_error: string | null
  created_at: Date | string
  updated_at: Date | string
}

export type ApprovalActionSummary = {
  kind: AdminActionKind
  title: string
  summary: string
  approvalUrl: string
  source: string
}

export async function queueAdminAction(input: {
  kind: AdminActionKind
  title: string
  summary: string
  source: string
  idempotencyKey: string
  payload: Record<string, unknown>
  expiresAt?: Date
}): Promise<AdminActionRow> {
  const expiresAt = input.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const rows = await sql`
    INSERT INTO admin_action_queue (
      kind, title, summary, source, idempotency_key, payload, expires_at
    ) VALUES (
      ${input.kind}, ${input.title}, ${input.summary}, ${input.source},
      ${input.idempotencyKey}, ${JSON.stringify(input.payload)}::jsonb, ${expiresAt}
    )
    ON CONFLICT (idempotency_key) DO UPDATE
    SET title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        payload = CASE
          WHEN admin_action_queue.status = 'pending' THEN EXCLUDED.payload
          ELSE admin_action_queue.payload
        END,
        expires_at = CASE
          WHEN admin_action_queue.status = 'pending' THEN GREATEST(admin_action_queue.expires_at, EXCLUDED.expires_at)
          ELSE admin_action_queue.expires_at
        END,
        updated_at = NOW()
    RETURNING *
  `
  return rows[0] as AdminActionRow
}

export function approvalUrlForAction(action: AdminActionRow): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai").replace(/\/$/, "")
  const expiresAt = new Date(action.expires_at)
  const token = signAdminActionToken({ actionId: Number(action.id), expiresAt })
  return `${siteUrl}/approve/${encodeURIComponent(token)}`
}

export async function getAdminActionByToken(token: string): Promise<AdminActionRow | null> {
  const { actionId, expiresAt } = verifyAdminActionToken({ token })
  const rows = await sql`
    SELECT *
    FROM admin_action_queue
    WHERE id = ${actionId}
      AND expires_at = ${expiresAt}
    LIMIT 1
  `
  return (rows[0] as AdminActionRow | undefined) || null
}

export async function claimAdminAction(actionId: number): Promise<AdminActionRow | null> {
  const rows = await sql`
    UPDATE admin_action_queue
    SET status = 'executing', updated_at = NOW()
    WHERE id = ${actionId}
      AND status = 'pending'
      AND expires_at > NOW()
    RETURNING *
  `
  return (rows[0] as AdminActionRow | undefined) || null
}

export async function completeAdminAction(actionId: number, reviewNote?: string | null): Promise<void> {
  await sql`
    UPDATE admin_action_queue
    SET status = 'completed', acted_at = NOW(), review_note = ${reviewNote || null},
        last_error = NULL, updated_at = NOW()
    WHERE id = ${actionId}
  `
}

export async function dismissAdminAction(actionId: number): Promise<boolean> {
  const rows = await sql`
    UPDATE admin_action_queue
    SET status = 'dismissed', acted_at = NOW(), updated_at = NOW()
    WHERE id = ${actionId}
      AND status = 'pending'
    RETURNING id
  `
  return rows.length > 0
}

export async function failAdminAction(actionId: number, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  await sql`
    UPDATE admin_action_queue
    SET status = 'failed', last_error = ${message.slice(0, 1000)}, updated_at = NOW()
    WHERE id = ${actionId}
  `
}

export async function listOpenAdminActions(limit = 10): Promise<AdminActionRow[]> {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 25))
  const rows = await sql`
    SELECT *
    FROM admin_action_queue
    WHERE status IN ('pending', 'failed')
      AND expires_at > NOW()
    ORDER BY CASE WHEN status = 'failed' THEN 0 ELSE 1 END, created_at ASC
    LIMIT ${safeLimit}
  `
  return rows as AdminActionRow[]
}

