/**
 * Broadcast naming convention for SSELFIE Resend broadcasts.
 *
 * All programmatic broadcasts MUST include a name. Unnamed broadcasts in the
 * Resend dashboard are impossible to audit or attribute to a campaign.
 *
 * Naming format:
 *   <Campaign> — <Audience> (<Month YYYY>)
 *
 * Examples:
 *   "Re-engagement — Maya 2026 Upgrade (Mar 2026)"
 *   "Lifecycle — Studio D0 Welcome (Mar 2026)"
 *   "Feature — Videos Tab Launch (Apr 2026)"
 *   "Win-back — 7-Day Dormant (Apr 2026)"
 */

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function currentMonthLabel(): string {
  const now = new Date()
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
}

type BroadcastCategory = "Re-engagement" | "Lifecycle" | "Feature" | "Win-back" | "Announcement" | "Promotion"

/**
 * Build a standardised broadcast name.
 *
 * @param category  Broad category (e.g. "Re-engagement", "Feature")
 * @param label     Short descriptive label (e.g. "Maya 2026 Upgrade", "Studio D0 Welcome")
 * @param month     Override month label — defaults to current month (e.g. "Mar 2026")
 *
 * @example
 *   broadcastName("Re-engagement", "Maya 2026 Upgrade")
 *   // → "Re-engagement — Maya 2026 Upgrade (Mar 2026)"
 */
export function broadcastName(category: BroadcastCategory, label: string, month?: string): string {
  return `${category} — ${label} (${month ?? currentMonthLabel()})`
}
