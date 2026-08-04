// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8")

describe("Vault Maya direct checkout", () => {
  it("sends mobile and desktop buyers directly to secure Stripe payment", () => {
    const page = read("app/checkout/vault-maya/page.tsx")

    expect(page).not.toContain("PromptVaultCheckoutEmailCapture")
    expect(page).not.toContain("shouldShowCheckoutEmailCapture")
    expect(page).toContain("createLandingCheckoutSession(productId, params.promo, checkoutEmail")
    expect(page).toContain("buildCheckoutRedirectUrl(clientSecret, productId")
  })
})
