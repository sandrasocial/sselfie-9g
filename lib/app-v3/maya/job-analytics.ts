"use client"

import { trackAnalyticsEvent } from "@/lib/analytics/client"

export const MAYA_JOBS = [
  "decide_post",
  "create_content",
  "finish_calendar_post",
  "improve_grid",
  "learn_next",
] as const

export type MayaJob = (typeof MAYA_JOBS)[number]

export const MAYA_JOB_SURFACES = ["create", "calendar", "gallery", "learn", "account"] as const
export type MayaJobSurface = (typeof MAYA_JOB_SURFACES)[number]

export const MAYA_JOB_ENTRIES = [
  "maya_recommendation",
  "inspiration",
  "visual_world",
  "weekly_look_chip",
  "maya_text_start",
  "continue_recent_shoot",
  "my_selfies",
  "add_selfie",
  "calendar_post_maya",
  "calendar_needs_visual_direction",
  "calendar_first_post",
  "calendar_needs_me",
  "visual_direction",
  "visual_direction_maya",
  "visual_direction_curated",
  "visual_direction_custom",
  "visual_direction_inspiration",
  "what-to-post",
  "sound-like-me",
  "photos-no-plan",
  "connect-offer",
] as const
export type MayaJobEntry = (typeof MAYA_JOB_ENTRIES)[number]

const MAYA_JOB_COHORTS = ["member", "trial", "limited", "admin"] as const
type MayaJobCohort = (typeof MAYA_JOB_COHORTS)[number]

const MAYA_JOB_OUTCOMES = ["completed", "cancelled", "failed"] as const
type MayaJobOutcome = (typeof MAYA_JOB_OUTCOMES)[number]

const MAYA_CONTEXT_MISMATCH_REASONS = [
  "stale_inspiration",
  "wrong_post",
  "wrong_grid",
  "wrong_lesson",
  "overlapping_overlay",
  "legacy_context_invalid",
  "unknown",
] as const
type MayaContextMismatchReason = (typeof MAYA_CONTEXT_MISMATCH_REASONS)[number]

export const MAYA_JOB_ANALYTICS_PROPERTY_KEYS = [
  "task_id",
  "job",
  "surface",
  "entry",
  "cohort",
  "outcome",
  "reason",
  "duration_ms",
  "provider_wait_ms",
  "decision_count",
  "surface_handoff_count",
  "context_repair_count",
  "source_count",
] as const

type MayaJobAnalyticsKey = (typeof MAYA_JOB_ANALYTICS_PROPERTY_KEYS)[number]
type MayaJobAnalyticsProperties = Partial<
  Record<MayaJobAnalyticsKey, string | number | boolean | null>
>

interface ActiveMayaJob {
  taskId: string
  job: MayaJob
  surface: MayaJobSurface
  entry: MayaJobEntry
  cohort?: MayaJobCohort
  startedAt: number
  decisionCount: number
  surfaceHandoffCount: number
  contextRepairCount: number
}

const ALLOWED_KEYS = new Set<string>(MAYA_JOB_ANALYTICS_PROPERTY_KEYS)
const ALLOWED_VALUES: Partial<Record<MayaJobAnalyticsKey, ReadonlySet<string>>> = {
  job: new Set(MAYA_JOBS),
  surface: new Set(MAYA_JOB_SURFACES),
  entry: new Set(MAYA_JOB_ENTRIES),
  cohort: new Set(MAYA_JOB_COHORTS),
  outcome: new Set(MAYA_JOB_OUTCOMES),
  reason: new Set(MAYA_CONTEXT_MISMATCH_REASONS),
}

const NUMERIC_KEYS = new Set<MayaJobAnalyticsKey>([
  "duration_ms",
  "provider_wait_ms",
  "decision_count",
  "surface_handoff_count",
  "context_repair_count",
  "source_count",
])

export function sanitizeMayaJobAnalyticsProperties(
  input: Record<string, unknown>
): MayaJobAnalyticsProperties {
  const safe: MayaJobAnalyticsProperties = {}
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_KEYS.has(key)) continue
    const typedKey = key as MayaJobAnalyticsKey
    if (value === null && (typedKey === "cohort" || typedKey === "provider_wait_ms")) {
      safe[typedKey] = null
      continue
    }
    if (
      typedKey === "task_id" &&
      typeof value === "string" &&
      /^[a-zA-Z0-9_-]{8,80}$/.test(value)
    ) {
      safe.task_id = value
      continue
    }
    if (typeof value === "string" && ALLOWED_VALUES[typedKey]?.has(value)) {
      safe[typedKey] = value
      continue
    }
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      NUMERIC_KEYS.has(typedKey)
    ) {
      safe[typedKey] = value
    }
  }
  return safe
}

export function createMayaJobTaskId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `maya-job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function trackMayaJobEvent(
  event:
    | "suite_maya_job_started"
    | "suite_maya_job_finished"
    | "suite_maya_context_mismatch"
    | "suite_maya_guidance_served",
  properties: MayaJobAnalyticsProperties
): void {
  try {
    void trackAnalyticsEvent({
      event,
      properties: sanitizeMayaJobAnalyticsProperties(properties),
    }).catch(() => undefined)
  } catch {
    // Analytics is deliberately fail-open and cannot interrupt member work.
  }
}

const ACTIVE_JOB_PREFIX = "sselfie.maya.active-job.v1"

function storageKey(job: MayaJob): string {
  return `${ACTIVE_JOB_PREFIX}:${job}`
}

function readActiveJob(job: MayaJob): ActiveMayaJob | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.sessionStorage.getItem(storageKey(job))
    if (!value) return null
    const parsed = JSON.parse(value) as ActiveMayaJob
    if (parsed.job !== job || typeof parsed.taskId !== "string") return null
    return parsed
  } catch {
    return null
  }
}

function writeActiveJob(active: ActiveMayaJob | null): void {
  if (typeof window === "undefined") return
  try {
    if (!active) return
    window.sessionStorage.setItem(storageKey(active.job), JSON.stringify(active))
  } catch {
    // Analytics state is best effort and must never block the member journey.
  }
}

export function startMayaJob(input: {
  job: MayaJob
  surface: MayaJobSurface
  entry: MayaJobEntry
  cohort?: MayaJobCohort
}): string {
  const existing = readActiveJob(input.job)
  if (existing && Date.now() - existing.startedAt < 4 * 60 * 60 * 1000) return existing.taskId

  const active: ActiveMayaJob = {
    taskId: createMayaJobTaskId(),
    job: input.job,
    surface: input.surface,
    entry: input.entry,
    cohort: input.cohort,
    startedAt: Date.now(),
    decisionCount: 1,
    surfaceHandoffCount: 0,
    contextRepairCount: 0,
  }
  writeActiveJob(active)
  trackMayaJobEvent("suite_maya_job_started", {
    task_id: active.taskId,
    job: active.job,
    surface: active.surface,
    entry: active.entry,
    cohort: active.cohort ?? null,
    decision_count: active.decisionCount,
  })
  return active.taskId
}

function updateActiveJob(job: MayaJob, update: (active: ActiveMayaJob) => ActiveMayaJob): void {
  const active = readActiveJob(job)
  if (!active) return
  writeActiveJob(update(active))
}

export function recordMayaJobHandoff(job: MayaJob): void {
  updateActiveJob(job, active => ({
    ...active,
    surfaceHandoffCount: active.surfaceHandoffCount + 1,
  }))
}

export function recordMayaJobDecision(job: MayaJob): void {
  updateActiveJob(job, active => ({ ...active, decisionCount: active.decisionCount + 1 }))
}

export function recordMayaContextMismatch(job: MayaJob, reason: MayaContextMismatchReason): void {
  const active = readActiveJob(job)
  if (!active) return
  const next = { ...active, contextRepairCount: active.contextRepairCount + 1 }
  writeActiveJob(next)
  trackMayaJobEvent("suite_maya_context_mismatch", {
    task_id: next.taskId,
    job: next.job,
    surface: next.surface,
    reason,
    context_repair_count: next.contextRepairCount,
  })
}

export function finishMayaJob(input: {
  job: MayaJob
  outcome: MayaJobOutcome
  providerWaitMs?: number | null
}): void {
  const active = readActiveJob(input.job)
  if (!active) return
  trackMayaJobEvent("suite_maya_job_finished", {
    task_id: active.taskId,
    job: active.job,
    surface: active.surface,
    entry: active.entry,
    cohort: active.cohort ?? null,
    outcome: input.outcome,
    duration_ms: Math.max(0, Date.now() - active.startedAt),
    provider_wait_ms: input.providerWaitMs ?? null,
    decision_count: active.decisionCount,
    surface_handoff_count: active.surfaceHandoffCount,
    context_repair_count: active.contextRepairCount,
  })
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(storageKey(input.job))
    } catch {
      // Best effort only.
    }
  }
}
