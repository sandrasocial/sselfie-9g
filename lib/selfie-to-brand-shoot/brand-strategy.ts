import { sql } from "@/lib/db/client"

/**
 * Loads the learner's completed Brand Strategy so the Selfie to Brand Shoot course
 * can personalize itself (Step 0 gate + Module 5 content plan). Returns null when the
 * learner has not finished their strategy yet — that drives the hard gate.
 */

export type CourseBrandStrategyPillar = {
  name: string
  description: string
  postIdeas: string[]
}

export type CourseBrandStrategy = {
  name: string | null
  businessType: string | null
  targetAudience: string | null
  brandVibe: string | null
  positioning: string[]
  pillars: CourseBrandStrategyPillar[]
  voice: { tone: string; do: string; avoid: string; phrases: string[] }
  captionStarters: string[]
}

function strArray(value: unknown, max?: number): string[] {
  if (!Array.isArray(value)) return []
  const out = value
    .map(item => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
  return typeof max === "number" ? out.slice(0, max) : out
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizePillars(value: unknown): CourseBrandStrategyPillar[] {
  if (!Array.isArray(value)) return []
  return value
    .map(p => {
      if (!p || typeof p !== "object") return null
      const r = p as Record<string, unknown>
      const name = str(r.name)
      const description = str(r.description)
      const postIdeas = strArray(r.postIdeas, 3)
      if (!name && !description && postIdeas.length === 0) return null
      return { name: name || "Content pillar", description, postIdeas }
    })
    .filter((p): p is CourseBrandStrategyPillar => Boolean(p))
    .slice(0, 5)
}

export async function getCourseBrandStrategy(
  email: string | null | undefined,
  _userId: string | number | null | undefined
): Promise<CourseBrandStrategy | null> {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""
  if (!normalizedEmail) return null

  const rows = await sql`
    SELECT name, business_type, target_audience, brand_vibe, strategy_json
    FROM freebie_brand_strategies
    WHERE strategy_json IS NOT NULL
      AND LOWER(email) = ${normalizedEmail}
    ORDER BY created_at DESC
    LIMIT 1
  `.catch(() => [] as Array<Record<string, unknown>>)

  const row = (rows as Array<Record<string, unknown>>)[0]
  if (!row) return null

  const strategy = (row.strategy_json || {}) as Record<string, unknown>
  const voice = (strategy.voice || {}) as Record<string, unknown>

  return {
    name: str(row.name) || null,
    businessType: str(row.business_type) || null,
    targetAudience: str(row.target_audience) || null,
    brandVibe: str(row.brand_vibe) || null,
    positioning: strArray(strategy.positioning, 2),
    pillars: normalizePillars(strategy.pillars),
    voice: {
      tone: str(voice.tone),
      do: str(voice.do),
      avoid: str(voice.avoid),
      phrases: strArray(voice.phrases, 6),
    },
    captionStarters: strArray(strategy.captionStarters, 10),
  }
}
