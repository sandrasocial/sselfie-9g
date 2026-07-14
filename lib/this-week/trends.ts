import "server-only"

// THIS WEEK - platform trend digest (2026-07-07, approved by Sandra).
// One digest per ISO week (Monday-keyed) of what's working on Instagram RIGHT NOW for
// SSELFIE's audience: women 35-64 building a personal brand with phone + face + story.
//
// FRESHNESS IS STRUCTURAL: every read keys on the current week's Monday. Last week's row
// simply never matches, so stale suggestions cannot be served. The Monday cron pre-warms
// the digest; if it ever misses, the first member to open the strip triggers the same
// generation lazily. Old rows are pruned after 8 weeks.
//
// Provider lanes (per the platform split): the digest is platform intelligence -> Anthropic
// direct WITH the web_search server tool (same tool the admin content brief uses), so the
// trends are genuinely current, not model memory. Member personalization happens elsewhere
// (Maya's OpenRouter lane, see member-brief.ts).

import Anthropic from "@anthropic-ai/sdk"
import type { ToolUnion } from "@anthropic-ai/sdk/resources/messages"
import { sql } from "@/lib/db/client"
import { extractJson } from "@/lib/ai/extract-json"

const DIGEST_MODEL = "claude-sonnet-5"

const WEB_SEARCH_TOOL: ToolUnion = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
}

export interface TrendDigest {
  summary: string
  trends: Array<{
    name: string
    whatItIs: string
    whyItWorksNow: string
    formatFit: "photo" | "carousel" | "reel-cover" | "story-slide"
  }>
  /** How the digest was produced - "web" (searched) or "grounded" (doctrine-only fallback). */
  provenance: "web" | "grounded"
}

/** Monday of the current week as YYYY-MM-DD (UTC, matching the cron's clock). */
export function currentWeekStart(now = new Date()): string {
  const day = (now.getUTCDay() + 6) % 7 // Mon=0 ... Sun=6
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day))
  return monday.toISOString().slice(0, 10)
}

const DIGEST_SYSTEM = `You research what is working on Instagram THIS WEEK for one specific audience: women roughly 35-64 (US-heavy) building a personal brand around a skill, service, story, or small business - not influencers, not Gen Z aesthetics.

Their platform, SSELFIE, holds one doctrine you must respect in every trend you pick:
- AI is not the hero, the woman is. Content must feel human, specific, and real - never synthetic, never "no one will know it's AI", never perfect-face filters.
- Current Instagram reality: over-produced content is deprioritized as AI floods the feed; human, specific, imperfect wins. DM shares are weighted far above likes. Topic consistency is rewarded. Carousels are gaining engagement share.

Use web search to check what is CURRENT this week (formats, hook styles, carousel patterns, photo-dump styles, cover-text conventions). Prefer patterns a busy woman can execute with good brand photos + captions: photos, carousels, reel covers, story slides. Skip trends that require dancing, lip-sync, heavy editing, or being a full-time creator.

Return ONLY raw JSON, no prose, no code fences:
{"summary": "2-3 sentences on the week's overall picture", "trends": [{"name": "...", "whatItIs": "one sentence", "whyItWorksNow": "one sentence tied to current algorithm/audience behavior", "formatFit": "photo" | "carousel" | "reel-cover" | "story-slide"}]}
Exactly 4-6 trends.`

function validateDigest(parsed: unknown, provenance: "web" | "grounded"): TrendDigest | null {
  const d = parsed as { summary?: unknown; trends?: unknown }
  if (!d || typeof d.summary !== "string" || !Array.isArray(d.trends)) return null
  const validFormats = new Set(["photo", "carousel", "reel-cover", "story-slide"])
  const trends = (d.trends as any[])
    .filter(
      (t) =>
        t &&
        typeof t.name === "string" &&
        typeof t.whatItIs === "string" &&
        typeof t.whyItWorksNow === "string" &&
        validFormats.has(t.formatFit),
    )
    .slice(0, 6)
  if (trends.length < 3) return null
  return { summary: d.summary, trends, provenance }
}

async function generateDigest(weekStart: string): Promise<TrendDigest> {
  const userMsg = `Week starting Monday ${weekStart}. What is working on Instagram this week for this audience?`

  // Primary: Anthropic direct with live web search.
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey) {
    try {
      const anthropic = new Anthropic({ apiKey })
      const response = await anthropic.messages.create({
        model: DIGEST_MODEL,
        max_tokens: 6000,
        // Sonnet 5 defaults to adaptive thinking when the param is omitted; thinking would
        // spend this small budget before any text (same failure as content-kit llm.ts).
        thinking: { type: "disabled" },
        system: DIGEST_SYSTEM,
        tools: [WEB_SEARCH_TOOL],
        messages: [{ role: "user", content: userMsg }],
      })
      const text = response.content
        .filter((block): block is { type: "text"; text: string } & typeof block => block.type === "text")
        .map((block) => block.text)
        .join("\n")
      const digest = validateDigest(JSON.parse(extractJson(text)), "web")
      if (digest) return digest
      console.error("[this-week] web digest failed validation; falling back to grounded")
    } catch (error) {
      console.error("[this-week] web digest generation failed; falling back to grounded:", error)
    }
  }

  // Fallback: doctrine-grounded, date-aware, via Maya's funded OpenRouter lane. Still keyed
  // to THIS week (never reuses an old row) - "grounded" provenance is visible in the data.
  const { generateText } = await import("ai")
  const { createMayaOpenRouterModel } = await import("@/lib/maya/openrouter")
  const { text } = await generateText({
    model: createMayaOpenRouterModel("chat_default"),
    system: DIGEST_SYSTEM.replace("Use web search to check what is CURRENT this week", "You cannot search the web right now; lean on the doctrine and evergreen-but-current patterns"),
    messages: [{ role: "user", content: userMsg }],
    temperature: 0.7,
    maxOutputTokens: 2000,
  })
  const digest = validateDigest(JSON.parse(extractJson(text)), "grounded")
  if (!digest) throw new Error("Trend digest generation failed in both lanes")
  return digest
}

/**
 * The current week's digest - generated on first request of the week (cron pre-warms Monday
 * morning, lazy generation covers a missed cron). Old weeks are pruned.
 */
export async function getOrCreateWeeklyTrendDigest(): Promise<{ weekStart: string; digest: TrendDigest }> {
  const weekStart = currentWeekStart()

  const [existing] = await sql`
    SELECT digest FROM weekly_content_trends WHERE week_start = ${weekStart} LIMIT 1
  `
  if (existing?.digest) return { weekStart, digest: existing.digest as TrendDigest }

  const digest = await generateDigest(weekStart)
  await sql`
    INSERT INTO weekly_content_trends (week_start, digest)
    VALUES (${weekStart}, ${JSON.stringify(digest)}::jsonb)
    ON CONFLICT (week_start) DO NOTHING
  `
  // Prune anything older than 8 weeks - the table stays tiny and nothing old can linger.
  await sql`DELETE FROM weekly_content_trends WHERE week_start < (CURRENT_DATE - INTERVAL '8 weeks')`.catch(() => {})
  await sql`DELETE FROM member_weekly_briefs WHERE week_start < (CURRENT_DATE - INTERVAL '8 weeks')`.catch(() => {})

  // Re-read in case a concurrent request won the insert race.
  const [row] = await sql`
    SELECT digest FROM weekly_content_trends WHERE week_start = ${weekStart} LIMIT 1
  `
  return { weekStart, digest: (row?.digest as TrendDigest) ?? digest }
}
