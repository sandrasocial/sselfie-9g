import { describe, expect, it } from "vitest"

import { classifyVaultMayaLaunchAudience } from "@/lib/email/campaigns/vault-maya-launch-audience"

describe("Vault Maya launch audience classification", () => {
  it("keeps SUITE, buyers and nonbuyers mutually exclusive", () => {
    const result = classifyVaultMayaLaunchAudience({
      contacts: [
        { email: "suite@example.com" },
        { email: "buyer@example.com" },
        { email: "lead@example.com" },
        { email: "trial@example.com" },
        { email: "vault@example.com" },
        { email: "unsubscribed@example.com", unsubscribed: true },
        { email: "LEAD@example.com" },
      ],
      paidSuiteEmails: ["suite@example.com"],
      salesExcludedEmails: [
        "suite@example.com",
        "trial@example.com",
        "vault@example.com",
      ],
      commerceBuyerEmails: ["buyer@example.com", "suite@example.com"],
    })

    expect(result.subscribed).toBe(5)
    expect(result.suite.map(contact => contact.email)).toEqual(["suite@example.com"])
    expect(result.commerce.map(contact => contact.email)).toEqual(["buyer@example.com"])
    expect(result.nonbuyers.map(contact => contact.email)).toEqual(["lead@example.com"])
    expect(result.protectedNotSuite).toBe(2)
    expect(result.eligibleNonmembers).toBe(2)
  })

  it("does not treat an unsubscribed contact as sendable", () => {
    const result = classifyVaultMayaLaunchAudience({
      contacts: [{ email: "no@example.com", unsubscribed: true }],
      paidSuiteEmails: [],
      salesExcludedEmails: [],
      commerceBuyerEmails: [],
    })

    expect(result.subscribed).toBe(0)
    expect(result.eligibleNonmembers).toBe(0)
  })
})
