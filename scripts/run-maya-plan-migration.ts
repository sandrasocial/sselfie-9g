import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "..", ".env.local") })

import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required")
const sql = neon(process.env.DATABASE_URL)

async function main() {
  console.log("[migrate] dropping + re-adding maya_chats_chat_type_check with maya_plan...")
  await sql`ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS maya_chats_chat_type_check`
  await sql`ALTER TABLE maya_chats DROP CONSTRAINT IF EXISTS chat_type_check`
  await sql`
    ALTER TABLE maya_chats
    ADD CONSTRAINT maya_chats_chat_type_check
    CHECK (chat_type IN ('maya', 'pro', 'videos', 'feed_planner', 'prompt_builder', 'pro-photoshoot', 'maya_plan'))
  `
  await sql`COMMENT ON COLUMN maya_chats.chat_type IS 'Maya chat surface: maya (Photos), pro (Studio Pro), videos, feed_planner, prompt_builder, pro-photoshoot, maya_plan (content Plan).'`

  const def = (await sql`
    SELECT pg_get_constraintdef(oid) AS definition
    FROM pg_constraint WHERE conname = 'maya_chats_chat_type_check'
  `) as any[]
  console.log("[migrate] new constraint:", def[0]?.definition)
  console.log(def[0]?.definition?.includes("maya_plan") ? "[migrate] ✅ maya_plan now allowed" : "[migrate] ❌ maya_plan NOT in constraint")
}

main().then(() => process.exit(0)).catch((e) => { console.error("[migrate] FAILED:", e.message || e); process.exit(1) })
