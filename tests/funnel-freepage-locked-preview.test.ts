import { describe, expect, it } from "vitest"

import { isAllowedAnalyticsEventName } from "@/lib/analytics/event-contract"
import { getStaticVaultFreebieCollections } from "@/lib/ai-prompts/prompt-data"

describe("AI prompts free page locked Vault previews", () => {
  it("keeps paid prompts out of locked teaser data", () => {
    const collections = getStaticVaultFreebieCollections()

    expect(collections.length).toBeGreaterThan(0)

    for (const collection of collections) {
      expect(collection.freeCard.prompt).toEqual(expect.any(String))
      expect(collection.shotCount).toBeGreaterThan(1)
      expect(collection.lockedShots).toHaveLength(collection.shotCount - 1)

      for (const lockedShot of collection.lockedShots) {
        expect(lockedShot.title).toEqual(expect.any(String))
        expect("prompt" in lockedShot).toBe(false)
      }
    }
  })

  it("allows the locked tile analytics events", () => {
    expect(isAllowedAnalyticsEventName("ai_prompts_locked_vault_tiles_view")).toBe(true)
    expect(isAllowedAnalyticsEventName("ai_prompts_locked_vault_tile_click")).toBe(true)
  })
})
