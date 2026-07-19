import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import dotenv from "dotenv"
import { Client } from "pg"

dotenv.config({
  path: process.env.SSELFIE_ENV_FILE || resolve(process.cwd(), ".env.local"),
})

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const migration = await readFile(
      resolve(process.cwd(), "migrations/20260719_calendar_post_media.sql"),
      "utf8"
    )
    await client.query(migration)
    const result = await client.query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'feed_posts' AND column_name = 'media_urls'`
    )
    if (result.rows[0]?.data_type !== "jsonb") {
      throw new Error("feed_posts.media_urls was not created as jsonb")
    }
    console.log("Calendar post media migration verified")
  } finally {
    await client.end()
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
