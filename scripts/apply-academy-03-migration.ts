import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log("🔍 Checking ACADEMY-03 migration status…\n")

  // 1. Check if user_lesson_notes table exists
  const tableCheck = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_lesson_notes'
    ) AS exists
  `
  const tableExists = tableCheck[0]?.exists

  if (tableExists) {
    console.log("✅ user_lesson_notes table already exists")
  } else {
    console.log("⚠️  user_lesson_notes table does not exist — creating it…")
    await sql`
      CREATE TABLE IF NOT EXISTS user_lesson_notes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
        reflection TEXT,
        action_level TEXT CHECK (action_level IN ('bare_minimum', 'bold_move', 'bonus_vibe')),
        profile_answer TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, lesson_id)
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_user_lesson_notes_user ON user_lesson_notes(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_lesson_notes_lesson ON user_lesson_notes(lesson_id)`
    console.log("✅ Table + indexes created")
  }

  // 2. Check how many lessons have content seeded
  const seeded = await sql`
    SELECT COUNT(*) AS total, COUNT(content) AS with_content
    FROM academy_lessons
  `
  const total = Number(seeded[0]?.total ?? 0)
  const withContent = Number(seeded[0]?.with_content ?? 0)
  console.log(`\n📊 Lesson content: ${withContent}/${total} lessons have companion data`)

  if (withContent < total) {
    console.log(`\n⚠️  ${total - withContent} lessons missing content. Applying migration seeds…\n`)

    // Read and split the migration file into individual UPDATE statements
    const migrationPath = path.join(__dirname, "..", "migrations", "20260423_academy_course_library_notes.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    // Extract just the UPDATE statements (skip CREATE TABLE which we already handled)
    const updates = migrationSQL.match(/UPDATE academy_lessons[\s\S]+?\$json\$::jsonb WHERE id = \d+;/g) || []
    console.log(`Found ${updates.length} UPDATE statements to run`)

    let applied = 0
    for (const stmt of updates) {
      try {
        // We need to use the raw SQL approach since neon tagged template won't work with $json$ syntax
        // Extract the id from the statement
        const idMatch = stmt.match(/WHERE id = (\d+)/)
        const id = idMatch ? Number(idMatch[1]) : null
        if (!id) continue

        // Extract the JSON content between $json$ markers
        const jsonMatch = stmt.match(/\$json\$([\s\S]+?)\$json\$/)
        const jsonContent = jsonMatch ? jsonMatch[1].trim() : null
        if (!jsonContent) continue

        const parsed = JSON.parse(jsonContent)

        // Check if this lesson already has content
        const existing = await sql`SELECT content FROM academy_lessons WHERE id = ${id} AND content IS NOT NULL`
        if (existing.length > 0) {
          continue // already seeded
        }

        await sql`UPDATE academy_lessons SET content = ${JSON.stringify(parsed)}::jsonb WHERE id = ${id}`
        applied++
      } catch (err) {
        console.error(`  ❌ Failed for statement (id ${stmt.match(/WHERE id = (\d+)/)?.[1]}):`, err)
      }
    }

    console.log(`\n✅ Applied ${applied} content updates`)
  } else {
    console.log("✅ All lessons already have companion data seeded")
  }

  // 3. Show lesson content summary
  const lessons = await sql`
    SELECT id, lesson_number, title,
      content->>'profile_field' AS profile_field,
      jsonb_array_length(COALESCE(content->'key_takeaways', '[]'::jsonb)) AS takeaway_count
    FROM academy_lessons
    ORDER BY course_id, lesson_number
  `

  console.log("\n📋 Lesson companion data summary:")
  for (const lesson of lessons) {
    const profileTag = lesson.profile_field ? ` [→ ${lesson.profile_field}]` : ""
    console.log(`  ${String(lesson.id).padStart(3)} · L${String(lesson.lesson_number).padStart(2, "0")} · ${lesson.takeaway_count ?? 0} takeaways${profileTag} — ${lesson.title}`)
  }

  console.log("\n🏁 Done.")
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
