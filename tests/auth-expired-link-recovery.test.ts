import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("expired purchase password link recovery", () => {
  it("gives the customer clear password and purchase recovery actions", () => {
    const errorPage = readFileSync("app/auth/error/page.tsx", "utf8")

    expect(errorPage).toContain("Your purchase is safe.")
    expect(errorPage).toContain("/auth/forgot-password?next=")
    expect(errorPage).toContain('href="/access"')
    expect(errorPage).not.toContain("Error: {params.error}")
  })

  it("returns the customer to the intended product after requesting a fresh link", () => {
    const forgotPasswordPage = readFileSync("app/auth/forgot-password/page.tsx", "utf8")

    expect(forgotPasswordPage).toContain('searchParams.get("next")')
    expect(forgotPasswordPage).toContain("sanitizeRedirect")
    expect(forgotPasswordPage).toContain(
      "/auth/callback?next=${encodeURIComponent(nextAfterReset)}"
    )
  })

  it("keeps direct Prompt Vault access ahead of optional password setup", () => {
    const template = readFileSync("lib/email/templates/prompt-vault-delivery.ts", "utf8")
    const openVault = template.indexOf('renderStoneButton("Open Your Prompt Vault"')
    const setPassword = template.indexOf('renderStoneButton("Set Your Password"')

    expect(openVault).toBeGreaterThan(-1)
    expect(setPassword).toBeGreaterThan(-1)
    expect(openVault).toBeLessThan(setPassword)
  })
})
