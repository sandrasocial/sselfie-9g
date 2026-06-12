import "server-only"

// SUITE-UX-02 slice 3 — Member pulse: what members actually DO with Maya in /app, aggregated
// weekly for Sandra. Sources: analytics_events (behavior ONLY, per the Admin Data Contract —
// never money) + app_v3_memory (what members told Maya about their brand/style). Sandra's own
// admin usage is excluded by user id so the pulse reflects members, not her.

import { sql } from "@/lib/db/client"
import { getAdminEmails } from "@/lib/admin-feature-flags"

export interface MemberPulse {
  periodDays: number
  /** Distinct members who triggered any suite_* event in the window. */
  activeMembers: number
  conceptSets: number
  conceptsEmitted: number
  imagesGenerated: number
  rerolls: number
  downloads: number
  edits: number
  clarifiesAsked: number
  memoryNotesSaved: number
  /** downloads / imagesGenerated — the "she loved it" rate. Null when nothing was generated. */
  downloadRate: number | null
  /** rerolls / imagesGenerated — the friction rate. Null when nothing was generated. */
  rerollRate: number | null
  topFormats: { format: string; count: number }[]
  topVibes: { aestheticId: string; count: number }[]
  /** Latest style preferences members told Maya (app_v3_memory) — the "what they want" signal. */
  freshPreferenceNotes: string[]
  /** Latest edit instructions — what members keep asking to change (friction themes). */
  recentEditAsks: string[]
}

const PULSE_EVENTS = [
  "suite_concepts_emitted",
  "suite_clarify_asked",
  "suite_image_generated",
  "suite_image_downloaded",
  "suite_edit_applied",
  "suite_memory_note_saved",
]

export async function buildMemberPulse(periodDays = 7): Promise<MemberPulse> {
  const adminEmails = getAdminEmails()
  const adminRows = (await sql`
    SELECT id::text AS id FROM users WHERE LOWER(email) = ANY(${adminEmails})
  `) as { id: string }[]
  const adminIds = adminRows.map((r) => r.id)
  // <> ALL(empty array) is true for everything, so an empty list excludes no one — correct.

  const totals = (await sql`
    SELECT
      event_name,
      COUNT(*)::int AS events,
      SUM(CASE WHEN event_name = 'suite_concepts_emitted'
        THEN COALESCE(NULLIF(properties->>'count', '')::int, 0) ELSE 0 END)::int AS concepts,
      SUM(CASE WHEN properties->>'rerun' = 'true' THEN 1 ELSE 0 END)::int AS reruns
    FROM analytics_events
    WHERE event_name = ANY(${PULSE_EVENTS})
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND COALESCE(properties->>'admin', 'false') <> 'true'
      AND (user_id IS NULL OR user_id <> ALL(${adminIds}))
    GROUP BY event_name
  `) as { event_name: string; events: number; concepts: number; reruns: number }[]

  const byName = new Map(totals.map((t) => [t.event_name, t]))
  const count = (name: string) => byName.get(name)?.events ?? 0

  const activeRows = (await sql`
    SELECT COUNT(DISTINCT user_id)::int AS members
    FROM analytics_events
    WHERE event_name = ANY(${PULSE_EVENTS})
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND COALESCE(properties->>'admin', 'false') <> 'true'
      AND user_id IS NOT NULL
      AND user_id <> ALL(${adminIds})
  `) as { members: number }[]

  const topFormats = (await sql`
    SELECT COALESCE(properties->>'format', 'photo') AS format, COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'suite_image_generated'
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND (user_id IS NULL OR user_id <> ALL(${adminIds}))
    GROUP BY 1 ORDER BY 2 DESC LIMIT 5
  `) as { format: string; count: number }[]

  const topVibes = (await sql`
    SELECT properties->>'aestheticId' AS aesthetic_id, COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'suite_image_generated'
      AND properties->>'aestheticId' IS NOT NULL
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND (user_id IS NULL OR user_id <> ALL(${adminIds}))
    GROUP BY 1 ORDER BY 2 DESC LIMIT 5
  `) as { aesthetic_id: string; count: number }[]

  // What members told Maya they want (the last lines are the freshest notes).
  let freshPreferenceNotes: string[] = []
  try {
    const memoryRows = (await sql`
      SELECT preferences FROM app_v3_memory
      WHERE preferences IS NOT NULL
        AND updated_at >= NOW() - make_interval(days => ${periodDays})
        AND user_id <> ALL(${adminIds})
      ORDER BY updated_at DESC LIMIT 10
    `) as { preferences: string }[]
    freshPreferenceNotes = memoryRows
      .flatMap((r) =>
        r.preferences
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(-2),
      )
      .slice(0, 8)
      .map((l) => (l.length > 140 ? `${l.slice(0, 140)}…` : l))
  } catch {
    // Memory table may not exist yet in some environments — the pulse still works without it.
  }

  const recentEdits = (await sql`
    SELECT properties->>'instruction' AS instruction
    FROM analytics_events
    WHERE event_name = 'suite_edit_applied'
      AND properties->>'instruction' IS NOT NULL
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND (user_id IS NULL OR user_id <> ALL(${adminIds}))
    ORDER BY created_at DESC LIMIT 6
  `) as { instruction: string }[]

  const imagesGenerated = count("suite_image_generated")
  const downloads = count("suite_image_downloaded")
  const rerolls = byName.get("suite_image_generated")?.reruns ?? 0

  return {
    periodDays,
    activeMembers: activeRows[0]?.members ?? 0,
    conceptSets: count("suite_concepts_emitted"),
    conceptsEmitted: byName.get("suite_concepts_emitted")?.concepts ?? 0,
    imagesGenerated,
    rerolls,
    downloads,
    edits: count("suite_edit_applied"),
    clarifiesAsked: count("suite_clarify_asked"),
    memoryNotesSaved: count("suite_memory_note_saved"),
    downloadRate: imagesGenerated > 0 ? downloads / imagesGenerated : null,
    rerollRate: imagesGenerated > 0 ? rerolls / imagesGenerated : null,
    topFormats: topFormats.map((f) => ({ format: f.format, count: f.count })),
    topVibes: topVibes.map((v) => ({ aestheticId: v.aesthetic_id, count: v.count })),
    freshPreferenceNotes,
    recentEditAsks: recentEdits.map((e) => e.instruction),
  }
}
