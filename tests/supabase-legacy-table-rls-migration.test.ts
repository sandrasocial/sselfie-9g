import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const migration = fs.readFileSync(
  path.join(process.cwd(), "migrations/20260824_secure_legacy_supabase_tables.sql"),
  "utf8"
)
const [applySql, rollbackSql = ""] = migration.split("-- MANUAL ROLLBACK")

const tables = [
  "agents_chat_sessions",
  "maya_tasks",
  "agents_planner_library_items",
  "selfieschool_purchases",
  "webhook_events_needs_review",
]

describe("legacy Supabase table RLS migration", () => {
  it("applies the security change transactionally", () => {
    expect(applySql.trimStart()).toMatch(/^--[\s\S]*\nBEGIN;/)
    expect(applySql.trimEnd()).toMatch(/COMMIT;$/)
  })

  it("enables RLS on all five exposed public tables", () => {
    for (const table of tables) {
      expect(applySql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`)
    }
  })

  it("does not force RLS so service-role and owner maintenance retain their normal bypass", () => {
    expect(applySql).not.toMatch(/FORCE ROW LEVEL SECURITY/i)
    expect(applySql).not.toMatch(/TO service_role/i)
  })

  it("keeps internal and unverified-caller tables default-deny", () => {
    for (const table of [
      "agents_chat_sessions",
      "selfieschool_purchases",
      "webhook_events_needs_review",
    ]) {
      expect(applySql).not.toMatch(new RegExp(`CREATE POLICY[\\s\\S]*ON public\\.${table}`))
    }
  })

  it("creates member policies only for the two verified owner-scoped tables", () => {
    expect(applySql.match(/CREATE POLICY/g)).toHaveLength(2)
    expect(applySql).toContain("ON public.maya_tasks")
    expect(applySql).toContain("ON public.agents_planner_library_items")
  })

  it("never grants an anonymous or unrestricted public policy", () => {
    expect(applySql).not.toMatch(/TO\s+anon/i)
    expect(applySql).not.toMatch(/TO\s+public/i)
    expect(applySql).not.toMatch(/USING\s*\(\s*true\s*\)/i)
    expect(applySql).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i)
  })

  it("scopes Maya tasks through profile ownership", () => {
    expect(applySql).toContain("profile.id = maya_tasks.profile_id::uuid")
    expect(applySql).toContain("profile.supabase_user_id::text = (SELECT auth.uid())::text")
  })

  it("scopes planner items through profile ownership", () => {
    expect(applySql).toContain("profile.id = agents_planner_library_items.user_id::uuid")
  })

  it("protects both existing rows and new ownership on authenticated writes", () => {
    expect(applySql.match(/TO authenticated/g)).toHaveLength(2)
    expect(applySql.match(/USING \(/g)).toHaveLength(2)
    expect(applySql.match(/WITH CHECK \(/g)).toHaveLength(2)
  })

  it("contains no destructive data or table operation", () => {
    expect(applySql).not.toMatch(/\b(?:DELETE|TRUNCATE|DROP TABLE)\b/i)
  })

  it("documents a complete transactional rollback", () => {
    expect(rollbackSql).toContain("-- BEGIN;")
    expect(rollbackSql).toContain("-- DROP POLICY IF EXISTS maya_tasks_authenticated_owner")
    expect(rollbackSql).toContain(
      "-- DROP POLICY IF EXISTS agents_planner_library_items_authenticated_owner"
    )
    for (const table of tables) {
      expect(rollbackSql).toContain(`-- ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`)
    }
    expect(rollbackSql).toContain("-- COMMIT;")
  })
})
