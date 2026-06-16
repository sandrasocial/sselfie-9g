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
    expect(briefGenerator).toContain("newestPublishedDrops")
    expect(briefGenerator).toContain("dataPacket.suite.includedProducts")
    expect(briefGenerator).toContain("Do not give away the full copy-paste Vault prompt")
    expect(briefGenerator).toContain("sanitizeContentBriefOutput")
  })
})
