#!/usr/bin/env tsx
/**
 * Column Name Validation Script
 * 
 * Scans codebase for SQL queries and validates column names against actual schema.
 * Reports incorrect column usage that could cause runtime errors.
 * 
 * Usage:
 *   npm run validate-columns
 *   or
 *   tsx scripts/validate-column-names.ts
 */

import { readFileSync, readdirSync, statSync } from "fs"
import { join, extname } from "path"

interface ValidationIssue {
  file: string
  line: number
  column: number
  incorrectColumn: string
  correctColumn: string
  context: string
}

// Common incorrect column mappings
const COLUMN_MAPPINGS: Record<string, string> = {
  // Users table
  "u.first_name": "u.display_name",
  "u.last_name": "u.display_name", // Note: last_name doesn't exist, use display_name
  "u.last_activity_at": "u.last_login_at",
  "users.first_name": "users.display_name",
  "users.last_name": "users.display_name",
  "users.last_activity_at": "users.last_login_at",
  // Without table prefix (more risky, but worth checking)
  "first_name": "display_name",
  "last_activity_at": "last_login_at",
}

// Patterns to check (regex)
const COLUMN_PATTERNS = [
  {
    pattern: /\bu\.first_name\b/g,
    incorrect: "u.first_name",
    correct: "u.display_name",
    description: "Users table first_name column",
  },
  {
    pattern: /\bu\.last_name\b/g,
    incorrect: "u.last_name",
    correct: "u.display_name",
    description: "Users table last_name column (doesn't exist)",
  },
  {
    pattern: /\bu\.last_activity_at\b/g,
    incorrect: "u.last_activity_at",
    correct: "u.last_login_at",
    description: "Users table last_activity_at column",
  },
  {
    pattern: /\busers\.first_name\b/g,
    incorrect: "users.first_name",
    correct: "users.display_name",
    description: "Users table first_name column",
  },
  {
    pattern: /\busers\.last_activity_at\b/g,
    incorrect: "users.last_activity_at",
    correct: "users.last_login_at",
    description: "Users table last_activity_at column",
  },
]

// Files/directories to ignore
const IGNORE_PATTERNS = [
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".vercel",
  "scripts/validate-column-names.ts", // Don't check this file itself
  ".backup",
  ".backup-",
]

// File extensions to check
const VALID_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".sql"]

function shouldIgnoreFile(filePath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => filePath.includes(pattern))
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir)

  for (const file of files) {
    const filePath = join(dir, file)
    
    if (shouldIgnoreFile(filePath)) {
      continue
    }

    const stat = statSync(filePath)

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList)
    } else if (stat.isFile()) {
      const ext = extname(filePath)
      if (VALID_EXTENSIONS.includes(ext)) {
        fileList.push(filePath)
      }
    }
  }

  return fileList
}

function findSQLQueries(content: string): Array<{ start: number; end: number; query: string }> {
  const queries: Array<{ start: number; end: number; query: string }> = []
  
  // Match sql`...` template literals
  const sqlTemplateRegex = /sql`([^`]*)`/gs
  let match
  
  while ((match = sqlTemplateRegex.exec(content)) !== null) {
    queries.push({
      start: match.index,
      end: match.index + match[0].length,
      query: match[1],
    })
  }
  
  // Also match await sql`...` and const ... = sql`...`
  const sqlAwaitRegex = /(?:await\s+|const\s+\w+\s*=\s*)?sql`([^`]*)`/gs
  while ((match = sqlAwaitRegex.exec(content)) !== null) {
    // Avoid duplicates
    const existing = queries.find(
      (q) => q.start === match.index && q.end === match.index + match[0].length
    )
    if (!existing) {
      queries.push({
        start: match.index,
        end: match.index + match[0].length,
        query: match[1],
      })
    }
  }
  
  return queries
}

function getLineNumber(content: string, position: number): number {
  return content.substring(0, position).split("\n").length
}

function getColumnNumber(content: string, position: number): number {
  const lines = content.substring(0, position).split("\n")
  const lastLine = lines[lines.length - 1]
  return lastLine.length + 1
}

function validateFile(filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  
  try {
    const content = readFileSync(filePath, "utf-8")
    const queries = findSQLQueries(content)
    
    for (const { start, query } of queries) {
      for (const { pattern, incorrect, correct, description } of COLUMN_PATTERNS) {
        let match
        pattern.lastIndex = 0 // Reset regex
        
        while ((match = pattern.exec(query)) !== null) {
          // Get context (50 chars before and after)
          const contextStart = Math.max(0, match.index - 50)
          const contextEnd = Math.min(query.length, match.index + match[0].length + 50)
          const context = query.substring(contextStart, contextEnd).replace(/\n/g, " ")
          
          // Calculate absolute position in file
          const absolutePosition = start + match.index
          const line = getLineNumber(content, absolutePosition)
          const column = getColumnNumber(content, absolutePosition)
          
          issues.push({
            file: filePath,
            line,
            column,
            incorrectColumn: incorrect,
            correctColumn: correct,
            context: `...${context}...`,
          })
        }
      }
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
  }
  
  return issues
}

function main() {
  console.log("🔍 Validating column names in SQL queries...\n")
  
  const rootDir = process.cwd()
  const files = getAllFiles(rootDir)
  
  console.log(`📁 Found ${files.length} files to check\n`)
  
  const allIssues: ValidationIssue[] = []
  
  for (const file of files) {
    const issues = validateFile(file)
    allIssues.push(...issues)
  }
  
  // Group issues by file
  const issuesByFile = new Map<string, ValidationIssue[]>()
  for (const issue of allIssues) {
    if (!issuesByFile.has(issue.file)) {
      issuesByFile.set(issue.file, [])
    }
    issuesByFile.get(issue.file)!.push(issue)
  }
  
  // Report results
  if (allIssues.length === 0) {
    console.log("✅ No column name issues found!\n")
    process.exit(0)
  }
  
  console.log(`❌ Found ${allIssues.length} column name issue(s) in ${issuesByFile.size} file(s):\n`)
  
  for (const [file, issues] of issuesByFile.entries()) {
    const relativePath = file.replace(rootDir + "/", "")
    console.log(`📄 ${relativePath}`)
    
    for (const issue of issues) {
      console.log(`   Line ${issue.line}, Column ${issue.column}:`)
      console.log(`   ❌ Found: ${issue.incorrectColumn}`)
      console.log(`   ✅ Should be: ${issue.correctColumn}`)
      console.log(`   Context: ${issue.context}`)
      console.log("")
    }
  }
  
  console.log("\n💡 Fix suggestions:")
  console.log("   - Replace u.first_name with u.display_name as first_name")
  console.log("   - Replace u.last_activity_at with u.last_login_at")
  console.log("   - Replace u.last_name with u.display_name (last_name doesn't exist)\n")
  
  process.exit(1)
}

main()
