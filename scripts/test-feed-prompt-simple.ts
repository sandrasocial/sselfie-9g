/**
 * Simple test to check feed prompt generation via API route
 * This avoids import issues with neon initialization
 * 
 * Run with: npx tsx scripts/test-feed-prompt-simple.ts
 */

// Load environment variables FIRST
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

if (!process.env.DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL environment variable is required")
  process.exit(1)
}

// Now we can import
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL!)

async function testPromptGeneration() {
  console.log("🧪 Testing Feed Planner Prompt Generation\n")
  console.log("=".repeat(80))

  // Get a test user
  console.log("🔍 Finding a test user from database...")
  let testUser
  try {
    const users = await sql`
      SELECT u.stack_auth_id, u.id, um.trigger_word, u.gender, u.ethnicity, upb.physical_preferences
      FROM users u
      LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
      LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
      WHERE u.stack_auth_id IS NOT NULL
      LIMIT 1
    `
    
    if (users.length === 0) {
      console.error("❌ No users found in database")
      process.exit(1)
    }

    testUser = users[0]
    console.log(`✅ Found test user:`)
    console.log(`   Auth ID: ${testUser.stack_auth_id}`)
    console.log(`   User ID: ${testUser.id}`)
    console.log(`   Trigger Word: ${testUser.trigger_word || "N/A"}`)
    console.log(`   Gender: ${testUser.gender || "N/A"}`)
    console.log(`   Ethnicity: ${testUser.ethnicity || "N/A"}`)
    console.log(`   Physical Preferences: ${testUser.physical_preferences ? "Yes" : "No"}\n`)
  } catch (error: any) {
    console.error("❌ Error fetching test user:", error.message)
    process.exit(1)
  }

  // Now import the function (after env vars are loaded)
  const { generateVisualComposition } = await import("@/lib/feed-planner/visual-composition-expert")

  // Test cases
  const testCases = [
    {
      name: "User Post - Portrait",
      params: {
        postPosition: 1,
        shotType: "portrait",
        purpose: "Showcase personal brand and expertise",
        visualDirection: "Confident professional in modern office setting",
        brandVibe: "sophisticated minimalist",
        authUserId: testUser.stack_auth_id,
        triggerWord: testUser.trigger_word,
      },
    },
    {
      name: "User Post - Half Body",
      params: {
        postPosition: 2,
        shotType: "half body",
        purpose: "Lifestyle moment showing authenticity",
        visualDirection: "Casual coffee shop moment, relaxed and approachable",
        brandVibe: "warm authentic",
        authUserId: testUser.stack_auth_id,
        triggerWord: testUser.trigger_word,
      },
    },
  ]

  for (const testCase of testCases) {
    console.log(`\n${"=".repeat(80)}`)
    console.log(`📝 Test: ${testCase.name}`)
    console.log("=".repeat(80))

    try {
      const composition = await generateVisualComposition(testCase.params)

      // Analyze the prompt
      const prompt = composition.fluxPrompt
      const wordCount = prompt.split(/\s+/).length
      const promptLower = prompt.toLowerCase()

      console.log(`\n✅ Generated Prompt (${wordCount} words):`)
      console.log(`"${prompt}"`)

      // Check requirements
      console.log(`\n📊 Requirements Check:`)
      const checks = {
        wordCount: {
          status: wordCount >= 50 && wordCount <= 80,
          value: `${wordCount} words`,
          required: "50-80 words",
        },
        hasTriggerWord: {
          status: testUser.trigger_word ? promptLower.startsWith(testUser.trigger_word.toLowerCase()) : true,
          value: prompt.split(",")[0],
          required: "Trigger word at start",
        },
        hasOutfit: {
          status: /(in|wearing|blouse|shirt|dress|trousers|pants|sweater|jacket|blazer|silk|linen|cashmere|leather|wool|cotton)/i.test(prompt),
          value: /(in|wearing|blouse|shirt|dress|trousers|pants|sweater|jacket|blazer|silk|linen|cashmere|leather|wool|cotton)/i.exec(prompt)?.[0] || "NOT FOUND",
          required: "Specific outfit (material + color + garment)",
        },
        hasLocation: {
          status: /(restaurant|cafe|kitchen|office|street|park|room|space|bar|counter|window|terrace|rooftop|location|setting)/i.test(prompt),
          value: /(restaurant|cafe|kitchen|office|street|park|room|space|bar|counter|window|terrace|rooftop|location|setting)/i.exec(prompt)?.[0] || "NOT FOUND",
          required: "Specific location with details",
        },
        hasIphone: {
          status: promptLower.includes("iphone 15 pro") || promptLower.includes("amateur cellphone"),
          value: promptLower.includes("iphone 15 pro") ? "iPhone 15 Pro" : promptLower.includes("amateur cellphone") ? "amateur cellphone" : "NOT FOUND",
          required: "iPhone 15 Pro or amateur cellphone",
        },
        hasImperfections: {
          status: ["sensor noise", "motion blur", "uneven lighting", "mixed color temperatures", "handheld"].filter(term => promptLower.includes(term)).length >= 3,
          value: ["sensor noise", "motion blur", "uneven lighting", "mixed color temperatures", "handheld"].filter(term => promptLower.includes(term)).join(", ") || "NOT FOUND",
          required: "At least 3 natural imperfections",
        },
        hasSkinTexture: {
          status: promptLower.includes("natural skin texture") || promptLower.includes("pores visible"),
          value: promptLower.includes("natural skin texture") ? "natural skin texture" : promptLower.includes("pores visible") ? "pores visible" : "NOT FOUND",
          required: "Natural skin texture with pores",
        },
        hasFilmGrain: {
          status: promptLower.includes("film grain") || promptLower.includes("grainy"),
          value: promptLower.includes("film grain") ? "film grain" : promptLower.includes("grainy") ? "grainy" : "NOT FOUND",
          required: "Film grain",
        },
        hasMutedColors: {
          status: promptLower.includes("muted") || promptLower.includes("desaturated"),
          value: promptLower.includes("muted") ? "muted" : promptLower.includes("desaturated") ? "desaturated" : "NOT FOUND",
          required: "Muted/desaturated colors",
        },
        hasGenericTerms: {
          status: !/(stylish outfit|business casual outfit|trendy outfit|professional outfit|urban background|urban setting|perfect lighting|edgy-minimalist)/i.test(prompt),
          value: /(stylish outfit|business casual outfit|trendy outfit|professional outfit|urban background|urban setting|perfect lighting|edgy-minimalist)/i.exec(prompt)?.[0] || "None found ✅",
          required: "No generic terms",
        },
      }

      let allPassed = true
      for (const [key, check] of Object.entries(checks)) {
        const icon = check.status ? "✅" : "❌"
        console.log(`  ${icon} ${key}: ${check.value} (required: ${check.required})`)
        if (!check.status) allPassed = false
      }

      if (allPassed) {
        console.log(`\n🎉 All requirements met!`)
      } else {
        console.log(`\n⚠️  Some requirements are missing`)
      }

    } catch (error: any) {
      console.error(`\n❌ Error generating prompt:`)
      console.error(error.message)
      if (error.stack) {
        console.error(error.stack.split("\n").slice(0, 5).join("\n"))
      }
    }
  }

  console.log(`\n${"=".repeat(80)}`)
  console.log("✅ Test complete!")
  console.log("=".repeat(80))
}

// Run the test
testPromptGeneration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })

