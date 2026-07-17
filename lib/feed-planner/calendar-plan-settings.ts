export interface CalendarPlanSettings {
  businessType: string
  idealAudience: string
  currentSituation: string
  feedStyle: string
}

export const EMPTY_CALENDAR_PLAN_SETTINGS: CalendarPlanSettings = {
  businessType: "",
  idealAudience: "",
  currentSituation: "",
  feedStyle: "",
}

export function calendarPlanSettingsFromProfile(profile: any): CalendarPlanSettings {
  const data = profile?.data ?? profile ?? {}
  return {
    businessType: typeof data.businessType === "string" ? data.businessType : "",
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
  }
}

export function isCalendarPlanComplete(settings: CalendarPlanSettings): boolean {
  return Boolean(
    settings.businessType.trim() &&
    settings.idealAudience.trim() &&
    settings.currentSituation.trim()
  )
}
