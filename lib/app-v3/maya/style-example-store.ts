// SSELFIE Studio 3.0 — text style example store (SUITE-UX-02 slice 6).
//
// Members pick text-overlay styles and carousel design systems from inline visual cards in
// Maya's chat instead of imagining them from names. The style DEFINITIONS stay in code
// (overlay-styles.ts / carousel-design-systems.ts — they feed prompts); this table holds one
// admin-curated EXAMPLE IMAGE per style so the cards show what each style actually looks like.
// Sandra uploads an example or has Maya generate one on /admin/content-brief; members only read.
//
// db/migrations/60-app-v3-style-examples.sql is the canonical record for the production apply;
// the lazy ensure below keeps dev/preview working without a manual step.

import { sql } from "@/lib/db/client"
import { OVERLAY_STYLES } from "./overlay-styles"
import { CAROUSEL_DESIGN_SYSTEMS } from "./carousel-design-systems"

export type StyleKind = "overlay" | "carousel"

export interface StyleOption {
  id: string
  name: string
  /** When to use it — shown on the card and used by Maya to advise. */
  when: string
  kind: StyleKind
  exampleImageUrl: string | null
}

let ensured = false
async function ensureTable(): Promise<void> {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS app_v3_style_examples (
      style_id   text PRIMARY KEY,
      image_url  text NOT NULL,
      source     text NOT NULL DEFAULT 'upload',
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  ensured = true
}

/** Every style the app knows, as picker options (no images yet). */
function staticOptions(kind?: StyleKind): StyleOption[] {
  const overlay: StyleOption[] = OVERLAY_STYLES.map((s) => ({
    id: s.id,
    name: s.name,
    when: s.when,
    kind: "overlay" as const,
    exampleImageUrl: null,
  }))
  const carousel: StyleOption[] = CAROUSEL_DESIGN_SYSTEMS.map((s) => ({
    id: s.id,
    name: s.name,
    when: s.whenToUse,
    kind: "carousel" as const,
    exampleImageUrl: null,
  }))
  if (kind === "overlay") return overlay
  if (kind === "carousel") return carousel
  return [...overlay, ...carousel]
}

export function isKnownStyleId(styleId: string): boolean {
  return staticOptions().some((o) => o.id === styleId)
}

/**
 * Style options with their example images merged in. Fail-open: if the table is unreachable
 * the static definitions still come back (cards render with a typographic placeholder).
 */
export async function listStyleOptions(kind?: StyleKind): Promise<StyleOption[]> {
  const options = staticOptions(kind)
  try {
    await ensureTable()
    const rows = await sql`SELECT style_id, image_url FROM app_v3_style_examples`
    const map = new Map<string, string>()
    for (const r of rows as Array<{ style_id?: unknown; image_url?: unknown }>) {
      if (typeof r.style_id === "string" && typeof r.image_url === "string" && r.image_url.length > 0) {
        map.set(r.style_id, r.image_url)
      }
    }
    return options.map((o) => ({ ...o, exampleImageUrl: map.get(o.id) ?? null }))
  } catch (e) {
    console.error("[app-v3 style-examples] list failed (serving definitions only):", e)
    return options
  }
}

/** One example image per style: setting again replaces the old one. */
export async function setStyleExample(styleId: string, imageUrl: string, source: "upload" | "maya"): Promise<void> {
  await ensureTable()
  await sql`
    INSERT INTO app_v3_style_examples (style_id, image_url, source, updated_at)
    VALUES (${styleId}, ${imageUrl}, ${source}, now())
    ON CONFLICT (style_id) DO UPDATE
      SET image_url = EXCLUDED.image_url, source = EXCLUDED.source, updated_at = now()
  `
}

export async function deleteStyleExample(styleId: string): Promise<void> {
  await ensureTable()
  await sql`DELETE FROM app_v3_style_examples WHERE style_id = ${styleId}`
}

/**
 * The prompt Maya uses to render an example image for a style (admin "Maya example" button).
 * No people, no faces: the example demonstrates typography and design DNA, so identity can't
 * drift and the no-fake doctrine is untouchable. Sample copy follows Sandra's voice rules.
 */
export function buildStyleExamplePrompt(styleId: string): string | null {
  const overlay = OVERLAY_STYLES.find((s) => s.id === styleId)
  if (overlay) {
    return [
      "A 4:5 portrait example cover for a personal brand's Instagram. The photograph: a calm",
      "editorial scene from a founder's world (a linen-covered desk with a coffee cup and an open",
      "notebook in soft window light), no people, no faces, generous negative space.",
      `Render the example headline text "SHOW UP AS YOU ARE" on the image, with the small supporting line "save this for later".`,
      overlay.typography,
      overlay.accents !== "none" ? overlay.accents : "",
      "The text must be perfectly legible and spelled exactly as given. No logos, no watermarks, no emojis.",
    ]
      .filter(Boolean)
      .join(" ")
  }
  const system = CAROUSEL_DESIGN_SYSTEMS.find((s) => s.id === styleId)
  if (system) {
    return [
      "A 4:5 portrait example slide from an Instagram carousel for a personal brand.",
      system.setDna,
      system.detailTreatment,
      `The slide's headline text reads "3 ways to show up on camera" — render it perfectly legible and spelled exactly as given.`,
      "No people, no faces. No logos, no watermarks, no emojis.",
    ].join(" ")
  }
  return null
}
