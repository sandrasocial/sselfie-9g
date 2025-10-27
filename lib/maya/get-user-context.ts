import { getUserPersonalMemory } from "@/lib/data/maya"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function getUserContextForMaya(authUserId: string): Promise<string> {
  try {
    // Get Neon user
    const neonUser = await getUserByAuthId(authUserId)
    if (!neonUser) {
      return ""
    }

    // Get personal memory
    const memory = await getUserPersonalMemory(neonUser.id)
    if (!memory) {
      return ""
    }

    // Build context string
    const contextParts: string[] = []

    if (memory.preferred_topics && Array.isArray(memory.preferred_topics) && memory.preferred_topics.length > 0) {
      contextParts.push(`User's preferred topics: ${memory.preferred_topics.join(", ")}`)
    }

    if (memory.personalized_styling_notes) {
      contextParts.push(`Styling notes: ${memory.personalized_styling_notes}`)
    }

    const insights = memory.personal_insights as any
    if (insights) {
      if (insights.concepts_generated > 0) {
        contextParts.push(`User has generated ${insights.concepts_generated} concepts previously`)
      }
      if (insights.images_favorited > 0) {
        contextParts.push(`User has favorited ${insights.images_favorited} images`)
      }
    }

    const feedbackPatterns = memory.user_feedback_patterns as any
    if (feedbackPatterns && feedbackPatterns.total_interactions > 5) {
      const positiveRate = feedbackPatterns.positive_feedback / feedbackPatterns.total_interactions
      if (positiveRate > 0.7) {
        contextParts.push("User typically responds positively to suggestions")
      }
    }

    return contextParts.length > 0 ? `\n\nPersonal Context:\n${contextParts.join("\n")}` : ""
  } catch (error) {
    console.error("[v0] Error getting user context:", error)
    return ""
  }
}
