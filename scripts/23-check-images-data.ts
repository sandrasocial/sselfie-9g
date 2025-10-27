import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function checkImagesData() {
  console.log("[v0] Checking images data in Neon database...")

  // Check total images count
  const totalImages = await sql`
    SELECT COUNT(*) as count FROM generated_images
  `
  console.log(`[v0] Total images in database: ${totalImages[0].count}`)

  // Check images by user
  const imagesByUser = await sql`
    SELECT 
      u.id as user_id,
      u.email,
      u.name,
      COUNT(gi.id) as image_count
    FROM users u
    LEFT JOIN generated_images gi ON gi.user_id = u.id
    GROUP BY u.id, u.email, u.name
    ORDER BY image_count DESC
  `
  console.log("[v0] Images by user:")
  console.table(imagesByUser)

  // Check if there are orphaned images (images without a user)
  const orphanedImages = await sql`
    SELECT COUNT(*) as count 
    FROM generated_images gi
    LEFT JOIN users u ON gi.user_id = u.id
    WHERE u.id IS NULL
  `
  console.log(`[v0] Orphaned images (no matching user): ${orphanedImages[0].count}`)

  // Check sample of images
  const sampleImages = await sql`
    SELECT 
      gi.id,
      gi.user_id,
      gi.prompt,
      gi.created_at,
      u.email as user_email
    FROM generated_images gi
    LEFT JOIN users u ON gi.user_id = u.id
    LIMIT 10
  `
  console.log("[v0] Sample images:")
  console.table(sampleImages)

  // Check the specific user
  const specificUser = await sql`
    SELECT 
      u.id,
      u.email,
      u.auth_id,
      COUNT(gi.id) as image_count
    FROM users u
    LEFT JOIN generated_images gi ON gi.user_id = u.id
    WHERE u.email = 'ssa@ssasocial.com'
    GROUP BY u.id, u.email, u.auth_id
  `
  console.log("[v0] User ssa@ssasocial.com:")
  console.table(specificUser)
}

checkImagesData()
  .then(() => {
    console.log("[v0] Database check complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[v0] Error checking database:", error)
    process.exit(1)
  })
