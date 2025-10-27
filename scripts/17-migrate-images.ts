import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"

const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateImages() {
  console.log("[v0] Migrating generated images...")

  try {
    const images = await prodDb`SELECT * FROM generated_images`
    console.log(`[v0] Found ${images.length} images`)

    let migrated = 0
    for (const image of images) {
      // Parse image_urls if it's a JSON string
      let imageUrls = image.image_urls
      if (typeof imageUrls === "string") {
        try {
          imageUrls = JSON.parse(imageUrls)
        } catch (e) {
          imageUrls = [imageUrls]
        }
      }

      const { error } = await supabase.from("generated_images").upsert(
        {
          id: image.id,
          user_id: image.user_id,
          model_id: image.model_id,
          category: image.category,
          subcategory: image.subcategory,
          prompt: image.prompt,
          image_urls: imageUrls,
          selected_url: image.selected_url,
          saved: image.saved || false,
          created_at: image.created_at,
        },
        { onConflict: "id" },
      )

      if (error) {
        console.log(`[v0] ✗ Error migrating image ${image.id}:`, error.message)
      } else {
        migrated++
        if (migrated % 50 === 0) {
          console.log(`[v0] Progress: ${migrated}/${images.length} images migrated`)
        }
      }
    }

    console.log(`[v0] ✅ Images migration complete! Migrated ${migrated}/${images.length} images`)
  } catch (error) {
    console.error("[v0] Migration failed:", error)
  }
}

migrateImages()
