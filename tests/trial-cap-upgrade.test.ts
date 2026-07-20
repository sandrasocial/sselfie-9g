// @vitest-environment node
// TRIAL-CAP-01 — trial-cap conversion moment.
// Data finding: engaged trials burn all 20 credits and expire with no upgrade ask.
// This pins (1) the email copy + voice rules, (2) the cron wiring (flag, idempotency,
// candidate correctness), (3) the in-app offer replacing the dead credits error for trials.
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import {
  generateTrialCapUpgradeEmail,
  TRIAL_CAP_UPGRADE_EMAIL_TYPE,
} from "@/lib/email/templates/suite-trial"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

const BANNED_WORDS = [
  "leverage",
  "synergy",
  "transform",
  "game-changer",
  "game changer",
  "skyrocket",
  "unlock",
  "elevate",
  "flawless",
]

describe("trial-cap upgrade email", () => {
  const email = generateTrialCapUpgradeEmail({
    customerName: "Sandra",
    customerEmail: "sandra@example.com",
  })

  it("celebrates the cap and asks for the upgrade", () => {
    expect(email.subject).toBe("You used all 20. I love that")
    expect(email.text).toContain("You used every single trial credit. All 20 photos.")
    expect(email.text).toContain("100 credits a month")
    expect(email.text).toContain("cancel anytime")
    expect(email.text).toContain(
      "/checkout/membership?interval=month&source=trial_cap_email&utm_source=email&utm_medium=email&utm_campaign=trial_cap_upgrade"
    )
  })

  it("holds the No-Fake doctrine: still you, never erased", () => {
    expect(email.text).toContain("started from your selfie, and it's still you")
    expect(email.text).toContain("Not a filter. Not some AI stranger.")
    expect(email.text).toContain("Your photos are yours to keep either way")
  })

  it("keeps Sandra's voice rules: no em-dashes, no banned words", () => {
    for (const content of [email.subject, email.text, email.html]) {
      expect(content).not.toContain("—")
    }
    // Banned-word scan runs on the words Sandra wrote (subject + text); the HTML shell
    // legitimately contains CSS like `text-transform`.
    for (const content of [email.subject, email.text]) {
      const lower = content.toLowerCase()
      for (const word of BANNED_WORDS) {
        expect(lower, `banned word "${word}"`).not.toContain(word)
      }
    }
  })

  it("uses the locked email_type", () => {
    expect(TRIAL_CAP_UPGRADE_EMAIL_TYPE).toBe("trial-cap-upgrade")
  })
})

describe("trial-cap cron wiring (suite-trial-expiry)", () => {
  const route = read("app/api/cron/suite-trial-expiry/route.ts")

  it("ships flag-off: gated by TRIAL_CAP_UPGRADE_EMAIL_ENABLED", () => {
    expect(route).toContain('process.env.TRIAL_CAP_UPGRADE_EMAIL_ENABLED === "true"')
  })

  it("is idempotent per user via email_logs incl. suppressed", () => {
    expect(route).toContain("TRIAL_CAP_UPGRADE_EMAIL_TYPE")
    expect(route).toContain("generateTrialCapUpgradeEmail")
    expect(route).toContain("status IN ('sent', 'delivered', 'suppressed')")
  })

  it("targets exhausted trial grants and excludes members + the expiry-zeroing row", () => {
    // Full grant used since trial_grant...
    expect(route).toContain("transaction_type = 'trial_grant'")
    expect(route).toContain(">= ${TRIAL_CREDITS}")
    // ...but the trial_expiry zeroing transaction must not count as usage,
    // or every expired trial would look exhausted.
    expect(route).toContain("ct.transaction_type <> 'trial_expiry'")
    // Never email active members.
    expect(route).toMatch(
      /NOT EXISTS \(\s*SELECT 1 FROM subscriptions m[\s\S]*?sselfie_studio_membership'[\s\S]*?m\.status = 'active'/
    )
    // Trials flipping to expired this run wait for the next run (no double email day).
    expect(route).toContain("(s.status = 'expired' OR s.trial_ends_at > NOW())")
    // Test accounts stay out.
    expect(route).toContain("u.email NOT ILIKE '%@sselfie.ai'")
  })
})

describe("in-app trial-cap offer (App v3)", () => {
  const offer = read("components/app-v3/trial-cap-offer.tsx")
  const concierge = read("components/app-v3/maya-concierge.tsx")
  const editMode = read("components/app-v3/edit-mode.tsx")

  it("CTA carries the trial_cap attribution", () => {
    expect(offer).toContain(
      "/checkout/membership?interval=month&checkout_source=trial_cap&utm_source=app&utm_medium=in_app&utm_campaign=trial_cap_upgrade"
    )
  })

  it("leads with her own photos as the proof", () => {
    expect(offer).toContain("Look what you made this week")
    expect(offer).toContain("/api/app-v3/gallery")
    expect(offer).toContain("still you")
    expect(offer).toContain("trial_cap_offer_shown")
  })

  it("concierge routes blocked TRIAL users to the offer, members to top-up", () => {
    expect(concierge).toContain("TrialCapOffer")
    expect(concierge).toContain('if (cohort === "trial") setTrialCapOpen(true)')
    expect(concierge).toContain("else setCreditModal({ open: true, balance })")
    expect(concierge).toContain("showTrialCapIfDepleted")
    expect(concierge).toContain("showTrialCapIfDepleted(data?.newBalance)")
    expect(concierge).toContain("showTrialCapIfDepleted(evt.newBalance)")
    // generation_locked (trial expired mid-session) also gets the offer, not a dead error.
    expect(concierge).toContain('data?.code === "generation_locked" && cohort === "trial"')
  })

  it("allows the analytics events used by the in-app offer and failure logging", () => {
    const contract = read("lib/analytics/event-contract.ts")
    expect(contract).toContain('"suite_generation_failed"')
    expect(contract).toContain('"trial_cap_offer_shown"')
    expect(contract).toContain('"trial_cap_offer_cta_click"')
  })

  it("edit mode surfaces credit blocks to the parent instead of a dead error", () => {
    expect(editMode).toContain("onCreditBlock")
    expect(editMode).toContain('data?.code === "insufficient_credits"')
    expect(concierge).toContain("onCreditBlock={balance => {")
  })
})
