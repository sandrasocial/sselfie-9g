// @vitest-environment node

import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import path from "path"

const ROOT = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("retired 20-credit SUITE trial", () => {
  it.each([
    "lib/payments/handlers/prompt-vault.ts",
    "lib/payments/handlers/starter-kit.ts",
    "lib/payments/handlers/selfie-ai-photos-kit.ts",
  ])("does not grant a new trial from %s", relativePath => {
    const source = read(relativePath)

    expect(source).not.toContain("activatePaidBuyerSuiteTrial")
    expect(source).not.toContain("/claim/")
  })

  it("does not schedule the day-8 free SUITE trial email", async () => {
    const { SELFIE_AI_PHOTOS_KIT_EMAIL_TOUCHES } = await import(
      "@/lib/email/selfie-ai-photos-kit-email-sequence"
    )

    expect(SELFIE_AI_PHOTOS_KIT_EMAIL_TOUCHES.map(touch => touch.emailType)).toEqual([
      "selfie-ai-photos-kit-day2-first-photo",
      "selfie-ai-photos-kit-day4-vault-bridge",
    ])
  })

  it("preserves trials already granted and previously issued claim links", () => {
    const claimPage = read("app/claim/[token]/page.tsx")
    const trial = read("lib/trial/suite-trial.ts")

    expect(claimPage).toContain("grantSuiteTrial(userId")
    expect(claimPage).toContain("suite_trial_unlock")
    expect(claimPage).toContain("selfie-ai-photos-kit-day8-suite-trial")
    expect(claimPage).toContain("product_type = 'suite_trial'")
    expect(claimPage).toContain("if (promisedTrial.length === 0) return <InvalidLink />")
    expect(trial).toContain("export const TRIAL_CREDITS = 20")
    expect(trial).toContain("product_type = 'suite_trial'")
  })

  it("keeps the existing two-credit welcome path and zero-credit upgrade", () => {
    const credits = read("lib/credits.ts")
    const upgrade = read("components/credits/zero-credits-upgrade-modal.tsx")

    expect(credits).toContain("const credits = 2")
    expect(credits).toContain("Free blueprint credits (welcome bonus)")
    expect(upgrade).toContain("Join SSELFIE SUITE · 200 credits/mo")
  })
})
