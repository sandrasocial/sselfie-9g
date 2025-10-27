const { neon } = await import("@neondatabase/serverless")

const prodConnectionString =
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

const prodDb = neon(prodConnectionString)

async function inspectSchema() {
  console.log("[v0] Inspecting production database schema...\n")

  const tables = [
    "users",
    "user_profiles",
    "user_models",
    "lora_weights",
    "training_runs",
    "generated_images",
    "maya_chats",
    "maya_chat_messages",
    "subscriptions",
  ]

  for (const table of tables) {
    try {
      console.log(`[v0] === ${table.toUpperCase()} ===`)

      // Get column information
      const columns = await prodDb`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = ${table}
        ORDER BY ordinal_position
      `

      console.log("[v0] Columns:")
      columns.forEach((col) => {
        console.log(
          `[v0]   - ${col.column_name}: ${col.data_type} ${col.is_nullable === "NO" ? "(required)" : "(optional)"}`,
        )
      })

      // Get sample row
      const sample = await prodDb`
        SELECT * FROM ${prodDb(table)}
        LIMIT 1
      `

      if (sample.length > 0) {
        console.log("[v0] Sample data:")
        console.log("[v0]  ", JSON.stringify(sample[0], null, 2))
      }

      console.log("\n")
    } catch (error) {
      console.log(`[v0] ✗ ${table}: ${error.message}\n`)
    }
  }
}

inspectSchema().catch(console.error)
