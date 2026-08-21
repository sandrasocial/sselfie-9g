// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: Object.assign(vi.fn(), { query: vi.fn(), transaction: vi.fn() }) as any,
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))

import {
  deriveSuitePilotDecisionArtifactDigest,
  recordSuitePilotAuthorizationEvent,
  recordSuitePilotPreflightSnapshot,
} from "@/lib/integrations/suite-pilot-authorization"
import {
  getSuitePilotAuthorizationReport,
  serializeSuitePilotAuthorizationReport,
} from "@/lib/integrations/suite-pilot-authorization-report"
import type { SuiteFounderPreflightReport } from "@/lib/integrations/suite-founder-preflight"
import {
  applyMigration74,
  parseMigration74Statements,
  runMigration74,
} from "@/scripts/run-migration-74"

const root = process.cwd()
const HASH = `sha256:${"a".repeat(64)}`
const HASH_B = `sha256:${"b".repeat(64)}`
const HASH_C = `sha256:${"c".repeat(64)}`
const report = {
  version: 1,
  state: "ready_for_sandra_approval",
  pilotMode: "founder_only",
  observedAt: "2026-08-21T12:00:00.000Z",
  completedAt: "2026-08-21T12:00:01.000Z",
  validUntil: "2026-08-21T12:05:00.000Z",
  provider: "skool",
  resourceId: "community_sselfie",
  founderUserId: "founder_opaque_1",
  approvalState: "not_requested",
  proposal: null,
  externalEffectsAllowed: false,
  adapterEnablementAllowed: false,
  dispatchAllowed: false,
  passwordState: "recovery_required",
  blockers: [],
  baselines: { walletCredits: 0 } as any,
  academyAccessSummary: { accessibleProductCount: 0 } as any,
  approvalSummary: {
    artifactDigests: {
      providerIdentity: HASH,
      providerTerms: HASH,
      providerPrivacy: HASH,
      providerRemoval: HASH,
      consent: HASH,
      providerCapability: HASH,
    },
    dataCategories: ["email_address"],
    consent: {
      capturedAt: "2026-08-21T11:00:00.000Z",
      checkAt: "2026-08-21T12:00:00.000Z",
      expiresAt: "2026-08-22T11:00:00.000Z",
      withdrawnAt: null,
    },
    providerCapability: {
      artifactDigest: HASH,
      verifiedAt: "2026-08-21T11:00:00.000Z",
      expiresAt: "2026-08-22T11:00:00.000Z",
      identityMethod: "manual_verified_email_match",
      deliveryMethod: "manual_invite",
      inviteSupported: true,
      observedStatusMethod: "manual_provider_dashboard",
      pendingInviteRevokeSupported: true,
      activeMemberRemovalSupported: true,
      replayPolicy: "manual_single_attempt",
      statusReadSupported: true,
      absenceConfirmationSupported: true,
      credentialMode: "attended_provider_session",
      rateLimitPolicy: "single_manual_action",
      killSwitch: "no_dispatch_without_new_approval",
    },
    rollback: { owner: "sandra", method: "manual_provider_removal", slaHours: 24 },
  },
  evidenceDigest: HASH,
} satisfies SuiteFounderPreflightReport

function tag(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce(
    (result, part, index) => result + part + (index < values.length ? `$${index + 1}` : ""),
    ""
  )
}

describe("suite pilot authorization ledger", () => {
  beforeEach(() => vi.clearAllMocks())

  it("records a validated 3C3 snapshot under a resource lock without enabling effects", async () => {
    let statements: string[] = []
    mocks.sql.transaction.mockImplementation(async (builder: (tx: typeof tag) => string[]) => {
      statements = builder(tag)
      return [
        [],
        [{ snapshot_id: "snapshot-uuid", inserted: true, approval_deadline: report.validUntil }],
      ]
    })
    const result = await recordSuitePilotPreflightSnapshot({ snapshotKey: "preflight.one", report })
    expect(result).toEqual({
      snapshotId: "snapshot-uuid",
      inserted: true,
      approvalDeadline: report.validUntil,
    })
    expect(statements).toHaveLength(2)
    expect(statements[0]).toContain("pg_advisory_xact_lock")
    expect(statements[1]).toContain("suite_pilot_preflight_snapshots")
    expect(statements[1]).not.toMatch(
      /integration_outbox|business_events|external_provisioning_states/
    )
  })

  it("domain-separates decision bindings and rejects raw caller values as bindings", () => {
    const consent = deriveSuitePilotDecisionArtifactDigest({
      reportDigest: HASH,
      decisionEvidenceDigest: HASH,
      decision: "consent_confirmed",
      actorUserId: "founder_opaque_1",
    })
    const approval = deriveSuitePilotDecisionArtifactDigest({
      reportDigest: HASH,
      decisionEvidenceDigest: HASH,
      decision: "founder_approved",
      actorUserId: "founder_opaque_1",
    })
    expect(consent).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(approval).not.toBe(consent)
    expect(() =>
      deriveSuitePilotDecisionArtifactDigest({
        reportDigest: "raw-caller-hash",
        decisionEvidenceDigest: HASH_B,
        decision: "consent_confirmed",
        actorUserId: "founder_opaque_1",
      })
    ).toThrow(/report digest/i)
  })

  it("requires consent before a separate founder approval and exact revocation target", async () => {
    const rows = [
      { event_id: "consent-uuid", inserted: true, revision: 1 },
      { event_id: "approval-uuid", inserted: true, revision: 2 },
      { event_id: "revoke-uuid", inserted: true, revision: 3 },
    ]
    mocks.sql.transaction.mockImplementation(async (builder: (tx: typeof tag) => string[]) => {
      const statements = builder(tag)
      expect(statements[0]).toContain("pg_advisory_xact_lock")
      expect(statements[1]).not.toMatch(
        /integration_outbox|business_events|external_provisioning_states/
      )
      return [[], [rows.shift()]]
    })
    await expect(
      recordSuitePilotAuthorizationEvent({
        snapshotId: "snapshot_1",
        eventKey: "consent_1",
        decision: "consent_confirmed",
        reportDigest: HASH,
        decisionEvidenceDigest: HASH,
        actorUserId: "founder_opaque_1",
        expectedRevision: 0,
      })
    ).resolves.toMatchObject({ revision: 1, state: "consent_confirmed", dispatchAllowed: false })
    await expect(
      recordSuitePilotAuthorizationEvent({
        snapshotId: "snapshot_1",
        eventKey: "approval_1",
        decision: "founder_approved",
        reportDigest: HASH,
        decisionEvidenceDigest: HASH_B,
        actorUserId: "founder_opaque_1",
        expectedRevision: 1,
      })
    ).resolves.toMatchObject({ revision: 2, state: "authorized_non_dispatchable" })
    const approvalSql = mocks.sql.transaction.mock.calls[1][0](tag)[1]
    expect(approvalSql).toContain("l.decision_evidence_digest <>")
    await expect(
      recordSuitePilotAuthorizationEvent({
        snapshotId: "snapshot_1",
        eventKey: "revoke_1",
        decision: "founder_revoked",
        reportDigest: HASH,
        decisionEvidenceDigest: HASH_C,
        actorUserId: "founder_opaque_1",
        expectedRevision: 2,
        targetEventId: "approval-uuid",
        reasonCode: "founder_cancelled",
      })
    ).resolves.toMatchObject({ revision: 3, state: "revoked_non_dispatchable" })
  })

  it("allows consent withdrawal before founder approval and requires a new snapshot afterward", async () => {
    mocks.sql.transaction.mockResolvedValue([
      [],
      [{ event_id: "withdrawal-uuid", inserted: true, revision: 2 }],
    ])
    await expect(
      recordSuitePilotAuthorizationEvent({
        snapshotId: "snapshot_1",
        eventKey: "withdrawal_1",
        decision: "consent_withdrawn",
        reportDigest: HASH,
        decisionEvidenceDigest: HASH,
        actorUserId: "founder_opaque_1",
        expectedRevision: 1,
        targetEventId: "consent-uuid",
        reasonCode: "consent_withdrawn",
      })
    ).resolves.toMatchObject({ revision: 2, state: "revoked_non_dispatchable" })
    const statements = mocks.sql.transaction.mock.calls[0][0](tag)
    expect(statements[1]).toContain("l.decision = 'founder_approved'")
    expect(statements[1]).toContain("l.prior_event_id")
    expect(statements[1]).toContain("ON CONFLICT DO NOTHING")
    expect(statements[1]).not.toContain("DO UPDATE")
  })

  it("allows participant withdrawal to supersede a derived founder revocation", async () => {
    mocks.sql.transaction.mockResolvedValue([
      [],
      [{ event_id: "withdrawal-final-uuid", inserted: true, revision: 4 }],
    ])
    await expect(
      recordSuitePilotAuthorizationEvent({
        snapshotId: "snapshot_1",
        eventKey: "withdrawal_final_1",
        decision: "consent_withdrawn",
        reportDigest: HASH,
        decisionEvidenceDigest: HASH_C,
        actorUserId: "founder_opaque_1",
        expectedRevision: 2,
        targetEventId: "consent-uuid",
        reasonCode: "consent_withdrawn",
      })
    ).resolves.toMatchObject({ revision: 4, state: "revoked_non_dispatchable" })
    const statements = mocks.sql.transaction.mock.calls[0][0](tag)
    expect(statements[1]).toContain("l.decision = 'founder_revoked'")
    expect(statements[1]).toContain("latest_prior")
  })

  it("rejects malformed or incomplete decisions before SQL", async () => {
    await expect(
      recordSuitePilotAuthorizationEvent({
        snapshotId: "snapshot_1",
        eventKey: "revoke_1",
        decision: "founder_revoked",
        reportDigest: HASH,
        decisionEvidenceDigest: HASH,
        actorUserId: "founder_opaque_1",
        expectedRevision: 2,
      })
    ).rejects.toThrow(/exact current consent or approval/i)
    await expect(
      recordSuitePilotAuthorizationEvent({
        snapshotId: "snapshot_1",
        eventKey: "revoke_2",
        decision: "founder_revoked",
        reportDigest: HASH,
        decisionEvidenceDigest: HASH,
        actorUserId: "founder_opaque_1",
        expectedRevision: 2,
        targetEventId: "approval-uuid",
        reasonCode: "consent_withdrawn",
      })
    ).rejects.toThrow(/reason must match/i)
    await expect(
      recordSuitePilotPreflightSnapshot({
        snapshotKey: "preflight.one",
        report: { ...report, state: "blocked" },
      })
    ).rejects.toThrow(/ready/i)
    expect(mocks.sql.transaction).not.toHaveBeenCalled()
  })

  it("fails stale, expired, out-of-order, and immutable mismatch decisions closed", async () => {
    mocks.sql.transaction.mockResolvedValue([[], []])
    await expect(
      recordSuitePilotAuthorizationEvent({
        snapshotId: "snapshot_1",
        eventKey: "approval_1",
        decision: "founder_approved",
        reportDigest: HASH,
        decisionEvidenceDigest: HASH,
        actorUserId: "founder_opaque_1",
        expectedRevision: 1,
      })
    ).rejects.toThrow(/stale, expired, out of order, or conflicts/i)
  })
})

describe("suite pilot authorization report", () => {
  it("is one provider-bounded SELECT and always non-dispatchable", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        snapshot_id: "snap_1",
        user_id: "founder_1",
        provider: "skool",
        resource_id: "community_1",
        latest_event_id: "event_2",
        latest_revision: 2,
        latest_decision: "founder_approved",
        observed_at: "2026-08-21T11:00:00Z",
        completed_at: "2026-08-21T11:00:01Z",
        approval_deadline: "2026-08-21T12:10:00Z",
        report_digest: HASH,
      },
    ])
    const result = await getSuitePilotAuthorizationReport(
      "skool",
      new Date("2026-08-21T12:00:00Z"),
      query
    )
    expect(result).toMatchObject({ state: "authorized_non_dispatchable", dispatchAllowed: false })
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][0]).toContain("WHERE s.provider = $1")
    expect(serializeSuitePilotAuthorizationReport(result)).not.toMatch(
      /email|provider_reference|external_account/i
    )
  })

  it("reports unavailable and empty sources as failure/no_evidence, never green", async () => {
    await expect(
      getSuitePilotAuthorizationReport("skool", new Date(), vi.fn().mockResolvedValue([]))
    ).resolves.toMatchObject({ status: "ok", state: "no_evidence", dispatchAllowed: false })
    await expect(
      getSuitePilotAuthorizationReport(
        "skool",
        new Date(),
        vi.fn().mockRejectedValue(new Error("down"))
      )
    ).resolves.toMatchObject({
      status: "failure",
      state: "no_evidence",
      error: "database_unavailable",
    })
  })

  it("treats a fresh re-consent snapshot as current after a historical withdrawal", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        snapshot_id: "snap_old",
        user_id: "founder_1",
        resource_id: "community_1",
        latest_event_id: "withdraw_old",
        latest_revision: 2,
        latest_decision: "consent_withdrawn",
        observed_at: "2026-08-21T10:00:00Z",
        completed_at: "2026-08-21T10:00:01Z",
        approval_deadline: "2026-08-21T10:05:00Z",
        report_digest: HASH,
      },
      {
        snapshot_id: "snap_fresh",
        user_id: "founder_1",
        resource_id: "community_1",
        latest_event_id: "consent_fresh",
        latest_revision: 1,
        latest_decision: "consent_confirmed",
        observed_at: "2026-08-21T11:59:00Z",
        completed_at: "2026-08-21T11:59:01Z",
        approval_deadline: "2026-08-21T12:04:00Z",
        report_digest: `sha256:${"b".repeat(64)}`,
      },
    ])
    const result = await getSuitePilotAuthorizationReport(
      "skool",
      new Date("2026-08-21T12:00:00Z"),
      query
    )
    expect(result.state).toBe("consent_confirmed")
    expect(result.rows).toHaveLength(2)
    expect(result.dispatchAllowed).toBe(false)
  })
})

describe("migration 74", () => {
  const migrationPath = path.join(
    root,
    "db/migrations/74-create-suite-pilot-authorization-ledger.sql"
  )
  const source = fs.readFileSync(migrationPath, "utf8")

  it("is additive, append-only, PII-free and hard-disables protected outbox", () => {
    expect(source).toContain("CREATE TABLE suite_pilot_preflight_snapshots")
    expect(source).toContain("CREATE TABLE suite_pilot_authorization_events")
    expect(source).toContain("suite pilot authorization ledger is append-only")
    expect(source).toContain("provider NOT IN ('skool', 'studio_platform_partner')")
    expect(source).toContain(
      "VALIDATE CONSTRAINT integration_outbox_protected_provider_kill_switch"
    )
    expect(source).toContain("actor_user_id = user_id")
    expect(source).toContain("reason_code = 'consent_withdrawn'")
    expect(source).not.toMatch(/\b(?:email|name|phone|token|secret|payload|external_id)\b/i)
    expect(source).not.toMatch(/\{1,256\}/)
    expect(source).not.toMatch(/^\s*(?:DROP TABLE|ALTER TABLE users|UPDATE\s+\w|DELETE FROM)\b/im)
  })

  it("parses PL/pgSQL blocks and applies every statement in one transaction", async () => {
    const statements = parseMigration74Statements(source)
    expect(statements.some(statement => statement.includes("CREATE FUNCTION"))).toBe(true)
    expect(statements.some(statement => statement.startsWith("DO $$"))).toBe(true)
    const tx = { query: vi.fn((statement: string) => statement) }
    const fakeSql = Object.assign(vi.fn(), {
      transaction: vi.fn(async (builder: (input: typeof tx) => unknown[]) => builder(tx)),
      query: vi.fn(),
    })
    await applyMigration74(fakeSql as any, source)
    expect(fakeSql.transaction).toHaveBeenCalledTimes(1)
    expect(tx.query).toHaveBeenCalledTimes(statements.length)
  })

  it("does not verify after atomic migration failure", async () => {
    const fakeSql = Object.assign(vi.fn(), {
      transaction: vi.fn().mockRejectedValue(new Error("rollback")),
      query: vi.fn(),
    })
    await expect(runMigration74(fakeSql as any, source)).rejects.toThrow("rollback")
    expect(fakeSql.query).not.toHaveBeenCalled()
  })

  it("starts the full migration runner through the canonical package command without DB access", () => {
    const result = spawnSync("pnpm", ["migrate:74", "--", "--help"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: "", POSTGRES_URL: "" },
    })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain("Usage: pnpm migrate:74")
    expect(result.stdout).toContain("protected-provider kill switch")
    expect(result.stderr).not.toMatch(/DATABASE_URL|POSTGRES_URL|server-only|Client Component/)
  })

  it("keeps runtime consumers and write-capable CLIs disconnected", () => {
    for (const directory of ["app", "lib/payments"]) {
      const visit = (entry: string): void => {
        for (const item of fs.readdirSync(entry, { withFileTypes: true })) {
          const full = path.join(entry, item.name)
          if (item.isDirectory()) visit(full)
          else if (/\.(?:ts|tsx)$/.test(item.name)) {
            const content = fs.readFileSync(full, "utf8")
            expect(content, full).not.toMatch(/suite-pilot-authorization/)
          }
        }
      }
      visit(path.join(root, directory))
    }
    const cli = fs.readFileSync(
      path.join(root, "scripts/report-suite-pilot-authorization.ts"),
      "utf8"
    )
    expect(cli).toContain("read-only")
    expect(cli).not.toMatch(/recordSuitePilot|recordControlPlaneIntent|claimIntegrationWork/)
  })
})
