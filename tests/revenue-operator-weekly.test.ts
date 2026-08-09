// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { reconcileCash, type LedgerPayment, type LiveChargeTruth } from "@/lib/revenue-operator/cash-reconciliation"
import {
  buildRevenueOperatorPack,
  createComparisonWindows,
  parseCompletedGatesPack,
  parsePreviousDecisionPack,
  renderRevenueOperatorMarkdown,
  type RevenueOperatorInput,
  type SourceHealth,
} from "@/lib/revenue-operator/weekly-pack"

const HEALTHY_SOURCES: SourceHealth[] = [
  { source: "stripe_payments", status: "ok", checkedAt: "2026-08-10T07:01:00.000Z" },
  { source: "stripe_subscriptions", status: "ok", checkedAt: "2026-08-10T07:01:00.000Z" },
  { source: "resend_broadcasts", status: "ok", checkedAt: "2026-08-10T07:01:00.000Z" },
  { source: "analytics_events", status: "ok", checkedAt: "2026-08-10T07:01:00.000Z" },
  { source: "checkout_attribution", status: "ok", checkedAt: "2026-08-10T07:01:00.000Z" },
  { source: "maya_events", status: "ok", checkedAt: "2026-08-10T07:01:00.000Z" },
  { source: "protected_operations", status: "ok", checkedAt: "2026-08-10T07:01:00.000Z" },
]

function input(overrides: Partial<RevenueOperatorInput> = {}): RevenueOperatorInput {
  return {
    asOf: "2026-08-10T07:00:00.000Z",
    generatedAt: "2026-08-10T07:01:00.000Z",
    windowDays: 7,
    sourceHealth: HEALTHY_SOURCES,
    cash: [
      {
        product: "Prompt Vault",
        currency: "USD",
        currentPayments: 5,
        currentGrossMinor: 18500,
        currentRefundedMinor: 0,
        currentNetMinor: 18500,
        previousPayments: 7,
        previousGrossMinor: 25900,
        previousRefundedMinor: 0,
        previousNetMinor: 25900,
      },
      {
        product: "SSELFIE SUITE",
        currency: "EUR",
        currentPayments: 1,
        currentGrossMinor: 9700,
        currentRefundedMinor: 0,
        currentNetMinor: 9700,
        previousPayments: 0,
        previousGrossMinor: 0,
        previousRefundedMinor: 0,
        previousNetMinor: 0,
      },
    ],
    membership: {
      active: 11,
      discounted: 6,
      netMrrByCurrency: { USD: 393, EUR: 349.08 },
    },
    promptVault: {
      campaignKey: "prompt_vault_proof_recovery_2026_08",
      exposureComplete: false,
      measurementMaturesAt: "2026-08-18T09:00:00.000Z",
      current: {
        leads: 120,
        promptCopies: 100,
        paidHandoffClicks: 55,
        vaultViews: 40,
        checkoutStarts: 25,
        qualifyingPayments: 5,
        campaignAttributedPayments: 2,
      },
      previous: {
        leads: 110,
        promptCopies: 90,
        paidHandoffClicks: 60,
        vaultViews: 45,
        checkoutStarts: 28,
        qualifyingPayments: 7,
        campaignAttributedPayments: 0,
      },
    },
    maya: {
      campaignKey: "maya_value_test_2026_08",
      activeAccessRows: 11,
      activeMembers: 4,
      jobsStarted: 8,
      jobsCompleted: 3,
      finishedPostJobs: 2,
      calendarPostsReady: 2,
      qualifyingMonthlyPurchases: 0,
      firstOutcomeMaturePurchases: 0,
      firstOutcomesWithin48h: 0,
      secondOutcomeMaturePurchases: 0,
      secondOutcomesWithin10d: 0,
    },
    operations: {
      openPaymentReviews: 0,
      failedProtectedJobs: 0,
      openBugs: 1,
      openMayaReleaseBlockers: 0,
      staleProtectedJobs: [],
    },
    previousDecision: null,
    completedGates: [],
    mayaTestReadiness: {
      cohortSelected: false,
      mayaHomeAccessVerified: false,
      checkoutVerified: false,
      defectGateClear: false,
      invitationPrepared: true,
    },
    ...overrides,
  }
}

function healthyWith(source: SourceHealth["source"], status: SourceHealth["status"]): SourceHealth[] {
  return HEALTHY_SOURCES.map(item => item.source === source ? { ...item, status } : item)
}

describe("weekly Revenue Operator", () => {
  it("creates exact non-overlapping current and previous windows", () => {
    const windows = createComparisonWindows(new Date("2026-08-10T07:00:00.000Z"), 7)
    expect(windows.current.end).toBe("2026-08-10T07:00:00.000Z")
    expect(windows.current.start).toBe("2026-08-03T07:00:00.000Z")
    expect(windows.previous.end).toBe(windows.current.start)
    expect(windows.previous.start).toBe("2026-07-27T07:00:00.000Z")
  })

  it("keeps currencies separate, nets refunds, and selects one current decision", () => {
    const pack = buildRevenueOperatorPack(input())
    expect(pack.cash.map(row => row.currency)).toEqual(["EUR", "USD"])
    expect(pack.decision.id).toBe("activate-owned-commerce")
    expect(pack.sandraActions).toHaveLength(0)
    expect(pack.terminalStatus).toBe("Ready")
    expect(renderRevenueOperatorMarkdown(pack)).toContain("$185.00 net")
  })

  it.each([
    ["stripe_payments", "restore-money-truth"],
    ["protected_operations", "restore-customer-guard"],
  ] as const)("blocks dependent decisions when %s is unavailable", (sourceName, decisionId) => {
    const pack = buildRevenueOperatorPack(input({ sourceHealth: healthyWith(sourceName, "unavailable") }))
    expect(pack.decision.id).toBe(decisionId)
    expect(pack.decision.status).toBe("blocked")
    expect(pack.terminalStatus).toBe("Blocked")
  })

  it("preserves the commerce priority when analytics or checkout is unavailable instead of calling it zero", () => {
    for (const sourceName of ["analytics_events", "checkout_attribution"] as const) {
      const pack = buildRevenueOperatorPack(input({
        sourceHealth: healthyWith(sourceName, "unavailable"),
        promptVault: null,
      }))
      expect(pack.decision.id).toBe("activate-owned-commerce")
      expect(pack.decision.evidence).toContain("unavailable or stale")
      expect(pack.largestLeak.status).toBe("unavailable")
    }
  })

  it("treats stale sources as unavailable for their decision dependency", () => {
    const money = buildRevenueOperatorPack(input({ sourceHealth: healthyWith("stripe_payments", "stale") }))
    const safety = buildRevenueOperatorPack(input({ sourceHealth: healthyWith("protected_operations", "stale") }))
    expect(money.decision.id).toBe("restore-money-truth")
    expect(safety.decision.id).toBe("restore-customer-guard")
  })

  it("allows a verified customer or money incident to override the commercial priority", () => {
    const pack = buildRevenueOperatorPack(input({
      operations: {
        openPaymentReviews: 2,
        failedProtectedJobs: 0,
        openBugs: 1,
        openMayaReleaseBlockers: 0,
        staleProtectedJobs: [],
      },
    }))
    expect(pack.decision.id).toBe("restore-customer-guard")
    expect(pack.decision.status).toBe("blocked")
  })

  it("preserves an unfinished prior decision until its review date using canonical copy", () => {
    const pack = buildRevenueOperatorPack(input({
      previousDecision: {
        id: "activate-owned-commerce",
        startedAt: "2026-08-08T07:00:00.000Z",
        reviewAt: "2026-08-15T07:00:00.000Z",
        status: "in_progress",
        result: null,
        terminalReason: null,
      },
    }))
    expect(pack.decision.id).toBe("activate-owned-commerce")
    expect(pack.decision.startedAt).toBe("2026-08-08T07:00:00.000Z")
    expect(pack.decision.priority).toBe("Finish the Prompt Vault comeback campaign")
  })

  it("does not advance past commerce on raw sales without completed attributed exposure", () => {
    const promptVault = input().promptVault!
    const pack = buildRevenueOperatorPack(input({
      cash: [{
        product: "Prompt Vault", currency: "USD",
        currentPayments: 20, currentGrossMinor: 74000, currentRefundedMinor: 0, currentNetMinor: 74000,
        previousPayments: 1, previousGrossMinor: 3700, previousRefundedMinor: 0, previousNetMinor: 3700,
      }],
      promptVault: {
        ...promptVault,
        exposureComplete: false,
        current: { ...promptVault.current, qualifyingPayments: 20, campaignAttributedPayments: 2 },
      },
    }))
    expect(pack.decision.id).toBe("activate-owned-commerce")
  })

  it("blocks tier decisions when Stripe membership or Maya behavior is unavailable", () => {
    const promptVault = input().promptVault!
    const cash = [{
      product: "Prompt Vault", currency: "USD",
      currentPayments: 15, currentGrossMinor: 55500, currentRefundedMinor: 0, currentNetMinor: 55500,
      previousPayments: 1, previousGrossMinor: 3700, previousRefundedMinor: 0, previousNetMinor: 3700,
    }]
    for (const sourceName of ["stripe_subscriptions", "maya_events"] as const) {
      const pack = buildRevenueOperatorPack(input({
        sourceHealth: healthyWith(sourceName, "unavailable"),
        cash,
        promptVault: {
          ...promptVault,
          exposureComplete: true,
          current: { ...promptVault.current, qualifyingPayments: 15, campaignAttributedPayments: 15 },
        },
      }))
      expect(pack.decision.id).toBe("restore-recurring-value-evidence")
      expect(pack.terminalStatus).toBe("Blocked")
    }
  })

  it("requires all three mature Maya value gates before advancing to a leveraged pilot", () => {
    const base = input()
    const commercePassed = {
      cash: [{
        product: "Prompt Vault", currency: "USD",
        currentPayments: 15, currentGrossMinor: 55500, currentRefundedMinor: 0, currentNetMinor: 55500,
        previousPayments: 1, previousGrossMinor: 3700, previousRefundedMinor: 0, previousNetMinor: 3700,
      }],
      promptVault: {
        ...base.promptVault!,
        exposureComplete: true,
        current: { ...base.promptVault!.current, qualifyingPayments: 15, campaignAttributedPayments: 15 },
      },
    }
    const missingSecond = buildRevenueOperatorPack(input({
      ...commercePassed,
      maya: {
        ...base.maya!,
        qualifyingMonthlyPurchases: 3,
        firstOutcomeMaturePurchases: 2,
        firstOutcomesWithin48h: 2,
        secondOutcomeMaturePurchases: 2,
        secondOutcomesWithin10d: 1,
      },
    }))
    expect(missingSecond.decision.id).toBe("prove-maya-repeat-value")

    const passed = buildRevenueOperatorPack(input({
      ...commercePassed,
      maya: {
        ...base.maya!,
        qualifyingMonthlyPurchases: 3,
        firstOutcomeMaturePurchases: 2,
        firstOutcomesWithin48h: 2,
        secondOutcomeMaturePurchases: 2,
        secondOutcomesWithin10d: 2,
      },
    }))
    expect(passed.decision.id).toBe("prepare-leveraged-pilot")
  })

  it("persists a terminal campaign result when its review gate matures", () => {
    const base = input()
    const pack = buildRevenueOperatorPack(input({
      asOf: "2026-08-16T07:00:00.000Z",
      previousDecision: {
        id: "activate-owned-commerce",
        startedAt: "2026-08-09T07:00:00.000Z",
        reviewAt: "2026-08-16T07:00:00.000Z",
        status: "in_progress",
        result: null,
        terminalReason: null,
      },
      cash: [{
        product: "Prompt Vault", currency: "USD",
        currentPayments: 15, currentGrossMinor: 55500, currentRefundedMinor: 0, currentNetMinor: 55500,
        previousPayments: 1, previousGrossMinor: 3700, previousRefundedMinor: 0, previousNetMinor: 3700,
      }],
      promptVault: {
        ...base.promptVault!,
        exposureComplete: true,
        current: { ...base.promptVault!.current, qualifyingPayments: 15, campaignAttributedPayments: 15 },
      },
    }))
    expect(pack.previousDecision?.status).toBe("succeeded")
    expect(pack.previousDecision?.terminalReason).toContain("passed")
    expect(pack.decision.id).toBe("prove-maya-repeat-value")
  })

  it("turns a mature failed exposure into a future repair window without rescoring the past", () => {
    const base = input()
    const scored = buildRevenueOperatorPack(input({
      asOf: "2026-08-18T09:00:00.000Z",
      previousDecision: {
        id: "activate-owned-commerce",
        startedAt: "2026-08-09T07:00:00.000Z",
        reviewAt: "2026-08-18T09:00:00.000Z",
        status: "in_progress",
        result: null,
        terminalReason: null,
      },
      cash: [{
        product: "Prompt Vault", currency: "USD",
        currentPayments: 4, currentGrossMinor: 14800, currentRefundedMinor: 0, currentNetMinor: 14800,
        previousPayments: 0, previousGrossMinor: 0, previousRefundedMinor: 0, previousNetMinor: 0,
      }],
      promptVault: {
        ...base.promptVault!,
        exposureComplete: true,
        current: { ...base.promptVault!.current, qualifyingPayments: 4, campaignAttributedPayments: 4 },
      },
    }))
    expect(scored.previousDecision?.status).toBe("failed")
    expect(scored.completedGates.map(gate => gate.id)).toContain("owned-commerce-scored")
    expect(scored.decision.id).toBe("repair-owned-commerce")
    expect(new Date(scored.decision.reviewAt).getTime()).toBeGreaterThan(new Date(scored.asOf).getTime())

    const later = buildRevenueOperatorPack(input({
      asOf: "2026-09-08T09:00:00.000Z",
      completedGates: parseCompletedGatesPack(scored),
      cash: [],
      promptVault: {
        ...base.promptVault!,
        exposureComplete: true,
        current: { ...base.promptVault!.current, qualifyingPayments: 0, campaignAttributedPayments: 0 },
      },
    }))
    expect(later.decision.id).toBe("repair-owned-commerce")
    expect(later.decision.evidence).toContain("4 campaign-attributed")
    expect(new Date(later.decision.reviewAt).getTime()).toBeGreaterThan(new Date(later.asOf).getTime())
  })

  it("keeps a post-review campaign blocked when provider exposure is unavailable", () => {
    const pack = buildRevenueOperatorPack(input({
      asOf: "2026-08-18T09:00:00.000Z",
      sourceHealth: healthyWith("resend_broadcasts", "unavailable"),
      promptVault: null,
      previousDecision: {
        id: "activate-owned-commerce",
        startedAt: "2026-08-09T07:00:00.000Z",
        reviewAt: "2026-08-18T09:00:00.000Z",
        status: "in_progress",
        result: null,
        terminalReason: null,
      },
    }))
    expect(pack.previousDecision?.status).toBe("blocked")
    expect(pack.decision.id).toBe("activate-owned-commerce")
    expect(pack.decision.status).toBe("blocked")
    expect(pack.decision.priority).toContain("Restore complete Prompt Vault exposure")
    expect(pack.terminalStatus).toBe("Blocked")
  })

  it("reports the largest measurable leak and one completed action", () => {
    const markdown = renderRevenueOperatorMarkdown(buildRevenueOperatorPack(input()))
    expect(markdown).toContain("## Largest measurable leak")
    expect(markdown).toContain("checkout -> payment")
    expect(markdown).toContain("## Work completed")
    expect(markdown).toContain("Refreshed and reconciled the aggregate money")
  })

  it("accepts only a closed prior-decision schema and ignores arbitrary copy", () => {
    expect(parsePreviousDecisionPack({ decision: {
      id: "activate-owned-commerce",
      startedAt: "2026-08-08T07:00:00.000Z",
      reviewAt: "2026-08-15T07:00:00.000Z",
      status: "in_progress",
      result: null,
      terminalReason: null,
      priority: "A private name cannot become authority",
    } })).toEqual({
      id: "activate-owned-commerce",
      startedAt: "2026-08-08T07:00:00.000Z",
      reviewAt: "2026-08-15T07:00:00.000Z",
      status: "in_progress",
      result: null,
      terminalReason: null,
    })
    expect(parsePreviousDecisionPack({ decision: { id: "invent-a-product" } })).toBeNull()
    expect(parsePreviousDecisionPack({ decision: {
      id: "activate-owned-commerce",
      startedAt: "2026-08-08T07:00:00.000Z",
      reviewAt: "2026-08-15T07:00:00.000Z",
      status: "in_progress",
      private_text: "do not accept this",
    } })).toBeNull()
  })

  it("persists completed gates and never regresses after rolling evidence expires", () => {
    const first = buildRevenueOperatorPack(input({
      asOf: "2026-08-18T09:00:00.000Z",
      previousDecision: {
        id: "activate-owned-commerce",
        startedAt: "2026-08-09T07:00:00.000Z",
        reviewAt: "2026-08-18T09:00:00.000Z",
        status: "in_progress",
        result: null,
        terminalReason: null,
      },
      cash: [{
        product: "Prompt Vault", currency: "USD",
        currentPayments: 15, currentGrossMinor: 55500, currentRefundedMinor: 0, currentNetMinor: 55500,
        previousPayments: 0, previousGrossMinor: 0, previousRefundedMinor: 0, previousNetMinor: 0,
      }],
      promptVault: {
        ...input().promptVault!,
        exposureComplete: true,
        current: { ...input().promptVault!.current, qualifyingPayments: 15, campaignAttributedPayments: 15 },
      },
    }))
    expect(first.completedGates.map(gate => gate.id)).toContain("owned-commerce")

    const later = buildRevenueOperatorPack(input({
      asOf: "2026-09-08T09:00:00.000Z",
      completedGates: parseCompletedGatesPack(first),
      cash: [],
      promptVault: {
        ...input().promptVault!,
        exposureComplete: true,
        current: { ...input().promptVault!.current, qualifyingPayments: 0, campaignAttributedPayments: 0 },
      },
    }))
    expect(later.decision.id).toBe("prove-maya-repeat-value")

    const afterBothGates = buildRevenueOperatorPack(input({
      asOf: "2026-10-01T09:00:00.000Z",
      completedGates: [
        ...later.completedGates,
        {
          id: "maya-paid-value",
          campaignKey: "maya_value_test_2026_08",
          completedAt: "2026-09-20T09:00:00.000Z",
          evidence: "All mature Maya paid-value gates passed.",
        },
      ],
      cash: [],
      maya: { ...input().maya!, qualifyingMonthlyPurchases: 0 },
    }))
    expect(afterBothGates.decision.id).toBe("prepare-leveraged-pilot")
  })

  it("derives a single approval only when the paid Maya cohort path is actually ready", () => {
    const ready = buildRevenueOperatorPack(input({
      completedGates: [{
        id: "owned-commerce-scored",
        campaignKey: "prompt_vault_proof_recovery_2026_08",
        completedAt: "2026-08-18T09:00:00.000Z",
        evidence: "Gate scored.",
      }, {
        id: "owned-commerce",
        campaignKey: "prompt_vault_proof_recovery_2026_08",
        completedAt: "2026-08-18T09:00:00.000Z",
        evidence: "Gate passed.",
      }],
      mayaTestReadiness: {
        cohortSelected: true,
        mayaHomeAccessVerified: true,
        checkoutVerified: true,
        defectGateClear: true,
        invitationPrepared: true,
      },
    }))
    expect(ready.outwardApprovalReady).toBe(true)
    expect(ready.sandraActions).toHaveLength(1)

    const blocked = buildRevenueOperatorPack(input({
      completedGates: ready.completedGates,
      mayaTestReadiness: { ...ready.mayaTestReadiness, mayaHomeAccessVerified: false },
    }))
    expect(blocked.outwardApprovalReady).toBe(false)
    expect(blocked.sandraActions).toHaveLength(0)
  })

  it("reports incomplete source work honestly", () => {
    const pack = buildRevenueOperatorPack(input({ sourceHealth: healthyWith("resend_broadcasts", "unavailable") }))
    expect(pack.completedWork).toContain("resend_broadcasts is unavailable")
    expect(pack.completedWork).toContain("conclusions were suppressed")
  })

  it("contains no customer output and uses a mutation-free, fixed-directory CLI", () => {
    const serialized = JSON.stringify(buildRevenueOperatorPack(input()))
    expect(serialized).not.toMatch(/[^\s"']+@[^\s"']+/)
    const cli = readFileSync("scripts/revenue-operator-weekly.ts", "utf8")
    for (const forbidden of [
      "INSERT ", "UPDATE ", "DELETE ", "CREATE TABLE", "ALTER TABLE",
      "resend.emails.send", "broadcasts.create", "setCache(", "ensureAnalyticsSchema",
      "--previous-pack",
    ]) expect(cli).not.toContain(forbidden)
    expect(cli).toContain("readLatestOperatorState(outputDir)")
    expect(cli).toContain("MAYA_VALUE_TEST_COHORT_AUDITED_AT")
    expect(cli).toContain("MAYA_VALUE_TEST_ACCESS_VERIFIED_AT")
    expect(cli).toContain("MAYA_VALUE_TEST_CHECKOUT_VERIFIED_AT")
    expect(cli).not.toContain("cohortSelected: false")
  })

  it("keeps the approved proof-event stop boundary fixed and deliberate", () => {
    const guard = readFileSync("scripts/guard-prompt-vault-proof-event.ts", "utf8")
    expect(guard).toContain("fa3ec7a9-bf83-427f-b561-ec34f99f2c4f")
    expect(guard).toContain("34ac74a1-5216-45d1-9665-885815debfde")
    expect(guard).toContain("8d6e9101-c4fd-468a-8d16-ea197fc56a1b")
    expect(guard).toContain("approved-proof-event-guard-2026-08")
    expect(guard).toContain('item.status === "scheduled" || item.status === "queued"')
    expect(guard).toContain("resend.broadcasts.remove(item.broadcastId)")
    expect(guard).toContain("is still queued after stop")
    expect(guard).not.toContain("broadcasts.create")
    expect(guard).not.toContain("emails.send")
  })

  it("exposes a read-only live Stripe path without cache writes", () => {
    const source = readFileSync("lib/revenue/single-source.ts", "utf8")
    expect(source).toContain("getSingleSourceRevenueMetricsReadOnly")
    expect(source).toMatch(/getSingleSourceRevenueMetricsReadOnly[\s\S]*return fetchSingleSourceMetrics\(\)/)
  })
})

describe("live cash reconciliation", () => {
  const windows = createComparisonWindows(new Date("2026-08-10T07:00:00.000Z"), 7)
  const ledger = (overrides: Partial<LedgerPayment> = {}): LedgerPayment => ({
    paymentId: "pi_1",
    invoiceId: null,
    product: "Prompt Vault",
    currency: "usd",
    amountMinor: 3700,
    paidAt: "2026-08-09T07:00:00.000Z",
    utmCampaign: "prompt_vault_proof_recovery_2026_08",
    ...overrides,
  })
  const charge = (overrides: Partial<LiveChargeTruth> = {}): LiveChargeTruth => ({
    chargeId: "ch_1",
    paymentIntentId: "pi_1",
    invoiceIds: [],
    currency: "usd",
    grossMinor: 3700,
    refunds: [],
    createdAt: "2026-08-09T07:00:00.000Z",
    livemode: true,
    paid: true,
    status: "succeeded",
    ...overrides,
  })

  it("subtracts a partial refund while retaining one net qualifying payment", () => {
    const result = reconcileCash([ledger()], [charge({ refunds: [{
      refundId: "re_1",
      amountMinor: 1200,
      createdAt: "2026-08-09T12:00:00.000Z",
    }] })], windows)
    expect(result.cash[0]).toMatchObject({
      currentPayments: 1,
      currentGrossMinor: 3700,
      currentRefundedMinor: 1200,
      currentNetMinor: 2500,
    })
    expect(result.campaignPayments.prompt_vault_proof_recovery_2026_08.current).toBe(1)
  })

  it("excludes a fully refunded payment from the purchase and campaign gates", () => {
    const result = reconcileCash([ledger()], [charge({ refunds: [{
      refundId: "re_1",
      amountMinor: 3700,
      createdAt: "2026-08-09T12:00:00.000Z",
    }] })], windows)
    expect(result.cash[0]).toMatchObject({ currentPayments: 0, currentNetMinor: 0 })
    expect(result.campaignPayments.prompt_vault_proof_recovery_2026_08).toBeUndefined()
  })

  it("marks unmatched live and ledger records instead of silently calling them cleared", () => {
    const result = reconcileCash(
      [ledger(), ledger({ paymentId: "pi_missing" })],
      [charge(), charge({ chargeId: "ch_missing", paymentIntentId: "pi_live_missing" })],
      windows
    )
    expect(result.unmatchedLedgerPayments).toBe(1)
    expect(result.unmatchedLiveCharges).toBe(1)
  })

  it("attributes a current refund on an older charge to current net cash", () => {
    const result = reconcileCash(
      [ledger({ paidAt: "2026-07-01T07:00:00.000Z" })],
      [charge({
        createdAt: "2026-07-01T07:00:00.000Z",
        refunds: [{ refundId: "re_old", amountMinor: 3700, createdAt: "2026-08-09T12:00:00.000Z" }],
      })],
      windows
    )
    expect(result.cash[0]).toMatchObject({
      currentPayments: 0,
      currentGrossMinor: 0,
      currentRefundedMinor: 3700,
      currentNetMinor: -3700,
    })
  })

  it("does not apply a refund created after the historical as-of time", () => {
    const result = reconcileCash(
      [ledger()],
      [charge({
        refunds: [{ refundId: "re_future", amountMinor: 3700, createdAt: "2026-08-11T12:00:00.000Z" }],
      })],
      windows
    )
    expect(result.cash[0]).toMatchObject({
      currentPayments: 1,
      currentRefundedMinor: 0,
      currentNetMinor: 3700,
    })
  })
})
