// @vitest-environment node

import { describe, expect, it, vi } from "vitest"
import { spawnSync } from "node:child_process"
import {
  parsePaymentAdjustmentTargetArgument,
  parsePaymentAdjustmentTargetArguments,
  runPaymentAdjustmentCli,
} from "@/lib/payments/payment-adjustment-cli"

describe("payment adjustment reconciliation target parser", () => {
  it.each([
    ["--refund=re_123AbC", { type: "refund", id: "re_123AbC" }],
    ["--refund=pyr_123AbC", { type: "refund", id: "pyr_123AbC" }],
    ["--dispute=dp_123AbC", { type: "dispute", id: "dp_123AbC" }],
    ["--dispute=du_123AbC", { type: "dispute", id: "du_123AbC" }],
    ["--charge=ch_123AbC", { type: "charge", id: "ch_123AbC" }],
    ["--charge=py_123AbC", { type: "charge", id: "py_123AbC" }],
  ])("accepts %s", (argument, expected) => {
    expect(parsePaymentAdjustmentTargetArgument(argument)).toEqual(expected)
  })

  it.each([
    "--refund=dp_123AbC",
    "--refund=du_123AbC",
    "--dispute=re_123AbC",
    "--dispute=pyr_123AbC",
    "--charge=re_123AbC",
    "--charge=pyr_123AbC",
    "--refund=py_123AbC",
    "--dispute=py_123AbC",
    "--refund=pi_123AbC",
    "--dispute=pi_123AbC",
    "--charge=pi_123AbC",
    "--refund=re_",
    "--refund=re_bad-value",
    "--refund=re_bad/value",
    "--unknown=re_123AbC",
  ])("rejects malformed or cross-type target %s", argument => {
    expect(parsePaymentAdjustmentTargetArgument(argument)).toBeNull()
  })

  it("starts under the repository CJS runtime without top-level-await failure", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--conditions=react-server",
        "--import",
        "tsx",
        "scripts/reconcile-payment-adjustments.ts",
        "--help",
      ],
      { cwd: process.cwd(), encoding: "utf8" }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("bounded discovery")
    expect(result.stderr).not.toContain("Top-level await")
  })

  it("rejects a mismatched target in record arguments instead of falling through", () => {
    expect(() =>
      parsePaymentAdjustmentTargetArguments(["--record", "--livemode=live", "--refund=dp_123AbC"])
    ).toThrow("Invalid payment-adjustment target flag")
  })

  it("fails a mismatched target before report mode can fall through", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--conditions=react-server",
        "--import",
        "tsx",
        "scripts/reconcile-payment-adjustments.ts",
        "--report",
        "--refund=dp_123AbC",
      ],
      { cwd: process.cwd(), encoding: "utf8" }
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Invalid payment-adjustment target flag")
    expect(result.stderr).not.toMatch(/DATABASE_URL|STRIPE_SECRET_KEY|Top-level await/)
  })

  it("loads the server-script reconciliation boundary before rejecting an incomplete dry run", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--conditions=react-server",
        "--import",
        "tsx",
        "scripts/reconcile-payment-adjustments.ts",
        "--livemode=live",
      ],
      { cwd: process.cwd(), encoding: "utf8" }
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Bounded --since and --until are required")
    expect(result.stderr).not.toContain("Client Component module")
  })

  it("runs an exact-ID dry run through injected reconciliation without writes", async () => {
    const reconcileTargets = vi.fn().mockResolvedValue({
      mode: "dry_run",
      observations: [{ adjustmentId: "re_123AbC" }],
    })
    const reconcileWindow = vi.fn()
    const report = vi.fn()
    const review = vi.fn()

    await expect(
      runPaymentAdjustmentCli(
        ["node", "script", "--livemode=live", "--refund=re_123AbC"],
        async () => ({
          reconcilePaymentAdjustmentTargets: reconcileTargets,
          reconcilePaymentAdjustmentWindow: reconcileWindow,
          getPaymentAdjustmentReportProjection: report,
          getPaymentAdjustmentReviewQueue: review,
        })
      )
    ).resolves.toEqual({
      mode: "dry_run",
      observations: [{ adjustmentId: "re_123AbC" }],
    })
    expect(reconcileTargets).toHaveBeenCalledWith({
      targets: [{ type: "refund", id: "re_123AbC" }],
      expectedLivemode: true,
      record: false,
    })
    expect(reconcileWindow).not.toHaveBeenCalled()
    expect(report).not.toHaveBeenCalled()
    expect(review).not.toHaveBeenCalled()
  })
})
