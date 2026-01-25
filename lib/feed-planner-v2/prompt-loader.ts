import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const FEED_STYLE_V2_NAME_MAP: Record<string, string> = {
  "dark & moody": "Dark & Moody",
  "dark moody": "Dark & Moody",
  dark_moody: "Dark & Moody",
  luxury: "Luxury Future Self",
  "beige aesthetic": "Beige Aesthetic",
  beige: "Beige Aesthetic",
  beige_aesthetic: "Beige Aesthetic",
  "light & minimalistic": "Light & Minimalistic",
  "light minimalistic": "Light & Minimalistic",
  light_minimalistic: "Light & Minimalistic",
  minimal: "Light & Minimalistic",
  "luxury future self": "Luxury Future Self",
  luxury_future_self: "Luxury Future Self",
  "casual bohemian": "Casual Bohemian",
  casual_bohemian: "Casual Bohemian",
  "athletic & wellness": "Athletic & Wellness",
  athletic_wellness: "Athletic & Wellness",
  "coastal aesthetics": "Coastal Aesthetics",
  coastal_aesthetics: "Coastal Aesthetics",
}

export function normalizeFeedStyleV2Name(value: string): string {
  const normalized = value.trim().toLowerCase()
  return FEED_STYLE_V2_NAME_MAP[normalized] || value
}

export interface FeedStyleV2 {
  id: number
  name: string
  description: string
  preview_prompt: string | null
  preview_prompt_approved: boolean
  preview_test_image_url: string | null
  enabled: boolean
}

export interface FeedStyleVariationV2 {
  id: number
  feed_style_id: number
  name: string
  description: string | null
  is_default: boolean
  sort_order: number
  enabled: boolean
}

export interface ScenePromptV2 {
  id: number
  feed_style_id: number
  position: number
  prompt_text: string
  is_primary: boolean
  variation_name: string | null
  variation_id: number | null
  approved: boolean
  test_image_url: string | null
}

export async function getFeedStylesV2(): Promise<FeedStyleV2[]> {
  const rows = await sql`
    SELECT id, name, description, preview_prompt, preview_prompt_approved, preview_test_image_url, enabled
    FROM feed_styles_v2
    ORDER BY id ASC
  `
  return rows as FeedStyleV2[]
}

export async function getFeedStyleV2ById(id: number): Promise<FeedStyleV2 | null> {
  const [row] = await sql`
    SELECT id, name, description, preview_prompt, preview_prompt_approved, preview_test_image_url, enabled
    FROM feed_styles_v2
    WHERE id = ${id}
    LIMIT 1
  `
  return (row as FeedStyleV2) || null
}

export async function getFeedStyleV2ByName(name: string): Promise<FeedStyleV2 | null> {
  const resolvedName = normalizeFeedStyleV2Name(name)
  const [row] = await sql`
    SELECT id, name, description, preview_prompt, preview_prompt_approved, preview_test_image_url, enabled
    FROM feed_styles_v2
    WHERE name = ${resolvedName}
    LIMIT 1
  `
  return (row as FeedStyleV2) || null
}

export async function getFeedStyleVariationsV2(styleId: number): Promise<FeedStyleVariationV2[]> {
  const rows = await sql`
    SELECT id, feed_style_id, name, description, is_default, sort_order, enabled
    FROM feed_style_variations_v2
    WHERE feed_style_id = ${styleId}
      AND enabled = true
    ORDER BY sort_order ASC, id ASC
  `
  return rows as FeedStyleVariationV2[]
}

export async function getFeedStyleVariationById(variationId: number): Promise<FeedStyleVariationV2 | null> {
  const [row] = await sql`
    SELECT id, feed_style_id, name, description, is_default, sort_order, enabled
    FROM feed_style_variations_v2
    WHERE id = ${variationId}
    LIMIT 1
  `
  return (row as FeedStyleVariationV2) || null
}

export async function getDefaultVariationId(styleId: number): Promise<number | null> {
  const [row] = await sql`
    SELECT id
    FROM feed_style_variations_v2
    WHERE feed_style_id = ${styleId}
      AND is_default = true
      AND enabled = true
    ORDER BY id ASC
    LIMIT 1
  `
  if (row?.id) return Number(row.id)
  const [fallback] = await sql`
    SELECT id
    FROM feed_style_variations_v2
    WHERE feed_style_id = ${styleId}
      AND enabled = true
    ORDER BY sort_order ASC, id ASC
    LIMIT 1
  `
  return fallback?.id ? Number(fallback.id) : null
}

export async function getApprovedPreviewPrompt(styleId: number, variationId?: number | null): Promise<string> {
  const resolvedVariationId = variationId ?? (await getDefaultVariationId(styleId))
  console.log(`[v0] [PROMPT-LOADER] getApprovedPreviewPrompt: styleId=${styleId}, variationId=${variationId}, resolvedVariationId=${resolvedVariationId}`)
  const [preview] = await sql`
    SELECT prompt_text, approved, is_primary, variation_id
    FROM feed_style_previews_v2
    WHERE feed_style_id = ${styleId}
      AND is_primary = true
      AND (variation_id IS NULL OR variation_id = ${resolvedVariationId})
    ORDER BY CASE WHEN variation_id = ${resolvedVariationId} THEN 0 ELSE 1 END ASC, id ASC
    LIMIT 1
  `
  console.log(`[v0] [PROMPT-LOADER] Preview prompt found: variation_id=${preview?.variation_id}, hasPrompt=${!!preview?.prompt_text}`)

  if (preview && preview.prompt_text) {
    if (!preview.approved) {
      throw new Error("Primary preview prompt has not been approved yet.")
    }
    return String(preview.prompt_text)
  }

  const [legacy] = await sql`
    SELECT preview_prompt, preview_prompt_approved
    FROM feed_styles_v2
    WHERE id = ${styleId}
    LIMIT 1
  `

  if (!legacy || !legacy.preview_prompt) {
    throw new Error("Preview prompt not found for this feed style.")
  }
  if (!legacy.preview_prompt_approved) {
    throw new Error("Preview prompt has not been approved yet.")
  }
  return String(legacy.preview_prompt)
}

export async function getApprovedScenePrompts(
  styleId: number,
  variationId?: number | null,
): Promise<ScenePromptV2[]> {
  const resolvedVariationId = variationId ?? (await getDefaultVariationId(styleId))
  console.log(`[v0] [PROMPT-LOADER] getApprovedScenePrompts: styleId=${styleId}, variationId=${variationId}, resolvedVariationId=${resolvedVariationId}`)
  
  // Query with proper NULL handling
  const rows = await sql`
    SELECT id, feed_style_id, position, prompt_text, is_primary, variation_name, variation_id, approved, test_image_url
    FROM scene_prompts_v2
    WHERE feed_style_id = ${styleId}
      AND approved = true
      AND (variation_id IS NULL OR variation_id = ${resolvedVariationId})
    ORDER BY position ASC, CASE WHEN variation_id = ${resolvedVariationId} THEN 0 ELSE 1 END ASC, is_primary DESC, id ASC
  `
  
  // Log detailed breakdown for debugging
  const specificPrompts = rows.filter((r: any) => r.variation_id === resolvedVariationId)
  const genericPrompts = rows.filter((r: any) => r.variation_id === null)
  console.log(`[v0] [PROMPT-LOADER] Scene prompts found: ${rows.length} total (${specificPrompts.length} specific for variationId=${resolvedVariationId}, ${genericPrompts.length} generic)`)
  
  // Group by position for detailed logging
  const byPosition = new Map<number, { specific: number; generic: number }>()
  for (const row of rows) {
    const pos = row.position
    const current = byPosition.get(pos) || { specific: 0, generic: 0 }
    if (row.variation_id === resolvedVariationId) {
      current.specific++
    } else {
      current.generic++
    }
    byPosition.set(pos, current)
  }
  
  // Log per-position breakdown
  for (let pos = 1; pos <= 9; pos++) {
    const counts = byPosition.get(pos)
    if (counts) {
      console.log(`[v0] [PROMPT-LOADER] Position ${pos}: ${counts.specific} specific, ${counts.generic} generic`)
    }
  }
  
  return rows as ScenePromptV2[]
}
