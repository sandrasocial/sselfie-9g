import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface FeedStyleDefinition {
  id: number
  visual_aesthetic: string
  feed_style: string
  category: string
  mood: string
  color_palette: string[] | null
  color_hex_codes: string[] | null
  lighting_description: string | null
  mood_description: string | null
  background_style: string | null
  enabled: boolean
}

export interface FeedPositionTemplate {
  id: number
  visual_aesthetic: string
  feed_style: string
  fashion_style: string
  position: number
  activity: string | null
  outfit_description: string | null
  location_type: string | null
  location_description: string | null
  camera_framing: string | null
  objects: Array<{ type: string; description?: string; position?: string }> | null
  lighting_type: string | null
  pose_description: string | null
  narrative: string | null
  final_prompt_override: string | null
  approved: boolean
}

const VISUAL_AESTHETIC_LABELS: Record<string, string> = {
  luxury: "Luxury",
  minimal: "Minimal",
  warm: "Warm",
  edgy: "Edgy",
  professional: "Professional",
  beige: "Beige Aesthetic",
}

const FEED_STYLE_LABELS: Record<string, string> = {
  luxury: "Dark & Moody",
  "dark & moody": "Dark & Moody",
  "dark moody": "Dark & Moody",
  dark_moody: "Dark & Moody",
  minimal: "Light & Minimalistic",
  "light & minimalistic": "Light & Minimalistic",
  "light minimalistic": "Light & Minimalistic",
  light_minimalistic: "Light & Minimalistic",
  beige: "Beige Aesthetic",
  "beige aesthetic": "Beige Aesthetic",
  beige_aesthetic: "Beige Aesthetic",
}

const FASHION_STYLE_LABELS: Record<string, string> = {
  casual: "Casual",
  business: "Business",
  bohemian: "Bohemian",
  classic: "Classic",
  trendy: "Trendy",
  athletic: "Athletic",
}

export function normalizeVisualAesthetic(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.toLowerCase().trim()
  if (VISUAL_AESTHETIC_LABELS[normalized]) return VISUAL_AESTHETIC_LABELS[normalized]
  return value
}

export function normalizeFeedStyle(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.toLowerCase().trim()
  if (FEED_STYLE_LABELS[normalized]) return FEED_STYLE_LABELS[normalized]
  return value
}

export function normalizeFashionStyle(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.toLowerCase().trim()
  if (FASHION_STYLE_LABELS[normalized]) return FASHION_STYLE_LABELS[normalized]
  return value
}

export async function loadStyleDefinition(
  visualAesthetic: string,
  feedStyle: string
): Promise<FeedStyleDefinition> {
  const [row] = await sql`
    SELECT *
    FROM feed_style_definitions
    WHERE visual_aesthetic = ${visualAesthetic}
      AND feed_style = ${feedStyle}
      AND enabled = true
    LIMIT 1
  `

  if (!row) {
    throw new Error(
      `Style combination "${visualAesthetic} + ${feedStyle}" not found. Configure it in /admin/feed-styles.`
    )
  }

  return row as FeedStyleDefinition
}

export async function loadFeedPositionTemplates(
  visualAesthetic: string,
  feedStyle: string,
  fashionStyle: string
): Promise<FeedPositionTemplate[]> {
  const rows = await sql`
    SELECT *
    FROM feed_position_templates
    WHERE visual_aesthetic = ${visualAesthetic}
      AND feed_style = ${feedStyle}
      AND fashion_style = ${fashionStyle}
    ORDER BY position ASC
  `

  if (!rows || rows.length === 0) {
    throw new Error(
      `No position templates found for "${visualAesthetic} + ${feedStyle} + ${fashionStyle}". Configure them in /admin/feed-positions.`
    )
  }

  return rows as FeedPositionTemplate[]
}

export async function validateFeedConfiguration(
  visualAesthetic: string,
  feedStyle: string,
  fashionStyle: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    await loadStyleDefinition(visualAesthetic, feedStyle)
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) }
  }

  try {
    await loadFeedPositionTemplates(visualAesthetic, feedStyle, fashionStyle)
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) }
  }

  return { valid: true }
}
