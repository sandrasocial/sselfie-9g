/**
 * GET  /api/admin/webhook-review          — list unresolved needs_review events
 * PATCH /api/admin/webhook-review         — mark an event resolved
 *
 * Admin-only. Secured by checking session email against ADMIN_EMAIL.
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"

export const dynamic = "force-dynamic"
const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
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
  const authError = await requireAdmin(req)
  if (authError) return authError

  const showResolved = req.nextUrl.searchParams.get("resolved") === "true"

  const rows = await sql`
    SELECT
      id, stripe_event_id, event_type, session_id,
      customer_email, product_type, amount_cents, currency,
      reason, raw_metadata, resolved, resolved_at, resolved_by,
      notes, created_at
    FROM webhook_events_needs_review
    WHERE resolved = ${showResolved}
    ORDER BY created_at DESC
    LIMIT 50
  `

  return NextResponse.json({ events: rows })
}

export async function PATCH(req: NextRequest) {
  const authError = await requireAdmin(req)
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

  await sql`
    UPDATE webhook_events_needs_review
    SET
      resolved = TRUE,
      resolved_at = NOW(),
      resolved_by = ${user?.email ?? "admin"},
      notes = CASE WHEN ${notes ?? null} IS NOT NULL THEN ${notes} ELSE notes END
    WHERE id = ${id}
  `

  return NextResponse.json({ ok: true })
}
