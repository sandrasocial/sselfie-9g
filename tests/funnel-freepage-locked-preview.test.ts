// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import { isAllowedAnalyticsEventName } from "@/lib/analytics/event-contract"
import {
  FREEBIE_ROTATING_DROP_LIMIT,
  FREEBIE_STATIC_STARTER_LIMIT,
  FREEBIE_TOTAL_SHOOT_LIMIT,
  getCuratedStaticVaultFreebieCollections,
  getStaticVaultFreebieCollections,
  selectLatestFreebieShootCollections,
} from "@/lib/ai-prompts/prompt-data"
import { selectRotatingPublishedFreebieCollections } from "@/lib/vault/freebie-curation"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

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

  it("keeps the old curated static helper capped for legacy callers", () => {
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

  it("caps published Shoot Studio freebie previews instead of appending forever", () => {
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
        makeCollection("older-drop-2", "2026-06-07T10:00:00.000Z"),
        makeCollection("older-drop-3", "2026-06-06T10:00:00.000Z"),
        makeCollection("older-drop-4", "2026-06-05T10:00:00.000Z"),
        makeCollection("older-drop-5", "2026-06-04T10:00:00.000Z"),
      ],
      { limit: FREEBIE_ROTATING_DROP_LIMIT }
    )

    expect(curated).toHaveLength(FREEBIE_ROTATING_DROP_LIMIT)
    expect(curated[0].freeCard.id).toBe("newest-drop-shot-1")
    expect(curated.map(collection => collection.freeCard.id)).not.toContain("older-drop-5-shot-1")
    expect(curated[0].lockedShots).toEqual([
      {
        title: "newest-drop · Shot 2",
        exampleImage: "/image-2.jpg",
      },
    ])
    expect("prompt" in curated[0].lockedShots[0]).toBe(false)
  })

  it("caps the delivered freebie to the latest five shoot previews", () => {
    const makePublishedPreview = (id: string) => ({
      freeCard: {
        number: id.replace(/\D/g, "") || "1",
        id,
        title: `${id} title`,
        whenToUse: "Use it.",
        mood: "test",
        prompt: "free prompt",
        exampleImage: "/image.jpg",
      },
      name: `${id} collection`,
      shotCount: 2,
      lockedShots: [{ title: `${id} locked`, exampleImage: "/locked.jpg" }],
    })

    const selected = selectLatestFreebieShootCollections(
      [makePublishedPreview("published-1"), makePublishedPreview("published-2")],
      getStaticVaultFreebieCollections()
    )

    expect(selected).toHaveLength(FREEBIE_TOTAL_SHOOT_LIMIT)
    expect(selected.slice(0, 2).map(collection => collection.freeCard.id)).toEqual([
      "published-1",
      "published-2",
    ])
    expect(selected.map(collection => collection.freeCard.id)).not.toContain("dark-balcony-shot-1")
  })

  it("delivers the five free prompts before making one paid Vault invitation", () => {
    const freePageContents = read("app/ai-prompts/access/[token]/page.tsx")
    const vaultLandingContents = read("app/prompt-vault/page.tsx")
    const vaultAccessContents = read("app/access/prompt-vault/[token]/page.tsx")

    expect(freePageContents).toContain("Your five free AI photo prompts are ready.")
    expect(freePageContents).toContain("HOW IT WORKS")
    expect(freePageContents).toContain("Choose your first look.")
    expect(freePageContents).toContain("You have five complete prompts to try.")
    expect(freePageContents).toContain("Get the complete SSELFIE Prompt Vault")
    expect(freePageContents).not.toContain("The latest five shoot previews.")
    expect(freePageContents).not.toContain("Newest Vault world")
    expect(freePageContents).not.toContain("visual identity")
    expect(freePageContents).not.toContain("which version of you")
    expect(freePageContents).not.toContain("ap-locked-grid")
    expect(freePageContents).not.toContain("ai_prompts_locked_vault_tile_click")
    expect(freePageContents).not.toContain("BONUS PROMPT LIBRARY")
    expect(freePageContents).not.toContain("MAIN_LOOKS.map")
    const vaultLandingComponent = read("components/sselfie/public-marketing.tsx")
    expect(vaultLandingContents).toContain("PromptVaultPageContent")
    expect(vaultLandingComponent).toContain("Turn one selfie into a complete AI photoshoot.")
    expect(vaultLandingComponent).toContain("See how each photoshoot continues.")
    expect(vaultLandingComponent).toContain("Here are three different photos from six")
    expect(vaultLandingComponent).not.toContain("Turn one selfie into unlimited photoshoots.")
    expect(vaultLandingComponent).not.toContain("A Vault prompt locks in your face and your body")
    expect(vaultLandingComponent).not.toContain("Not a stranger with your haircut")
    expect(vaultLandingComponent).not.toContain("Pick a shoot. See the first photo free.")
    expect(vaultLandingContents).toContain("series.slice(1, 4)")
    expect(vaultLandingContents).toContain("collection.cards.slice(1, 4)")
    expect(vaultLandingContents).not.toContain("Turn one<br />selfie into<br />unlimited")
    expect(vaultLandingContents).not.toContain("import { CopyButton }")
    expect(vaultLandingComponent).not.toContain("import { CopyButton }")

    expect(vaultAccessContents).toContain("You unlocked the full SSELFIE shoot library")
    expect(vaultAccessContents).toContain("Start with one full shoot")
    expect(vaultAccessContents).not.toContain("See the System · $170")
  })

  it("measures Prompt Vault landing CTA clicks separately from checkout", () => {
    const checkoutLinkContents = read("components/prompt-vault/prompt-vault-checkout-link.tsx")

    expect(isAllowedAnalyticsEventName("prompt_vault_landing_cta_clicked")).toBe(true)
    expect(checkoutLinkContents).toContain('event: "prompt_vault_landing_cta_clicked"')
    expect(checkoutLinkContents).toContain("properties: { placement }")
  })

  it("keeps prompt copying focused on the free result instead of opening a sales card", () => {
    const freePageContents = read("app/ai-prompts/access/[token]/page.tsx")

    expect(freePageContents).toContain('label="Copy prompt"')
    expect(freePageContents).not.toContain(
      'afterCopyViewEvent="ai_prompts_after_copy_vault_cta_view"'
    )
    expect(freePageContents).not.toContain('afterCopyTrackEvent="ai_prompts_prompt_vault_click"')
    expect(freePageContents).not.toContain('checkout_source: "after_copy_prompt_vault_cta"')
    expect(freePageContents).not.toContain('checkout_source: "after_copy_prompt_kit_cta"')
    expect(freePageContents).not.toContain(
      'afterCopyViewEvent="ai_prompts_after_copy_kit_cta_view"'
    )
  })
})
