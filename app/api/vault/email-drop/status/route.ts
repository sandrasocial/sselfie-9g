// GET /api/vault/email-drop/status?runId=<uuid>
//
// Returns current progress for a vault drop run.
// Safe to call at any time — read-only.
//
// Also supports ?latest=true to return the most recent run (any status).
//
// Authorization: Bearer <VAULT_EMAIL_DROP_SECRET>

import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"

type DropRunRow = {
  id: string
  drop_key: string
  collection_slugs: string[]
  is_dry_run: boolean
  status: string
  non_buyer_total: number
  non_buyer_sent: number
  non_buyer_failed: number
  non_buyer_skipped: number
  buyer_total: number
  buyer_sent: number
  buyer_failed: number
  buyer_skipped: number
  created_at: string
  started_at: string | null
  completed_at: string | null
  notes: string | null
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.VAULT_EMAIL_DROP_SECRET
  if (!secret) return false
  const auth = request.headers.get("Authorization") ?? ""
  return auth === `Bearer ${secret}`
}

function formatRun(run: DropRunRow) {
  const nonBuyerProcessed =
    run.non_buyer_sent + run.non_buyer_failed + run.non_buyer_skipped
  const buyerProcessed =
    run.buyer_sent + run.buyer_failed + run.buyer_skipped

  return {
    id: run.id,
    dropKey: run.drop_key,
    collectionSlugs: run.collection_slugs,
    isDryRun: run.is_dry_run,
    status: run.status,
    nonBuyer: {
      total: run.non_buyer_total,
      sent: run.non_buyer_sent,
      failed: run.non_buyer_failed,
      skipped: run.non_buyer_skipped,
      processed: nonBuyerProcessed,
      remaining: Math.max(0, run.non_buyer_total - nonBuyerProcessed + run.non_buyer_failed),
      pct:
        run.non_buyer_total > 0
          ? Math.round((run.non_buyer_sent / run.non_buyer_total) * 100)
          : 100,
    },
    buyer: {
      total: run.buyer_total,
      sent: run.buyer_sent,
      failed: run.buyer_failed,
      skipped: run.buyer_skipped,
      processed: buyerProcessed,
      remaining: Math.max(0, run.buyer_total - buyerProcessed + run.buyer_failed),
      pct:
        run.buyer_total > 0
          ? Math.round((run.buyer_sent / run.buyer_total) * 100)
          : 100,
    },
    createdAt: run.created_at,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    notes: run.notes,
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const runId = searchParams.get("runId")
  const latest = searchParams.get("latest") === "true"

  if (!runId && !latest) {
    return NextResponse.json(
      { error: "Provide ?runId=<uuid> or ?latest=true" },
      { status: 400 },
    )
  }

  try {
    let rows: unknown[]

    if (runId) {
      rows = await sql`SELECT * FROM vault_drop_runs WHERE id = ${runId}`
    } else {
      rows = await sql`
        SELECT * FROM vault_drop_runs
        ORDER BY created_at DESC
        LIMIT 1
      `
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: runId ? `Run not found: ${runId}` : "No runs found" },
        { status: 404 },
      )
    }

    const run = rows[0] as DropRunRow

    return NextResponse.json({ run: formatRun(run) })
  } catch (err) {
    console.error("[vault/email-drop/status] DB error:", err)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
}
