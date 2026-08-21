// @vitest-environment node

import fs from "node:fs"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  createSuiteMembershipShadowReport,
  serializeSuiteMembershipShadowReport,
  type SuiteMembershipShadowEvidence,
} from "@/lib/integrations/suite-membership-shadow-report"

const NOW = new Date("2026-08-21T12:00:00.000Z")

function evidence(
  overrides: Partial<SuiteMembershipShadowEvidence> = {}
): SuiteMembershipShadowEvidence {
  return {
    state: "available",
    subscriptions: [
      {
        subscriptionId: "sub_compatible",
        userId: "user_1",
        planId: "monthly",
      },
      {
        subscriptionId: "sub_missing_paid",
        userId: "user_2",
        planId: "annual",
      },
      {
        subscriptionId: "sub_unknown",
        userId: "user_3",
        planId: "monthly",
      },
      {
        subscriptionId: "sub_conflict",
        userId: "user_4",
        planId: "monthly",
      },
    ],
    events: [
      {
        eventId: "event_compatible",
        eventType: "membership_started",
        aggregateType: "stripe_subscription",
        aggregateId: "sub_compatible",
        subjectType: "membership",
        subjectId: "sselfie_studio_membership",
        userId: "user_1",
        sourceProvider: "stripe",
        sourceEventId: "cs_compatible",
        idempotencyKey: "suite.membership_started.v1:sub_compatible",
        occurredAt: "2026-08-21T09:55:00.000Z",
        attributes: {
          membership_id: "sselfie_studio_membership",
          plan_id: "monthly",
          effective_at: "2026-08-21T09:55:00.000Z",
        },
      },
      {
        eventId: "event_conflict",
        eventType: "membership_started",
        aggregateType: "stripe_subscription",
        aggregateId: "sub_conflict",
        subjectType: "membership",
        subjectId: "wrong_membership",
        userId: "user_4",
        sourceProvider: "stripe",
        sourceEventId: "cs_conflict",
        idempotencyKey: "suite.membership_started.v1:sub_conflict",
        occurredAt: "2026-08-21T09:55:00.000Z",
        attributes: {
          membership_id: "wrong_membership",
          plan_id: "monthly",
          effective_at: "2026-08-21T09:55:00.000Z",
        },
      },
      {
        eventId: "event_orphan",
        eventType: "membership_started",
        aggregateType: "stripe_subscription",
        aggregateId: "sub_orphan",
        subjectType: "membership",
        subjectId: "sselfie_studio_membership",
        userId: "user_orphan",
        sourceProvider: "stripe",
        sourceEventId: "cs_orphan",
        idempotencyKey: "suite.membership_started.v1:sub_orphan",
        occurredAt: "2026-08-21T09:55:00.000Z",
        attributes: {
          membership_id: "sselfie_studio_membership",
          plan_id: "monthly",
          effective_at: "2026-08-21T09:55:00.000Z",
        },
      },
    ],
    positiveInitialPayments: [
      {
        subscriptionId: "sub_missing_paid",
        invoiceId: "in_initial_paid",
        amountCents: 9700,
        currency: "eur",
      },
    ],
    ...overrides,
  }
}

describe("SUITE membership shadow reconciliation", () => {
  it("classifies compatible, paid-missing, unknown, conflict, and orphan evidence deterministically", () => {
    const report = createSuiteMembershipShadowReport(evidence(), NOW)

    expect(report.status).toBe("ok")
    expect(report.rows.map(row => [row.subscriptionId, row.state])).toEqual([
      ["sub_compatible", "compatible"],
      ["sub_conflict", "immutable_conflict"],
      ["sub_missing_paid", "qualification_unknown"],
      ["sub_orphan", "orphan_event"],
      ["sub_unknown", "qualification_unknown"],
    ])
    expect(serializeSuiteMembershipShadowReport(report)).toBe(
      serializeSuiteMembershipShadowReport(createSuiteMembershipShadowReport(evidence(), NOW))
    )
  })

  it("never infers a historical zero-total start from missing money evidence", () => {
    const report = createSuiteMembershipShadowReport(
      evidence({
        state: "available",
        subscriptions: [{ subscriptionId: "sub_zero_or_trial", userId: "user_5", planId: "trial" }],
        events: [],
        positiveInitialPayments: [],
      }),
      NOW
    )

    expect(report.rows).toEqual([
      expect.objectContaining({
        subscriptionId: "sub_zero_or_trial",
        state: "qualification_unknown",
      }),
    ])
  })

  it("does not call a mutable current-plan change an immutable event conflict", () => {
    const input = evidence()
    input.subscriptions = input.subscriptions.map(row =>
      row.subscriptionId === "sub_compatible" ? { ...row, planId: "annual" } : row
    )

    const report = createSuiteMembershipShadowReport(input, NOW)
    expect(report.rows.find(row => row.subscriptionId === "sub_compatible")?.state).toBe(
      "compatible"
    )
  })

  it("emits an explicit failure rather than a clean zero report when DB evidence is unavailable", () => {
    const report = createSuiteMembershipShadowReport(
      { state: "unavailable", reason: "database unavailable" },
      NOW
    )

    expect(report).toEqual({
      version: 1,
      status: "failure",
      observedAt: NOW.toISOString(),
      error: "database_unavailable",
      rows: [],
      summary: {
        compatible: 0,
        missing_with_positive_initial_payment: 0,
        immutable_conflict: 0,
        orphan_event: 0,
        qualification_unknown: 0,
      },
    })
  })

  it("keeps the reader and CLI SELECT-only, PII-free, and disconnected from customer systems", () => {
    const reportSource = fs.readFileSync(
      "lib/integrations/suite-membership-shadow-report.ts",
      "utf8"
    )
    const scriptSource = fs.readFileSync("scripts/report-suite-membership-shadow.ts", "utf8")
    const combined = `${reportSource}\n${scriptSource}`

    expect(reportSource).toContain("SELECT")
    expect(combined).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i)
    expect(combined).not.toMatch(
      /@\/lib\/(?:stripe|email|supabase)|integration_outbox|external_provisioning_states/
    )
    expect(combined).not.toMatch(/customer_email|\bemail\b|\bname\b|\bphone\b/i)
    expect(scriptSource).toContain("createRequire")
    expect(scriptSource).toContain("process.stdout.write")
  })

  it("keeps invoice and generic subscription lifecycle paths outside the producer", () => {
    const invoice = fs.readFileSync("lib/payments/lifecycle/invoice-paid.ts", "utf8")
    const lifecycle = fs.readFileSync("lib/payments/lifecycle/subscription-events.ts", "utf8")
    const checkout = fs.readFileSync("lib/payments/handlers/studio-membership.ts", "utf8")

    expect(invoice).not.toContain("shadowMembershipStarted")
    expect(lifecycle).not.toContain("shadowMembershipStarted")
    expect(checkout).toContain("shadowMembershipStarted")
    expect(checkout).toContain('rawProductType === "sselfie_studio_membership"')
  })
})
