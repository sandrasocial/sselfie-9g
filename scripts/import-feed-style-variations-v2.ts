/**
 * Import Feed Planner V2 variations from JSON.
 *
 * Usage:
 *   pnpm exec tsx scripts/import-feed-style-variations-v2.ts path/to/variations.json
 */

import * as dotenv from "dotenv"
import { readFileSync } from "fs"
import { neon } from "@neondatabase/serverless"

dotenv.config({ path: ".env.local" })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

type VariationInput = {
  name: string
  description?: string
  isDefault?: boolean
  previewPrompt?: string
  previewName?: string
  scenes?: Array<{ position: number; prompt: string }>
}

type StyleInput = {
  styleName: string
  variations: VariationInput[]
}

function requireArg(value: string | undefined, message: string): string | null {
  if (!value) return null
  return value
}

async function importStyle(styleData: StyleInput) {
  const styleName = styleData.styleName
  const [style] = await sql`
    SELECT id, name
    FROM feed_styles_v2
    WHERE name = ${styleName}
    LIMIT 1
  `
  if (!style?.id) {
    throw new Error(`Feed style not found: ${styleName}`)
  }

  const styleId = Number(style.id)
  const variations = styleData.variations || []
  if (variations.length === 0) {
    console.warn(`[IMPORT] No variations provided for ${styleName}`)
    return
  }

  const [existingDefault] = await sql`
    SELECT id
    FROM feed_style_variations_v2
    WHERE feed_style_id = ${styleId} AND is_default = true
    LIMIT 1
  `

  for (let index = 0; index < variations.length; index += 1) {
    const variation = variations[index]
    const isDefault = variation.isDefault ?? false
    let variationId: number | null = null

    if (isDefault && existingDefault?.id) {
      const [updated] = await sql`
        UPDATE feed_style_variations_v2
        SET
          name = ${variation.name},
          description = ${variation.description || null},
          is_default = true,
          sort_order = ${index + 1},
          enabled = true,
          updated_at = NOW()
        WHERE id = ${existingDefault.id}
        RETURNING id
      `
      variationId = updated?.id ? Number(updated.id) : null
    } else {
      const [existingByName] = await sql`
        SELECT id
        FROM feed_style_variations_v2
        WHERE feed_style_id = ${styleId} AND name = ${variation.name}
        LIMIT 1
      `

      const [upserted] = await sql`
        INSERT INTO feed_style_variations_v2 (
          feed_style_id,
          name,
          description,
          is_default,
          sort_order,
          enabled,
          updated_at
        )
        VALUES (
          ${styleId},
          ${variation.name},
          ${variation.description || null},
          ${isDefault},
          ${index + 1},
          true,
          NOW()
        )
        ON CONFLICT (feed_style_id, name)
        DO UPDATE SET
          description = EXCLUDED.description,
          is_default = EXCLUDED.is_default,
          sort_order = EXCLUDED.sort_order,
          enabled = true,
          updated_at = NOW()
        RETURNING id
      `
      variationId = upserted?.id ? Number(upserted.id) : null
    }

    if (!variationId) {
      throw new Error(`Failed to resolve variation id for ${variation.name}`)
    }

    if (variation.previewPrompt) {
      const previewName = variation.previewName || variation.name
      const [existingPreview] = await sql`
        SELECT id
        FROM feed_style_previews_v2
        WHERE feed_style_id = ${styleId}
          AND variation_id = ${variationId}
          AND is_primary = true
        LIMIT 1
      `

      if (existingPreview?.id) {
        await sql`
          UPDATE feed_style_previews_v2
          SET
            name = ${previewName},
            prompt_text = ${variation.previewPrompt},
            approved = true,
            is_primary = true,
            updated_at = NOW()
          WHERE id = ${existingPreview.id}
        `
      } else {
        await sql`
          DELETE FROM feed_style_previews_v2
          WHERE feed_style_id = ${styleId}
            AND variation_id = ${variationId}
            AND is_primary = true
        `
        await sql`
          INSERT INTO feed_style_previews_v2 (
            feed_style_id,
            variation_id,
            name,
            prompt_text,
            approved,
            is_primary,
            updated_at
          )
          VALUES (
            ${styleId},
            ${variationId},
            ${previewName},
            ${variation.previewPrompt},
            true,
            true,
            NOW()
          )
        `
      }
    }

    if (variation.scenes && variation.scenes.length > 0) {
      for (const scene of variation.scenes) {
        const [existingScene] = await sql`
          SELECT id
          FROM scene_prompts_v2
          WHERE feed_style_id = ${styleId}
            AND position = ${scene.position}
            AND variation_id = ${variationId}
            AND is_primary = true
          LIMIT 1
        `

        if (existingScene?.id) {
          await sql`
            UPDATE scene_prompts_v2
            SET
              prompt_text = ${scene.prompt},
              approved = true,
              variation_name = ${variation.name},
              is_primary = true,
              updated_at = NOW()
            WHERE id = ${existingScene.id}
          `
        } else {
          await sql`
            DELETE FROM scene_prompts_v2
            WHERE feed_style_id = ${styleId}
              AND position = ${scene.position}
              AND variation_id = ${variationId}
              AND is_primary = true
          `
          await sql`
            INSERT INTO scene_prompts_v2 (
              feed_style_id,
              position,
              prompt_text,
              is_primary,
              variation_name,
              variation_id,
              approved,
              updated_at
            )
            VALUES (
              ${styleId},
              ${scene.position},
              ${scene.prompt},
              true,
              ${variation.name},
              ${variationId},
              true,
              NOW()
            )
          `
        }
      }
    }

  }

  console.log(`[IMPORT] ✅ Imported variations for ${styleName}`)
}

async function run() {
  const filePath = requireArg(process.argv[2], "Provide a JSON file path.")
  let raw = ""

  if (!filePath || filePath === "-") {
    raw = await new Promise<string>((resolve, reject) => {
      let buffer = ""
      process.stdin.setEncoding("utf-8")
      process.stdin.on("data", (chunk) => {
        buffer += chunk
      })
      process.stdin.on("end", () => resolve(buffer))
      process.stdin.on("error", reject)
    })
  } else {
    raw = readFileSync(filePath, "utf-8")
  }

  const data = JSON.parse(raw) as StyleInput

  if (!data?.styleName || !Array.isArray(data.variations)) {
    throw new Error("Invalid JSON format. Expected { styleName, variations: [] }.")
  }

  await importStyle(data)
}

run()
  .then(() => {
    console.log("[IMPORT] ✅ Completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[IMPORT] ❌ Failed:", error)
    process.exit(1)
  })
