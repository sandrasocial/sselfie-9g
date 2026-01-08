/**
 * Codebase Indexing Script
 * Indexes all relevant files in the codebase for semantic search
 */

import { readFile, readdir, stat } from "fs/promises"
import { join } from "path"
import { config } from "dotenv"
import { indexCodebaseFile, type FileMetadata } from "@/lib/ai/embeddings"

// Load environment variables from .env.local
config({ path: ".env.local" })

// Files and directories to skip
const SKIP_PATTERNS = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".vercel",
  ".cursor",
  ".idea",
  "coverage",
  ".turbo",
  ".backups",
  "backup-before-cleanup",
  "archive",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  ".env",
  ".env.local",
  ".DS_Store",
]

// File extensions to index
const INDEXED_EXTENSIONS = ["ts", "tsx", "js", "jsx", "md", "sql", "json", "yaml", "yml"]

// Maximum file size to index (in bytes) - skip very large files
const MAX_FILE_SIZE = 500 * 1024 // 500KB

/**
 * Get category from file path
 */
function getCategory(filePath: string): string {
  if (filePath.includes("/api/")) return "api"
  if (filePath.includes("/components/")) return "component"
  if (filePath.includes("/lib/")) return "library"
  if (filePath.includes("/app/")) return "app"
  if (filePath.includes("/docs/")) return "documentation"
  if (filePath.includes("/scripts/")) return "script"
  if (filePath.includes("/migrations/")) return "migration"
  return "other"
}

/**
 * Get file type from extension and path
 */
function getFileType(filePath: string, ext: string): FileMetadata["type"] {
  if (filePath.includes("/api/")) return "api"
  if (filePath.includes("/components/")) return "component"
  if (ext === "md") return "docs"
  if (ext === "json" || ext === "yaml" || ext === "yml") return "config"
  return "code"
}

/**
 * Get language from extension
 */
function getLanguage(ext: string): string {
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    md: "markdown",
    sql: "sql",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
  }
  return langMap[ext] || ext
}

/**
 * Check if file should be skipped
 */
function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some((pattern) => filePath.includes(pattern))
}

/**
 * Recursively index a directory
 */
async function indexDirectory(
  dir: string,
  basePath: string = "",
  stats: { indexed: number; skipped: number; errors: number } = {
    indexed: 0,
    skipped: 0,
    errors: 0,
  }
): Promise<typeof stats> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

      // Skip if matches skip patterns
      if (shouldSkip(relativePath)) {
        stats.skipped++
        continue
      }

      if (entry.isDirectory()) {
        // Recursively index subdirectories
        await indexDirectory(fullPath, relativePath, stats)
      } else if (entry.isFile()) {
        const ext = entry.name.split(".").pop()?.toLowerCase()

        // Only index relevant file types
        if (ext && INDEXED_EXTENSIONS.includes(ext)) {
          try {
            // Check file size
            const fileStat = await stat(fullPath)
            if (fileStat.size > MAX_FILE_SIZE) {
              console.log(`[Index] Skipping large file: ${relativePath} (${fileStat.size} bytes)`)
              stats.skipped++
              continue
            }

            // Read file content
            const content = await readFile(fullPath, "utf-8")

            // Skip empty files
            if (!content.trim()) {
              stats.skipped++
              continue
            }

            // Index file
            const metadata: FileMetadata = {
              type: getFileType(relativePath, ext),
              category: getCategory(relativePath),
              language: getLanguage(ext),
            }

            await indexCodebaseFile(relativePath, content, metadata)
            stats.indexed++

            // Rate limiting: wait 100ms between requests to avoid hitting API limits
            if (stats.indexed % 10 === 0) {
              console.log(`[Index] Progress: ${stats.indexed} files indexed...`)
            } else {
              // Small delay to avoid rate limits
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
          } catch (error) {
            console.error(`[Index] Error indexing ${relativePath}:`, error)
            stats.errors++
          }
        } else {
          stats.skipped++
        }
      }
    }

    return stats
  } catch (error) {
    console.error(`[Index] Error reading directory ${dir}:`, error)
    stats.errors++
    return stats
  }
}

/**
 * Main indexing function
 */
async function main() {
  // Check for required environment variables
  if (!process.env.UPSTASH_SEARCH_REST_URL || !process.env.UPSTASH_SEARCH_REST_TOKEN) {
    console.error("\n[Index] ❌ Missing required environment variables:")
    console.error("  - UPSTASH_SEARCH_REST_URL")
    console.error("  - UPSTASH_SEARCH_REST_TOKEN")
    console.error("\n[Index] Please set these in your .env.local file")
    console.error("[Index] You can get them from: https://console.upstash.com/")
    process.exit(1)
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("\n[Index] ❌ Missing required environment variable:")
    console.error("  - OPENAI_API_KEY")
    console.error("\n[Index] Please set this in your .env.local file")
    process.exit(1)
  }

  console.log("[Index] Starting codebase indexing...")
  console.log("[Index] This may take a few minutes...")

  const startTime = Date.now()
  const stats = await indexDirectory(process.cwd())

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  console.log("\n[Index] ✅ Indexing complete!")
  console.log(`[Index] Files indexed: ${stats.indexed}`)
  console.log(`[Index] Files skipped: ${stats.skipped}`)
  console.log(`[Index] Errors: ${stats.errors}`)
  console.log(`[Index] Duration: ${duration}s`)
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("[Index] Fatal error:", error)
    process.exit(1)
  })
}

export { indexDirectory, main }
