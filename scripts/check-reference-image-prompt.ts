/**
 * Script to find the prompt used for the reference image
 * Reference Image: https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-generations/5371-5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR.png
 * Created: December 13, 2025, 12:24:21 GMT
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function findReferenceImagePrompt() {
  try {
    console.log("🔍 Searching for reference image prompt...")
    console.log("Image URL: maya-generations/5371-5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR.png")
    console.log("Created: December 13, 2025, 12:24:21 GMT\n")

    // The image URL pattern is: maya-generations/{generationId}.png with random suffix
    // The generation ID might be 5371 (numeric)
    const possibleGenerationId = 5371

    // Search in generated_images table by ID
    console.log(`📊 Searching generated_images table for ID: ${possibleGenerationId}...`)
    const generatedImages = await sql`
      SELECT 
        id,
        user_id,
        prompt,
        description,
        category,
        subcategory,
        image_urls,
        selected_url,
        created_at
      FROM generated_images
      WHERE id = ${possibleGenerationId}
      LIMIT 1
    `

    if (generatedImages.length > 0) {
      const img = generatedImages[0] as any
      console.log("✅ Found in generated_images table!")
      console.log("\n📝 PROMPT:")
      console.log("=" .repeat(80))
      console.log(img.prompt || "(no prompt)")
      console.log("=" .repeat(80))
      console.log("\n📋 DETAILS:")
      console.log(`  ID: ${img.id}`)
      console.log(`  User ID: ${img.user_id}`)
      console.log(`  Description: ${img.description || "(none)"}`)
      console.log(`  Category: ${img.category || "(none)"}`)
      console.log(`  Subcategory: ${img.subcategory || "(none)"}`)
      console.log(`  Image URLs: ${typeof img.image_urls === 'string' ? img.image_urls : JSON.stringify(img.image_urls)}`)
      console.log(`  Selected URL: ${img.selected_url || "(none)"}`)
      console.log(`  Created At: ${img.created_at}`)
      return
    }

    // Search in ai_images table by image_url containing the ID
    console.log(`\n📊 Searching ai_images table for URL containing '5371'...`)
    const aiImages = await sql`
      SELECT 
        id,
        user_id,
        image_url,
        prompt,
        generated_prompt,
        category,
        created_at
      FROM ai_images
      WHERE image_url LIKE '%5371%' OR image_url LIKE '%5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR%'
      ORDER BY created_at DESC
      LIMIT 5
    `

    if (aiImages.length > 0) {
      console.log(`✅ Found ${aiImages.length} image(s) in ai_images table!`)
      aiImages.forEach((img: any, index: number) => {
        console.log(`\n📝 IMAGE ${index + 1}:`)
        console.log("=" .repeat(80))
        console.log(`  Prompt: ${img.prompt || "(no prompt)"}`)
        console.log(`  Generated Prompt: ${img.generated_prompt || "(no generated prompt)"}`)
        console.log(`  Image URL: ${img.image_url}`)
        console.log(`  Created At: ${img.created_at}`)
        console.log("=" .repeat(80))
      })
      return
    }

    // Search by date range around December 13, 2025
    console.log(`\n📊 Searching by date range (Dec 13, 2025 ± 1 day)...`)
    const dateRangeImages = await sql`
      SELECT 
        id,
        user_id,
        prompt,
        description,
        category,
        subcategory,
        image_urls,
        selected_url,
        created_at
      FROM generated_images
      WHERE created_at >= '2025-12-12 00:00:00'::timestamp
        AND created_at <= '2025-12-14 23:59:59'::timestamp
      ORDER BY created_at DESC
      LIMIT 20
    `

    if (dateRangeImages.length > 0) {
      console.log(`✅ Found ${dateRangeImages.length} image(s) in date range!`)
      console.log("\n📋 Checking for matching image URL pattern...")
      
      dateRangeImages.forEach((img: any, index: number) => {
        const imageUrl = typeof img.image_urls === 'string' ? img.image_urls : img.selected_url || ""
        if (imageUrl.includes('5371') || imageUrl.includes('5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR')) {
          console.log(`\n✅ MATCH FOUND (Image ${index + 1}):`)
          console.log("=" .repeat(80))
          console.log("📝 PROMPT:")
          console.log(img.prompt || "(no prompt)")
          console.log("=" .repeat(80))
          console.log(`  ID: ${img.id}`)
          console.log(`  Image URL: ${imageUrl}`)
          console.log(`  Created At: ${img.created_at}`)
          console.log("=" .repeat(80))
        }
      })
      
      if (dateRangeImages.length > 0) {
        console.log("\n📋 All images in date range:")
        dateRangeImages.forEach((img: any, index: number) => {
          const imageUrl = typeof img.image_urls === 'string' ? img.image_urls : img.selected_url || ""
          console.log(`\n  ${index + 1}. ID: ${img.id}, Created: ${img.created_at}`)
          console.log(`     URL: ${imageUrl.substring(0, 100)}...`)
          console.log(`     Prompt preview: ${(img.prompt || "").substring(0, 100)}...`)
        })
      }
    } else {
      console.log("❌ No images found in date range")
    }

    // Also search ai_images by date
    console.log(`\n📊 Searching ai_images by date range...`)
    const dateRangeAiImages = await sql`
      SELECT 
        id,
        user_id,
        image_url,
        prompt,
        generated_prompt,
        category,
        created_at
      FROM ai_images
      WHERE created_at >= '2025-12-12 00:00:00'::timestamp
        AND created_at <= '2025-12-14 23:59:59'::timestamp
      ORDER BY created_at DESC
      LIMIT 20
    `

    if (dateRangeAiImages.length > 0) {
      console.log(`✅ Found ${dateRangeAiImages.length} image(s) in ai_images date range!`)
      dateRangeAiImages.forEach((img: any, index: number) => {
        if (img.image_url.includes('5371') || img.image_url.includes('5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR')) {
          console.log(`\n✅ MATCH FOUND in ai_images (Image ${index + 1}):`)
          console.log("=" .repeat(80))
          console.log("📝 PROMPT:")
          console.log(img.prompt || "(no prompt)")
          console.log("\n📝 GENERATED PROMPT:")
          console.log(img.generated_prompt || "(no generated prompt)")
          console.log("=" .repeat(80))
          console.log(`  ID: ${img.id}`)
          console.log(`  Image URL: ${img.image_url}`)
          console.log(`  Created At: ${img.created_at}`)
          console.log("=" .repeat(80))
        }
      })
    }

  } catch (error) {
    console.error("❌ Error searching for reference image:", error)
    throw error
  }
}

findReferenceImagePrompt()
  .then(() => {
    console.log("\n✅ Search complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Script failed:", error)
    process.exit(1)
  })
































