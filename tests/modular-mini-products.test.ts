import { readFileSync } from "node:fs"
import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"

const PRODUCT_ROUTES = [
  ["concept_cards_pack", "concept-cards"],
  ["caption_sprint", "captions"],
  ["feed_reset_9grid", "feed-reset"],
  ["ai_photo_refresh", "ai-photo-refresh"],
] as const

describe("modular mini-products", () => {
  it("adds standalone public pages for every stripped Studio feature", () => {
    for (const [, slug] of PRODUCT_ROUTES) {
      expect(existsSync(`app/${slug}/page.tsx`)).toBe(true)
    }
  })

  it("adds product IDs, price env mapping, and checkout routing for modular offers", () => {
    const products = readFileSync("lib/products.ts", "utf8")
    const checkout = readFileSync("app/checkout/academy-product/[productId]/page.tsx", "utf8")

    for (const [productId] of PRODUCT_ROUTES) {
      expect(products).toContain(productId)
      expect(checkout).toContain("VISIBILITY_MINI_PRODUCT_IDS")
    }

    expect(products).toContain("STRIPE_PRICE_CONCEPT_CARDS_PACK")
    expect(products).toContain("STRIPE_PRICE_CAPTION_SPRINT")
    expect(products).toContain("STRIPE_PRICE_FEED_RESET_9GRID")
    expect(products).toContain("STRIPE_PRICE_AI_PHOTO_REFRESH")
  })

  it("routes mini-product buyers to focused product homes, not full Maya or Studio", () => {
    const success = readFileSync("components/checkout/success-content.tsx", "utf8")
    const accessPage = readFileSync("app/academy/access/[productSlug]/page.tsx", "utf8")
    const workspace = readFileSync("components/academy/mini-product-workspace.tsx", "utf8")

    expect(success).toContain('href: "/academy/access/concept-cards"')
    expect(success).toContain('href: "/academy/access/captions"')
    expect(success).toContain('href: "/academy/access/feed-reset"')
    expect(success).toContain('href: "/academy/access/ai-photo-refresh"')
    expect(accessPage).toContain("MiniProductWorkspace")
    expect(workspace).toContain("focused mini-product workspace")
    expect(workspace).toContain("/api/academy/mini-product/generate")
    expect(workspace).not.toContain("router.push(\"/studio")
  })

  it("uses product-specific workspaces with progress and locked upgrade previews", () => {
    const workspace = readFileSync("components/academy/mini-product-workspace.tsx", "utf8")

    expect(workspace).toContain("Progress")
    expect(workspace).toContain("Next upgrade preview")
    expect(workspace).toContain("Generate with Maya")
    expect(workspace).toContain("Main topic or offer")
    expect(workspace).toContain("Context Maya should use")
    expect(workspace).toContain("Copy all")
    expect(workspace).toContain("Complete")
  })

  it("keeps mini-product generation behind access and shared Maya model routing", () => {
    const route = readFileSync("app/api/academy/mini-product/generate/route.ts", "utf8")

    expect(route).toContain("requireAcademyProductAccess(productId)")
    expect(route).toContain("VISIBILITY_MINI_PRODUCT_IDS")
    expect(route).toContain('createMayaOpenRouterModel("chat_pro")')
    expect(route).toContain("VISIBILITY_MINI_PRODUCT_BY_ID")
    expect(route).not.toContain('model: "anthropic/claude-sonnet-4-6"')
  })

  it("configures visibility lifecycle sequences without sending live emails", () => {
    const sequences = readFileSync("lib/email/visibility-lifecycle-sequences.ts", "utf8")
    const cron = readFileSync("app/api/cron/nurture-sequence/route.ts", "utf8")

    expect(sequences).toContain("quiz_message_clarity_5d")
    expect(sequences).toContain("quiz_consistency_5d")
    expect(sequences).toContain("quiz_sales_5d")
    expect(sequences).toContain("micro_to_suite_4d")
    expect(sequences).toContain("suite_to_studio_7d")
    expect(sequences).toContain("studio_to_sprint_14d")
    expect(cron).toContain("VISIBILITY_LIFECYCLE_SEQUENCES")
  })
})
