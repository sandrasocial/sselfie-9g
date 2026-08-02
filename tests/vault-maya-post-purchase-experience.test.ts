import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")
const vaultSuccess = readFileSync("components/checkout/vault-maya-success.tsx", "utf8")
const passwordSetup = readFileSync("app/auth/setup-password/page.tsx", "utf8")

describe("Vault Maya post-purchase experience", () => {
  it("uses a dedicated Vault Maya handoff instead of the generic checkout confirmation", () => {
    expect(successContent).toContain('resolvedProductType === "vault_maya"')
    expect(successContent).toContain("<VaultMayaSuccess")
    expect(vaultSuccess).toContain("Your membership is ready.")
    expect(vaultSuccess).toContain("Create my first photo")
  })

  it("keeps the permanent return path and billing reassurance visible", () => {
    expect(vaultSuccess).toContain("Keep the email so you can find Vault Maya again anytime.")
    expect(vaultSuccess).toContain("Manage or cancel from Account &amp;")
  })

  it("does not introduce an upsell before the buyer creates her first photo", () => {
    expect(vaultSuccess).not.toMatch(/SSELFIE SUITE|upgrade|upsell/i)
  })

  it("reuses the approved Vault handoff when an emailed password link is opened", () => {
    expect(passwordSetup).toContain('nextAfterSetup === "/vault-maya/studio"')
    expect(passwordSetup).toContain("<VaultMayaSuccess")
    expect(passwordSetup).toContain('showNameField={false}')
  })
})
