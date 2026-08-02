import { describe, expect, it } from "vitest"
import {
  generateVaultMayaWelcomeEmail,
  VAULT_MAYA_WELCOME_SUBJECTS,
} from "@/lib/email/templates/vault-maya-welcome"

// Launch requirement (Sandra, 2026-07-30): the welcome email must carry the studio access
// link, first-photo instructions, credit renewal details, top-ups, cancellation, support,
// and the failed-generation credit promise.
describe("Vault Maya welcome email", () => {
  const REQUIRED_LINES = [
    "/vault-maya/studio",
    "Start with one clear selfie",
    "Choose the photo you want",
    "Maya will create it for you",
    "30 photo creations every month, refreshed on your billing date",
    // B6 disclosure: monthly credits expire at refresh; purchased top-ups never do.
    "Unused monthly photos expire when they refresh",
    "top-up credits you purchase never expire",
    "You can top up, manage or cancel your membership",
    "Account & billing",
    "credit comes back automatically",
    "reply to this email",
  ]

  // Decision 5 (Sandra, 2026-07-30): no speed claims until n>=20 measured generations.
  it("carries no speed claim", () => {
    const email = generateVaultMayaWelcomeEmail({
      variant: "new",
      customerEmail: "test@example.com",
    })
    expect(email.html).not.toMatch(/30 seconds|seconds later|in seconds/i)
    expect(email.text).not.toMatch(/30 seconds|seconds later|in seconds/i)
  })

  it("new-member variant contains every required detail in html and text", () => {
    const email = generateVaultMayaWelcomeEmail({
      variant: "new",
      customerEmail: "test@example.com",
      customerName: "Test Person",
      passwordSetupUrl: "https://sselfie.ai/auth/confirm?token=x",
    })
    expect(email.subject).toBe(VAULT_MAYA_WELCOME_SUBJECTS.new)
    for (const line of REQUIRED_LINES) {
      expect(email.html).toContain(line)
      expect(email.text).toContain(line)
    }
    expect(email.html).toContain("Create my password")
  })

  it("existing-member variant links straight to the studio", () => {
    const email = generateVaultMayaWelcomeEmail({
      variant: "existing",
      customerEmail: "test@example.com",
    })
    expect(email.subject).toBe(VAULT_MAYA_WELCOME_SUBJECTS.existing)
    for (const line of REQUIRED_LINES) {
      expect(email.html).toContain(line)
      expect(email.text).toContain(line)
    }
    expect(email.html).toContain("Open Vault Maya")
  })
})
