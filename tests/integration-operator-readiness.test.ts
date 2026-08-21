// @vitest-environment node

import fs from "node:fs"
import { spawnSync } from "node:child_process"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
const mocks = vi.hoisted(() => ({ sql: vi.fn() as any }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

import {
  getIntegrationReadinessReport,
  serializeIntegrationReadinessReport,
} from "@/lib/integrations/integration-readiness-report"

const NOW = new Date("2026-08-21T12:00:00.000Z")

function row(overrides: Record<string, unknown> = {}) {
  return {
    state_id: "state_1",
    user_id: "user_opaque_1",
    provider: "skool",
    scope_key: "community",
    resource_type: "community_membership",
    resource_id: "sselfie_community",
    desired_state: "present",
    observed_state: "unknown",
    desired_revision: 2,
    observed_at: null,
    state_created_at: "2026-08-21T10:00:00.000Z",
    state_updated_at: "2026-08-21T11:00:00.000Z",
    current_work_count: 0,
    current_outbox_ids: [],
    latest_outbox_id: null,
    latest_outbox_status: null,
    latest_available_at: null,
    latest_created_at: null,
    latest_updated_at: null,
    latest_completed_at: null,
    ...overrides,
  }
}

describe("integration reconciliation readiness", () => {
  beforeEach(() => vi.clearAllMocks())

  it("requires an exact provider before SQL", async () => {
    await expect(getIntegrationReadinessReport("studio" as any, NOW)).rejects.toThrow(/provider/i)
    await expect(getIntegrationReadinessReport(undefined as any, NOW)).rejects.toThrow(/provider/i)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("reports an all-zero control plane as no evidence, never green", async () => {
    mocks.sql.mockResolvedValueOnce([])
    const report = await getIntegrationReadinessReport("skool", NOW)
    expect(report).toMatchObject({
      status: "ok",
      state: "no_evidence",
      provider: "skool",
      adapterEnablementAllowed: false,
      rows: [],
      summary: { no_evidence: 1, reconciled: 0 },
    })
  })

  it.each([
    [
      "awaiting_provider_confirmation",
      { observed_state: "pending", current_work_count: 1, latest_outbox_status: "succeeded" },
    ],
    ["delivery_in_progress", { current_work_count: 1, latest_outbox_status: "claimed" }],
    [
      "delivery_failed",
      { observed_state: "failed", current_work_count: 1, latest_outbox_status: "dead_letter" },
    ],
    ["missing_current_work", {}],
    ["ambiguous_current_work", { current_work_count: 2, latest_outbox_status: "pending" }],
    ["reconciled", { observed_state: "present" }],
  ])("classifies %s from current revision evidence", async (state, overrides) => {
    mocks.sql.mockResolvedValueOnce([row(overrides)])
    const report = await getIntegrationReadinessReport("skool", NOW)
    expect(report.rows[0].state).toBe(state)
    expect(report.rows[0]).toMatchObject({
      stateId: "state_1",
      userId: "user_opaque_1",
      resourceId: "sselfie_community",
    })
    expect(report.adapterEnablementAllowed).toBe(false)
  })

  it("bounds provider states before aggregating only current-revision work", async () => {
    mocks.sql.mockResolvedValueOnce([row()])
    await getIntegrationReadinessReport("studio_platform_partner", NOW)

    const sql = String(mocks.sql.mock.calls[0]?.[0])
    expect(sql).toMatch(/scoped_states[\s\S]*WHERE s\.provider =/)
    expect(sql).toMatch(/current_work[\s\S]*captured_desired_revision = s\.desired_revision/)
    expect(sql).toMatch(/current_work[\s\S]*o\.provider =/)
    expect(sql.indexOf("scoped_states")).toBeLessThan(sql.indexOf("current_work AS"))
    expect(sql.indexOf("current_work AS")).toBeLessThan(sql.indexOf("work_aggregate AS"))
    expect(mocks.sql).toHaveBeenCalledTimes(1)
    expect(mocks.sql.mock.calls[0]?.slice(1)).toEqual([
      "studio_platform_partner",
      "studio_platform_partner",
    ])
  })

  it("does not let stale succeeded work satisfy a newer desired revision", async () => {
    mocks.sql.mockResolvedValueOnce([row({ current_work_count: 0, latest_outbox_status: null })])
    const report = await getIntegrationReadinessReport("skool", NOW)
    expect(report.rows[0].state).toBe("missing_current_work")
    expect(String(mocks.sql.mock.calls[0]?.[0])).toContain(
      "o.captured_desired_revision = s.desired_revision"
    )
  })

  it("fails explicitly without leaking a database error", async () => {
    mocks.sql.mockRejectedValueOnce(new Error("connection includes secret"))
    const report = await getIntegrationReadinessReport("skool", NOW)
    expect(report).toMatchObject({
      status: "failure",
      state: "unavailable",
      error: "database_unavailable",
      rows: [],
      adapterEnablementAllowed: false,
    })
    expect(serializeIntegrationReadinessReport(report)).not.toContain("secret")
  })

  it("keeps the report and CLI SELECT-only, PII-free, and disconnected from effects", () => {
    const paths = [
      "lib/integrations/integration-readiness-report.ts",
      "scripts/report-integration-readiness.ts",
    ]
    const source = paths.map(file => fs.readFileSync(file, "utf8")).join("\n")
    expect(source).toContain("SELECT")
    expect(source).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i)
    expect(source).not.toMatch(
      /recordControlPlaneIntent|claimIntegrationWork|completeIntegrationWork|failIntegrationWork/
    )
    expect(source).not.toMatch(
      /@\/lib\/(?:stripe|email|supabase)|fetch\s*\(|axios|from ["']resend["']/i
    )
    expect(source).not.toMatch(
      /provider_reference|external_account_id|customer_email|\bemail\b|\bname\b/i
    )
    expect(source).not.toMatch(/business_key|destination_key|idempotency_key|last_error_message/i)
  })

  it("starts as an attended CLI and rejects missing or invalid providers before DB", () => {
    for (const args of [[], ["--provider=studio"]]) {
      const result = spawnSync(
        process.execPath,
        [
          "--conditions=react-server",
          "--import",
          "tsx",
          "scripts/report-integration-readiness.ts",
          ...args,
        ],
        { cwd: process.cwd(), encoding: "utf8" }
      )
      expect(result.status).toBe(1)
      expect(result.stderr).toMatch(/exact --provider/i)
      expect(result.stderr).not.toMatch(/DATABASE_URL|Client Component|secret/i)
    }
  })
})
