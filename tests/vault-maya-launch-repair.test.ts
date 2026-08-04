import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { assessDeliverabilityWindow } from "@/lib/email/deliverability-alerts"
import {
  isVaultMayaOfferClickUrl,
  runResendRequest,
} from "@/lib/email/campaigns/vault-maya-launch-segments"

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("Vault Maya launch repair", () => {
  it("counts only clicks on the Vault Maya offer as high intent", () => {
    expect(isVaultMayaOfferClickUrl("https://www.sselfie.ai/vault-maya?utm_source=email")).toBe(true)
    expect(isVaultMayaOfferClickUrl("https://sselfie.ai/checkout/vault-maya?source=email")).toBe(true)
    expect(isVaultMayaOfferClickUrl("https://sselfie.ai/unsubscribe?token=secret")).toBe(false)
    expect(isVaultMayaOfferClickUrl("https://resend.com/unsubscribe?token=secret")).toBe(false)
    expect(isVaultMayaOfferClickUrl(undefined)).toBe(false)
  })

  it("uses rates and minimum volume instead of an absolute damage count", () => {
    expect(
      assessDeliverabilityWindow(
        { delivered: 7_000, sent: 0, bounced: 30, complained: 1 },
        { minimumVolume: 100, bounceRatePercent: 2, complaintRatePercent: 0.1 },
      ).shouldAlert,
    ).toBe(false)

    expect(
      assessDeliverabilityWindow(
        { delivered: 970, sent: 0, bounced: 30, complained: 0 },
        { minimumVolume: 100, bounceRatePercent: 2, complaintRatePercent: 0.1 },
      ),
    ).toMatchObject({ shouldAlert: true, reason: "bounce_rate" })

    expect(
      assessDeliverabilityWindow(
        { delivered: 19, sent: 0, bounced: 1, complained: 0 },
        { minimumVolume: 100, bounceRatePercent: 2, complaintRatePercent: 0.1 },
      ).shouldAlert,
    ).toBe(false)
  })

  it("paces and retries Resend pagination before sending a large segment", () => {
    const runner = source("lib/email/campaigns/vault-maya-launch-runner.ts")
    expect(runner).toContain("runResendRequest")
    expect(runner).toContain("RESEND_REQUEST_DELAY_MS")
    expect(runner).toContain("await sleep(RESEND_REQUEST_DELAY_MS)")
  })

  it("backs off and recovers when Resend returns a rate-limit error", async () => {
    let attempts = 0
    const delays: number[] = []
    const result = await runResendRequest(
      async () => {
        attempts += 1
        return attempts < 3
          ? { data: null, error: { message: "429 Too many requests" } }
          : { data: { ok: true }, error: null }
      },
      false,
      async (ms) => {
        delays.push(ms)
      },
    )

    expect(result.data).toEqual({ ok: true })
    expect(attempts).toBe(3)
    expect(delays).toEqual([800, 1_600])
  })

  it("claims a deliverability alert atomically before sending it", () => {
    const webhook = source("app/api/webhooks/resend/route.ts")
    const migration = source("migrations/20260804_deliverability_alert_claims.sql")
    expect(webhook).toContain("deliverability_alert_claims")
    expect(webhook).toContain("ON CONFLICT (alert_id) DO NOTHING")
    expect(webhook).toContain("RETURNING alert_id")
    expect(migration).toContain("alert_id TEXT PRIMARY KEY")
  })

  it("opens Vault Maya's secure Stripe checkout without a separate email gate", () => {
    const checkout = source("app/checkout/vault-maya/page.tsx")
    expect(checkout).not.toContain("PromptVaultCheckoutEmailCapture")
    expect(checkout).not.toContain("shouldShowCheckoutEmailCapture")
    expect(checkout).toContain("createLandingCheckoutSession(productId, params.promo, checkoutEmail")
  })
})
