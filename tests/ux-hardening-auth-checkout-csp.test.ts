// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("post-phase4 ux hardening", () => {
  it("preserves returnTo when navigating between auth login and sign-up", () => {
    const loginPage = readFile("app/auth/login/page.tsx")
    const signUpPage = readFile("app/auth/sign-up/page.tsx")

    expect(loginPage).toContain("/auth/sign-up?returnTo=")
    expect(signUpPage).toContain("/auth/login?returnTo=")
  })

  it("gates checkout-upgrade on server auth before rendering Stripe checkout", () => {
    const checkoutUpgradePage = readFile("app/checkout-upgrade/page.tsx")

    expect(checkoutUpgradePage).toContain("createServerClient")
    expect(checkoutUpgradePage).toContain('redirect("/auth/login?returnTo=%2Fcheckout-upgrade")')
  })

  it("allows google fonts in CSP style/font directives", () => {
    const middleware = readFile("middleware.ts")

    expect(middleware).toContain("https://fonts.googleapis.com")
    expect(middleware).toContain("https://fonts.gstatic.com")
  })
})
