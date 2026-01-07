import { NextResponse } from "next/server"

// Maximum file size: 200 KB
const MAX_FILE_SIZE = 200 * 1024 // 200 KB in bytes

// Denied paths (relative to project root)
const DENIED_PATHS = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
]

// GET handler for health check
export async function GET() {
  return NextResponse.json({
    service: "GPT Actions API",
    status: "healthy",
    availableTools: ["read_file", "list_files", "file_stat"],
    maxFileSize: `${MAX_FILE_SIZE} bytes (200 KB)`,
    deniedPaths: DENIED_PATHS,
  })
}

