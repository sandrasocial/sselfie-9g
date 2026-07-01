import { NextResponse } from "next/server"
import { WEEKLY_THEMES } from "@/lib/maya/sselfie-method-content"
import { getWeeklyThemeRotation } from "@/lib/maya/week-plan-prompt"
import { getISOWeek } from "date-fns"

/**
 * GET /api/maya/week-plan
 *
 * Returns 3 suggested weekly themes for the current ISO week.
 * No AI call - pure rotation from the themes data file.
 * Used by the welcome panel to surface theme chips.
 */
export async function GET() {
  const isoWeek = getISOWeek(new Date())
  const themeIds = getWeeklyThemeRotation(WEEKLY_THEMES, isoWeek)
  const themes = themeIds
    .map((id) => WEEKLY_THEMES.find((t) => t.id === id))
    .filter(Boolean)

  return NextResponse.json({ themes, isoWeek })
}
