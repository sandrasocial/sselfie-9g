// @vitest-environment node

import { existsSync, readFileSync, statSync } from "node:fs"
import { describe, expect, it } from "vitest"

const starterPage = readFileSync("components/sselfie/public-marketing.tsx", "utf8")
const bundlePage = readFileSync("components/one-selfie/one-selfie-landing.tsx", "utf8")
const bundleRoute = readFileSync("app/one-selfie/page.tsx", "utf8")

const assets = [
  "public/images/starter-kit/starter-kit-product-mockup-v3.webp",
  "public/images/starter-kit/preset-collection-vertical-v3.webp",
  "public/images/one-selfie/bundle-products-mockup-v2.webp",
  "public/images/one-selfie/og-bundle-v2.webp",
] as const

describe("public product mockups", () => {
  it("keeps the Starter Kit and campaign on separate truthful visuals", () => {
    expect(starterPage).toContain("/images/starter-kit/starter-kit-product-mockup-v3.webp")
    expect(starterPage).toContain("/images/starter-kit/preset-collection-vertical-v3.webp")
    expect(starterPage).not.toContain("16 Lightroom Presets")
    expect(bundlePage).toContain("/images/one-selfie/bundle-products-mockup-v2.webp")
    expect(bundleRoute).toContain("/images/one-selfie/og-bundle-v2.webp")
    expect(starterPage).not.toContain("starter-kit-product-mockup-v2.webp")
    expect(starterPage).not.toContain("preset-collection-vertical-v2.webp")
    expect(bundlePage).not.toContain("bundle-products-mockup-v1.webp")
    expect(bundleRoute).not.toContain("og-bundle-v1.webp")
  })

  it("ships every optimized asset and keeps it below the public-page budget", () => {
    for (const asset of assets) {
      expect(existsSync(asset), `${asset} should exist`).toBe(true)
      expect(statSync(asset).size, `${asset} should remain below 500 KB`).toBeLessThan(500_000)
    }
  })
})
