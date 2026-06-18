import { NextRequest, NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import { ensureVaultCollectionsSchema } from "@/lib/vault/published-collections"
import { derivePublicVaultWhenToUse } from "@/lib/vault/public-copy"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type VaultPromptCopyRow = {
  id: number
  title: string
  mood: string
  when_to_use: string
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.VAULT_EMAIL_DROP_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get("authorization")?.trim() || ""
  return header === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const dryRun = body.dryRun !== false

  await ensureVaultCollectionsSchema()

  const rows = (await sql`
    SELECT
      p.id,
      p.title,
      p.mood,
      p.when_to_use
    FROM vault_prompts p
    JOIN vault_collections c ON c.id = p.collection_id
    WHERE c.source_shoot_id IS NOT NULL
      AND p.status = 'published'
    ORDER BY c.published_at DESC, p.sort_order ASC
  `) as VaultPromptCopyRow[]

  let changed = 0
  for (const row of rows) {
    const next = derivePublicVaultWhenToUse({
      title: row.title,
      mood: row.mood,
      whenToUse: row.when_to_use,
    })

    if (next === row.when_to_use) continue
    changed += 1

    if (!dryRun) {
      await sql`
        UPDATE vault_prompts
        SET when_to_use = ${next}, updated_at = NOW()
        WHERE id = ${row.id}
      `
    }
  }

  return NextResponse.json({
    success: true,
    dryRun,
    scanned: rows.length,
    updated: dryRun ? 0 : changed,
    wouldUpdate: dryRun ? changed : undefined,
  })
}
