export const BRAND_ENGINE_COHORT_START_DATE = "2026-03-16"
export const BRAND_ENGINE_SEAT_CAP = 12
export const BRAND_ENGINE_TARGET_CALLS_PER_DAY = 3
export const BRAND_ENGINE_APPLICATION_SPRINT_DAYS = 7

export function getDaysUntilCohortStart(now: Date = new Date()) {
  const cohortStart = new Date(`${BRAND_ENGINE_COHORT_START_DATE}T00:00:00.000Z`)
  const msInDay = 24 * 60 * 60 * 1000
  const diffMs = cohortStart.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / msInDay))
}

