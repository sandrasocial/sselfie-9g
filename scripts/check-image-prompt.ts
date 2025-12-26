import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config()

const sql = neon(process.env.DATABASE_URL!)

const imageUrl = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/photoshoots/bks1mywmhsrme0ctjtgsc9e8s0-0-7XYtxP41XqeRzX4Rywf74koJsaOMJ6.png"

async function checkImagePrompt() {
  try {
    console.log("🔍 Searching for image:", imageUrl.substring(0, 80) + "...")
    
    const result = await sql`
      SELECT 
        id,
        user_id,
        image_url,
        prompt,
        generated_prompt,
        category,
        source,
        created_at
      FROM ai_images
      WHERE image_url = ${imageUrl}
      LIMIT 1
    `

    if (result.length === 0) {
      console.log("❌ Image not found in ai_images table")
      console.log("🔍 Trying to search by partial URL...")
      
      // Try searching by the filename part
      const filename = imageUrl.split("/").pop()?.split("-")[0] || ""
      if (filename) {
        const partialResult = await sql`
          SELECT 
            id,
            user_id,
            image_url,
            prompt,
            generated_prompt,
            category,
            source,
            created_at
          FROM ai_images
          WHERE image_url LIKE ${`%${filename}%`}
          ORDER BY created_at DESC
          LIMIT 5
        `
        
        if (partialResult.length > 0) {
          console.log(`\n📋 Found ${partialResult.length} similar images:`)
          partialResult.forEach((img: any, idx: number) => {
            console.log(`\n--- Image ${idx + 1} ---`)
            console.log("ID:", img.id)
            console.log("URL:", img.image_url)
            console.log("Prompt:", img.prompt)
            console.log("Generated Prompt:", img.generated_prompt)
            console.log("Category:", img.category)
            console.log("Created:", img.created_at)
          })
        } else {
          console.log("❌ No images found with similar URL pattern")
        }
      }
      return
    }

    const image = result[0] as any
    
    console.log("\n✅ Image found!")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("📸 IMAGE DETAILS")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log("ID:", image.id)
    console.log("User ID:", image.user_id)
    console.log("Category:", image.category)
    console.log("Source:", image.source)
    console.log("Created:", image.created_at)
    console.log("\n📝 DISPLAY PROMPT (caption):")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log(image.prompt || "(empty)")
    console.log("\n🎨 GENERATED PROMPT (Flux prompt used for generation):")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    console.log(image.generated_prompt || "(empty)")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
  } catch (error) {
    console.error("❌ Error querying database:", error)
  }
}

checkImagePrompt()




































