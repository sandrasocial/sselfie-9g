import { describe, expect, it } from "vitest"

import { isAllowedAnalyticsEventName } from "@/lib/analytics/event-contract"
import {
  FREEBIE_ROTATING_DROP_LIMIT,
  FREEBIE_STATIC_STARTER_LIMIT,
  getCuratedStaticVaultFreebieCollections,
  getStaticVaultFreebieCollections,
} from "@/lib/ai-prompts/prompt-data"
import { selectRotatingPublishedFreebieCollections } from "@/lib/vault/freebie-curation"

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

  it("caps the freebie to a curated evergreen starter shoot", () => {
    const allCollections = getStaticVaultFreebieCollections()
    const curated = getCuratedStaticVaultFreebieCollections()

    expect(allCollections.length).toBeGreaterThan(curated.length)
    expect(curated).toHaveLength(FREEBIE_STATIC_STARTER_LIMIT)
    expect(curated.map(collection => collection.freeCard.id)).toEqual([
      "mysterious-vogue-shot-1",
      "clean-girl-morning-shot-1",
      "noir-femme-shot-1",
      "quiet-luxury-london-shot-1",
      "dark-feminine-cafe-shot-1",
    ])
  })

  it("keeps published Shoot Studio drops rotating instead of appending forever", () => {
    const makeCollection = (slug: string, publishedAt: string) => ({
      id: Number(publishedAt.slice(-1)),
      slug,
      title: slug,
      note: "Test collection",
      heroImage: null,
      moodLine: "Test mood.",
      sourceShootId: null,
      giveawayShotId: null,
      emailDropStatus: "queued",
      emailDropIncludedAt: null,
      publishedAt,
      cards: [
        {
          number: "1",
          id: `${slug}-shot-1`,
          title: `${slug} · Shot 1`,
          whenToUse: "Use first.",
          mood: "test",
          prompt: "paid prompt",
          exampleImage: "/image.jpg",
        },
        {
          number: "2",
          id: `${slug}-shot-2`,
          title: `${slug} · Shot 2`,
          whenToUse: "Use second.",
          mood: "test",
          prompt: "locked paid prompt",
          exampleImage: "/image-2.jpg",
        },
      ],
    })

    const curated = selectRotatingPublishedFreebieCollections(
      [
        makeCollection("newest-drop", "2026-06-15T10:00:00.000Z"),
        makeCollection("older-drop", "2026-06-08T10:00:00.000Z"),
      ],
      { limit: FREEBIE_ROTATING_DROP_LIMIT }
    )

    expect(curated).toHaveLength(1)
    expect(curated[0].freeCard.id).toBe("newest-drop-shot-1")
    expect(curated[0].lockedShots).toEqual([
      {
        title: "newest-drop · Shot 2",
        exampleImage: "/image-2.jpg",
      },
    ])
    expect("prompt" in curated[0].lockedShots[0]).toBe(false)
  })
})
