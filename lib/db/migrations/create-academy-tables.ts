import { sql } from "@/lib/neon"

export async function runAcademyMigration() {
  await sql`
    CREATE TABLE IF NOT EXISTS academy_course_purchases (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      purchased_at TIMESTAMP DEFAULT NOW(),
      stripe_session_id TEXT,
      UNIQUE(user_id, course_id)
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_academy_purchases_user ON academy_course_purchases(user_id)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS user_tags (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, tag)
    )
  `
}

// Run on import (for use in app bootstrap if needed)
export const academyTablesReady = runAcademyMigration().catch((error: unknown) => {
  console.error("[academy-migration] Failed to create academy tables:", error)
})
