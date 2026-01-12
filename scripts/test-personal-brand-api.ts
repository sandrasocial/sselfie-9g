/**
 * Test script to check personal brand data in database
 * Run with: npx tsx scripts/test-personal-brand-api.ts <user-email>
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables
const envPath = path.join(process.cwd(), ".env.local")
dotenv.config({ path: envPath })

const sql = neon(process.env.DATABASE_URL!)

async function testPersonalBrand(userEmail: string) {
  try {
    console.log(`\n🔍 Testing personal brand data for: ${userEmail}\n`)

    // First, find the user
    const users = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE email = ${userEmail}
      LIMIT 1
    `

    if (users.length === 0) {
      console.log("❌ User not found in database")
      return
    }

    const user = users[0]
    console.log(`✅ Found user: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.display_name || "N/A"}\n`)

    // Check personal brand data
    const personalBrand = await sql`
      SELECT 
        id,
        user_id,
        name,
        business_type,
        ideal_audience,
        audience_challenge,
        audience_transformation,
        transformation_story,
        current_situation,
        future_vision,
        visual_aesthetic,
        settings_preference,
        fashion_style,
        brand_inspiration,
        inspiration_links,
        content_pillars,
        is_completed,
        created_at,
        updated_at
      FROM user_personal_brand
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (personalBrand.length === 0) {
      console.log("❌ No personal brand data found for this user")
      return
    }

    const brand = personalBrand[0]
    console.log("✅ Personal brand data found:\n")
    console.log(`   ID: ${brand.id}`)
    console.log(`   Name: ${brand.name || "N/A"}`)
    console.log(`   Business Type: ${brand.business_type || "N/A"}`)
    console.log(`   Ideal Audience: ${brand.ideal_audience || "N/A"}`)
    console.log(`   Audience Challenge: ${brand.audience_challenge || "N/A"}`)
    console.log(`   Audience Transformation: ${brand.audience_transformation || "N/A"}`)
    console.log(`   Transformation Story: ${brand.transformation_story ? brand.transformation_story.substring(0, 50) + "..." : "N/A"}`)
    console.log(`   Current Situation: ${brand.current_situation || "N/A"}`)
    console.log(`   Future Vision: ${brand.future_vision || "N/A"}`)
    console.log(`   Visual Aesthetic: ${brand.visual_aesthetic || "N/A"}`)
    console.log(`   Settings Preference: ${brand.settings_preference || "N/A"}`)
    console.log(`   Fashion Style: ${brand.fashion_style || "N/A"}`)
    console.log(`   Brand Inspiration: ${brand.brand_inspiration || "N/A"}`)
    console.log(`   Inspiration Links: ${brand.inspiration_links || "N/A"}`)
    console.log(`   Content Pillars: ${brand.content_pillars || "N/A"}`)
    console.log(`   Is Completed: ${brand.is_completed}`)
    console.log(`   Created At: ${brand.created_at}`)
    console.log(`   Updated At: ${brand.updated_at}\n`)

    // Check avatar images
    const avatarImages = await sql`
      SELECT id, image_url, is_active, created_at
      FROM user_avatar_images
      WHERE user_id = ${user.id} AND is_active = true
      ORDER BY created_at DESC
    `

    console.log(`📸 Avatar Images: ${avatarImages.length} found`)
    avatarImages.forEach((img, idx) => {
      console.log(`   ${idx + 1}. ${img.image_url} (Active: ${img.is_active})`)
    })

    // Simulate what the API should return
    console.log("\n📤 What API should return (camelCase):\n")
    const apiResponse = {
      exists: true,
      completed: brand.is_completed,
      data: {
        name: brand.name,
        businessType: brand.business_type,
        idealAudience: brand.ideal_audience,
        audienceChallenge: brand.audience_challenge,
        audienceTransformation: brand.audience_transformation,
        transformationStory: brand.transformation_story,
        currentSituation: brand.current_situation,
        futureVision: brand.future_vision,
        visualAesthetic: brand.visual_aesthetic,
        settingsPreference: brand.settings_preference,
        fashionStyle: brand.fashion_style,
        brandInspiration: brand.brand_inspiration,
        inspirationLinks: brand.inspiration_links,
        contentPillars: brand.content_pillars,
      },
    }
    console.log(JSON.stringify(apiResponse, null, 2))

  } catch (error) {
    console.error("❌ Error:", error)
  }
}

// Get email from command line
const userEmail = process.argv[2]

if (!userEmail) {
  console.error("Usage: npx tsx scripts/test-personal-brand-api.ts <user-email>")
  process.exit(1)
}

testPersonalBrand(userEmail)
  .then(() => {
    console.log("\n✅ Test complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Test failed:", error)
    process.exit(1)
  })
