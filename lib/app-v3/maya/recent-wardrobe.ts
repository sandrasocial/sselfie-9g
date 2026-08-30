export interface RecentWardrobePromptRow {
  generated_prompt?: string | null
  prompt?: string | null
}

const OUTFIT_LINE = /(?:^|\n)\s*(?:\*\*)?outfit(?:\*\*)?\s*:\s*(?:\*\*)?\s*([^\n]+)/gi

/**
 * Pull only concise outfit lines from recent generation prompts. Maya gets enough signal to
 * avoid wardrobe repetition without receiving old prompts that could override today's brief.
 */
export function extractRecentWardrobe(rows: RecentWardrobePromptRow[], limit = 6): string[] {
  const found: string[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const source = row.generated_prompt || row.prompt || ""
    OUTFIT_LINE.lastIndex = 0
    for (const match of source.matchAll(OUTFIT_LINE)) {
      const outfit = (match[1] || "")
        .replace(/\s+/g, " ")
        .replace(/[.;\s]+$/g, "")
        .trim()
        .slice(0, 240)
      const key = outfit.toLowerCase()
      if (outfit.length < 4 || seen.has(key)) continue
      seen.add(key)
      found.push(outfit)
      if (found.length >= limit) return found
    }
  }

  return found
}
