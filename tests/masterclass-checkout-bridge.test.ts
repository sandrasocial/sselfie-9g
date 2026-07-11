// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import { isAllowedAnalyticsEventName } from "@/lib/analytics/event-contract"

const ROOT = process.cwd()

describe("masterclass checkout bridge", () => {
  it("reviews the order and captures a delivery email before creating Stripe checkout", () => {
    const contents = fs.readFileSync(path.join(ROOT, "app/checkout/masterclass/page.tsx"), "utf8")

    expect(contents).toContain("PromptVaultCheckoutEmailCapture")
    expect(contents).toContain("shouldShowCheckoutEmailCapture")
    expect(contents).toContain('checkout_email?: string')
    expect(contents).toContain('productName="Selfie Branding Masterclass"')
    expect(contents).toContain('productPrice="$147 one-time"')
    expect(contents).toContain('buttonLabel="Continue to secure checkout"')
    expect(contents).toContain('createLandingCheckoutSession(\n      "masterclass",\n      undefined,\n      checkoutEmail,')
    expect(contents).not.toContain("allowSkip")
  })

  it("makes the buying decision and post-payment next step explicit at payment entry", () => {
    const contents = fs.readFileSync(path.join(ROOT, "app/checkout/page.tsx"), "utf8")

    expect(contents).toContain('const isMasterclass = productType === "masterclass"')
    expect(contents).toContain("One $147 payment gives you the complete course")
    expect(contents).toContain("Start with Your Foundation")
    expect(contents).toContain("Instant course access")
  })

  it("keeps every bridge step inside the analytics event contract", () => {
    for (const eventName of [
      "masterclass_checkout_email_capture_view",
      "masterclass_checkout_session_requested",
      "masterclass_checkout_session_created",
      "masterclass_checkout_session_failed",
      "masterclass_checkout_payment_entry_shown",
    ]) {
      expect(isAllowedAnalyticsEventName(eventName), eventName).toBe(true)
    }
  })
})
