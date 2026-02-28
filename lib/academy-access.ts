import { sql } from "@/lib/neon"
import { hasStudioMembership } from "@/lib/subscription"

export type CourseId =
  | "what_to_say"
  | "show_up"
  | "get_paid"
  | "ai_photo_prompts"
  | "editing_masterclass"
  | "branded_by_sselfie"

export async function userHasAcademyAccess(userId: string, courseId: CourseId): Promise<boolean> {
  try {
    // Studio membership unlocks all Academy products.
    if (await hasStudioMembership(userId)) {
      return true
    }

    const activePurchase = await sql`
      SELECT 1
      FROM academy_course_purchases
      WHERE user_id = ${userId}
        AND course_id = ${courseId}
        AND status = 'active'
      LIMIT 1
    `

    return activePurchase.length > 0
  } catch (error) {
    console.error("[academy-access] Failed to check course access:", error)
    return false
  }
}
