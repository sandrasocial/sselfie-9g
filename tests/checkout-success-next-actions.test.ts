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

  it("routes visibility_suite buyers to /academy/access/visibility-suite with correct label", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    expect(successContent).toContain('productType === "visibility_suite"')
    expect(successContent).toContain('href: "/academy/access/visibility-suite"')
    expect(successContent).toContain('label: "Open your Visibility To Paid Path"')
  })

  it("prioritises purchaseType (URL param) over userInfo.productType (DB subscription)", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    // purchaseType must appear BEFORE userInfo?.productType in the resolvedProductType expression
    const resolvedLine = successContent
      .split("\n")
      .find(line => line.includes("resolvedProductType") && line.includes("purchaseType") && line.includes("userInfo"))
    expect(resolvedLine).toBeTruthy()
    const purchaseTypeIdx = resolvedLine!.indexOf("purchaseType")
    const userInfoIdx = resolvedLine!.indexOf("userInfo")
    expect(purchaseTypeIdx).toBeLessThan(userInfoIdx)
    expect(successContent).toContain("{getProductLabel(resolvedProductType)}")
  })

  it("does not show credits row for visibility_suite even when user has existing credits", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    // Credits row must be gated on CREDIT_GRANTING_TYPES, not just any user.credits value
    expect(successContent).toContain("CREDIT_GRANTING_TYPES")
    expect(successContent).toContain("CREDIT_GRANTING_TYPES.has(resolvedProductType)")
    // visibility_suite must NOT be in the credit-granting set
    expect(successContent).not.toMatch(/CREDIT_GRANTING_TYPES\s*=.*visibility_suite/)
  })

  it("shows Visibility To Paid Suite included items for visibility_suite purchases", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    expect(successContent).toContain("VISIBILITY_SUITE_INCLUDES")
    expect(successContent).toContain("What To Say")
    expect(successContent).toContain("Show Up")
    expect(successContent).toContain("Get Paid")
    expect(successContent).toContain("Maya Visibility Plan")
  })

  it("does not show Brand Strategy Pack label for visibility_suite product type", () => {
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")

    // getProductLabel must map visibility_suite to its own label — not fall through to brand_strategy_pack
    expect(successContent).toContain('case "visibility_suite"')
    expect(successContent).toContain('return "Visibility To Paid Suite"')
    // The brand strategy pack case must be separate
    expect(successContent).toContain('case "brand_strategy_pack"')
    expect(successContent).toContain('return "Brand Strategy Pack"')
  })

  it("100% discounted checkout still resolves visibility_suite product type from URL param", () => {
    // This is a static code assertion: when purchaseType is set from the URL,
    // it must take precedence regardless of amount_total or user account state.
    const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")
    const successPage = readFileSync("app/checkout/success/page.tsx", "utf8")

    // The page must pass purchaseType from searchParams to SuccessContent
    expect(successPage).toContain("purchaseType={params.type}")
    // SuccessContent must accept purchaseType as a prop
    expect(successContent).toContain("purchaseType?:")
    // resolvedProductType must derive from purchaseType first
    expect(successContent).toContain("purchaseType || userInfo?.productType")
  })
})
