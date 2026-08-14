import { sql } from "@/lib/db/client"

export async function ensureWorkWithMeClientProjectSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS work_with_me_client_projects (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      application_id INTEGER,
      status TEXT NOT NULL DEFAULT 'paid',
      business_name TEXT,
      business_summary TEXT,
      ideal_customer TEXT,
      current_offer TEXT,
      marketing_burden TEXT,
      ai_attempts TEXT,
      weekly_output TEXT,
      voice_examples TEXT,
      visual_direction TEXT,
      business_links TEXT,
      intake_completed_at TIMESTAMP,
      business_brain_ready_at TIMESTAMP,
      ai_team_ready_at TIMESTAMP,
      first_week_completed_at TIMESTAMP,
      handoff_completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `
}

export async function upsertPaidWorkWithMeProject({
  userId,
  applicationId,
}: {
  userId: string
  applicationId?: number | null
}) {
  await ensureWorkWithMeClientProjectSchema()
  const rows = await sql`
    INSERT INTO work_with_me_client_projects (user_id, application_id, status, created_at, updated_at)
    VALUES (${userId}, ${applicationId || null}, 'paid', NOW(), NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      application_id = COALESCE(work_with_me_client_projects.application_id, EXCLUDED.application_id),
      status = CASE
        WHEN work_with_me_client_projects.status = 'complete' THEN 'complete'
        ELSE 'paid'
      END,
      updated_at = NOW()
    RETURNING *
  `
  return rows[0] || null
}

export async function getWorkWithMeProject(userId: string) {
  await ensureWorkWithMeClientProjectSchema()
  const rows = await sql`
    SELECT *
    FROM work_with_me_client_projects
    WHERE user_id = ${userId}
    LIMIT 1
  `
  return rows[0] || null
}

export async function hasWorkWithMeAccess(userId: string) {
  await ensureWorkWithMeClientProjectSchema()
  const rows = await sql`
    SELECT 1 AS allowed
    FROM work_with_me_client_projects
    WHERE user_id = ${userId}
    UNION ALL
    SELECT 1 AS allowed
    FROM user_entitlements
    WHERE user_id = ${userId}
      AND product_id = 'work_with_me'
      AND status = 'active'
      AND valid_from <= NOW()
      AND (valid_until IS NULL OR valid_until > NOW())
    LIMIT 1
  `
  return rows.length > 0
}
