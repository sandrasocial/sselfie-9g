import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { getStaticVaultInventory } from "@/lib/ai-prompts/prompt-data"

describe("CONTENT-BRIEF-UPGRADE-01 guardrails", () => {
  const root = process.cwd()
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

  it("exposes static Vault inventory as data, not a hardcoded brief number", () => {
    const inventory = getStaticVaultInventory()
    const promptCount = inventory.reduce((sum, collection) => sum + collection.shotCount, 0)

    expect(inventory.length).toBeGreaterThan(0)
    expect(promptCount).toBeGreaterThan(0)
    expect(inventory.every(collection => collection.shotCount > 0)).toBe(true)
  })

  it("feeds live Vault drops and real SUITE inclusions into the content brief", () => {
    const briefGenerator = read("lib/content-engine/brief-generator.ts")

    expect(briefGenerator).toContain("getPublishedVaultCollections")
    expect(briefGenerator).toContain("getAcademyProductCatalog")
    expect(briefGenerator).toContain("getGrowthTruthSnapshot")
    expect(briefGenerator).toContain("dataPacket.growthTruth")
    expect(briefGenerator).toContain("newestPublishedDrops")
    expect(briefGenerator).toContain("dataPacket.suite.includedProducts")
    expect(briefGenerator).toContain("Instagram reach in dataPacket.growthTruth.recentInstagram")
    expect(briefGenerator).toContain("Do NOT write full posts, full captions, final carousel slides, hashtags, or copy-paste photoshoot prompts")
    expect(briefGenerator).toContain("sanitizeContentBriefOutput")
  })

  it("keeps active app surfaces away from stale 180K positioning", () => {
    const activeFiles = [
      "app/auth/sign-up/page.tsx",
      "app/bio/page.tsx",
      "app/layout.tsx",
      "components/sselfie/public-marketing.tsx",
      "components/sselfie/landing-page-new.tsx",
    ]

    for (const file of activeFiles) {
      expect(read(file), file).not.toMatch(/180K\+|180,000\+|180,000 followers/)
    }
  })
})
