import "server-only"

// THIS WEEK - per-member weekly brief. Takes the platform trend digest and turns it into
// exactly 3 content ideas for HER: her brand, her pillars, her voice - each one riding a
// current trend, each one startable with one tap (the Calendar strip seeds Maya with it).
// Week-keyed like the digest: a member's brief regenerates the first time she opens the
// strip in a new week, never before, never serving last week's ideas.
//
// Provider lane: member-facing -> Maya's OpenRouter lane (same as chat/recommendations).

import { generateText } from "ai"
import { sql } from "@/lib/db/client"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { extractJson } from "@/lib/ai/extract-json"
import { getOrCreateWeeklyTrendDigest, type TrendDigest } from "./trends"

export interface WeeklyIdea {
  title: string
  hook: string
  whyNow: string
  format: "photo" | "carousel" | "reel-cover" | "story-slide"
  trendName: string
}

export interface MemberWeeklyBrief {
  weekStart: string
  ideas: WeeklyIdea[]
}

const VALID_FORMATS = new Set(["photo", "carousel", "reel-cover", "story-slide"])

/** Sandra's copy rule: never long dashes in member-facing text. Applied at read time too,
 *  so briefs stored before this rule are cleaned when served. */
function stripLongDashes(ideas: WeeklyIdea[]): WeeklyIdea[] {
  const clean = (s: string) => s.replace(/\s*[—–]\s*/g, ", ")
  return ideas.map((i) => ({ ...i, title: clean(i.title), hook: clean(i.hook), whyNow: clean(i.whyNow) }))
}

function validateIdeas(parsed: unknown): WeeklyIdea[] | null {
  const p = parsed as { ideas?: unknown }
  if (!p || !Array.isArray(p.ideas)) return null
  const ideas = (p.ideas as any[])
    .filter(
      (i) =>
        i &&
        typeof i.title === "string" &&
        typeof i.hook === "string" &&
        typeof i.whyNow === "string" &&
        typeof i.trendName === "string" &&
        VALID_FORMATS.has(i.format),
    )
    .slice(0, 3)
  return ideas.length === 3 ? ideas : null
}

async function generateMemberIdeas(
  authUserId: string,
  neonUserId: string | number,
  digest: TrendDigest,
  weekStart: string,
): Promise<WeeklyIdea[]> {
  const brandContext = await getUserContextForMaya(authUserId).catch(() => "")

  const system = [
    "You are Maya, her personal content strategist at SSELFIE. Turn this week's Instagram trends into exactly 3 content ideas for HER - her business, her audience, her story. Specific to her, never generic.",
    "Rules:",
    "- Each idea rides exactly ONE of the trends below (set trendName to that trend's name).",
    "- title: a short, concrete content idea in plain words (what the post IS, about HER topic).",
    "- hook: the first line of the post/cover - warm, direct, human, in her world. No hype words, never a long dash.",
    "- whyNow: one short sentence connecting it to the trend (why this lands THIS week).",
    "- Never use a long dash in ANY field; use a period or comma instead.",
    "- format: the trend's formatFit.",
    "- Spread ideas across 3 different trends and at least 2 different formats.",
    "- AI is never the hero; she is. Nothing that implies looking fake or fooling anyone.",
    'Return ONLY raw JSON: {"ideas": [{"title": "...", "hook": "...", "whyNow": "...", "format": "...", "trendName": "..."}]}',
  ].join("\n")

  const userMsg = [
    `Week of ${weekStart}.`,
    `THIS WEEK'S TRENDS:\n${JSON.stringify(digest.trends, null, 2)}`,
    brandContext ? `WHO SHE IS:\n${brandContext}` : "You don't have much on her yet - keep ideas about a real woman's business and story, never generic filler.",
  ].join("\n\n")

  const { text } = await generateText({
    model: createMayaOpenRouterModel("chat_default", {
      userId: neonUserId,
      feature: "member_weekly_brief",
    }),
    system,
    messages: [{ role: "user", content: userMsg }],
    temperature: 0.8,
    maxOutputTokens: 800,
  })

  const ideas = validateIdeas(JSON.parse(extractJson(text)))
  if (!ideas) throw new Error("Member weekly brief failed validation")
  return ideas
}

/** The member's brief for the CURRENT week - created on her first open, reused all week. */
export async function getOrCreateMemberWeeklyBrief(
  authUserId: string,
  neonUserId: string | number,
): Promise<MemberWeeklyBrief> {
  const { weekStart, digest } = await getOrCreateWeeklyTrendDigest()

  const [existing] = await sql`
    SELECT brief FROM member_weekly_briefs
    WHERE user_id = ${String(neonUserId)} AND week_start = ${weekStart}
    LIMIT 1
  `
  if (existing?.brief?.ideas) {
    return { weekStart, ideas: stripLongDashes(existing.brief.ideas as WeeklyIdea[]) }
  }

  const ideas = await generateMemberIdeas(authUserId, neonUserId, digest, weekStart)
  await sql`
    INSERT INTO member_weekly_briefs (user_id, week_start, brief)
    VALUES (${String(neonUserId)}, ${weekStart}, ${JSON.stringify({ ideas })}::jsonb)
    ON CONFLICT (user_id, week_start) DO NOTHING
  `
  const [row] = await sql`
    SELECT brief FROM member_weekly_briefs
    WHERE user_id = ${String(neonUserId)} AND week_start = ${weekStart}
    LIMIT 1
  `
  return { weekStart, ideas: stripLongDashes((row?.brief?.ideas as WeeklyIdea[]) ?? ideas) }
}
