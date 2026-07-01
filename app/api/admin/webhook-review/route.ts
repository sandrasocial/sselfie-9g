/**
 * GET  /api/admin/webhook-review          - list unresolved needs_review events
 * PATCH /api/admin/webhook-review         - mark an event resolved
 *
 * Admin-only. Secured by checking session email against ADMIN_EMAIL.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"
const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const showResolved = req.nextUrl.searchParams.get("resolved") === "true"

  const rows = await sql`
    SELECT
      id,
      stripe_event_id,
      raw_metadata->>'event_type' AS event_type,
      raw_metadata->>'session_id' AS session_id,
      customer_email,
      product_type,
      amount_cents,
      raw_metadata->>'currency' AS currency,
      flag_reason AS reason,
      raw_metadata,
      resolved,
      resolved_at,
      resolved_by,
      raw_metadata->>'notes' AS notes,
      created_at
    FROM webhook_events_needs_review
    WHERE resolved = ${showResolved}
    ORDER BY created_at DESC
    LIMIT 50
  `

  return NextResponse.json({ events: rows })
}

export async function PATCH(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const body = await req.json().catch(() => ({}))
  const { id, notes } = body

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }

  const resolvedRows = await sql`
    UPDATE webhook_events_needs_review
    SET
      resolved = TRUE,
      resolved_at = NOW(),
      resolved_by = ${user?.email ?? "admin"},
      raw_metadata = COALESCE(raw_metadata, '{}'::jsonb) || ${JSON.stringify({
        resolved_by: user?.email ?? "admin",
        notes: notes ?? null,
      })}::jsonb
    WHERE id = ${id}
    RETURNING stripe_event_id
  `

  const stripeEventId = resolvedRows[0]?.stripe_event_id
  if (stripeEventId) {
    await sql`
      UPDATE webhook_events
      SET status = 'processed',
          metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
            manually_resolved_from_webhook_review: true,
          })}::jsonb,
          updated_at = NOW()
      WHERE provider = 'stripe'
        AND event_id = ${stripeEventId}
        AND status = 'claimed'
    `
  }

  return NextResponse.json({ ok: true })
}
