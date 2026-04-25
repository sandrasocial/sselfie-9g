import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("checkout success next actions", () => {
  it("routes Starter Kit and Masterclass buyers to their deliverable start points", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    expect(successContent).toContain('case "starter_kit"')
    expect(successContent).toContain('case "masterclass"')
    expect(successContent).toContain('href: "/academy/access/starter-kit"')
    expect(successContent).toContain('label: "Open your Starter Kit"')
    expect(successContent).toContain('href: "/academy/access/brand-strategy"')
    expect(successContent).toContain('label: "Start with Brand Strategy"')
    expect(successContent).toContain('secondaryHref: "/academy"')
  })
})
