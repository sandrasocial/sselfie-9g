// @vitest-environment node

import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import { PROMPT_VAULT_EMAIL_TOUCHES } from "@/lib/email/prompt-vault-email-sequence"
import { STARTER_KIT_EMAIL_TOUCHES } from "@/lib/email/starter-kit-email-sequence"

const ROOT = process.cwd()
const route = fs.readFileSync(
  path.join(ROOT, "app/api/cron/paid-product-membership-bridge/route.ts"),
  "utf8",
)

describe("paid product ascension", () => {
  it("keeps legacy product ladders out of the active Starter Kit registry", () => {
    expect(STARTER_KIT_EMAIL_TOUCHES.map(touch => touch.emailType)).toEqual([
      "starter-kit-day0-delivery",
      "starter-kit-day1-quick-win",
      "starter-kit-day3-story",
      "starter-kit-day5-proof",
    ])
  })

  it("keeps Prompt Vault customer-success touches unchanged", () => {
    expect(PROMPT_VAULT_EMAIL_TOUCHES.map(touch => touch.emailType)).toEqual([
      "prompt-vault-day2-first-result",
      "prompt-vault-day5-fix-bad-result",
      "prompt-vault-day10-next-shoot",
    ])
  })

  it("retires the direct low-ticket to Studio email jump", () => {
    expect(route).toContain("Retired 2026-08-22")
    expect(route).toContain("low-ticket quick result -> SSELFIE community/implementation -> Studio app")
    expect(route).toContain("direct_low_ticket_to_studio_bridge_retired_pending_community_bridge")
    expect(route).not.toContain("sendEmail(")
    expect(route).not.toContain("generateStarterKitMembershipBridgeEmail")
    expect(route).not.toContain("generatePromptVaultMembershipBridgeEmail")
  })
})
