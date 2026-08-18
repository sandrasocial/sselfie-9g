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
  activePaidMembers: number
  activeTrialMembers: number
  activeOtherMembers: number
  conceptSets: number
  conceptsEmitted: number
  generationCompletions: number
  imagesGenerated: number
  rerolls: number
  downloads: number
  edits: number
  clarifiesAsked: number
  memoryNotesSaved: number
  generationFailures: number
  recoveriesShown: number
  chatAborts: number
  reviewsSubmitted: number
  finishedPosts: number
  projectsResumed: number
  mayaJobsStarted: number
  mayaJobsFinished: number
  vaultMayaLoved: number
  vaultMayaNotQuite: number
  readinessRatings: { answer: "yes" | "almost" | "no"; count: number }[]
  /** rerolls / successful generation completions. Null when nothing was generated. */
  rerollRate: number | null
  topFormats: { format: string; count: number }[]
  topVibes: { aestheticId: string; count: number }[]
  failureReasons: { reason: string; count: number }[]
  recoveryReasons: { reason: string; count: number }[]
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
  "suite_generation_failed",
  "suite_maya_recovery_shown",
  "suite_chat_aborted",
  "suite_review_submitted",
  "suite_post_finished",
  "suite_post_project_resumed",
  "suite_maya_job_started",
  "suite_maya_job_finished",
  "suite_post_readiness_rated",
  "vault_maya_photo_loved",
  "vault_maya_photo_not_quite",
]

function anonymizeSnippet(value: string, maxLength = 180): string {
  const cleaned = value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email removed]")
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned
}

export async function buildMemberPulse(periodDays = 7): Promise<MemberPulse> {
  const adminEmails = getAdminEmails()
  const adminRows = (await sql`
    SELECT id::text AS id FROM users WHERE LOWER(email) = ANY(${adminEmails})
  `) as { id: string }[]
  const adminIds = adminRows.map(r => r.id)
  // <> ALL(empty array) is true for everything, so an empty list excludes no one — correct.

  const totals = (await sql`
    SELECT
      event_name,
      COUNT(*)::int AS events,
      SUM(CASE WHEN event_name = 'suite_concepts_emitted'
        THEN COALESCE(NULLIF(properties->>'count', '')::int, 0) ELSE 0 END)::int AS concepts,
      SUM(CASE WHEN event_name = 'suite_image_generated'
        THEN GREATEST(COALESCE(NULLIF(properties->>'images', '')::int, 1), 1)
        ELSE 0 END)::int AS images,
      SUM(CASE WHEN properties->>'rerun' = 'true' THEN 1 ELSE 0 END)::int AS reruns
    FROM analytics_events
    WHERE event_name = ANY(${PULSE_EVENTS})
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND COALESCE(properties->>'admin', 'false') <> 'true'
      AND (user_id IS NULL OR user_id <> ALL(${adminIds}))
    GROUP BY event_name
  `) as {
    event_name: string
    events: number
    concepts: number
    images: number
    reruns: number
  }[]

  const byName = new Map(totals.map(t => [t.event_name, t]))
  const count = (name: string) => byName.get(name)?.events ?? 0

  const activeRows = (await sql`
    WITH engaged AS (
      SELECT DISTINCT user_id
      FROM analytics_events
      WHERE event_name = ANY(${PULSE_EVENTS})
        AND created_at >= NOW() - make_interval(days => ${periodDays})
        AND COALESCE(properties->>'admin', 'false') <> 'true'
        AND user_id IS NOT NULL
        AND user_id <> ALL(${adminIds})
    ),
    latest_membership AS (
      SELECT DISTINCT ON (user_id) user_id, status
      FROM subscriptions
      WHERE product_type = 'sselfie_studio_membership'
        AND COALESCE(is_test_mode, false) = false
      ORDER BY user_id, updated_at DESC, created_at DESC
    ),
    trial_users AS (
      SELECT DISTINCT user_id
      FROM subscriptions
      WHERE product_type = 'suite_trial'
        AND COALESCE(is_test_mode, false) = false
    )
    SELECT
      COUNT(*)::int AS members,
      COUNT(*) FILTER (WHERE latest_membership.status = 'active')::int AS paid_members,
      COUNT(*) FILTER (
        WHERE latest_membership.status IS DISTINCT FROM 'active'
          AND trial_users.user_id IS NOT NULL
      )::int AS trial_members,
      COUNT(*) FILTER (
        WHERE latest_membership.status IS DISTINCT FROM 'active'
          AND trial_users.user_id IS NULL
      )::int AS other_members
    FROM engaged
    LEFT JOIN latest_membership USING (user_id)
    LEFT JOIN trial_users USING (user_id)
  `) as {
    members: number
    paid_members: number
    trial_members: number
    other_members: number
  }[]

  const topFormats = (await sql`
    SELECT COALESCE(properties->>'format', 'photo') AS format, COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'suite_image_generated'
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND COALESCE(properties->>'admin', 'false') <> 'true'
      AND (user_id IS NULL OR user_id <> ALL(${adminIds}))
    GROUP BY 1 ORDER BY 2 DESC LIMIT 5
  `) as { format: string; count: number }[]

  const topVibes = (await sql`
    SELECT properties->>'aestheticId' AS aesthetic_id, COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'suite_image_generated'
      AND properties->>'aestheticId' IS NOT NULL
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND COALESCE(properties->>'admin', 'false') <> 'true'
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
      .flatMap(r =>
        r.preferences
          .split("\n")
          .map(l => l.trim())
          .filter(Boolean)
          .slice(-2)
      )
      .slice(0, 8)
      .map(note => anonymizeSnippet(note))
  } catch {
    // Memory table may not exist yet in some environments — the pulse still works without it.
  }

  const recentEdits = (await sql`
    SELECT properties->>'instruction' AS instruction
    FROM analytics_events
    WHERE event_name = 'suite_edit_applied'
      AND properties->>'instruction' IS NOT NULL
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND COALESCE(properties->>'admin', 'false') <> 'true'
      AND (user_id IS NULL OR user_id <> ALL(${adminIds}))
    ORDER BY created_at DESC LIMIT 6
  `) as { instruction: string }[]

  const failureReasons = (await sql`
    SELECT COALESCE(NULLIF(properties->>'reason', ''), 'unknown') AS reason, COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'suite_generation_failed'
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND COALESCE(properties->>'admin', 'false') <> 'true'
      AND (user_id IS NULL OR user_id <> ALL(${adminIds}))
    GROUP BY 1 ORDER BY 2 DESC LIMIT 6
  `) as { reason: string; count: number }[]

  const recoveryReasons = (await sql`
    SELECT COALESCE(NULLIF(properties->>'reason', ''), 'unknown') AS reason, COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'suite_maya_recovery_shown'
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND COALESCE(properties->>'admin', 'false') <> 'true'
      AND (user_id IS NULL OR user_id <> ALL(${adminIds}))
    GROUP BY 1 ORDER BY 2 DESC LIMIT 6
  `) as { reason: string; count: number }[]

  const readinessRatings = (await sql`
    SELECT properties->>'answer' AS answer, COUNT(*)::int AS count
    FROM analytics_events
    WHERE event_name = 'suite_post_readiness_rated'
      AND properties->>'answer' = ANY(ARRAY['yes', 'almost', 'no'])
      AND created_at >= NOW() - make_interval(days => ${periodDays})
      AND COALESCE(properties->>'admin', 'false') <> 'true'
      AND (user_id IS NULL OR user_id <> ALL(${adminIds}))
    GROUP BY 1 ORDER BY 2 DESC
  `) as { answer: "yes" | "almost" | "no"; count: number }[]

  const generationCompletions = count("suite_image_generated")
  const imagesGenerated = byName.get("suite_image_generated")?.images ?? 0
  const downloads = count("suite_image_downloaded")
  const rerolls = byName.get("suite_image_generated")?.reruns ?? 0
  const active = activeRows[0]

  return {
    periodDays,
    activeMembers: active?.members ?? 0,
    activePaidMembers: active?.paid_members ?? 0,
    activeTrialMembers: active?.trial_members ?? 0,
    activeOtherMembers: active?.other_members ?? 0,
    conceptSets: count("suite_concepts_emitted"),
    conceptsEmitted: byName.get("suite_concepts_emitted")?.concepts ?? 0,
    generationCompletions,
    imagesGenerated,
    rerolls,
    downloads,
    edits: count("suite_edit_applied"),
    clarifiesAsked: count("suite_clarify_asked"),
    memoryNotesSaved: count("suite_memory_note_saved"),
    generationFailures: count("suite_generation_failed"),
    recoveriesShown: count("suite_maya_recovery_shown"),
    chatAborts: count("suite_chat_aborted"),
    reviewsSubmitted: count("suite_review_submitted"),
    finishedPosts: count("suite_post_finished"),
    projectsResumed: count("suite_post_project_resumed"),
    mayaJobsStarted: count("suite_maya_job_started"),
    mayaJobsFinished: count("suite_maya_job_finished"),
    vaultMayaLoved: count("vault_maya_photo_loved"),
    vaultMayaNotQuite: count("vault_maya_photo_not_quite"),
    readinessRatings,
    rerollRate: generationCompletions > 0 ? rerolls / generationCompletions : null,
    topFormats: topFormats.map(f => ({ format: f.format, count: f.count })),
    topVibes: topVibes.map(v => ({ aestheticId: v.aesthetic_id, count: v.count })),
    failureReasons,
    recoveryReasons,
    freshPreferenceNotes,
    recentEditAsks: recentEdits.map(e => anonymizeSnippet(e.instruction)),
  }
}
