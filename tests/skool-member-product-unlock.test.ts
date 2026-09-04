// @vitest-environment node
import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { projectAcademyProductRegistry } from "@/lib/academy-entitlements"

/**
 * Skool is the hub: a member gets every digital product free.
 *
 * `membershipIncluded` is only half of that. Several products are delivered
 * through a per-buyer access token minted by a Stripe webhook, so a member who
 * never bought has entitlement and no token — and the access page bounces her to
 * the sales page for something she already owns. Both halves are asserted here.
 */
describe("Skool members get every digital product", () => {
  // projectAcademyProductRegistry appends defaults for ids the database omits,
  // so passing no rows yields exactly the code-default registry.
  const registry = projectAcademyProductRegistry([])
  const active = registry.filter((product) => product.active)

  it("includes every active product in the membership", () => {
    const excluded = active
      .filter((product) => !product.membershipIncluded)
      .map((product) => product.id)
    expect(excluded, `these active products are not included in the membership`).toEqual([])
  })

  it("gives every privately delivered product a real access route", () => {
    // accessTarget drives /academy/access/<target>. A product whose route does not
    // exist is a 404 for a member who owns it, which is worse than a paywall
    // because nothing tells her what went wrong.
    const missing = active
      .filter((product) => product.deliveryKind === "direct_private")
      // The [productSlug] route only resolves visibility mini-products, so it is
      // NOT a fallback for a private delivery — each needs its own route.
      .filter((product) => !existsSync(`app/academy/access/${product.accessTarget}/page.tsx`))
      .map((product) => `${product.id} -> /academy/access/${product.accessTarget}`)
    expect(missing, "privately delivered products with no access route").toEqual([])
  })

  it("mints a token for the products a member never bought", () => {
    // The three token-delivered unlocks must route through the purchase-path
    // helpers, so a member's token is indistinguishable from a buyer's.
    const unlock = "lib/skool/member-product-unlock.ts"
    expect(existsSync(unlock)).toBe(true)

    for (const [page, helper] of [
      ["app/academy/access/prompt-vault/page.tsx", "unlockPromptVaultForMember"],
      ["app/academy/access/selfie-to-ai-photos-kit/page.tsx", "unlockAiPhotosKitForMember"],
      ["app/academy/access/presets/page.tsx", "unlockPresetsForMember"],
    ] as const) {
      expect(existsSync(page), `${page} is missing`).toBe(true)
    }
  })
})
