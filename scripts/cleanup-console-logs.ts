/**
 * Safe Console.log Cleanup Script
 * Removes console.log statements but preserves console.error and console.warn
 * Creates backups before making changes
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

interface FileStats {
  file: string
  removed: number
  kept: number
}

const stats: FileStats[] = []
const filesToProcess: string[] = []

// Find all TypeScript/JavaScript files in app and components
function findFiles(dir: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  const files: string[] = []
  try {
    const entries = execSync(`find ${dir} -type f ${extensions.map(ext => `-name "*${ext}"`).join(' -o ')}`, {
      encoding: 'utf-8',
      cwd: process.cwd()
    }).split('\n').filter(Boolean)
    
    return entries.filter(file => 
      !file.includes('node_modules') &&
      !file.includes('.next') &&
      !file.includes('backup') &&
      !file.includes('.backup')
    )
  } catch (error) {
    return []
  }
}

function createBackup(filePath: string): void {
  const backupPath = `${filePath}.backup-${Date.now()}`
  if (!existsSync(backupPath)) {
    const content = readFileSync(filePath, 'utf-8')
    writeFileSync(backupPath, content, 'utf-8')
  }
}

function cleanConsoleLogs(filePath: string): FileStats {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  let removed = 0
  let kept = 0
  const newLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Skip console.error and console.warn
    if (trimmed.startsWith('console.error') || trimmed.startsWith('console.warn')) {
      newLines.push(line)
      kept++
      continue
    }
    
    // Remove console.log statements
    if (trimmed.startsWith('console.log')) {
      // Check if it's a multi-line statement
      let isMultiLine = false
      let openParens = 0
      let j = i
      
      while (j < lines.length) {
        const currentLine = lines[j]
        for (const char of currentLine) {
          if (char === '(') openParens++
          if (char === ')') openParens--
        }
        if (openParens === 0 && currentLine.includes('console.log')) {
          isMultiLine = j > i
          break
        }
        j++
      }
      
      // Skip the entire console.log statement
      if (isMultiLine) {
        i = j
        removed++
        continue
      } else {
        // Single line console.log - remove it
        removed++
        continue
      }
    }
    
    newLines.push(line)
  }
  
  if (removed > 0) {
    createBackup(filePath)
    writeFileSync(filePath, newLines.join('\n'), 'utf-8')
  }
  
  return {
    file: filePath,
    removed,
    kept
  }
}

async function main() {
  console.log('🧹 Starting Console.log Cleanup...\n')
  
  // Find files in app and components directories
  const appFiles = findFiles('app')
  const componentFiles = findFiles('components')
  const libFiles = findFiles('lib')
  
  const allFiles = [...appFiles, ...componentFiles, ...libFiles]
  
  console.log(`Found ${allFiles.length} files to process\n`)
  
  let totalRemoved = 0
  let totalKept = 0
  let filesModified = 0
  
  for (const file of allFiles) {
    try {
      const result = cleanConsoleLogs(file)
      if (result.removed > 0) {
        stats.push(result)
        totalRemoved += result.removed
        totalKept += result.kept
        filesModified++
        console.log(`✅ ${file}: Removed ${result.removed} console.log(s)`)
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${file}: ${error.message}`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 CLEANUP SUMMARY')
  console.log('='.repeat(60))
  console.log(`\n✅ Files modified: ${filesModified}`)
  console.log(`🗑️  Console.logs removed: ${totalRemoved}`)
  console.log(`✅ Console.error/warn kept: ${totalKept}`)
  console.log(`\n💾 Backups created: ${filesModified} files`)
  console.log('\n✅ Cleanup complete!')
}

main().catch(console.error)

