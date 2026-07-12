// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import {
  generateTrialCapUpgradeEmail,
  generateTrialDay5Email,
  generateTrialEndedEmail,
} from "@/lib/email/templates/suite-trial"
import { shouldShowCheckoutEmailCapture } from "@/lib/revenue-engine/anonymous-checkout-capture"

const checkoutEmail = "Warm.Trial+checkout@example.com"
const ROOT = process.cwd()

function checkoutUrlFromText(text: string): URL {
  const match = text.match(/https?:\/\/[^\s]+\/checkout\/membership\?[^\s]+/)
  if (!match) throw new Error("Expected a membership checkout URL in the email text")
  return new URL(match[0])
}

describe("trial lifecycle checkout email pass-through", () => {
  const cases = [
    {
      label: "day 5",
      email: generateTrialDay5Email({
        customerName: "Sandra",
        customerEmail: checkoutEmail,
        endsOn: "July 14",
      }),
      source: "trial_day5",
      campaign: "trial_day5",
      medium: "lifecycle",
    },
    {
      label: "credit cap",
      email: generateTrialCapUpgradeEmail({
        customerName: "Sandra",
        customerEmail: checkoutEmail,
      }),
      source: "trial_cap_email",
      campaign: "trial_cap_upgrade",
      medium: "email",
    },
    {
      label: "trial ended",
      email: generateTrialEndedEmail({
        customerName: "Sandra",
        customerEmail: checkoutEmail,
      }),
      source: "trial_ended",
      campaign: "trial_ended",
      medium: "lifecycle",
    },
  ]

  for (const testCase of cases) {
    it(`${testCase.label} link carries the recipient into checkout without another email gate`, () => {
      const url = checkoutUrlFromText(testCase.email.text)
      const params = Object.fromEntries(url.searchParams.entries())

      expect(url.pathname).toBe("/checkout/membership")
      expect(url.searchParams.get("interval")).toBe("month")
      expect(url.searchParams.get("checkout_email")).toBe(checkoutEmail.toLowerCase())
      expect(url.searchParams.get("source")).toBe(testCase.source)
      expect(url.searchParams.get("utm_source")).toBe("email")
      expect(url.searchParams.get("utm_medium")).toBe(testCase.medium)
      expect(url.searchParams.get("utm_campaign")).toBe(testCase.campaign)
      expect(
        shouldShowCheckoutEmailCapture({
          params,
          hasRecoverableEmail: Boolean(url.searchParams.get("checkout_email")),
          hasAuthUser: false,
          hasFreebieToken: false,
        }),
      ).toBe(false)
    })
  }

  it("membership checkout recognizes checkout_email before evaluating its capture gate", () => {
    const page = fs.readFileSync(path.join(ROOT, "app/checkout/membership/page.tsx"), "utf8")

    expect(page).toContain("normalizeCheckoutEmail(params.checkout_email || params.email)")
    expect(page).toContain("hasRecoverableEmail: Boolean(checkoutEmail)")
  })
})
