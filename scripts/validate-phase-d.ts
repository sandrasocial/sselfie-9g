/**
 * Phase D Validation Script
 * Checks database tables, verifies configuration, and runs smoke tests
 */

// Load environment variables first
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

function loadEnvFile(filePath: string) {
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...valueParts] = trimmed.split("=")
        const value = valueParts.join("=").trim()
        const cleanValue = value.replace(/^["']|["']$/g, "")
        if (key) {
          process.env[key] = cleanValue
        }
      }
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"))
loadEnvFile(resolve(process.cwd(), ".env"))

import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set")
  console.error("Please set DATABASE_URL in .env.local or .env file")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

interface ValidationResult {
  name: string
  status: "PASS" | "FAIL" | "WARNING"
  message: string
}

async function validatePhaseD() {
  const results: ValidationResult[] = []

  console.log("=".repeat(80))
  console.log("PHASE D VALIDATION")
  console.log("=".repeat(80))
  console.log()

  // 1. Check Database Tables
  console.log("📊 Checking Database Tables...")
  
  try {
    const dailyDrops = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'daily_drops'
    `
    if (dailyDrops.length > 0) {
      results.push({ name: "daily_drops table", status: "PASS", message: "Table exists" })
      console.log("  ✅ daily_drops table: EXISTS")
    } else {
      results.push({ name: "daily_drops table", status: "FAIL", message: "Table missing - run create-daily-drops-table.sql" })
      console.log("  ❌ daily_drops table: MISSING")
    }
  } catch (error) {
    results.push({ name: "daily_drops table", status: "FAIL", message: `Error checking: ${error instanceof Error ? error.message : String(error)}` })
    console.log("  ❌ daily_drops table: ERROR")
  }

  try {
    const hooksLib = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'hooks_library'
    `
    if (hooksLib.length > 0) {
      results.push({ name: "hooks_library table", status: "PASS", message: "Table exists" })
      console.log("  ✅ hooks_library table: EXISTS")
      
      // Check if hooks are seeded
      const hookCount = await sql`SELECT COUNT(*) as count FROM hooks_library`
      const count = Number(hookCount[0]?.count || 0)
      if (count > 0) {
        results.push({ name: "hooks_library seeded", status: "PASS", message: `${count} hooks found` })
        console.log(`  ✅ hooks_library seeded: ${count} hooks`)
      } else {
        results.push({ name: "hooks_library seeded", status: "WARNING", message: "No hooks found - run seed-hooks-library.ts" })
        console.log("  ⚠️  hooks_library: No hooks found")
      }
    } else {
      results.push({ name: "hooks_library table", status: "FAIL", message: "Table missing - run create-hooks-library-table.sql" })
      console.log("  ❌ hooks_library table: MISSING")
    }
  } catch (error) {
    results.push({ name: "hooks_library table", status: "FAIL", message: `Error checking: ${error instanceof Error ? error.message : String(error)}` })
    console.log("  ❌ hooks_library table: ERROR")
  }

  try {
    const pipelineRuns = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'pipeline_runs'
    `
    if (pipelineRuns.length > 0) {
      results.push({ name: "pipeline_runs table", status: "PASS", message: "Table exists" })
      console.log("  ✅ pipeline_runs table: EXISTS")
    } else {
      results.push({ name: "pipeline_runs table", status: "WARNING", message: "Table missing - pipeline history won't be saved" })
      console.log("  ⚠️  pipeline_runs table: MISSING")
    }
  } catch (error) {
    results.push({ name: "pipeline_runs table", status: "WARNING", message: `Error checking: ${error instanceof Error ? error.message : String(error)}` })
    console.log("  ⚠️  pipeline_runs table: ERROR")
  }

  console.log()

  // 2. Check Vercel Cron Configuration
  console.log("⏰ Checking Vercel Cron Configuration...")
  try {
    const fs = await import("fs")
    const vercelJson = JSON.parse(fs.readFileSync("vercel.json", "utf-8"))
    const dailyVisibilityCron = vercelJson.crons?.find((c: any) => c.path === "/api/cron/daily-visibility")
    
    if (dailyVisibilityCron) {
      results.push({ 
        name: "Vercel cron config", 
        status: "PASS", 
        message: `Daily visibility cron configured: ${dailyVisibilityCron.schedule}` 
      })
      console.log(`  ✅ Daily visibility cron: ${dailyVisibilityCron.schedule}`)
    } else {
      results.push({ name: "Vercel cron config", status: "FAIL", message: "Daily visibility cron not found in vercel.json" })
      console.log("  ❌ Daily visibility cron: NOT FOUND")
    }
  } catch (error) {
    results.push({ name: "Vercel cron config", status: "WARNING", message: `Error reading vercel.json: ${error instanceof Error ? error.message : String(error)}` })
    console.log("  ⚠️  Vercel cron config: ERROR")
  }

  console.log()

  // 3. Check Pipeline Files
  console.log("🔧 Checking Pipeline Files...")
  const pipelineFiles = [
    "agents/pipelines/winback.ts",
    "agents/pipelines/upgrade.ts",
    "agents/pipelines/churn.ts",
    "agents/pipelines/lead-magnet.ts",
    "agents/pipelines/content-week.ts",
    "agents/pipelines/feed-optimizer.ts",
    "agents/pipelines/blueprint-followup.ts",
    "agents/pipelines/daily-visibility.ts",
    "agents/pipelines/revenue-recovery.ts",
  ]

  try {
    const fs = await import("fs")
    for (const file of pipelineFiles) {
      if (fs.existsSync(file)) {
        console.log(`  ✅ ${file}: EXISTS`)
      } else {
        results.push({ name: `Pipeline: ${file}`, status: "FAIL", message: "File missing" })
        console.log(`  ❌ ${file}: MISSING`)
      }
    }
  } catch (error) {
    console.log("  ⚠️  Error checking pipeline files")
  }

  console.log()

  // 4. Check API Endpoints
  console.log("🌐 Checking API Endpoints...")
  const apiEndpoints = [
    "app/api/cron/daily-visibility/route.ts",
    "app/api/automations/blueprint-followup/route.ts",
    "app/api/automations/revenue-recovery/route.ts",
    "app/api/admin/ai/daily-drops/route.ts",
    "app/api/admin/ai/hooks/route.ts",
  ]

  try {
    const fs = await import("fs")
    for (const endpoint of apiEndpoints) {
      if (fs.existsSync(endpoint)) {
        console.log(`  ✅ ${endpoint}: EXISTS`)
      } else {
        results.push({ name: `API: ${endpoint}`, status: "FAIL", message: "File missing" })
        console.log(`  ❌ ${endpoint}: MISSING`)
      }
    }
  } catch (error) {
    console.log("  ⚠️  Error checking API endpoints")
  }

  console.log()

  // 5. Check UI Components
  console.log("🎨 Checking UI Components...")
  const uiComponents = [
    "app/admin/ai/daily-drops/page.tsx",
    "components/admin/ai/daily-drops-client.tsx",
    "app/admin/ai/hooks/page.tsx",
    "components/admin/ai/hooks-library-client.tsx",
  ]

  try {
    const fs = await import("fs")
    for (const component of uiComponents) {
      if (fs.existsSync(component)) {
        console.log(`  ✅ ${component}: EXISTS`)
      } else {
        results.push({ name: `UI: ${component}`, status: "FAIL", message: "File missing" })
        console.log(`  ❌ ${component}: MISSING`)
      }
    }
  } catch (error) {
    console.log("  ⚠️  Error checking UI components")
  }

  console.log()

  // Summary
  console.log("=".repeat(80))
  console.log("VALIDATION SUMMARY")
  console.log("=".repeat(80))
  
  const passCount = results.filter((r) => r.status === "PASS").length
  const failCount = results.filter((r) => r.status === "FAIL").length
  const warnCount = results.filter((r) => r.status === "WARNING").length

  console.log(`✅ PASS: ${passCount}`)
  console.log(`❌ FAIL: ${failCount}`)
  console.log(`⚠️  WARNING: ${warnCount}`)
  console.log()

  if (failCount > 0) {
    console.log("FAILURES:")
    results.filter((r) => r.status === "FAIL").forEach((r) => {
      console.log(`  ❌ ${r.name}: ${r.message}`)
    })
    console.log()
  }

  if (warnCount > 0) {
    console.log("WARNINGS:")
    results.filter((r) => r.status === "WARNING").forEach((r) => {
      console.log(`  ⚠️  ${r.name}: ${r.message}`)
    })
    console.log()
  }

  return {
    pass: passCount,
    fail: failCount,
    warning: warnCount,
    results,
  }
}

if (require.main === module) {
  validatePhaseD()
    .then((summary) => {
      process.exit(summary.fail > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error("Fatal error:", error)
      process.exit(1)
    })
}

export { validatePhaseD }

