/**
 * Read Codebase File Tool
 * Reads and analyzes files from the SSELFIE codebase
 */

import type { Tool, ToolResult } from '../../types'
import * as fs from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

interface ReadCodebaseFileInput {
  filePath: string
  maxLines?: number
}

export const readCodebaseFileTool: Tool<ReadCodebaseFileInput> = {
  name: "read_codebase_file",
  description: `Read and analyze files from the SSELFIE codebase to understand the app structure, content, and features.
  
Use this to:
- Understand what freebies, guides, and resources exist
- Read content templates and documentation
- Analyze code structure and features
- Help Sandra manage and improve the codebase
- Reference actual content when creating emails or campaigns
- Find recently modified files
- Search for files by keyword

IMPORTANT: 
- If a file is not found, the tool will suggest similar files
- If you provide a directory path, it will list ALL available files in that directory
- When you see a directory listing, use the EXACT full paths shown to read specific files
- For dynamic routes like [slug], use the actual file path with brackets: app/prompt-guides/[slug]/page.tsx
- Example: If directory shows "[slug]/", read app/prompt-guides/[slug]/page.tsx

SEARCH CAPABILITIES:
- Exact file paths: 'app/api/route.ts'
- Directory browsing: 'app/api'
- Smart keyword search: Use keywords to find relevant files (e.g., 'maya', 'studio', 'prompt')
- Recent changes: Use 'recent' to see files modified in last 7 days

This tool allows you to read files from:
- content-templates/ (Instagram templates, guides)
- docs/ (documentation, guides)
- app/ (pages and routes)
- lib/ (utilities and helpers)
- scripts/ (database schemas, migrations)
- components/ (React components)

Always use this when Sandra asks about:
- What freebies exist
- What's in the brand blueprint
- What prompts are in the guide
- How features work
- What content exists
- What files were recently changed
- Finding files by feature name`,

  input_schema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "File path, directory, keyword search, or 'recent' for recent changes. Examples: 'app/api/route.ts' (exact path), 'app/api' (directory), 'maya' (keyword search), 'recent' (recent changes)"
      },
      maxLines: {
        type: "number",
        description: "Maximum number of lines to read (default 500, use for large files)"
      }
    },
    required: ["filePath"]
  },

  async execute({ filePath, maxLines = 500 }: ReadCodebaseFileInput): Promise<ToolResult> {
    try {
      if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
        console.error(`[Alex] ❌ read_codebase_file called with invalid filePath:`, filePath)
        return {
          success: false,
          error: "filePath is required and must be a non-empty string",
          filePath: filePath || 'undefined'
        }
      }

      console.log(`[Alex] 📖 Attempting to read file: ${filePath}`)

      // Security: Only allow reading from specific safe directories
      const allowedDirs = [
        'content-templates',
        'docs',
        'app',
        'lib',
        'scripts',
        'components'
      ]

      const trimmedPath = filePath.trim()

      // Special handling for "recent" keyword
      if (trimmedPath.toLowerCase() === 'recent') {
        console.log(`[Alex] 🔍 Finding recently modified files...`)
        try {
          const gitOutput = execSync(
            'git log --name-only --pretty=format: --since="7 days ago"',
            { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
          )

          const recentFiles = gitOutput
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => {
              const hasAllowedExt = /\.(ts|tsx|js|jsx|md)$/i.test(line)
              const inAllowedDir = allowedDirs.some(dir => line.startsWith(dir + '/'))
              return hasAllowedExt && (inAllowedDir || line === 'README.md' || line === 'package.json')
            })
            .filter((line: string, index: number, self: string[]) => self.indexOf(line) === index)
            .slice(0, 20)

          if (recentFiles.length > 0) {
            console.log(`[Alex] 📝 Found ${recentFiles.length} recently modified files`)
            return {
              success: true,
              type: 'recent_changes',
              files: recentFiles,
              message: `Files modified in last 7 days (${recentFiles.length} files):\n\n${recentFiles.map((f: string) => `- ${f}`).join('\n')}\n\n💡 Use read_codebase_file with a specific file path to read any of these files.`,
              data: {
                type: 'recent_changes',
                files: recentFiles
              }
            }
          } else {
            return {
              success: true,
              type: 'recent_changes',
              files: [],
              message: 'No files modified in the last 7 days. Use read_codebase_file with a file path, directory, or keyword to search the codebase.',
              data: {
                type: 'recent_changes',
                files: []
              }
            }
          }
        } catch (error: any) {
          console.error('[Alex] ⚠️ Error finding recent files:', error.message)
          return {
            success: false,
            error: "Could not retrieve recent changes. Git may not be available or initialized.",
            suggestion: "Try using a file path, directory, or keyword search instead."
          }
        }
      }

      // If filePath looks like a keyword search (no slashes, no extension, and not a special keyword)
      const hasNoSlashes = !trimmedPath.includes('/') && !trimmedPath.includes('\\')
      const hasNoExtension = !trimmedPath.includes('.')
      const isNotSpecial = trimmedPath.toLowerCase() !== 'recent'

      if (hasNoSlashes && hasNoExtension && isNotSpecial && trimmedPath.length > 1) {
        console.log(`[Alex] 🔍 Performing keyword search for: ${trimmedPath}`)
        const keyword = trimmedPath.toLowerCase()
        const searchResults: string[] = []

        try {
          for (const dir of allowedDirs) {
            const dirPath = join(process.cwd(), dir)
            try {
              await fs.promises.access(dirPath)
              // Directory exists, proceed
            } catch {
              // Directory doesn't exist, skip
              continue
            }

            try {
              const files = execSync(
                `find "${dir}" -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.md" \\) -iname "*${keyword}*" 2>/dev/null | head -15`,
                { encoding: 'utf-8', cwd: process.cwd() }
              ).split('\n').filter((f: string) => f.trim().length > 0)

              searchResults.push(...files)
            } catch (searchError: any) {
              // If find fails, try manual search
              try {
                const searchInDir = async (dirPath: string): Promise<void> => {
                  if (searchResults.length >= 20) return

                  try {
                    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
                    for (const entry of entries) {
                      if (searchResults.length >= 20) break

                      const fullPath = join(dirPath, entry.name)
                      const relPath = fullPath.replace(process.cwd() + '/', '')

                      if (relPath.includes('node_modules') || relPath.includes('.next')) continue

                      if (entry.isDirectory()) {
                        await searchInDir(fullPath)
                      } else if (entry.isFile()) {
                        const ext = entry.name.split('.').pop()?.toLowerCase()
                        if (['ts', 'tsx', 'js', 'jsx', 'md'].includes(ext || '')) {
                          const nameLower = entry.name.toLowerCase()
                          if (nameLower.includes(keyword)) {
                            if (!searchResults.includes(relPath)) {
                              searchResults.push(relPath)
                            }
                          }
                        }
                      }
                    }
                  } catch (e) {
                    // Skip directories we can't read
                  }
                }

                await searchInDir(dirPath)
              } catch (manualError) {
                // Continue to next directory
              }
            }
          }

          if (searchResults.length > 0) {
            const uniqueResults = Array.from(new Set(searchResults)).slice(0, 20)
            console.log(`[Alex] 🔍 Found ${uniqueResults.length} files matching "${keyword}"`)
            return {
              success: true,
              type: 'search_results',
              keyword: keyword,
              files: uniqueResults,
              message: `Files matching "${keyword}" (${uniqueResults.length} found):\n\n${uniqueResults.map((f: string) => `- ${f}`).join('\n')}\n\n💡 Use read_codebase_file with a specific file path to read any of these files.`,
              data: {
                type: 'search_results',
                keyword,
                files: uniqueResults
              }
            }
          }
        } catch (error: any) {
          console.warn(`[Alex] ⚠️ Error in keyword search:`, error.message)
        }
      }

      // Normalize path and check if it's in allowed directory
      const normalizedPath = trimmedPath.replace(/\\/g, '/')

      const isAllowed = allowedDirs.some(dir => normalizedPath.startsWith(dir + '/')) || 
                        allowedDirs.includes(normalizedPath) ||
                        normalizedPath === 'README.md' || 
                        normalizedPath === 'package.json'

      if (!isAllowed) {
        console.log(`[Alex] ⚠️ File path not allowed: ${filePath}`)
        return {
          success: false,
          error: `File path must be in one of these directories: ${allowedDirs.join(', ')}`,
          filePath: filePath,
          suggestion: `If you want to list files in a directory, use a path like: ${allowedDirs[0]}/filename.ext`
        }
      }

      // Prevent directory traversal
      if (normalizedPath.includes('..')) {
        console.log(`[Alex] ⚠️ Directory traversal attempt blocked: ${filePath}`)
        return {
          success: false,
          error: "Directory traversal not allowed",
          filePath: filePath
        }
      }

      const fullPath = join(process.cwd(), normalizedPath)

      // Check if it's a directory
      try {
        const stats = fs.statSync(fullPath)
        if (stats.isDirectory()) {
          const files = fs.readdirSync(fullPath)
          const directoryContents = files.slice(0, 30).map((f: string) => {
            const filePath = join(fullPath, f)
            try {
              const fileStats = fs.statSync(filePath)
              return fileStats.isDirectory() ? `${f}/` : f
            } catch {
              return f
            }
          })

          const fullPaths = directoryContents.map((f: string) => {
            const cleanPath = normalizedPath.endsWith('/') ? normalizedPath.slice(0, -1) : normalizedPath
            return f.endsWith('/') ? `${cleanPath}/${f.slice(0, -1)}/` : `${cleanPath}/${f}`
          })

          return {
            success: false,
            error: `Path is a directory, not a file: ${filePath}`,
            filePath: filePath,
            suggestion: `This is a directory. Available files:\n${directoryContents.map((f: string, idx: number) => `  ${idx + 1}. ${f} → Full path: ${fullPaths[idx]}`).join('\n')}\n\nUse the full path shown above to read a specific file.`,
            directoryContents: directoryContents.length > 0 ? directoryContents : undefined,
            availableFiles: directoryContents.length > 0 ? fullPaths : undefined
          }
        }
      } catch (statError: any) {
        // File doesn't exist
      }

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
          filePath: filePath,
          suggestion: "Check the file path and ensure it exists in the project. Use a directory path to list available files."
        }
      }

      // Read file
      const content = fs.readFileSync(fullPath, 'utf8')
      const lines = content.split('\n')
      const totalLines = lines.length

      // Truncate if needed
      let fileContent = content
      let truncated = false
      if (lines.length > maxLines) {
        fileContent = lines.slice(0, maxLines).join('\n')
        truncated = true
      }

      // Get file extension for context
      const ext = fullPath.split('.').pop()?.toLowerCase() || ''
      const fileType = ext === 'md' ? 'markdown' : 
                      ext === 'tsx' || ext === 'ts' ? 'typescript' :
                      ext === 'jsx' || ext === 'js' ? 'javascript' :
                      ext === 'sql' ? 'sql' :
                      ext === 'json' ? 'json' : 'text'

      console.log(`[Alex] 📖 Read file: ${filePath} (${totalLines} lines${truncated ? `, showing first ${maxLines}` : ''})`)

      return {
        success: true,
        filePath: filePath,
        fileType: fileType,
        totalLines: totalLines,
        linesRead: truncated ? maxLines : totalLines,
        truncated: truncated,
        content: fileContent,
        note: truncated ? `File truncated to first ${maxLines} lines. Use maxLines parameter to read more.` : undefined,
        data: {
          filePath,
          fileType,
          totalLines,
          linesRead: truncated ? maxLines : totalLines,
          truncated,
          content: fileContent
        }
      }
    } catch (error: any) {
      console.error(`[Alex] ❌ Error reading file ${filePath}:`, error.message)
      return {
        success: false,
        error: error.message || "Failed to read file",
        filePath: filePath
      }
    }
  }
}

