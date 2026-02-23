import { runAcademyMigration } from "@/lib/db/migrations/create-academy-tables"

async function run() {
  await runAcademyMigration()
  console.log("[academy-migration] ✅ Academy tables ready")
  process.exit(0)
}

run().catch((error: unknown) => {
  console.error("[academy-migration] Migration failed:", error)
  process.exitCode = 1
})
