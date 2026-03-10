// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8")
}

describe("maya premerge stability hygiene", () => {
  it("removes workbook, landing-page, and photoshoot quick prompts from Maya home", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")

    expect(mayaChatScreen).not.toContain('label: "Create Workbook"')
    expect(mayaChatScreen).not.toContain("Create a workbook PDF draft for this offer")
    expect(mayaChatScreen).not.toContain('label: "Build a page"')
    expect(mayaChatScreen).not.toContain("Create a landing page draft for my current offer")
    expect(mayaChatScreen).not.toContain('label: "Create Photoshoot"')
    expect(mayaChatScreen).not.toContain("I want to create a photoshoot for my new offer")
  })

  it("removes workbook/page capability cards and retired asset messaging from Maya chat UI", () => {
    const mayaChatInterface = read("components/sselfie/maya/maya-chat-interface.tsx")
    const mayaChatRoute = read("app/api/maya/chat/route.ts")
    const accountScreen = read("components/sselfie/account-screen.tsx")
    const assetGeneration = read("lib/maya/asset-generation.ts")

    expect(mayaChatInterface).not.toContain("Create Workbook PDF")
    expect(mayaChatInterface).not.toContain("Create a workbook PDF for my offer")
    expect(mayaChatInterface).not.toContain("Create a workbook draft for my current offer.")
    expect(mayaChatInterface).not.toContain("Create a landing page draft for my current offer.")
    expect(mayaChatRoute).not.toContain("workbook drafts")
    expect(accountScreen).not.toContain("landing page or content calendar")
    expect(assetGeneration).not.toContain("Create a workbook draft for my current offer")
  })

  it("removes start-fresh reset wiring from the Maya image library modal", () => {
    const mayaChatScreen = read("components/sselfie/maya-chat-screen.tsx")
    const libraryModalBlock =
      mayaChatScreen.match(/<ImageLibraryModal[\s\S]*?\/>/)?.[0] || ""

    expect(libraryModalBlock).not.toContain("onStartFresh=")
    expect(libraryModalBlock).toContain("onManageCategory=")
  })

  it("keeps pro photoshoot entry admin-only in concept cards until the workflow is rebuilt", () => {
    const proConceptCard = read("components/sselfie/pro-mode/ConceptCardPro.tsx")
    const classicConceptCard = read("components/sselfie/concept-card.tsx")

    expect(proConceptCard).toContain("isAdmin && !isCreatingProPhotoshoot")
    expect(classicConceptCard).toContain("isAdmin && isProMode && !isCreatingProPhotoshoot")
  })
})
