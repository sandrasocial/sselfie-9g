// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8")

describe("Vault Maya fresh mobile checkout", () => {
  it("keeps the price compact and puts the email action before imagery on mobile", () => {
    const page = read("app/checkout/vault-maya/page.tsx")
    const capture = read("components/prompt-vault/prompt-vault-checkout-email-capture.tsx")

    expect(page).toContain('productPrice={price.flipped ? "$29/month" : "$19/month"}')
    expect(page).toContain('proofQuote=""')
    expect(page).toContain("mobileFormFirst")
    expect(page).toContain("showSupportingVisuals={false}")
    expect(page).not.toContain("quiet-luxury-london-shot-1.jpg")
    expect(page).not.toContain("clean-girl-morning-shot-1.jpg")
    expect(capture).toContain(".pv-email-shell,")
    expect(capture).toContain(".pv-email-shell * {")
    expect(capture).toContain("box-sizing: border-box;")
    expect(capture).toMatch(
      /@media \(max-width: 899px\)[\s\S]*?\.pv-order \{[\s\S]*?flex-direction: column;/,
    )
    expect(capture).toMatch(
      /@media \(max-width: 899px\)[\s\S]*?\.pv-order-price \{[\s\S]*?white-space: normal;/,
    )
  })
})
