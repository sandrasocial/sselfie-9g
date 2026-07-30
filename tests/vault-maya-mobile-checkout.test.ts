// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8")

describe("Vault Maya fresh mobile checkout", () => {
  it("contains the long founder-price summary without allowing it to widen the card", () => {
    const page = read("app/checkout/vault-maya/page.tsx")
    const capture = read("components/prompt-vault/prompt-vault-checkout-email-capture.tsx")

    expect(page).toContain("$19/month founder price · then $29/month for new members")
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
