import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"

const ALLOWED_EVENT_TYPES = new Set([
  "guide_opened",
  "scroll_progress",
  "cta_clicked",
  "converted",
])

let ensureSchemaPromise: Promise<void> | null = null

async function ensureFreebieEngagementSchema() {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      // Canonical freebie table (new freebie flow).
      await sql`
        CREATE TABLE IF NOT EXISTS freebie_brand_strategies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          access_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
          email TEXT NOT NULL,
          name TEXT NOT NULL,
          business_type TEXT NOT NULL,
          target_audience TEXT NOT NULL,
          transformation_story TEXT,
          brand_vibe TEXT NOT NULL DEFAULT 'warm',
          strategy_json JSONB,
          resend_contact_id TEXT,
          email_sent BOOLEAN NOT NULL DEFAULT false,
          email_sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `

      // Event stream tied to canonical freebie strategy tokens.
      await sql`
        CREATE TABLE IF NOT EXISTS freebie_brand_strategy_engagement (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          access_token UUID NOT NULL,
          event_type TEXT NOT NULL,
          event_payload JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `

      await sql`
        CREATE INDEX IF NOT EXISTS idx_fbs_engagement_access_token
        ON freebie_brand_strategy_engagement(access_token)
      `

      await sql`
        CREATE INDEX IF NOT EXISTS idx_fbs_engagement_event_type
        ON freebie_brand_strategy_engagement(event_type)
      `
    })().catch((error) => {
      ensureSchemaPromise = null
      throw error
    })
  }

  await ensureSchemaPromise
}

export async function POST(request: NextRequest) {
  try {
    await ensureFreebieEngagementSchema()

    const body = await request.json()
    const accessToken = typeof body?.accessToken === "string" ? body.accessToken : ""
    const eventType = typeof body?.eventType === "string" ? body.eventType : ""
    const payload = body?.data && typeof body.data === "object" ? body.data : {}

    if (!accessToken || !eventType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
    }

    const strategy = await sql`
      SELECT access_token
      FROM freebie_brand_strategies
      WHERE access_token = ${accessToken}
      LIMIT 1
    `

    if (strategy.length === 0) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    await sql`
      INSERT INTO freebie_brand_strategy_engagement (
        access_token,
        event_type,
        event_payload
      ) VALUES (
        ${accessToken},
        ${eventType},
        ${JSON.stringify(payload)}::jsonb
      )
    `

    await sql`
      UPDATE freebie_brand_strategies
      SET updated_at = NOW()
      WHERE access_token = ${accessToken}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[freebie-track-engagement] Engagement tracking error:", error)
    return NextResponse.json({ error: "Failed to track engagement" }, { status: 500 })
  }
}
