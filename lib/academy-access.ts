import { userHasAcademyProductAccess } from "@/lib/academy-entitlements"

export type CourseId =
  | "what_to_say"
  | "show_up"
  | "get_paid"
  | "ai_photo_prompts"
  | "editing_masterclass"
  | "branded_by_sselfie"
  | "selfie_guide"
  | "selfie_guide_bundle"
  | "brand_strategy_pack"

export async function userHasAcademyAccess(userId: string, courseId: CourseId): Promise<boolean> {
  try {
    return await userHasAcademyProductAccess(userId, courseId)
  } catch (error) {
    console.error("[academy-access] Failed to check course access:", error)
    return false
  }
}
