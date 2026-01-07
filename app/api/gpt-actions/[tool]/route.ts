import { NextRequest, NextResponse } from "next/server"
import { readFile, readdir, stat } from "fs/promises"
import { join, resolve, relative, normalize } from "path"
import { existsSync } from "fs"

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

// Verify GPT Actions API key from header
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-gpt-actions-key")
  const expectedKey = process.env.GPT_ACTIONS_API_KEY

  if (!expectedKey) {
    console.error("[GPT Actions] GPT_ACTIONS_API_KEY not configured in environment")
    return false
  }

  if (!apiKey || apiKey !== expectedKey) {
    console.error("[GPT Actions] Invalid or missing API key")
    return false
  }

  return true
}

// Check if path is denied
function isPathDenied(filePath: string): boolean {
  const normalizedPath = normalize(filePath)
  
  // Check if path contains any denied segment
  for (const denied of DENIED_PATHS) {
    if (normalizedPath.includes(denied)) {
      return true
    }
  }

  // Check if path starts with denied path
  const pathSegments = normalizedPath.split(/[/\\]/)
  if (pathSegments.some(segment => DENIED_PATHS.includes(segment))) {
    return true
  }

  return false
}

// Get project root directory
function getProjectRoot(): string {
  return process.cwd()
}

// Resolve and validate file path
function resolveFilePath(requestedPath: string): { success: boolean; path?: string; error?: string } {
  try {
    const projectRoot = getProjectRoot()
    const resolvedPath = resolve(projectRoot, requestedPath)
    const relativePath = relative(projectRoot, resolvedPath)

    // Prevent directory traversal
    if (relativePath.startsWith("..") || relativePath.startsWith("../")) {
      return { success: false, error: "Directory traversal not allowed" }
    }

    // Check if path is denied
    if (isPathDenied(relativePath)) {
      return { success: false, error: "Access to this path is denied" }
    }

    return { success: true, path: resolvedPath }
  } catch (error: any) {
    return { success: false, error: error.message || "Invalid path" }
  }
}

// Handle read_file tool
async function handleReadFile(request: NextRequest): Promise<NextResponse> {
  try {
    const { filePath } = await request.json()

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { error: "filePath is required and must be a string" },
        { status: 400 }
      )
    }

    const pathResult = resolveFilePath(filePath)
    if (!pathResult.success || !pathResult.path) {
      return NextResponse.json(
        { error: pathResult.error || "Invalid path" },
        { status: 403 }
      )
    }

    // Check if file exists
    if (!existsSync(pathResult.path)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    // Get file stats
    const fileStats = await stat(pathResult.path)
    
    // Check if it's a file (not a directory)
    if (!fileStats.isFile()) {
      return NextResponse.json(
        { error: "Path is not a file" },
        { status: 400 }
      )
    }

    // Check file size
    if (fileStats.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: `File size (${fileStats.size} bytes) exceeds maximum allowed size (${MAX_FILE_SIZE} bytes / 200 KB)`,
          fileSize: fileStats.size,
          maxSize: MAX_FILE_SIZE
        },
        { status: 413 }
      )
    }

    // Read file content
    const content = await readFile(pathResult.path, "utf-8")

    return NextResponse.json({
      success: true,
      filePath: relative(getProjectRoot(), pathResult.path),
      content,
      size: fileStats.size,
    })
  } catch (error: any) {
    console.error("[GPT Actions] Error reading file:", error)
    return NextResponse.json(
      { error: error.message || "Failed to read file" },
      { status: 500 }
    )
  }
}

// Handle list_files tool
async function handleListFiles(request: NextRequest): Promise<NextResponse> {
  try {
    const { directoryPath = "." } = await request.json()

    if (typeof directoryPath !== "string") {
      return NextResponse.json(
        { error: "directoryPath must be a string" },
        { status: 400 }
      )
    }

    const pathResult = resolveFilePath(directoryPath)
    if (!pathResult.success || !pathResult.path) {
      return NextResponse.json(
        { error: pathResult.error || "Invalid path" },
        { status: 403 }
      )
    }

    // Check if path exists
    if (!existsSync(pathResult.path)) {
      return NextResponse.json(
        { error: "Directory not found" },
        { status: 404 }
      )
    }

    // Get file stats
    const pathStats = await stat(pathResult.path)
    
    // Check if it's a directory
    if (!pathStats.isDirectory()) {
      return NextResponse.json(
        { error: "Path is not a directory" },
        { status: 400 }
      )
    }

    // Read directory contents
    const entries = await readdir(pathResult.path, { withFileTypes: true })

    // Filter out denied paths and map to file/directory info
    const files = entries
      .filter((entry) => {
        const entryPath = join(pathResult.path, entry.name)
        const relativeEntryPath = relative(getProjectRoot(), entryPath)
        return !isPathDenied(relativeEntryPath)
      })
      .map((entry) => {
        return {
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
          path: relative(getProjectRoot(), join(pathResult.path, entry.name)),
        }
      })

    return NextResponse.json({
      success: true,
      directoryPath: relative(getProjectRoot(), pathResult.path),
      files,
      count: files.length,
    })
  } catch (error: any) {
    console.error("[GPT Actions] Error listing files:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list files" },
      { status: 500 }
    )
  }
}

// Handle file_stat tool
async function handleFileStat(request: NextRequest): Promise<NextResponse> {
  try {
    const { filePath } = await request.json()

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { error: "filePath is required and must be a string" },
        { status: 400 }
      )
    }

    const pathResult = resolveFilePath(filePath)
    if (!pathResult.success || !pathResult.path) {
      return NextResponse.json(
        { error: pathResult.error || "Invalid path" },
        { status: 403 }
      )
    }

    // Check if path exists
    if (!existsSync(pathResult.path)) {
      return NextResponse.json(
        { error: "File or directory not found" },
        { status: 404 }
      )
    }

    // Get file stats
    const fileStats = await stat(pathResult.path)

    return NextResponse.json({
      success: true,
      filePath: relative(getProjectRoot(), pathResult.path),
      isFile: fileStats.isFile(),
      isDirectory: fileStats.isDirectory(),
      size: fileStats.size,
      modifiedAt: fileStats.mtime.toISOString(),
      createdAt: fileStats.birthtime.toISOString(),
      readable: fileStats.size <= MAX_FILE_SIZE,
    })
  } catch (error: any) {
    console.error("[GPT Actions] Error getting file stats:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get file stats" },
      { status: 500 }
    )
  }
}

// Main route handler
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tool: string }> | { tool: string } }
) {
  // Verify API key
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing x-gpt-actions-key header" },
      { status: 401 }
    )
  }

  // Resolve params (Next.js 15+ makes params a Promise)
  const resolvedParams = await Promise.resolve(params)
  const { tool } = resolvedParams

  // Route to appropriate tool handler
  switch (tool) {
    case "read_file":
      return handleReadFile(request)

    case "list_files":
      return handleListFiles(request)

    case "file_stat":
      return handleFileStat(request)

    default:
      return NextResponse.json(
        { 
          error: `Unknown tool: ${tool}`,
          availableTools: ["read_file", "list_files", "file_stat"]
        },
        { status: 400 }
      )
  }
}


