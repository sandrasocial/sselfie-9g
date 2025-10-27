import { neon } from "@neondatabase/serverless"

const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

async function analyzeProductionData() {
  console.log("[v0] Analyzing production database...\n")

  const tables = await prodDb`
    SELECT 
      schemaname,
      tablename,
      n_live_tup as row_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC
  `

  console.log(`[v0] Found ${tables.length} tables in production database:\n`)

  // Filter to show only the tables we care about
  const essentialTables = [
    "users",
    "user_profiles",
    "training_runs",
    "user_models",
    "lora_weights",
    "selfie_uploads",
    "generated_images",
    "maya_chats",
    "maya_chat_messages",
    "subscriptions",
    "user_personal_brand",
    "user_styleguides",
    "concept_cards",
    "photo_selections",
  ]

  console.log("[v0] Essential tables for migration:\n")

  for (const table of tables) {
    if (essentialTables.includes(table.tablename)) {
      const status = table.row_count > 0 ? "✓" : "○"
      console.log(`[v0] ${status} ${table.tablename}: ${table.row_count} rows`)
    }
  }

  console.log("\n[v0] Other tables with data:\n")

  for (const table of tables) {
    if (!essentialTables.includes(table.tablename) && table.row_count > 0) {
      console.log(`[v0]   ${table.tablename}: ${table.row_count} rows`)
    }
  }

  // Get total counts for essential tables
  const totalUsers = tables.find((t) => t.tablename === "users")?.row_count || 0
  const totalImages = tables.find((t) => t.tablename === "generated_images")?.row_count || 0
  const totalModels = tables.find((t) => t.tablename === "user_models")?.row_count || 0

  console.log("\n[v0] Migration Summary:")
  console.log(`[v0]   - ${totalUsers} users to migrate`)
  console.log(`[v0]   - ${totalModels} trained models to migrate`)
  console.log(`[v0]   - ${totalImages} generated images to migrate`)
  console.log("\n[v0] Analysis complete! Ready to run migration script.")
}

analyzeProductionData()
