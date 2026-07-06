/**
 * Pull the JSON object out of a model's reply even if it wrapped it in prose or code fences.
 * Shared by the routes that ask an LLM for raw JSON (recommendations, feed-plan draft,
 * regenerate-idea) - one copy instead of three drifting ones.
 */
export function extractJson(s: string): string {
  const t = s.replace(/```(?:json)?/gi, "").trim()
  const start = t.indexOf("{")
  const end = t.lastIndexOf("}")
  return start >= 0 && end > start ? t.slice(start, end + 1) : t
}
