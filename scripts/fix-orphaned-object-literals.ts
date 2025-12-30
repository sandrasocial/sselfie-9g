/**
 * Safe Script to Find and Fix Orphaned Object Literals
 * These are leftover from console.log cleanup - they're object literals not assigned to anything
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'

interface Issue {
  file: string
  line: number
  content: string
}

function findOrphanedObjectLiterals(filePath: string): Issue[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const issues: Issue[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Pattern: Line starts with a property name (like "id:", "name:", etc.) 
    // and previous line doesn't end with assignment or function call
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*:/.test(line)) {
      // Check if previous non-empty line ends with assignment or function call
      let prevNonEmpty = i - 1
      while (prevNonEmpty >= 0 && lines[prevNonEmpty].trim() === '') {
        prevNonEmpty--
      }
      
      if (prevNonEmpty >= 0) {
        const prevLine = lines[prevNonEmpty].trim()
        // If previous line doesn't end with =, (, {, or }, it's likely orphaned
        if (!prevLine.match(/[=({]$/) && !prevLine.match(/console\.(log|warn|error|info)\s*\($/)) {
          // Check if this is part of an object literal that's not assigned
          // Look ahead to find the closing brace
          let braceCount = 0
          let foundOpening = false
          let j = i
          
          // Look backwards for opening brace or assignment
          for (let k = i - 1; k >= 0 && k >= i - 10; k--) {
            const checkLine = lines[k].trim()
            if (checkLine.includes('{') && !checkLine.includes('}')) {
              foundOpening = true
              break
            }
            if (checkLine.match(/[=({]\s*$/)) {
              // This is assigned, not orphaned
              break
            }
          }
          
          // If we found an opening brace, check if it's assigned
          if (foundOpening) {
            // Look further back for assignment
            let hasAssignment = false
            for (let k = i - 1; k >= 0 && k >= i - 20; k--) {
              const checkLine = lines[k].trim()
              if (checkLine.match(/=\s*[{\(]$/) || checkLine.match(/console\.(log|warn|error|info)\s*\($/)) {
                hasAssignment = true
                break
              }
            }
            
            if (!hasAssignment) {
              issues.push({
                file: filePath,
                line: i + 1,
                content: line
              })
            }
          }
        }
      }
    }
  }
  
  return issues
}

function fixOrphanedObjectLiteral(filePath: string, lineNumber: number): boolean {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  // Find the object literal block
  let startLine = lineNumber - 1
  let endLine = lineNumber - 1
  
  // Look backwards for opening brace
  while (startLine > 0 && !lines[startLine].includes('{')) {
    startLine--
  }
  
  // Look forwards for closing brace
  let braceCount = 0
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i]
    braceCount += (line.match(/{/g) || []).length
    braceCount -= (line.match(/}/g) || []).length
    
    if (braceCount === 0 && i >= lineNumber - 1) {
      endLine = i
      break
    }
  }
  
  // Check if this is really orphaned (not part of a function call or assignment)
  const beforeStart = lines[startLine - 1]?.trim() || ''
  if (beforeStart.match(/[=({]\s*$/) || beforeStart.match(/console\.(log|warn|error|info)\s*\($/)) {
    return false // It's assigned, not orphaned
  }
  
  // Remove the orphaned object literal
  const newLines = [
    ...lines.slice(0, startLine),
    ...lines.slice(endLine + 1)
  ]
  
  // Create backup
  if (!existsSync(`${filePath}.backup-orphaned-fix`)) {
    writeFileSync(`${filePath}.backup-orphaned-fix`, content, 'utf-8')
  }
  
  writeFileSync(filePath, newLines.join('\n'), 'utf-8')
  return true
}

async function main() {
  console.log('🔍 Finding orphaned object literals...\n')
  
  // Find all TypeScript files
  const files = execSync('find app lib components -type f \\( -name "*.ts" -o -name "*.tsx" \\) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -name "*.backup*"', {
    encoding: 'utf-8',
    cwd: process.cwd()
  }).split('\n').filter(Boolean)
  
  const allIssues: Issue[] = []
  
  for (const file of files) {
    try {
      const issues = findOrphanedObjectLiterals(file)
      if (issues.length > 0) {
        allIssues.push(...issues)
        console.log(`⚠️  ${file}: ${issues.length} potential orphaned object literal(s)`)
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  console.log(`\n📊 Found ${allIssues.length} potential orphaned object literals`)
  console.log('\n⚠️  REVIEW REQUIRED: These need manual verification before removal')
  console.log('\nFirst 10 issues:')
  allIssues.slice(0, 10).forEach(issue => {
    console.log(`  ${issue.file}:${issue.line} - ${issue.content.substring(0, 50)}...`)
  })
  
  if (allIssues.length > 10) {
    console.log(`\n... and ${allIssues.length - 10} more`)
  }
  
  console.log('\n💡 Recommendation: Fix these manually to ensure we don\'t remove valid code')
}

main().catch(console.error)

