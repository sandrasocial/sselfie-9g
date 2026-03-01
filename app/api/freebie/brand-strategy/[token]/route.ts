import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/neon"

let ensureTablePromise: Promise<void> | null = null

async function ensureFreebieBrandStrategiesTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
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

      await sql`CREATE INDEX IF NOT EXISTS idx_fbs_email ON freebie_brand_strategies(email)`
      await sql`CREATE INDEX IF NOT EXISTS idx_fbs_token ON freebie_brand_strategies(access_token)`
    })().catch((error) => {
      ensureTablePromise = null
      throw error
    })
  }

  await ensureTablePromise
}

type ParamsLike = Promise<{ token: string }> | { token: string }
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function resolveToken(params: ParamsLike): Promise<string> {
  const resolved = await params
  return (resolved?.token || "").trim()
}

export async function GET(
  _request: NextRequest,
  { params }: { params: ParamsLike },
) {
  try {
    await ensureFreebieBrandStrategiesTable()

    const token = await resolveToken(params)

    if (!token) {
      return NextResponse.json({ error: "Strategy token is required" }, { status: 400 })
    }

    if (!UUID_REGEX.test(token)) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    const rows = await sql`
      SELECT name, business_type, target_audience, brand_vibe, strategy_json, created_at
      FROM freebie_brand_strategies
      WHERE access_token = ${token}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 })
    }

    const row = rows[0]

    if (!row.strategy_json) {
      return NextResponse.json({ error: "Strategy still generating" }, { status: 202 })
    }

    return NextResponse.json({
      name: row.name,
      business_type: row.business_type,
      target_audience: row.target_audience,
      brand_vibe: row.brand_vibe,
      strategy: row.strategy_json,
      created_at: row.created_at,
    })
  } catch (error) {
    console.error("[freebie-strategy] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch strategy" }, { status: 500 })
  }
}
