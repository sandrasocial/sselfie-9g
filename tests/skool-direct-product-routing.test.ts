import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { VISIBILITY_MINI_PRODUCT_BY_SLUG } from "@/lib/visibility-products"

const read = (file: string) => readFileSync(file, "utf8")

describe("Skool direct product links", () => {
  it.each([
    ["selfie-guide", "app/academy/access/selfie-guide/page.tsx"],
    ["starter-kit", "app/academy/access/starter-kit/page.tsx"],
    ["prompt-vault", "app/academy/access/prompt-vault/page.tsx"],
    ["presets", "app/academy/access/presets/page.tsx"],
    ["selfie-to-ai-photos-kit", "app/academy/access/selfie-to-ai-photos-kit/page.tsx"],
  ])("keeps %s behind the shared Academy auth return path", (_slug, file) => {
    expect(read(file)).toContain("requireAcademyPageUser")
  })

  it.each([
    ["ai-photo-refresh", "ai_photo_refresh"],
    ["concept-cards", "concept_cards_pack"],
    ["captions", "caption_sprint"],
    ["feed-reset", "feed_reset_9grid"],
  ])("maps %s to its exact membership workspace", (slug, productId) => {
    expect(VISIBILITY_MINI_PRODUCT_BY_SLUG[slug]?.id).toBe(productId)
  })

  it("opens mini-products directly in their named workbook", () => {
    const route = read("app/academy/access/[productSlug]/page.tsx")
    expect(route).toContain("entitlementState.membershipActive ||")
    expect(route).toContain("academy_view=workbook&academy_workbook=${product.slug}")
  })

  it("recognizes Skool membership for both Vault Maya and the full Maya app", () => {
    const suiteAccess = read("lib/trial/suite-trial.ts")
    const vaultStudio = read("app/vault-maya/studio/page.tsx")
    const mayaApp = read("app/app/page.tsx")

    expect(suiteAccess).toContain("const hasActiveSkool = await hasActiveSkoolMembership(userId)")
    expect(suiteAccess).toContain("if (hasActiveSkool)")
    expect(vaultStudio).toContain("const access = await getSuiteAccess(neonUserId)")
    expect(mayaApp).toContain("getSuiteAccess(String(neonUserId))")
  })
})
