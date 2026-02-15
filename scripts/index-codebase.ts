/**
 * Codebase Indexing Script
 * Indexes relevant files in the codebase for semantic search.
 */

import { config } from "dotenv"

import { runCodebaseReindex } from "@/lib/ai/codebase-indexer"

config({ path: ".env.local" })

export async function main() {
  if (!process.env.UPSTASH_SEARCH_REST_URL || !process.env.UPSTASH_SEARCH_REST_TOKEN) {
    console.error("\n[Index] Missing required environment variables:")
    console.error("  - UPSTASH_SEARCH_REST_URL")
    console.error("  - UPSTASH_SEARCH_REST_TOKEN")
    process.exit(1)
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("\n[Index] Missing required environment variable:")
    console.error("  - OPENAI_API_KEY")
    process.exit(1)
  }

  console.log("[Index] Starting codebase indexing...")
  const startTime = Date.now()
  const stats = await runCodebaseReindex({ rootDir: process.cwd() })
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  console.log("\n[Index] Indexing complete")
  console.log(`[Index] Files indexed: ${stats.indexed}`)
  console.log(`[Index] Files skipped: ${stats.skipped}`)
  console.log(`[Index] Errors: ${stats.errors}`)
  console.log(`[Index] Duration: ${duration}s`)
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[Index] Fatal error:", error)
    process.exit(1)
  })
}
