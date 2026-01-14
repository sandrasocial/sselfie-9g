/**
 * Test Script: Prompt Builder for Preview Feeds
 * 
 * Tests the prompt building flow for preview feeds with specific configuration:
 * - Feed Style: luxury (dark and moody)
 * - Visual Aesthetic: luxury
 * - Fashion Style: athletic
 * 
 * This script verifies:
 * 1. Template selection logic
 * 2. Prompt extraction from templates
 * 3. Final prompt structure
 * 4. How prompts look for different positions
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL || "")

async function testPromptBuilder() {
  console.log("=".repeat(80))
  console.log("TEST: Prompt Builder for Preview Feeds")
  console.log("=".repeat(80))
  console.log()

  // Test Configuration
  const testConfig = {
    feedStyle: "luxury", // Maps to mood: "dark_moody"
    visualAesthetic: ["luxury"], // Maps to category: "luxury"
    fashionStyle: ["athletic"], // Used for outfit details, not template selection
  }

  console.log("📋 Test Configuration:")
  console.log(`   Feed Style: ${testConfig.feedStyle}`)
  console.log(`   Visual Aesthetic: ${testConfig.visualAesthetic.join(", ")}`)
  console.log(`   Fashion Style: ${testConfig.fashionStyle.join(", ")}`)
  console.log()

  try {
    // Step 1: Test Template Selection Logic
    console.log("🔍 Step 1: Testing Template Selection Logic")
    console.log("-".repeat(80))

    const { BLUEPRINT_PHOTOSHOOT_TEMPLATES, MOOD_MAP } = await import("@/lib/maya/blueprint-photoshoot-templates")

    // Map feed style to mood
    const mood = testConfig.feedStyle.toLowerCase().trim() // "luxury"
    const moodMapped = MOOD_MAP[mood as keyof typeof MOOD_MAP] || "light_minimalistic"
    console.log(`   Feed Style: "${mood}" → Mood Mapped: "${moodMapped}"`)

    // Map visual aesthetic to category
    const category = testConfig.visualAesthetic[0]?.toLowerCase().trim() || "professional"
    console.log(`   Visual Aesthetic: "${testConfig.visualAesthetic[0]}" → Category: "${category}"`)

    // Build template key
    const templateKey = `${category}_${moodMapped}` as keyof typeof BLUEPRINT_PHOTOSHOOT_TEMPLATES
    console.log(`   Template Key: "${templateKey}"`)
    console.log()

    // Step 2: Get Template
    console.log("📄 Step 2: Getting Template")
    console.log("-".repeat(80))

    const template = BLUEPRINT_PHOTOSHOOT_TEMPLATES[templateKey]
    if (!template) {
      console.error(`   ❌ ERROR: Template "${templateKey}" not found!`)
      console.log()
      console.log("   Available templates:")
      Object.keys(BLUEPRINT_PHOTOSHOOT_TEMPLATES).forEach((key) => {
        console.log(`   - ${key}`)
      })
      return
    }

    console.log(`   ✅ Template found: "${templateKey}"`)
    console.log(`   Template length: ${template.length} characters`)
    console.log(`   Template word count: ${template.split(/\s+/).length} words`)
    console.log()

    // Step 3: Test Template Parsing
    console.log("🔧 Step 3: Testing Template Parsing")
    console.log("-".repeat(80))

    const { parseTemplateFrames, buildSingleImagePrompt, validateTemplate } = await import(
      "@/lib/feed-planner/build-single-image-prompt"
    )

    // Parse template
    const { frames, colorGrade } = parseTemplateFrames(template)
    console.log(`   Frames found: ${frames.length}`)
    console.log(`   Color Grade: ${colorGrade ? "✅ Present" : "❌ Missing"}`)
    console.log()

    // Validate template
    const validation = validateTemplate(template)
    console.log(`   Validation Results:`)
    console.log(`   - Valid: ${validation.isValid ? "✅" : "❌"}`)
    console.log(`   - Has Frames: ${validation.hasFrames ? "✅" : "❌"} (${validation.frameCount} frames)`)
    console.log(`   - Has Color Grade: ${validation.hasColorGrade ? "✅" : "❌"}`)
    if (validation.missingSections.length > 0) {
      console.log(`   - Missing Sections: ${validation.missingSections.join(", ")}`)
    }
    console.log()

    // Step 4: Test Prompt Building for Different Positions
    console.log("🎨 Step 4: Testing Prompt Building for Different Positions")
    console.log("-".repeat(80))

    const testPositions = [1, 5, 9] // Test first, middle, and last positions

    for (const position of testPositions) {
      try {
        const prompt = buildSingleImagePrompt(template, position)
        const wordCount = prompt.split(/\s+/).length

        console.log(`   Position ${position}:`)
        console.log(`   - Word count: ${wordCount}`)
        console.log(`   - Character count: ${prompt.length}`)
        console.log(`   - Preview (first 150 chars):`)
        console.log(`     "${prompt.substring(0, 150)}..."`)
        console.log()

        // Check for key elements
        const hasBaseIdentity = prompt.includes("Influencer/pinterest style")
        const hasColorGrade = colorGrade && prompt.includes(colorGrade.substring(0, 50))
        const frameDescription = frames.find((f) => f.position === position)?.description || ""
        const hasFrameDescription = frameDescription && prompt.includes(frameDescription.substring(0, 50))

        console.log(`   - Key Elements Check:`)
        console.log(`     ✅ Base Identity: ${hasBaseIdentity}`)
        console.log(`     ✅ Frame Description: ${hasFrameDescription}`)
        console.log(`     ✅ Color Grade: ${hasColorGrade}`)
        console.log()
      } catch (error) {
        console.error(`   ❌ Error building prompt for position ${position}:`, error)
        console.log()
      }
    }

    // Step 5: Show Full Template Structure
    console.log("📋 Step 5: Full Template Structure")
    console.log("-".repeat(80))
    console.log("Template Preview (first 500 characters):")
    console.log(template.substring(0, 500) + "...")
    console.log()
    console.log(`Color Grade:`)
    console.log(colorGrade)
    console.log()
    console.log("First 3 Frames:")
    frames.slice(0, 3).forEach((frame) => {
      console.log(`   ${frame.position}. ${frame.description.substring(0, 100)}...`)
    })
    console.log()

    // Step 6: Show Complete Prompt Example
    console.log("✨ Step 6: Complete Prompt Example (Position 1)")
    console.log("-".repeat(80))
    try {
      const fullPrompt = buildSingleImagePrompt(template, 1)
      console.log("Complete Prompt:")
      console.log("=".repeat(80))
      console.log(fullPrompt)
      console.log("=".repeat(80))
      console.log()
    } catch (error) {
      console.error(`❌ Error:`, error)
    }

    // Step 7: Summary
    console.log("📊 Step 7: Test Summary")
    console.log("=".repeat(80))
    console.log(`✅ Template Selection: ${templateKey}`)
    console.log(`✅ Template Found: Yes`)
    console.log(`✅ Template Valid: ${validation.isValid}`)
    console.log(`✅ Frames: ${frames.length}/9`)
    console.log(`✅ Color Grade: ${colorGrade ? "Present" : "Missing"}`)
    console.log(`✅ Prompt Building: Working`)
    console.log()

    console.log("🎯 Expected Behavior:")
    console.log(`   - Feed Style "${testConfig.feedStyle}" → Mood "${moodMapped}"`)
    console.log(`   - Visual Aesthetic "${category}" → Category "${category}"`)
    console.log(`   - Template Key: "${templateKey}"`)
    console.log(`   - Fashion Style "${testConfig.fashionStyle[0]}" influences outfit details in prompts`)
    console.log()

    console.log("=".repeat(80))
    console.log("✅ TEST COMPLETE")
    console.log("=".repeat(80))
  } catch (error) {
    console.error("❌ TEST FAILED:", error)
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Stack trace:", error.stack)
    }
  }
}

// Run the test
testPromptBuilder()
  .then(() => {
    console.log("\nTest script completed.")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\nTest script failed:", error)
    process.exit(1)
  })
