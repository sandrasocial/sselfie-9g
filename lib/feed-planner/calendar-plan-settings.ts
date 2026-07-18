export interface CalendarPlanSettings {
  businessType: string
  idealAudience: string
  currentSituation: string
  feedStyle: string
  transformationStory?: string
  audienceChallenge?: string
  audienceTransformation?: string
  futureVision?: string
  contentGoals?: string
  contentPillars?: string[]
}

export const EMPTY_CALENDAR_PLAN_SETTINGS: CalendarPlanSettings = {
  businessType: "",
  idealAudience: "",
  currentSituation: "",
  feedStyle: "",
  transformationStory: "",
  audienceChallenge: "",
  audienceTransformation: "",
  futureVision: "",
  contentGoals: "",
  contentPillars: [],
}

const text = (value: unknown) => (typeof value === "string" ? value : "")

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item =>
        typeof item === "string"
          ? item
          : item && typeof item === "object" && "name" in item
            ? String(item.name)
            : ""
      )
      .map(item => item.trim())
      .filter(Boolean)
  }
  if (typeof value !== "string" || !value.trim()) return []
  try {
    return stringList(JSON.parse(value))
  } catch {
    return value
      .split(",")
      .map(item => item.trim())
      .filter(Boolean)
  }
}

export function calendarPlanSettingsFromProfile(profile: any): CalendarPlanSettings {
  const data = profile?.data ?? profile ?? {}
  return {
    businessType: text(data.businessType),
    idealAudience:
      typeof data.idealAudience === "string" && data.idealAudience.trim()
        ? data.idealAudience
        : typeof data.targetAudience === "string"
          ? data.targetAudience
          : "",
    currentSituation:
      typeof data.currentSituation === "string" && data.currentSituation.trim()
        ? data.currentSituation
        : typeof data.contentGoals === "string"
          ? data.contentGoals
          : "",
    feedStyle: Array.isArray(data.settingsPreference)
      ? String(data.settingsPreference[0] ?? "")
      : "",
    transformationStory: text(data.transformationStory),
    audienceChallenge: text(data.audienceChallenge),
    audienceTransformation: text(data.audienceTransformation),
    futureVision: text(data.futureVision),
    contentGoals: text(data.contentGoals),
    contentPillars: stringList(data.contentPillars),
  }
}

export function isCalendarPlanComplete(settings: CalendarPlanSettings): boolean {
  return Boolean(
    settings.businessType.trim() &&
    settings.idealAudience.trim() &&
    settings.currentSituation.trim()
  )
}
