/**
 * Seed Hooks Library
 * Generates 50 hooks and saves to hooks_library table
 */

// Load environment variables first
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

function loadEnvFile(filePath: string) {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=")
        const value = valueParts.join("=").trim()
        const cleanValue = value.replace(/^["']|["']$/g, "")
        if (key) {
          process.env[key] = cleanValue
        }
      }
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"))
loadEnvFile(resolve(process.cwd(), ".env"))

import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set")
  console.error("Please set DATABASE_URL in .env.local or .env file")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

const HOOKS = [
  // Numbers Pattern
  "3 things I wish I knew before starting my personal brand",
  "5 mistakes that killed my engagement (and how to avoid them)",
  "7 days to transform your Instagram presence",
  "10 hooks that got me 100K followers",
  "The 1 thing that changed everything for my brand",

  // Secrets Pattern
  "What nobody tells you about building a personal brand",
  "The secret to going viral (it's not what you think)",
  "Why your content isn't working (and what to do instead)",
  "The truth about Instagram algorithms they don't want you to know",
  "What successful creators do differently (it's simple)",

  // Mistakes Pattern
  "I wasted 2 years doing this wrong",
  "The biggest mistake I made as a content creator",
  "Why I almost quit (and what changed)",
  "I did everything wrong for 6 months",
  "The mistake that cost me 10K followers",

  // Transformation Pattern
  "How I went from 0 to 100K in 6 months",
  "From invisible to undeniable: my brand transformation",
  "How I turned my side hustle into a 6-figure business",
  "The moment everything changed for my brand",
  "How I went from broke to booked",

  // Relatable Pattern
  "If you're tired of posting and getting no engagement...",
  "If you feel like giving up on your brand...",
  "If you're stuck in the comparison trap...",
  "If you're tired of being invisible online...",
  "If you're ready to stop playing small...",

  // Question Pattern
  "What if I told you your brand could be different?",
  "What if you stopped waiting for permission?",
  "What if your next post changed everything?",
  "What if you showed up as yourself?",
  "What if you stopped hiding your story?",

  // Bold Statement Pattern
  "Your brand is boring (here's how to fix it)",
  "You're posting wrong (and it's costing you)",
  "Stop waiting for the perfect moment",
  "Your content strategy is broken",
  "You're one post away from everything changing",

  // Story Pattern
  "The day I almost gave up on my brand",
  "How I turned my biggest failure into my biggest win",
  "The email that changed my entire business",
  "The moment I realized I was playing too small",
  "The conversation that changed everything",

  // Direct Pattern
  "You need to see this",
  "This changed everything for me",
  "I have to tell you something",
  "You're doing it wrong",
  "Let me show you what works",

  // Value Pattern
  "The framework that got me 50K followers",
  "The system I use to never run out of content",
  "The strategy that tripled my engagement",
  "The method that changed my entire approach",
  "The blueprint I wish I had from day one",
]

async function seedHooks() {
  try {
    console.log("Seeding hooks library...")

    // Check if table exists
    try {
      await sql`SELECT 1 FROM hooks_library LIMIT 1`
    } catch (error: any) {
      if (error.message?.includes("does not exist")) {
        console.error("hooks_library table does not exist. Please run create-hooks-library-table.sql first.")
        process.exit(1)
      }
      throw error
    }

    // Insert hooks
    for (const hookText of HOOKS) {
      try {
        await sql`
          INSERT INTO hooks_library (hook_text, category, framework, created_at)
          VALUES (
            ${hookText},
            ${getCategory(hookText)},
            ${getFramework(hookText)},
            NOW()
          )
          ON CONFLICT DO NOTHING
        `
      } catch (error) {
        console.error(`Error inserting hook "${hookText}":`, error)
      }
    }

    console.log(`✅ Seeded ${HOOKS.length} hooks to hooks_library`)
  } catch (error) {
    console.error("Error seeding hooks:", error)
    process.exit(1)
  }
}

function getCategory(hook: string): string {
  if (hook.match(/^\d+/)) return "numbers"
  if (hook.toLowerCase().includes("secret") || hook.toLowerCase().includes("nobody tells")) return "secrets"
  if (hook.toLowerCase().includes("mistake") || hook.toLowerCase().includes("wrong")) return "mistakes"
  if (hook.toLowerCase().includes("how i") || hook.toLowerCase().includes("went from")) return "transformation"
  if (hook.toLowerCase().includes("if you")) return "relatable"
  if (hook.toLowerCase().includes("what if")) return "question"
  if (hook.toLowerCase().includes("you're") || hook.toLowerCase().includes("your")) return "bold_statement"
  if (hook.toLowerCase().includes("the day") || hook.toLowerCase().includes("the moment")) return "story"
  if (hook.toLowerCase().includes("framework") || hook.toLowerCase().includes("system")) return "value"
  return "direct"
}

function getFramework(hook: string): string {
  if (hook.match(/^\d+/)) return "numbers"
  if (hook.toLowerCase().includes("secret") || hook.toLowerCase().includes("nobody")) return "secrets"
  if (hook.toLowerCase().includes("mistake") || hook.toLowerCase().includes("wrong")) return "mistakes"
  if (hook.toLowerCase().includes("how i") || hook.toLowerCase().includes("went from")) return "transformation"
  if (hook.toLowerCase().includes("if you")) return "relatable"
  if (hook.toLowerCase().includes("what if")) return "question"
  if (hook.toLowerCase().includes("you're") || hook.toLowerCase().includes("your")) return "pattern_interrupt"
  if (hook.toLowerCase().includes("the day") || hook.toLowerCase().includes("the moment")) return "story_driven"
  if (hook.toLowerCase().includes("framework") || hook.toLowerCase().includes("system")) return "value_prop"
  return "direct"
}

if (require.main === module) {
  seedHooks()
    .then(() => {
      console.log("Done!")
      process.exit(0)
    })
    .catch((error) => {
      console.error("Fatal error:", error)
      process.exit(1)
    })
}

export { seedHooks }

