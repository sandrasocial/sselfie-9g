/**
 * Admin Wiring Verification Script
 * Verifies that admin endpoints reference real tables AND real columns
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"
import { readFileSync, globSync } from "fs"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

interface TableReference {
  table: string
  file: string
  line: number
  query: string
}

interface ColumnReference {
  table: string
  column: string
  file: string
  line: number
}

/**
 * Extract table references from SQL queries
 */
function extractTableReferences(content: string, filePath: string): TableReference[] {
  const references: TableReference[] = []
  const lines = content.split("\n")

  // Patterns to match table references
  const patterns = [
    /FROM\s+(admin_\w+|alex_\w+)/gi,
    /JOIN\s+(admin_\w+|alex_\w+)/gi,
    /INTO\s+(admin_\w+|alex_\w+)/gi,
    /UPDATE\s+(admin_\w+|alex_\w+)/gi,
    /DELETE\s+FROM\s+(admin_\w+|alex_\w+)/gi,
  ]

  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      const matches = line.matchAll(pattern)
      for (const match of matches) {
        const tableName = match[1]
        if (tableName) {
          references.push({
            table: tableName.toLowerCase(),
            file: filePath,
            line: index + 1,
            query: line.trim(),
          })
        }
      }
    })
  })

  return references
}

/**
 * Extract column references from SQL queries for a specific table
 */
function extractColumnReferences(
  content: string,
  filePath: string,
  tableName: string,
): ColumnReference[] {
  const references: ColumnReference[] = []
  const lines = content.split("\n")

  // Find lines that reference the table
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(tableName.toLowerCase())) {
      // Extract column names from SELECT, INSERT, UPDATE statements
      const selectMatch = line.match(/SELECT\s+(.+?)\s+FROM\s+.*?${tableName}/i)
      if (selectMatch) {
        const columns = selectMatch[1]
          .split(",")
          .map((col) => col.trim().split(/\s+/)[0].replace(/["'`]/g, ""))
        columns.forEach((col) => {
          if (col !== "*" && col && !col.includes("(")) {
            references.push({
              table: tableName.toLowerCase(),
              column: col.toLowerCase(),
              file: filePath,
              line: index + 1,
            })
          }
        })
      }

      // INSERT INTO table (col1, col2, ...)
      const insertMatch = line.match(/INSERT\s+INTO\s+.*?${tableName}.*?\((.+?)\)/i)
      if (insertMatch) {
        const columns = insertMatch[1]
          .split(",")
          .map((col) => col.trim().replace(/["'`]/g, ""))
        columns.forEach((col) => {
          if (col) {
            references.push({
              table: tableName.toLowerCase(),
              column: col.toLowerCase(),
              file: filePath,
              line: index + 1,
            })
          }
        })
      }

      // UPDATE table SET col1 = ...
      const updateMatch = line.match(/UPDATE\s+.*?${tableName}.*?SET\s+(.+?)(?:WHERE|$)/i)
      if (updateMatch) {
        const setClause = updateMatch[1]
        const assignments = setClause.split(",")
        assignments.forEach((assign) => {
          const colMatch = assign.match(/^\s*(\w+)\s*=/)
          if (colMatch) {
            references.push({
              table: tableName.toLowerCase(),
              column: colMatch[1].toLowerCase(),
              file: filePath,
              line: index + 1,
            })
          }
        })
      }
    }
  })

  return references
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set")
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  console.log("\n" + "=".repeat(70))
  console.log("ADMIN WIRING VERIFICATION")
  console.log("=".repeat(70) + "\n")

  // STEP 1: Discover table references
  console.log("[STEP 1] 🔍 Discovering table references in code...\n")

  const adminFiles = [
    ...globSync("app/api/admin/**/*.ts"),
    ...globSync("lib/alex/**/*.ts"),
  ]

  const tableReferences: TableReference[] = []
  const allReferencedTables = new Set<string>()

  for (const file of adminFiles) {
    try {
      const content = readFileSync(file, "utf-8")
      const refs = extractTableReferences(content, file)
      tableReferences.push(...refs)
      refs.forEach((ref) => allReferencedTables.add(ref.table))
    } catch (error) {
      // Skip files that can't be read
    }
  }

  console.log(`Found ${allReferencedTables.size} unique admin tables referenced:`)
  Array.from(allReferencedTables)
    .sort()
    .forEach((table) => console.log(`   - ${table}`))

  // STEP 2: Verify tables exist
  console.log("\n[STEP 2] ✅ Verifying tables exist in database...\n")

  const referencedTablesArray = Array.from(allReferencedTables)
  const existingTables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY(${referencedTablesArray})
    ORDER BY table_name
  `

  const existingTableNames = existingTables.map((row: any) => row.table_name.toLowerCase())
  const missingTables = referencedTablesArray.filter(
    (name) => !existingTableNames.includes(name.toLowerCase()),
  )

  console.log(`✅ Present tables (${existingTableNames.length}):`)
  existingTableNames.forEach((name) => console.log(`   - ${name}`))

  if (missingTables.length > 0) {
    console.log(`\n❌ Missing tables (${missingTables.length}):`)
    missingTables.forEach((name) => {
      console.log(`   - ${name}`)
      const refs = tableReferences.filter((r) => r.table === name.toLowerCase())
      console.log(`     Referenced in:`)
      refs.slice(0, 3).forEach((ref) => {
        console.log(`       ${ref.file}:${ref.line}`)
      })
      if (refs.length > 3) {
        console.log(`       ... and ${refs.length - 3} more`)
      }
    })
  } else {
    console.log("\n✅ All referenced tables exist!")
  }

  // STEP 3: Verify columns for each table
  console.log("\n[STEP 3] 🔍 Verifying columns for each table...\n")

  const columnIssues: Array<{
    table: string
    column: string
    file: string
    line: number
    issue: string
  }> = []

  for (const tableName of existingTableNames) {
    // Get actual columns from database
    const actualColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ORDER BY column_name
    `

    const actualColumnNames = actualColumns.map((row: any) => row.column_name.toLowerCase())

    // Find column references for this table
    const filesWithTable = tableReferences
      .filter((r) => r.table === tableName)
      .map((r) => r.file)
      .filter((v, i, a) => a.indexOf(v) === i) // unique

    const columnRefs: ColumnReference[] = []
    for (const file of filesWithTable) {
      try {
        const content = readFileSync(file, "utf-8")
        const refs = extractColumnReferences(content, file, tableName)
        columnRefs.push(...refs)
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Check for missing columns
    const referencedColumns = new Set(
      columnRefs.map((r) => r.column).filter((c) => c && c !== "*"),
    )

    const missingColumns = Array.from(referencedColumns).filter(
      (col) => !actualColumnNames.includes(col.toLowerCase()),
    )

    if (missingColumns.length > 0) {
      console.log(`⚠️  ${tableName}: Missing columns (${missingColumns.length})`)
      missingColumns.forEach((col) => {
        const refs = columnRefs.filter((r) => r.column === col)
        console.log(`   - ${col}`)
        refs.slice(0, 2).forEach((ref) => {
          console.log(`     Referenced in: ${ref.file}:${ref.line}`)
        })
        columnIssues.push({
          table: tableName,
          column: col,
          file: refs[0]?.file || "unknown",
          line: refs[0]?.line || 0,
          issue: "Column does not exist",
        })
      })
    } else if (referencedColumns.size > 0) {
      console.log(`✅ ${tableName}: All referenced columns exist`)
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70))
  console.log("VERIFICATION SUMMARY")
  console.log("=".repeat(70))
  console.log(`Tables referenced: ${allReferencedTables.size}`)
  console.log(`Tables present: ${existingTableNames.length}`)
  console.log(`Tables missing: ${missingTables.length}`)
  console.log(`Column issues: ${columnIssues.length}`)

  if (missingTables.length === 0 && columnIssues.length === 0) {
    console.log("\n✅ All admin wiring is correct!")
  } else {
    console.log("\n⚠️  Issues found - see details above")
  }

  console.log("=".repeat(70) + "\n")

  return {
    referencedTables: Array.from(allReferencedTables),
    existingTables: existingTableNames,
    missingTables,
    columnIssues,
  }
}

if (require.main === module) {
  main()
    .then((result) => {
      process.exit(result.missingTables.length > 0 || result.columnIssues.length > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error("❌ Error:", error)
      process.exit(1)
    })
}

export { main }

