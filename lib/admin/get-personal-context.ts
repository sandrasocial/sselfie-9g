import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function getPersonalStoryContext(): Promise<string> {
  try {
    const contextParts: string[] = []

    // Fetch Sandra's personal story
    const personalStory = await sql`
      SELECT story_type, title, content, timeframe, emotional_tone, key_themes
      FROM admin_personal_story
      WHERE is_active = true
      ORDER BY display_order ASC
    `

    if (personalStory.length > 0) {
      contextParts.push("\n=== SANDRA'S PERSONAL STORY ===")
      contextParts.push("This is Sandra's personal narrative - use this to understand her journey and values:\n")

      for (const story of personalStory) {
        contextParts.push(`[${story.story_type.toUpperCase()}] ${story.title}`)
        if (story.timeframe) contextParts.push(`Timeframe: ${story.timeframe}`)
        contextParts.push(story.content)
        if (story.key_themes && Array.isArray(story.key_themes)) {
          contextParts.push(`Key themes: ${story.key_themes.join(", ")}`)
        }
        contextParts.push("") // Empty line for readability
      }
    }

    // Fetch Sandra's writing samples for voice matching
    const writingSamples = await sql`
      SELECT content_type, sample_text, context, tone, performance_score, target_audience
      FROM admin_writing_samples
      WHERE was_successful = true
      ORDER BY performance_score DESC NULLS LAST
      LIMIT 5
    `

    if (writingSamples.length > 0) {
      contextParts.push("\n=== SANDRA'S WRITING VOICE - EXAMPLES ===")
      contextParts.push("These are actual examples of Sandra's writing. Study these to match her voice:\n")

      for (const sample of writingSamples) {
        contextParts.push(`[${sample.content_type.toUpperCase()}] - Tone: ${sample.tone}`)
        if (sample.context) contextParts.push(`Context: ${sample.context}`)
        if (sample.target_audience) contextParts.push(`Audience: ${sample.target_audience}`)
        contextParts.push(`\nExample:\n${sample.sample_text}`)
        if (sample.performance_score) {
          contextParts.push(`Performance: ${sample.performance_score}/10`)
        }
        contextParts.push("---") // Separator
      }
    }

    // Fetch learned patterns from feedback
    const learnedPatterns = await sql`
      SELECT 
        edit_type,
        key_changes,
        learned_patterns
      FROM admin_agent_feedback
      WHERE applied_to_knowledge = true
      ORDER BY created_at DESC
      LIMIT 10
    `

    if (learnedPatterns.length > 0) {
      contextParts.push("\n=== LEARNED PREFERENCES FROM SANDRA'S EDITS ===")
      contextParts.push("These patterns were learned from Sandra's edits to AI output:\n")

      for (const pattern of learnedPatterns) {
        if (pattern.edit_type) contextParts.push(`${pattern.edit_type}:`)
        if (pattern.key_changes && Array.isArray(pattern.key_changes)) {
          pattern.key_changes.forEach((change: string) => {
            contextParts.push(`- ${change}`)
          })
        }
        if (pattern.learned_patterns) {
          contextParts.push(`Pattern: ${JSON.stringify(pattern.learned_patterns)}`)
        }
        contextParts.push("") // Empty line
      }
    }

    return contextParts.join("\n")
  } catch (error) {
    console.error("[v0] Error fetching personal story context:", error)
    return ""
  }
}
