// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("Prompt Vault checkout experience", () => {
  it("keeps the email action ahead of optional copy and proof", () => {
    const page = fs.readFileSync(path.join(ROOT, "app/checkout/prompt-vault/page.tsx"), "utf8")
    const capture = fs.readFileSync(
      path.join(ROOT, "components/prompt-vault/prompt-vault-checkout-email-capture.tsx"),
      "utf8",
    )

    expect(page).toContain('copy=""')
    expect(page).toContain('proofQuote=""')
    expect(page).toContain("mobileFormFirst")
    expect(capture).toContain("{copy ? <p className=\"pv-copy\">{copy}</p> : null}")
  })

  it("puts the checkout action before the editorial image on mobile", () => {
    const capture = fs.readFileSync(
      path.join(ROOT, "components/prompt-vault/prompt-vault-checkout-email-capture.tsx"),
      "utf8",
    )

    expect(capture).toContain(".pv-email-shell.pv-mobile-form-first .pv-email-card")
    expect(capture).toContain(".pv-email-shell.pv-mobile-form-first .pv-visual-panel")
    expect(capture).toContain("object-position: center 34%;")
    expect(capture).toContain("object-position: center 28%;")
  })
})
