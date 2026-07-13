// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { generateOneSelfieFounderBriefing } from "@/lib/email/templates/one-selfie-founder-briefing"

describe("One Selfie founder launch briefing", () => {
  it("gives Sandra one exact BUNDLE-only posting plan for the full event", () => {
    const briefing = generateOneSelfieFounderBriefing()

    expect(briefing.subject).toContain("Your exact 48-hour posting plan")
    expect(briefing.text).toContain("Ignore any routine DM WORK, PROMPT, or SELFIE draft")
    expect(briefing.text).toContain("Comment BUNDLE")
    expect(briefing.text).toContain("Wednesday at 6 PM Oslo time")
    expect(briefing.text).toContain("I just took the best photo of myself in years")
    expect(briefing.text).toContain('Monday 18:00 Oslo time: approve "Launch · One Selfie · 1 Open"')
    expect(briefing.text).toContain('Tuesday 10:00 Oslo time: approve "Launch · One Selfie · 2 Inside"')
    expect(briefing.text).toContain('Wednesday 09:00 Oslo time: approve "Launch · One Selfie · 3 Last call"')
    expect(briefing.text).toContain("APPROVE RECOVERY EMAIL")
    expect(briefing.text).toContain("https://www.sselfie.ai/admin")
    expect(briefing.text).toContain("18:00: Closed")
    expect(briefing.text).toContain("Nothing renews")
    expect(briefing.text).not.toContain("guaranteed")
  })

  it("keeps the attended send script internal, idempotent, and admin-only", () => {
    const script = readFileSync("scripts/send-one-selfie-founder-briefing.ts", "utf8")

    expect(script).toContain("process.env.ADMIN_EMAIL")
    expect(script).toContain('emailType: "one_selfie_founder_briefing"')
    expect(script).toContain('idempotencyKey: "one-selfie-founder-briefing-2026-07-13"')
    expect(script).not.toContain("RESEND_AUDIENCE_ID")
  })
})
