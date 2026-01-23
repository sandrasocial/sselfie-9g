import { neon } from "@neondatabase/serverless"
import { MAYA_SIGNATURE_PALETTES } from "@/lib/feed-planner/feed-prompt-expert"
import { VIBE_LIBRARIES, type FashionStyle } from "@/lib/styling/vibe-libraries"

const sql = neon(process.env.DATABASE_URL!)

const VISUAL_AESTHETICS = [
  { id: "luxury", name: "Luxury" },
  { id: "minimal", name: "Minimal" },
  { id: "warm", name: "Warm" },
  { id: "edgy", name: "Edgy" },
  { id: "professional", name: "Professional" },
  { id: "beige", name: "Beige Aesthetic" },
]

const FEED_STYLES = [
  { key: "luxury", name: "Dark & Moody", mood: "luxury", moodKey: "dark_moody", paletteId: "DARK_MOODY" },
  { key: "minimal", name: "Light & Minimalistic", mood: "minimal", moodKey: "light_minimalistic", paletteId: "CLEAN_MINIMAL" },
  { key: "beige", name: "Beige Aesthetic", mood: "beige", moodKey: "beige_aesthetic", paletteId: "BEIGE_SIMPLE" },
]

const FASHION_STYLES = [
  { id: "casual", name: "Casual" },
  { id: "business", name: "Business" },
  { id: "bohemian", name: "Bohemian" },
  { id: "classic", name: "Classic" },
  { id: "trendy", name: "Trendy" },
  { id: "athletic", name: "Athletic" },
]

const FASHION_STYLE_LABELS: Record<string, string> = {
  casual: "Casual",
  business: "Business",
  bohemian: "Bohemian",
  classic: "Classic",
  trendy: "Trendy",
  athletic: "Athletic",
}

const FASHION_STYLE_COMPATIBILITY: Record<string, string[]> = {
  athletic: ["luxury", "minimal", "beige", "warm", "edgy"],
  bohemian: ["minimal", "beige", "warm", "edgy"],
  casual: ["luxury", "minimal", "beige", "warm", "edgy", "professional"],
  business: ["luxury", "minimal", "beige", "warm", "professional"],
  classic: ["luxury", "minimal", "beige", "warm", "edgy", "professional"],
  trendy: ["luxury", "minimal", "beige", "warm", "edgy", "professional"],
}

const FASHION_STYLE_BASE_OPTIONS: Record<string, string[]> = {
  casual: ["casual_base", "lounge_base"],
  business: ["professional_base", "dressy_base"],
  bohemian: ["casual_base", "lounge_base"],
  classic: ["dressy_base", "professional_base"],
  trendy: ["casual_base", "dressy_base"],
  athletic: ["athletic_base"],
}

const FASHION_STYLE_LAYER_OPTIONS: Record<string, string[]> = {
  casual: ["casual_layer", "outerwear"],
  business: ["outerwear"],
  bohemian: ["casual_layer"],
  classic: ["outerwear"],
  trendy: ["outerwear"],
  athletic: [],
}

function getCategoryFromVibeKey(vibeKey: string): string {
  return vibeKey.split("_")[0]
}

const POSITION_BLUEPRINT = [
  { position: 1, framing: "full_body", activity: "seated_lifestyle", narrative: "Anchor portrait" },
  { position: 2, framing: "flatlay", activity: "lifestyle_flatlay", narrative: "Flatlay detail" },
  { position: 3, framing: "full_body", activity: "full_body_pose", narrative: "Full-body portrait" },
  { position: 4, framing: "close_up", activity: "detail_close_up", narrative: "Close-up detail" },
  { position: 5, framing: "close_up", activity: "brand_statement_sign", narrative: "Bold & Current" },
  { position: 6, framing: "close_up", activity: "texture_detail", narrative: "Texture detail" },
  { position: 7, framing: "midshot", activity: "walking_scene", narrative: "Walking moment" },
  { position: 8, framing: "flatlay", activity: "lifestyle_flatlay", narrative: "Flatlay detail" },
  { position: 9, framing: "midshot", activity: "mirror_selfie", narrative: "Mirror selfie" },
]

function buildObjects(items: string[], start: number, count: number) {
  return items.slice(start, start + count).map((item) => ({
    type: item,
    description: item,
    position: "table",
  }))
}

async function seedFeedStyleDefinitions() {
  for (const aesthetic of VISUAL_AESTHETICS) {
    for (const feedStyle of FEED_STYLES) {
      const palette = MAYA_SIGNATURE_PALETTES[feedStyle.paletteId]
      await sql`
        INSERT INTO feed_style_definitions (
          visual_aesthetic,
          feed_style,
          category,
          mood,
          color_palette,
          color_hex_codes,
          lighting_description,
          mood_description,
          background_style,
          enabled,
          updated_at
        )
        VALUES (
          ${aesthetic.name},
          ${feedStyle.name},
          ${aesthetic.id},
          ${feedStyle.mood},
          ${JSON.stringify(palette?.colors || [])}::jsonb,
          ${JSON.stringify(palette?.hexCodes || [])}::jsonb,
          ${palette?.lighting || null},
          ${palette?.mood || null},
          ${palette?.backgroundStyle || null},
          true,
          NOW()
        )
        ON CONFLICT (visual_aesthetic, feed_style) DO UPDATE SET
          category = EXCLUDED.category,
          mood = EXCLUDED.mood,
          color_palette = EXCLUDED.color_palette,
          color_hex_codes = EXCLUDED.color_hex_codes,
          lighting_description = EXCLUDED.lighting_description,
          mood_description = EXCLUDED.mood_description,
          background_style = EXCLUDED.background_style,
          enabled = EXCLUDED.enabled,
          updated_at = NOW()
      `
    }
  }
}

async function seedFashionStyleDefinitions() {
  for (const style of FASHION_STYLES) {
    await sql`
      INSERT INTO fashion_style_definitions (
        fashion_style_name,
        category_compatibility,
        outfit_base_options,
        outfit_layer_options,
        enabled,
        updated_at
      )
      VALUES (
        ${style.name},
        ${JSON.stringify(FASHION_STYLE_COMPATIBILITY[style.id] || [])}::jsonb,
        ${JSON.stringify(FASHION_STYLE_BASE_OPTIONS[style.id] || [])}::jsonb,
        ${JSON.stringify(FASHION_STYLE_LAYER_OPTIONS[style.id] || [])}::jsonb,
        true,
        NOW()
      )
      ON CONFLICT (fashion_style_name) DO UPDATE SET
        category_compatibility = EXCLUDED.category_compatibility,
        outfit_base_options = EXCLUDED.outfit_base_options,
        outfit_layer_options = EXCLUDED.outfit_layer_options,
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
    `
  }
}

async function seedOutfitLibrary() {
  const seen = new Set<string>()
  for (const [vibeKey, library] of Object.entries(VIBE_LIBRARIES)) {
    const category = getCategoryFromVibeKey(vibeKey)
    for (const [styleKey, outfits] of Object.entries(library.fashionStyles)) {
      const fashionStyle = FASHION_STYLE_LABELS[styleKey] || styleKey
      for (const outfit of outfits) {
        const dedupeKey = `${outfit.name}-${fashionStyle}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        const outfitBase =
          styleKey === "athletic"
            ? "athletic_base"
            : styleKey === "business"
            ? "professional_base"
            : styleKey === "classic"
            ? "dressy_base"
            : "casual_base"

        await sql`
          INSERT INTO outfit_library (
            outfit_name,
            fashion_style,
            category_fit,
            outfit_base,
            outfit_style,
            outfit_layer,
            description,
            enabled,
            updated_at
          )
          VALUES (
            ${outfit.name},
            ${fashionStyle},
            ${JSON.stringify([category])}::jsonb,
            ${outfitBase},
            ${styleKey},
            ${null},
            ${outfit.description},
            true,
            NOW()
          )
          ON CONFLICT (outfit_name, fashion_style) DO UPDATE SET
            category_fit = EXCLUDED.category_fit,
            outfit_base = EXCLUDED.outfit_base,
            outfit_style = EXCLUDED.outfit_style,
            outfit_layer = EXCLUDED.outfit_layer,
            description = EXCLUDED.description,
            enabled = EXCLUDED.enabled,
            updated_at = NOW()
        `
      }
    }
  }
}

async function seedLocationLibrary() {
  const seen = new Set<string>()
  for (const [vibeKey, library] of Object.entries(VIBE_LIBRARIES)) {
    const category = getCategoryFromVibeKey(vibeKey)
    for (const location of library.locations) {
      const locationKey = `${location.name}-${location.setting}`
      if (seen.has(locationKey)) continue
      seen.add(locationKey)

      await sql`
        INSERT INTO location_library (
          location_name,
          location_type,
          category_fit,
          description,
          indoor,
          public,
          enabled,
          updated_at
        )
        VALUES (
          ${location.name},
          ${location.setting},
          ${JSON.stringify([category])}::jsonb,
          ${location.description},
          ${location.setting === "indoor"},
          ${location.setting !== "indoor"},
          true,
          NOW()
        )
        ON CONFLICT (location_name, location_type) DO UPDATE SET
          category_fit = EXCLUDED.category_fit,
          description = EXCLUDED.description,
          indoor = EXCLUDED.indoor,
          public = EXCLUDED.public,
          enabled = EXCLUDED.enabled,
          updated_at = NOW()
      `
    }
  }
}

async function seedObjectLibrary() {
  const seen = new Set<string>()
  for (const [vibeKey, library] of Object.entries(VIBE_LIBRARIES)) {
    const category = getCategoryFromVibeKey(vibeKey)
    for (const accessory of library.accessories) {
      for (const item of accessory.items) {
        const objectKey = `${item}-${accessory.id}`
        if (seen.has(objectKey)) continue
        seen.add(objectKey)

        await sql`
          INSERT INTO object_library (
            object_name,
            object_type,
            category_fit,
            description,
            position_type,
            enabled,
            updated_at
          )
          VALUES (
            ${item},
            ${accessory.id},
            ${JSON.stringify([category])}::jsonb,
            ${accessory.description || accessory.name},
            ${null},
            true,
            NOW()
          )
          ON CONFLICT (object_name, object_type) DO UPDATE SET
            category_fit = EXCLUDED.category_fit,
            description = EXCLUDED.description,
            position_type = EXCLUDED.position_type,
            enabled = EXCLUDED.enabled,
            updated_at = NOW()
        `
      }
    }
  }
}

async function seedFeedPositionTemplates() {
  for (const aesthetic of VISUAL_AESTHETICS) {
    for (const feedStyle of FEED_STYLES) {
      for (const fashionStyle of FASHION_STYLES) {
        const vibeKey = `${aesthetic.id}_${feedStyle.moodKey}` as keyof typeof VIBE_LIBRARIES
        const library = VIBE_LIBRARIES[vibeKey]
        if (!library) continue

        const outfitPool = library.fashionStyles[fashionStyle.id as FashionStyle] || []
        const outfitDescriptions = outfitPool.map((item) => item.description).filter(Boolean)
        const locationPool = library.locations || []
        const accessoryItems = library.accessories.flatMap((accessory) => accessory.items)

        for (const blueprint of POSITION_BLUEPRINT) {
          const outfitIndex = (blueprint.position - 1) % Math.max(outfitDescriptions.length, 1)
          const locationIndex = (blueprint.position - 1) % Math.max(locationPool.length, 1)
          const outfitDescription = outfitDescriptions[outfitIndex] || "editorial outfit"
          const location = locationPool[locationIndex]
          const lighting = location?.lighting || "natural light"
          const objects =
            blueprint.framing === "flatlay"
              ? buildObjects(accessoryItems, blueprint.position % 3, 3)
              : []

          await sql`
            INSERT INTO feed_position_templates (
              visual_aesthetic,
              feed_style,
              fashion_style,
              position,
              activity,
              outfit_description,
              location_type,
              location_description,
              camera_framing,
              objects,
              lighting_type,
              pose_description,
              narrative,
              approved,
              updated_at
            )
            VALUES (
              ${aesthetic.name},
              ${feedStyle.name},
              ${fashionStyle.name},
              ${blueprint.position},
              ${blueprint.activity},
              ${outfitDescription},
              ${location?.setting || "indoor"},
              ${location?.description || "lifestyle location"},
              ${blueprint.framing},
              ${JSON.stringify(objects)}::jsonb,
              ${lighting},
              ${blueprint.activity === "walking_scene" ? "walking naturally" : "natural pose"},
              ${blueprint.narrative},
              false,
              NOW()
            )
            ON CONFLICT (visual_aesthetic, feed_style, fashion_style, position) DO UPDATE SET
              activity = EXCLUDED.activity,
              outfit_description = EXCLUDED.outfit_description,
              location_type = EXCLUDED.location_type,
              location_description = EXCLUDED.location_description,
              camera_framing = EXCLUDED.camera_framing,
              objects = EXCLUDED.objects,
              lighting_type = EXCLUDED.lighting_type,
              pose_description = EXCLUDED.pose_description,
              narrative = EXCLUDED.narrative,
              approved = EXCLUDED.approved,
              updated_at = NOW()
          `
        }
      }
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed Feed Planner tables.")
  }

  console.log("[Seed] Starting Feed Planner admin table seeding...")
  await seedFeedStyleDefinitions()
  await seedFashionStyleDefinitions()
  await seedOutfitLibrary()
  await seedLocationLibrary()
  await seedObjectLibrary()
  await seedFeedPositionTemplates()
  console.log("[Seed] ✅ Feed Planner admin tables seeded.")
}

main().catch((error) => {
  console.error("[Seed] ❌ Seeding failed:", error)
  process.exit(1)
})
