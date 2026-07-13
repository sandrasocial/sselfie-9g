import "server-only"

import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { getDb } from "@/lib/db/client"

export const LOOK_CHOICE_ACTIONS = [
  "choose_vibe",
  "choose_shot",
  "shot_director",
  "inspiration_style_committed",
  "maya_decides",
] as const

export type ActivationStepKey =
  | "opened_app"
  | "selfie_uploaded"
  | "look_chosen"
  | "first_image_generated"
  | "first_image_downloaded"
  | "returned_within_7d"
  | "created_again_days_8_14"

export type ActivationStep = {
  key: ActivationStepKey
  label: string
  description: string
  count: number
  eligible: number
  ratePct: number
  targetPct: number | null
  targetLabel: string | null
  targetComparable: boolean
}

export type ActivationCohort = {
  key: string
  label: string
  size: number
  steps: ActivationStep[]
}

export type ActivationFocusSummary = {
  status: "constraint" | "on_track" | "awaiting_data"
  stepKey: ActivationStepKey | null
  title: string
  evidence: string
  action: string
}

export type TrialSourceAttribution = {
  paidBuyerEvent: number
  exactClaimSubscriber: number
  emailFallback: number
  direct: number
}

export type ActivationFunnelScorecard = {
  generatedAt: string
  windowDays: number
  source: "analytics_events + subscriptions + freebie_subscribers"
  lookChoiceEvent: "suite_inline_choice_selected"
  lookChoiceActions: readonly string[]
  sessionMeasurementAvailable: false
  appCohorts: ActivationCohort[]
  trialOverall: ActivationCohort
  focusThisWeek: ActivationFocusSummary
  trialSources: ActivationCohort[]
  trialSourceAttribution: TrialSourceAttribution
  measurementNotes: string[]
}

export type ActivationUserFact = {
  userId: string
  cohortKey: string
  sourceKey: string | null
  sourceMethod: "paid_buyer_event" | "claim_subscriber" | "email_fallback" | "direct" | null
  entryAt: Date | string
  openedAt: Date | string | null
  selfieUploadedAt: Date | string | null
  lookChosenAt: Date | string | null
  generatedAt: Date | string | null
  downloadedAt: Date | string | null
  firstQualifyingAt: Date | string | null
  returnedWithin7d: boolean
  createdAgainDays8To14: boolean
}

type ActivationUserRow = {
  user_id: string
  cohort_key: string | null
  source_key?: string | null
  source_method?: string | null
  entry_at: Date | string
  opened_at: Date | string | null
  selfie_uploaded_at: Date | string | null
  look_chosen_at: Date | string | null
  generated_at: Date | string | null
  downloaded_at: Date | string | null
  first_qualifying_at: Date | string | null
  returned_within_7d: boolean | null
  created_again_days_8_14: boolean | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function validDate(value: Date | string | null): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function percentage(count: number, eligible: number): number {
  if (eligible <= 0) return 0
  return Number(((count / eligible) * 100).toFixed(1))
}

function step(input: Omit<ActivationStep, "ratePct">): ActivationStep {
  return {
    ...input,
    ratePct: percentage(input.count, input.eligible),
  }
}

const FOCUS_RULES: Array<{
  key: ActivationStepKey
  defaultWeakBelowPct: number
  title: string
  evidenceLabel: string
  action: string
}> = [
  {
    key: "created_again_days_8_14",
    defaultWeakBelowPct: 25,
    title: "Turn activated trials into a paid second week",
    evidenceLabel: "generated or downloaded again in days 8 to 14",
    action:
      "Make the next experiment the upgrade bridge before expiry, so women who got a result have one clear way to keep creating in week two.",
  },
  {
    key: "returned_within_7d",
    defaultWeakBelowPct: 25,
    title: "Give activated trials a reason to return",
    evidenceLabel: "completed another qualifying action within seven days",
    action:
      "Make the next experiment one focused day-one-to-seven return path, then measure whether more people come back.",
  },
  {
    key: "first_image_downloaded",
    defaultWeakBelowPct: 35,
    title: "Help more trials save their first result",
    evidenceLabel: "downloaded an image",
    action:
      "Make the next experiment the path from a generated result to a clear, easy first download.",
  },
  {
    key: "first_image_generated",
    defaultWeakBelowPct: 50,
    title: "Help more trials create their first image",
    evidenceLabel: "generated an image",
    action:
      "Make the next experiment the shortest clear path from opening the app to first creation.",
  },
]

export function buildActivationFocus(cohort: ActivationCohort): ActivationFocusSummary {
  const steps = new Map(cohort.steps.map(item => [item.key, item]))

  for (const rule of FOCUS_RULES) {
    const candidate = steps.get(rule.key)
    if (!candidate || candidate.eligible === 0) continue
    const focusSignalPct = candidate.targetPct ?? rule.defaultWeakBelowPct
    if (candidate.ratePct >= focusSignalPct) continue

    const people = candidate.eligible === 1 ? "person" : "people"
    return {
      status: "constraint",
      stepKey: rule.key,
      title: rule.title,
      evidence: `${candidate.count} of ${candidate.eligible} eligible ${people} ${rule.evidenceLabel} (${candidate.ratePct}%). This is below the ${focusSignalPct}% weekly focus signal.`,
      action: rule.action,
    }
  }

  const hasMeasuredPriority = FOCUS_RULES.some(rule => (steps.get(rule.key)?.eligible ?? 0) > 0)
  if (!hasMeasuredPriority) {
    return {
      status: "awaiting_data",
      stepKey: null,
      title: "Let the activation cohort mature",
      evidence: "There are not yet enough eligible people to judge the priority activation rates.",
      action:
        "Keep the current path stable and review this card when the observation windows mature.",
    }
  }

  return {
    status: "on_track",
    stepKey: null,
    title: "Protect the current activation path",
    evidence: "No measured priority rate is below its weekly focus signal right now.",
    action:
      "Keep the path stable, gather more observations, and watch for the next measured constraint.",
  }
}

export function buildActivationCohort(input: {
  key: string
  label: string
  facts: ActivationUserFact[]
  now?: Date
}): ActivationCohort {
  const now = input.now ?? new Date()
  const size = input.facts.length
  const matured7d = input.facts.filter(fact => {
    const firstQualifyingAt = validDate(fact.firstQualifyingAt)
    return firstQualifyingAt ? now.getTime() - firstQualifyingAt.getTime() >= 7 * DAY_MS : false
  })
  const matured14d = input.facts.filter(fact => {
    const firstQualifyingAt = validDate(fact.firstQualifyingAt)
    return firstQualifyingAt ? now.getTime() - firstQualifyingAt.getTime() >= 14 * DAY_MS : false
  })

  return {
    key: input.key,
    label: input.label,
    size,
    steps: [
      step({
        key: "opened_app",
        label: "Opened /app",
        description: "First suite_home_viewed after this cohort began.",
        count: input.facts.filter(fact => Boolean(fact.openedAt)).length,
        eligible: size,
        targetPct: null,
        targetLabel: null,
        targetComparable: true,
      }),
      step({
        key: "selfie_uploaded",
        label: "Uploaded a selfie",
        description:
          "A measured upload. Selecting an already-saved selfie is not tracked yet, so this is a lower bound.",
        count: input.facts.filter(fact => Boolean(fact.selfieUploadedAt)).length,
        eligible: size,
        targetPct: 70,
        targetLabel: "70% reference goal",
        targetComparable: false,
      }),
      step({
        key: "look_chosen",
        label: "Chose a look",
        description: "A committed vibe, shot, inspiration style, or Maya-decides choice.",
        count: input.facts.filter(fact => Boolean(fact.lookChosenAt)).length,
        eligible: size,
        targetPct: null,
        targetLabel: null,
        targetComparable: true,
      }),
      step({
        key: "first_image_generated",
        label: "Generated first image",
        description:
          "First measured generation after cohort entry. Session IDs do not exist, so this is not a first-session rate.",
        count: input.facts.filter(fact => Boolean(fact.generatedAt)).length,
        eligible: size,
        targetPct: 50,
        targetLabel: "50% first-session goal",
        targetComparable: false,
      }),
      step({
        key: "first_image_downloaded",
        label: "Downloaded first image",
        description: "First measured download after cohort entry, scoped to users in this cohort.",
        count: input.facts.filter(fact => Boolean(fact.downloadedAt)).length,
        eligible: size,
        targetPct: 35,
        targetLabel: "35% reference goal",
        targetComparable: true,
      }),
      step({
        key: "returned_within_7d",
        label: "Returned within 7 days",
        description:
          "Another qualifying action 1 to 7 days after the first one. Only first actions at least 7 days old are eligible.",
        count: matured7d.filter(fact => fact.returnedWithin7d).length,
        eligible: matured7d.length,
        targetPct: 25,
        targetLabel: "25% reference goal",
        targetComparable: true,
      }),
      step({
        key: "created_again_days_8_14",
        label: "Created again in days 8 to 14",
        description:
          "Generated or downloaded 8 to 14 days after the first qualifying action, after an earlier generation or download.",
        count: matured14d.filter(fact => fact.createdAgainDays8To14).length,
        eligible: matured14d.length,
        targetPct: null,
        targetLabel: null,
        targetComparable: true,
      }),
    ],
  }
}

function cohortLabel(key: string): string {
  switch (key) {
    case "member":
      return "Paid members"
    case "trial":
      return "Trial visitors"
    case "limited":
      return "Limited-access users"
    default:
      return "Unclassified visitors"
  }
}

function sourceLabel(key: string): string {
  if (key === "direct") return "Direct / unknown"
  if (key.startsWith("paid_buyer_")) {
    const product = key.slice("paid_buyer_".length)
    return `Paid buyer · ${product
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, character => character.toUpperCase())}`
  }
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, character => character.toUpperCase())
}

export function buildActivationFunnelScorecardFromFacts(input: {
  windowDays: number
  appFacts: ActivationUserFact[]
  trialFacts: ActivationUserFact[]
  now?: Date
}): ActivationFunnelScorecard {
  const now = input.now ?? new Date()
  const appGroups = new Map<string, ActivationUserFact[]>()
  for (const fact of input.appFacts) {
    const key = fact.cohortKey || "unknown"
    const rows = appGroups.get(key) ?? []
    rows.push(fact)
    appGroups.set(key, rows)
  }

  const sourceGroups = new Map<string, ActivationUserFact[]>()
  for (const fact of input.trialFacts) {
    const key = fact.sourceKey || "direct"
    const rows = sourceGroups.get(key) ?? []
    rows.push(fact)
    sourceGroups.set(key, rows)
  }

  const trialOverall = buildActivationCohort({
    key: "all_trials",
    label: "All trials claimed",
    facts: input.trialFacts,
    now,
  })

  return {
    generatedAt: now.toISOString(),
    windowDays: input.windowDays,
    source: "analytics_events + subscriptions + freebie_subscribers",
    lookChoiceEvent: "suite_inline_choice_selected",
    lookChoiceActions: LOOK_CHOICE_ACTIONS,
    sessionMeasurementAvailable: false,
    appCohorts: [
      buildActivationCohort({
        key: "all_app_visitors",
        label: "All new app visitors",
        facts: input.appFacts,
        now,
      }),
      ...Array.from(appGroups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, facts]) => buildActivationCohort({ key, label: cohortLabel(key), facts, now })),
    ],
    trialOverall,
    focusThisWeek: buildActivationFocus(trialOverall),
    trialSources: Array.from(sourceGroups.entries())
      .sort(([aKey, a], [bKey, b]) => b.length - a.length || aKey.localeCompare(bKey))
      .map(([key, facts]) =>
        buildActivationCohort({
          key,
          label: sourceLabel(key),
          facts,
          now,
        })
      ),
    trialSourceAttribution: {
      paidBuyerEvent: input.trialFacts.filter(
        fact => fact.sourceMethod === "paid_buyer_event"
      ).length,
      exactClaimSubscriber: input.trialFacts.filter(
        fact => fact.sourceMethod === "claim_subscriber"
      ).length,
      emailFallback: input.trialFacts.filter(fact => fact.sourceMethod === "email_fallback").length,
      direct: input.trialFacts.filter(fact => fact.sourceMethod === "direct").length,
    },
    measurementNotes: [
      "Behavior comes from analytics_events. Trial eligibility comes from live-mode subscriptions rows. Paid-buyer labels come from the exact trial_claimed event; older claim sources fall back to freebie_subscribers.",
      "New app visitor cohorts include users whose first-ever suite_home_viewed occurred inside the selected window.",
      "There is no session ID in analytics_events. First generation is measured after cohort entry, not claimed as first-session conversion.",
      "Existing-selfie selection has no event. The selfie step reports measured uploads only and is therefore a lower bound.",
      `Look choice uses suite_inline_choice_selected only for: ${LOOK_CHOICE_ACTIONS.join(", ")}. Typed messages, format choices, and post-generation next actions do not count as choosing a look.`,
      "Trial source first recognizes an exact paid-buyer auto-activation event and product, then uses the exact subscriber_id stored on trial_claimed, then a case-insensitive email fallback, then Direct / unknown. Subscriber-based labels display that subscriber record's current acquisition source because trials have no source column.",
      "Milestones are independently observed. A legacy or typed creation path can generate without a tracked look choice, so the rows are not forced to decrease at every step.",
      "Seven-day and days-8-to-14 rates include only users whose first qualifying action is old enough to have completed the observation window.",
      "The trial lasts seven days. Trial creation in days 8 to 14 therefore measures whether an activated woman crossed into paid or another valid continued-access path.",
    ],
  }
}

function mapRow(row: ActivationUserRow): ActivationUserFact {
  const sourceMethod = row.source_method
  return {
    userId: String(row.user_id),
    cohortKey: String(row.cohort_key || "unknown"),
    sourceKey: row.source_key ? String(row.source_key) : null,
    sourceMethod:
      sourceMethod === "paid_buyer_event" ||
      sourceMethod === "claim_subscriber" ||
      sourceMethod === "email_fallback" ||
      sourceMethod === "direct"
        ? sourceMethod
        : null,
    entryAt: row.entry_at,
    openedAt: row.opened_at,
    selfieUploadedAt: row.selfie_uploaded_at,
    lookChosenAt: row.look_chosen_at,
    generatedAt: row.generated_at,
    downloadedAt: row.downloaded_at,
    firstQualifyingAt: row.first_qualifying_at,
    returnedWithin7d: row.returned_within_7d === true,
    createdAgainDays8To14: row.created_again_days_8_14 === true,
  }
}

export async function getActivationFunnelScorecard(
  windowDays = 30
): Promise<ActivationFunnelScorecard> {
  const safeWindowDays = [7, 14, 30].includes(windowDays) ? windowDays : 30
  const interval = `${safeWindowDays} days`
  const sql = getDb()

  await ensureAnalyticsSchema()

  const appRows = (await sql`
    WITH first_home AS (
      SELECT DISTINCT ON (ae.user_id)
        ae.user_id,
        ae.created_at AS entry_at,
        LOWER(COALESCE(NULLIF(ae.properties->>'cohort', ''), 'unknown')) AS cohort_key
      FROM analytics_events ae
      WHERE ae.event_name = 'suite_home_viewed'
        AND ae.user_id IS NOT NULL
      ORDER BY ae.user_id, ae.created_at, ae.id
    ), cohort AS (
      SELECT user_id, entry_at, cohort_key
      FROM first_home
      WHERE entry_at >= NOW() - (${interval}::interval)
        AND cohort_key <> 'admin'
    ), qualifying_events AS (
      SELECT ae.user_id, ae.event_name, ae.created_at, ae.properties
      FROM analytics_events ae
      JOIN cohort c ON c.user_id = ae.user_id
      WHERE ae.created_at >= c.entry_at
        AND (
          ae.event_name IN ('activation_selfie_uploaded', 'suite_image_generated', 'suite_image_downloaded')
          OR (
            ae.event_name = 'suite_inline_choice_selected'
            AND ae.properties->>'action' = ANY(${LOOK_CHOICE_ACTIONS})
          )
        )
    ), facts AS (
      SELECT
        c.user_id,
        c.cohort_key,
        c.entry_at,
        c.entry_at AS opened_at,
        MIN(q.created_at) FILTER (WHERE q.event_name = 'activation_selfie_uploaded') AS selfie_uploaded_at,
        MIN(q.created_at) FILTER (WHERE q.event_name = 'suite_inline_choice_selected') AS look_chosen_at,
        MIN(q.created_at) FILTER (WHERE q.event_name = 'suite_image_generated') AS generated_at,
        MIN(q.created_at) FILTER (WHERE q.event_name = 'suite_image_downloaded') AS downloaded_at
      FROM cohort c
      LEFT JOIN qualifying_events q ON q.user_id = c.user_id
      GROUP BY c.user_id, c.cohort_key, c.entry_at
    ), timed AS (
      SELECT
        facts.*,
        LEAST(selfie_uploaded_at, look_chosen_at, generated_at, downloaded_at) AS first_qualifying_at
      FROM facts
    )
    SELECT
      timed.*,
      EXISTS (
        SELECT 1
        FROM qualifying_events q
        WHERE q.user_id = timed.user_id
          AND timed.first_qualifying_at IS NOT NULL
          AND q.created_at >= timed.first_qualifying_at + INTERVAL '1 day'
          AND q.created_at <= timed.first_qualifying_at + INTERVAL '7 days'
      ) AS returned_within_7d,
      EXISTS (
        SELECT 1
        FROM qualifying_events q
        WHERE q.user_id = timed.user_id
          AND timed.first_qualifying_at IS NOT NULL
          AND q.event_name IN ('suite_image_generated', 'suite_image_downloaded')
          AND q.created_at >= timed.first_qualifying_at + INTERVAL '8 days'
          AND q.created_at <= timed.first_qualifying_at + INTERVAL '14 days'
          AND EXISTS (
            SELECT 1
            FROM qualifying_events earlier
            WHERE earlier.user_id = timed.user_id
              AND earlier.event_name IN ('suite_image_generated', 'suite_image_downloaded')
              AND earlier.created_at < timed.first_qualifying_at + INTERVAL '8 days'
          )
      ) AS created_again_days_8_14
    FROM timed
    ORDER BY timed.entry_at DESC
  `) as ActivationUserRow[]

  const trialRows = (await sql`
    WITH trial_cohort AS (
      SELECT DISTINCT ON (t.user_id)
        t.user_id::text AS user_id,
        t.created_at AS entry_at,
        'trial'::text AS cohort_key,
        CASE
          WHEN paid_buyer_event.product_type IS NOT NULL
            THEN 'paid_buyer_' || LOWER(paid_buyer_event.product_type)
          ELSE LOWER(COALESCE(NULLIF(exact_subscriber.source, ''), NULLIF(email_subscriber.source, ''), 'direct'))
        END AS source_key,
        CASE
          WHEN paid_buyer_event.product_type IS NOT NULL THEN 'paid_buyer_event'
          WHEN exact_subscriber.id IS NOT NULL THEN 'claim_subscriber'
          WHEN email_subscriber.id IS NOT NULL THEN 'email_fallback'
          ELSE 'direct'
        END AS source_method
      FROM subscriptions t
      JOIN users u ON u.id::text = t.user_id::text
      LEFT JOIN LATERAL (
        SELECT ae.properties->>'product_type' AS product_type
        FROM analytics_events ae
        WHERE ae.user_id = t.user_id::text
          AND ae.event_name = 'trial_claimed'
          AND ae.properties->>'source' = 'paid_buyer_auto_activation'
          AND ae.properties->>'product_type' IN (
            'prompt_vault',
            'starter_kit',
            'selfie_ai_photos_kit'
          )
          AND ae.created_at >= t.created_at - INTERVAL '5 minutes'
          AND ae.created_at <= t.created_at + INTERVAL '30 minutes'
        ORDER BY ae.created_at ASC, ae.id ASC
        LIMIT 1
      ) paid_buyer_event ON TRUE
      LEFT JOIN LATERAL (
        SELECT (ae.properties->>'subscriber_id')::bigint AS subscriber_id
        FROM analytics_events ae
        WHERE ae.user_id = t.user_id::text
          AND ae.event_name = 'trial_claimed'
          AND ae.properties->>'subscriber_id' ~ '^[0-9]+$'
          AND ae.created_at >= t.created_at - INTERVAL '5 minutes'
        ORDER BY ae.created_at ASC, ae.id ASC
        LIMIT 1
      ) claim_event ON TRUE
      LEFT JOIN freebie_subscribers exact_subscriber ON exact_subscriber.id = claim_event.subscriber_id
      LEFT JOIN LATERAL (
        SELECT fs.id, fs.source
        FROM freebie_subscribers fs
        WHERE LOWER(fs.email) = LOWER(u.email)
        ORDER BY
          CASE WHEN COALESCE(fs.updated_at, fs.created_at) <= t.created_at + INTERVAL '5 minutes' THEN 0 ELSE 1 END,
          ABS(EXTRACT(EPOCH FROM (COALESCE(fs.updated_at, fs.created_at) - t.created_at))) ASC,
          fs.id DESC
        LIMIT 1
      ) email_subscriber ON paid_buyer_event.product_type IS NULL AND exact_subscriber.id IS NULL
      WHERE t.product_type = 'suite_trial'
        AND COALESCE(t.is_test_mode, false) = false
        AND t.created_at >= NOW() - (${interval}::interval)
      ORDER BY t.user_id, t.created_at ASC
    ), cohort_events AS (
      SELECT ae.user_id, ae.event_name, ae.created_at, ae.properties
      FROM analytics_events ae
      JOIN trial_cohort c ON c.user_id = ae.user_id
      WHERE ae.created_at >= c.entry_at
        AND (
          ae.event_name IN (
            'suite_home_viewed',
            'activation_selfie_uploaded',
            'trial_first_generation',
            'suite_image_generated',
            'suite_image_downloaded'
          )
          OR (
            ae.event_name = 'suite_inline_choice_selected'
            AND ae.properties->>'action' = ANY(${LOOK_CHOICE_ACTIONS})
          )
        )
    ), facts AS (
      SELECT
        c.user_id,
        c.cohort_key,
        c.source_key,
        c.source_method,
        c.entry_at,
        MIN(e.created_at) FILTER (WHERE e.event_name = 'suite_home_viewed') AS opened_at,
        MIN(e.created_at) FILTER (WHERE e.event_name = 'activation_selfie_uploaded') AS selfie_uploaded_at,
        MIN(e.created_at) FILTER (WHERE e.event_name = 'suite_inline_choice_selected') AS look_chosen_at,
        MIN(e.created_at) FILTER (WHERE e.event_name IN ('trial_first_generation', 'suite_image_generated')) AS generated_at,
        MIN(e.created_at) FILTER (WHERE e.event_name = 'suite_image_downloaded') AS downloaded_at
      FROM trial_cohort c
      LEFT JOIN cohort_events e ON e.user_id = c.user_id
      GROUP BY c.user_id, c.cohort_key, c.source_key, c.source_method, c.entry_at
    ), timed AS (
      SELECT
        facts.*,
        LEAST(selfie_uploaded_at, look_chosen_at, generated_at, downloaded_at) AS first_qualifying_at
      FROM facts
    )
    SELECT
      timed.*,
      EXISTS (
        SELECT 1
        FROM cohort_events e
        WHERE e.user_id = timed.user_id
          AND timed.first_qualifying_at IS NOT NULL
          AND e.event_name <> 'suite_home_viewed'
          AND e.created_at >= timed.first_qualifying_at + INTERVAL '1 day'
          AND e.created_at <= timed.first_qualifying_at + INTERVAL '7 days'
      ) AS returned_within_7d,
      EXISTS (
        SELECT 1
        FROM cohort_events e
        WHERE e.user_id = timed.user_id
          AND timed.first_qualifying_at IS NOT NULL
          AND e.event_name IN ('trial_first_generation', 'suite_image_generated', 'suite_image_downloaded')
          AND e.created_at >= timed.first_qualifying_at + INTERVAL '8 days'
          AND e.created_at <= timed.first_qualifying_at + INTERVAL '14 days'
          AND EXISTS (
            SELECT 1
            FROM cohort_events earlier
            WHERE earlier.user_id = timed.user_id
              AND earlier.event_name IN ('trial_first_generation', 'suite_image_generated', 'suite_image_downloaded')
              AND earlier.created_at < timed.first_qualifying_at + INTERVAL '8 days'
          )
      ) AS created_again_days_8_14
    FROM timed
    ORDER BY timed.entry_at DESC
  `) as ActivationUserRow[]

  return buildActivationFunnelScorecardFromFacts({
    windowDays: safeWindowDays,
    appFacts: appRows.map(mapRow),
    trialFacts: trialRows.map(mapRow),
  })
}
