import type { AppV3Section } from "./navigation"

/** The three places a member needs to understand every day. Calendar and Learn stay available
 * through Maya, Account, and direct links, but no longer compete with the core creation job. */
export const PRIMARY_MEMBER_SECTIONS = [
  "create",
  "photos",
  "account",
] as const satisfies readonly AppV3Section[]

export function isPrimaryMemberSection(section: AppV3Section): boolean {
  return (PRIMARY_MEMBER_SECTIONS as readonly AppV3Section[]).includes(section)
}
