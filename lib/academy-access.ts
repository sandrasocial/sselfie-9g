import { sql } from "@/lib/neon"

export type CourseId = "what_to_say" | "show_up" | "get_paid"

export async function userHasAcademyAccess(userId: string, courseId: CourseId): Promise<boolean> {
  try {
    const activeSubscription = await sql`
      SELECT 1
      FROM subscriptions
      WHERE user_id = ${userId}
        AND status = 'active'
      LIMIT 1
    `

    if (activeSubscription.length > 0) {
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
