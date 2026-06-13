// @vitest-environment node
import { readFileSync } from "fs"
import path from "path"

import { describe, expect, it } from "vitest"

import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"

const ROOT = process.cwd()

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8")
}

function extractSqlAfterMarker(source: string, marker: string): string {
  const markerIndex = source.indexOf(marker)
  expect(markerIndex, `Missing marker: ${marker}`).toBeGreaterThanOrEqual(0)

  const sqlStart = source.indexOf("sql`", markerIndex)
  expect(sqlStart, `Missing SQL template after marker: ${marker}`).toBeGreaterThanOrEqual(0)

  const queryStart = sqlStart + "sql`".length
  const queryEnd = source.indexOf("`", queryStart)
  expect(queryEnd, `Missing SQL template close after marker: ${marker}`).toBeGreaterThanOrEqual(0)

  return source.slice(queryStart, queryEnd)
}

function expectProductionLiveModeGuard(query: string) {
  expect(query).toMatch(/COALESCE\((?:s\.)?is_test_mode, false\) = false/)
  expect(query).toContain("enforceLiveMode")
}

describe("ENTITLE-01 live-mode subscription gate guards", () => {
  it("enforces live subscription rows only in production", () => {
    expect(shouldEnforceLiveSubscriptionRows("production")).toBe(true)
    expect(shouldEnforceLiveSubscriptionRows("development")).toBe(false)
    expect(shouldEnforceLiveSubscriptionRows("test")).toBe(false)
  })

  it("protects every named access, credit, entitlement, and plan gate", () => {
    const targets = [
      {
        file: "lib/credits.ts",
        marker: "const subscriptionResult = await sql`",
      },
      {
        file: "lib/upgrade-detection.ts",
        marker: "const result =",
      },
      {
        file: "lib/academy-entitlements.ts",
        marker: "const fallbackRows = await sql`",
      },
      {
        file: "app/api/credits/grant-free-welcome/route.ts",
        marker: "const hasSubscription = await sql`",
      },
      {
        file: "app/api/app-v3/account/route.ts",
        marker: "sql`\n        SELECT plan, product_type, status, current_period_end",
      },
      {
        file: "app/api/cron/reconcile-credits/route.ts",
        marker: "return await sql`\n    WITH active_subs AS",
      },
      {
        file: "app/api/cron/reconcile-credits/route.ts",
        marker: "return await sql`\n    WITH active_members AS",
      },
      {
        file: "app/checkout/blueprint/page.tsx",
        marker: "const existing = await sql`",
      },
      {
        file: "app/auth/callback/route.ts",
        marker: "const hasSubscription = await sql`",
      },
      {
        file: "app/studio/page.tsx",
        marker: "const hasSubscription = await sql`",
      },
      {
        file: "app/brand-strategy/setup/[token]/page.tsx",
        marker: "const rows = await sql`",
      },
      {
        file: "app/api/brand-strategy/setup-token/route.ts",
        marker: "const rows = await sql`",
      },
      {
        file: "app/api/brand-strategy/generate/route.ts",
        marker: "const rows = await sql`",
      },
      {
        file: "app/selfie-guide/access/[token]/page.tsx",
        marker: "async function emailHasBrandStrategyAccess",
      },
      {
        file: "app/api/stripe/apply-retention-discount/route.ts",
        marker: "const rows = await sql`",
      },
      {
        file: "app/api/subscription/upgrade/route.ts",
        marker: "const activeSub =",
      },
      {
        file: "app/api/cron/suite-habit-emails/route.ts",
        marker: "async function memberJoinedWithin",
      },
    ]

    for (const target of targets) {
      const source = readSource(target.file)
      const query = extractSqlAfterMarker(source, target.marker)
      expectProductionLiveModeGuard(query)
    }
  })
})
