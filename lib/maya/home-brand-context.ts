/**
 * The legacy Maya context contains image-generation commands alongside useful brand facts.
 * Maya Home only needs the facts that help with the member's message. Keeping the allow-list
 * deliberately small prevents old lookbooks, palettes, outfits, and styling rules from silently
 * choosing the visual direction before the member has approved it.
 */
const HOME_BRAND_FACT_PREFIXES = [
  "Name:",
  "Business Type:",
  "Communication Voice:",
  "Signature Phrases:",
  "Ideal Audience:",
  "Audience Challenge:",
  "Audience Transformation:",
  "Target Audience:",
  "Brand Voice:",
  "Language Style:",
  "Content Themes:",
  "Content Pillars:",
  "Current Situation:",
  "Transformation Story:",
  "Future Vision:",
  "Business Goals:",
  "Content Goals:",
] as const

export function getMayaHomeBrandContext(legacyContext: string): string {
  if (!legacyContext.trim()) return ""

  const start = legacyContext.indexOf("=== MEMBER WORKBOOK ANSWERS (DATA) ===")
  const end = legacyContext.indexOf("=== END MEMBER WORKBOOK ANSWERS ===", start)
  const workbook =
    start >= 0 && end >= start
      ? legacyContext.slice(start, end + "=== END MEMBER WORKBOOK ANSWERS ===".length)
      : legacyContext.includes("Workbook answers could not be loaded for this request.")
        ? "Workbook answers could not be loaded for this request. Do not claim to have read them. Tell the member if her request depends on them."
        : ""
  const facts = legacyContext
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => HOME_BRAND_FACT_PREFIXES.some(prefix => line.startsWith(prefix)))
    .join("\n")
  return [facts, workbook].filter(Boolean).join("\n\n")
}
