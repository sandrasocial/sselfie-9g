import type { AppV3Section } from "./navigation"

/** The five member destinations use plain outcome names. Their stable section ids stay unchanged
 * so remembered state and existing deep links continue to resolve. */
export const PRIMARY_MEMBER_SECTIONS = [
  "create",
  "photos",
  "calendar",
  "library",
  "account",
] as const satisfies readonly AppV3Section[]

export function isPrimaryMemberSection(section: AppV3Section): boolean {
  return (PRIMARY_MEMBER_SECTIONS as readonly AppV3Section[]).includes(section)
}
