import { main as runMigration77 } from "./run-migration-77"

async function main(): Promise<void> {
  if (process.env.VERCEL_ENV !== "production") {
    process.stdout.write("Skipping launch migrations outside Vercel production.\n")
    return
  }

  process.stdout.write("Applying verified launch migrations before production build...\n")
  await runMigration77([])
  process.stdout.write("Verified launch migrations are ready for production build.\n")
}

void main().catch(error => {
  process.stderr.write(
    `Production launch migration failed: ${error instanceof Error ? error.message : "unknown error"}\n`,
  )
  process.exitCode = 1
})
