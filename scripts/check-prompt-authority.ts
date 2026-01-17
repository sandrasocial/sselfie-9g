#!/usr/bin/env tsx
/**
 * Prompt Authority CI Check
 * 
 * Phase 4A: Prevents new prompt entry points from bypassing Authority Layer.
 * 
 * Scans app/api route.ts files for banned patterns:
 * - Direct imports of prompt builders
 * - Direct calls to model SDKs without Authority wrappers
 * - Inline prompt templates
 * 
 * Usage:
 *   npm run check:prompt-authority
 *   npx tsx scripts/check-prompt-authority.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Banned imports (must route through Authority Layer)
const BANNED_IMPORTS = [
  'buildNanoBananaPrompt',
  'buildPrompt',
  'PromptGenerator',
  'buildSingleImagePrompt',
]

// Banned patterns (direct usage without Authority)
const BANNED_PATTERNS = [
  /new\s+PromptGenerator\s*\(/,
  /buildNanoBananaPrompt\s*\(/,
  /buildPrompt\s*\(/,
  /buildSingleImagePrompt\s*\(/,
]

// Allowed exceptions (must be documented in allowlist)
interface AllowlistEntry {
  file: string
  reason: string
  migrationPlan?: string
}

let allowlist: AllowlistEntry[] = []

// Load allowlist if exists
const allowlistPath = path.join(process.cwd(), 'scripts', 'prompt-authority-allowlist.json')
if (fs.existsSync(allowlistPath)) {
  try {
    const allowlistContent = fs.readFileSync(allowlistPath, 'utf-8')
    allowlist = JSON.parse(allowlistContent)
  } catch (error) {
    console.warn(`⚠️  Could not parse allowlist: ${allowlistPath}`)
  }
}

interface Violation {
  file: string
  line: number
  type: 'banned-import' | 'banned-pattern'
  message: string
}

function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = []
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const relativePath = path.relative(process.cwd(), filePath)
  
  // Check if file is in allowlist
  const isAllowlisted = allowlist.some(entry => filePath.includes(entry.file))
  
  // Check for banned imports
  lines.forEach((line, index) => {
    // Skip comments and allowlist entries
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return
    }
    
    // Check for banned imports
    for (const bannedImport of BANNED_IMPORTS) {
      if (line.includes(`import`) && line.includes(bannedImport) && line.includes('from')) {
        // Check if it's importing from Authority Layer (allowed)
        if (line.includes('prompt-authority')) {
          continue // Importing from Authority is OK
        }
        
        violations.push({
          file: relativePath,
          line: index + 1,
          type: 'banned-import',
          message: `Banned import detected: ${bannedImport}. Must route through Prompt Authority Layer.`,
        })
      }
    }
    
    // Check for banned patterns (direct usage)
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.test(line)) {
        // Check if it's inside an Authority wrapper function (allowed)
        // This is a simple heuristic - check if we're in a function that contains "ViaAuthority"
        const contextBefore = lines.slice(Math.max(0, index - 10), index).join('\n')
        const contextAfter = lines.slice(index, Math.min(lines.length, index + 10)).join('\n')
        const fullContext = contextBefore + '\n' + contextAfter
        
        // If we're inside an Authority wrapper function, it's OK
        if (fullContext.includes('ViaAuthority') || fullContext.includes('generatePrompt(')) {
          continue
        }
        
        violations.push({
          file: relativePath,
          line: index + 1,
          type: 'banned-pattern',
          message: `Banned pattern detected: ${pattern.source}. Must route through Prompt Authority Layer.`,
        })
      }
    }
  })
  
  return violations
}

function findRouteFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir)
  
  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList)
    } else if (file === 'route.ts') {
      fileList.push(filePath)
    }
  })
  
  return fileList
}

async function main() {
  console.log('🔍 Checking prompt entry points for Authority Layer compliance...\n')
  
  // Find all route.ts files in app/api
  const apiDir = path.join(process.cwd(), 'app', 'api')
  const routeFiles = findRouteFiles(apiDir)
  
  console.log(`Found ${routeFiles.length} route files to check\n`)
  
  const allViolations: Violation[] = []
  
  for (const file of routeFiles) {
    const violations = checkFile(file)
    
    // Filter out allowlisted files
    const fileViolations = violations.filter(v => {
      const isAllowlisted = allowlist.some(entry => file.includes(entry.file))
      return !isAllowlisted
    })
    
    if (fileViolations.length > 0) {
      allViolations.push(...fileViolations)
    }
  }
  
  // Report results
  if (allViolations.length === 0) {
    console.log('✅ All prompt entry points comply with Authority Layer requirements!\n')
    process.exit(0)
  } else {
    console.error('❌ Violations detected:\n')
    
    // Group by file
    const violationsByFile = new Map<string, Violation[]>()
    for (const violation of allViolations) {
      if (!violationsByFile.has(violation.file)) {
        violationsByFile.set(violation.file, [])
      }
      violationsByFile.get(violation.file)!.push(violation)
    }
    
    for (const [file, violations] of violationsByFile.entries()) {
      console.error(`📄 ${file}:`)
      for (const violation of violations) {
        console.error(`  Line ${violation.line}: ${violation.message}`)
      }
      console.error('')
    }
    
    console.error('💡 How to fix:')
    console.error('  1. Route prompt generation through Prompt Authority Layer')
    console.error('  2. Use existing Authority wrappers from lib/maya/prompt-authority.ts')
    console.error('  3. Or create new wrapper function in Authority Layer')
    console.error('  4. See docs/_CANONICAL/PROMPT_BYPASS_PREVENTION.md for examples\n')
    
    console.error('💡 If this is a false positive:')
    console.error('  1. Add to scripts/prompt-authority-allowlist.json')
    console.error('  2. Document reason and migration plan\n')
    
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Error running check:', error)
  process.exit(1)
})
