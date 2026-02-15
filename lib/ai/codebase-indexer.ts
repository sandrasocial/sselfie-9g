import { readFile, readdir, stat } from "fs/promises"
import { join } from "node:path"

import { indexCodebaseFile, type FileMetadata } from "@/lib/ai/embeddings"

export interface CodebaseIndexStats {
  indexed: number
  skipped: number
  errors: number
}

interface RunCodebaseReindexOptions {
  rootDir: string
  delayMs?: number
  maxFileSizeBytes?: number
  indexFile?: (filePath: string, content: string, metadata: FileMetadata) => Promise<void>
}

const DEFAULT_DELAY_MS = 100
const DEFAULT_MAX_FILE_SIZE_BYTES = 500 * 1024

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

const INDEXED_EXTENSIONS = ["ts", "tsx", "js", "jsx", "md", "sql", "json", "yaml", "yml"]

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

function getFileType(filePath: string, ext: string): FileMetadata["type"] {
  if (filePath.includes("/api/")) return "api"
  if (filePath.includes("/components/")) return "component"
  if (ext === "md") return "docs"
  if (ext === "json" || ext === "yaml" || ext === "yml") return "config"
  return "code"
}

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

function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some((pattern) => filePath.includes(pattern))
}

async function indexDirectory(input: {
  dir: string
  basePath: string
  stats: CodebaseIndexStats
  delayMs: number
  maxFileSizeBytes: number
  indexFile: NonNullable<RunCodebaseReindexOptions["indexFile"]>
}): Promise<void> {
  const { dir, basePath, stats, delayMs, maxFileSizeBytes, indexFile } = input
  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

      if (shouldSkip(relativePath)) {
        stats.skipped++
        continue
      }

      if (entry.isDirectory()) {
        await indexDirectory({
          dir: fullPath,
          basePath: relativePath,
          stats,
          delayMs,
          maxFileSizeBytes,
          indexFile,
        })
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const ext = entry.name.split(".").pop()?.toLowerCase()
      if (!ext || !INDEXED_EXTENSIONS.includes(ext)) {
        stats.skipped++
        continue
      }

      try {
        const fileStat = await stat(fullPath)
        if (fileStat.size > maxFileSizeBytes) {
          stats.skipped++
          continue
        }

        const content = await readFile(fullPath, "utf-8")
        if (!content.trim()) {
          stats.skipped++
          continue
        }

        const metadata: FileMetadata = {
          type: getFileType(relativePath, ext),
          category: getCategory(relativePath),
          language: getLanguage(ext),
        }

        await indexFile(relativePath, content, metadata)
        stats.indexed++
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      } catch (error) {
        console.error(`[Index] Error indexing ${relativePath}:`, error)
        stats.errors++
      }
    }
  } catch (error) {
    console.error(`[Index] Error reading directory ${dir}:`, error)
    stats.errors++
  }
}

export async function runCodebaseReindex(options: RunCodebaseReindexOptions): Promise<CodebaseIndexStats> {
  const stats: CodebaseIndexStats = { indexed: 0, skipped: 0, errors: 0 }
  await indexDirectory({
    dir: options.rootDir,
    basePath: "",
    stats,
    delayMs: options.delayMs ?? DEFAULT_DELAY_MS,
    maxFileSizeBytes: options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES,
    indexFile: options.indexFile ?? indexCodebaseFile,
  })
  return stats
}
