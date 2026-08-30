import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  BOLD_EDITORIAL_COLORS,
  SSELFIE_NOIR_GLASS_COLORS,
  SSELFIE_NOIR_GLASS_GUARDRAILS,
  SSELFIE_NOIR_GLASS_SHAPE,
  SSELFIE_NOIR_GLASS_TYPE,
} from "@/lib/brand/bold-editorial-tokens"
import { renderSselfieNoirGlassProofEmail } from "@/lib/email/templates/bold-editorial-proof"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("SSELFIE Noir Glass foundation", () => {
  it("locks the approved cross-channel tokens and four-stage method", () => {
    expect(SSELFIE_NOIR_GLASS_COLORS).toMatchObject({
      obsidian: "#09090B",
      graphite: "#18181B",
      pearl: "#FAFAF9",
      paper: "#FFFFFF",
      coolMist: "#F0F0F2",
      pearlNeon: "#F3E6CF",
    })
    expect(SSELFIE_NOIR_GLASS_TYPE.display).toContain("Cormorant Garamond")
    expect(SSELFIE_NOIR_GLASS_TYPE.sans).toContain("Manrope")
    expect(SSELFIE_NOIR_GLASS_TYPE.signature).toContain("Allura")
    expect(SSELFIE_NOIR_GLASS_SHAPE.radius.surface).toBe("16px")
    expect(SSELFIE_NOIR_GLASS_GUARDRAILS.method).toEqual(["TAKE", "CREATE", "EDIT", "POST"])

    // Existing imports keep working, but these names are compatibility aliases only.
    expect(BOLD_EDITORIAL_COLORS.espresso).toBe(SSELFIE_NOIR_GLASS_COLORS.obsidian)
    expect(BOLD_EDITORIAL_COLORS.ivory).toBe(SSELFIE_NOIR_GLASS_COLORS.pearl)
    expect(BOLD_EDITORIAL_COLORS.champagne).toBe(SSELFIE_NOIR_GLASS_COLORS.pearlNeon)
  })

  it("exposes the approved Noir Glass global tokens", () => {
    const globals = read("app/globals.css")

    expect(globals).toContain("--ss-brand-obsidian: #09090b")
    expect(globals).toContain("--ss-brand-graphite: #18181b")
    expect(globals).toContain("--ss-brand-pearl: #fafaf9")
    expect(globals).toContain("--ss-brand-cool-mist: #f0f0f2")
    expect(globals).toContain("--ss-brand-pearl-neon: #f3e6cf")
    expect(globals).toContain("--ss-brand-glass-dark: rgba(9, 9, 11, 0.92)")
    expect(globals).not.toContain("--ss-brand-oxblood")
    expect(globals).toContain("--ss-brand-radius: 16px")
    expect(globals).toContain("Glass is reserved for navigation")
  })

  it("keeps the component reference private and discoverable to the founder", () => {
    const adminLayout = read("app/admin/layout.tsx")
    const designPage = read("app/admin/design-system/page.tsx")
    const adminNav = read("components/admin/admin-nav.tsx")

    expect(adminLayout).toContain("isAdminEmail")
    expect(designPage).toContain("SselfieNoirGlassProof")
    expect(designPage).toContain("renderSselfieNoirGlassProofEmail")
    expect(designPage).toContain("SSELFIE Noir Glass · Design reference")
    expect(adminNav).toContain('href: "/admin/design-system"')
  })

  it("moves the real Suite shell onto the approved frame without changing its destinations", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const navigation = read("components/app-v3/suite-editorial-navigation.tsx")
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    const gallery = read("components/app-v3/gallery-view.tsx")
    const appPage = read("app/app/page.tsx")

    expect(shell).toContain("SuiteEditorialNavigation")
    expect(shell).toContain('label: "Create"')
    expect(shell).toContain('label: "Gallery"')
    expect(shell).toContain('label: "Calendar"')
    expect(shell).toContain('label: "Learn"')
    expect(shell).toContain('label: "Account"')
    expect(navigation).toContain("suite-desktop-nav")
    expect(navigation).toContain("suite-bottom-nav")
    expect(navigation).toContain("suite-neon-sign")
    expect(navigation).toContain("Worth")
    expect(navigation).toContain("posting.")
    expect(navigation).toContain('const METHOD = ["TAKE", "CREATE", "EDIT", "POST"]')
    expect(frontDoor).toContain("Create something worth posting.")
    expect(frontDoor).toContain("var(--suite-accent)")
    expect(gallery).toContain("Gallery · Your visual library")
    expect(gallery).toContain("var(--suite-accent)")
    expect(appPage).toContain('title: "SSELFIE Suite"')
  })

  it("moves the real Maya workspace onto the editorial system without changing its controls", () => {
    const maya = read("components/app-v3/maya-concierge.tsx")
    const conceptCard = read("components/app-v3/concept-card.tsx")
    const resultViewer = read("components/app-v3/image-lightbox.tsx")
    const appLayout = read("app/app/layout.tsx")
    const mayaE2EFixture = read("app/e2e/maya-operating-layer/page.tsx")
    const mayaIdentity = read("lib/brand/maya.ts")

    expect(maya).toContain("suite-maya-header")
    expect(maya).toContain("suite-maya-thread")
    expect(maya).toContain("suite-maya-message--maya")
    expect(maya).toContain("suite-maya-message--user")
    expect(maya).toContain("suite-maya-composer")
    expect(maya).toContain("suite-maya-composer-rail")
    expect(maya).toContain("suite-maya-input")
    expect(maya).toContain("suite-maya-send")
    expect(maya).toContain('import { MAYA_AVATAR_SRC } from "@/lib/brand/maya"')
    expect(maya).toContain("const MAYA_AVATAR = MAYA_AVATAR_SRC")
    expect(mayaIdentity).toContain("/brand/maya-avatar-creative-director-v2.png")
    expect(maya).toContain('alt={isMaya ? "Maya" : ""}')
    expect(maya).toContain('aria-label="More Maya actions"')
    expect(maya).toContain('aria-label={textRefining ? "Updating" : "Send message"}')
    expect(maya).toContain('aria-label="Message Maya"')
    expect(maya).toContain('aria-label="Attach an inspiration image"')
    expect(appLayout).toContain("background: var(--suite-glass-dark)")
    expect(appLayout).toContain("backdrop-filter: blur(var(--suite-glass-blur))")
    expect(appLayout).toContain("suite-maya-neon-mark")
    expect(appLayout).toContain("suite-maya-avatar")
    expect(maya).toContain("suite-maya-path-tabs")
    expect(maya).toContain("suite-maya-journey-steps")
    expect(maya).toContain("AI Photos")
    expect(maya).toContain("Edit a Photo")
    expect(maya).toContain("Build a Post")
    expect(appLayout).toContain(".suite-concept-card")
    expect(conceptCard).toContain("suite-concept-result-rail")
    expect(conceptCard).toContain("Edit photo")
    expect(conceptCard).toContain("Download")
    expect(conceptCard).toContain("Finish as a post")
    expect(resultViewer).toContain("suite-result-viewer")
    expect(mayaE2EFixture).toContain('import AppV3Layout from "@/app/app/layout"')
    expect(mayaE2EFixture).toContain("<AppV3Layout>")
  })

  it("uses one approved Maya portrait across every Maya surface", () => {
    const surfaces = [
      "components/app-v3/maya-concierge.tsx",
      "components/app-v3/maya-floating-launcher.tsx",
      "components/feed-planner/calendar-maya-workspace.tsx",
      "components/sselfie/interactive-features-showcase.tsx",
      "components/sselfie/suite-multiformat-walkthrough.tsx",
      "components/sselfie/suite-product-walkthrough.tsx",
    ]

    for (const surfacePath of surfaces) {
      const surface = read(surfacePath)
      expect(surface, `${surfacePath} must use the shared Maya identity`).toContain(
        'import { MAYA_AVATAR_SRC } from "@/lib/brand/maya"'
      )
      expect(surface).not.toContain('const MAYA_AVATAR = "/brand/maya-avatar-editorial-v1.png"')
      expect(surface).not.toContain(
        'const MAYA_AVATAR = "/images/ai-prompts/clean-girl-morning-shot-1.jpg"'
      )
      expect(surface).not.toContain("https://i.postimg.cc/fTtCnzZv/out-1-22.png")
    }

    expect(
      readFileSync("public/brand/maya-avatar-creative-director-v2.png").byteLength
    ).toBeGreaterThan(100_000)
  })

  it("moves the real Account surface onto the editorial system without changing account actions", () => {
    const account = read("components/app-v3/account-view.tsx")
    const appLayout = read("app/app/layout.tsx")

    expect(account).toContain("suite-account-card")
    expect(account).toContain("suite-account-card--primary")
    expect(account).toContain("suite-account-primary--accent")
    expect(account).toContain("You · Your SSELFIE")
    expect(account).toContain("Manage billing")
    expect(account).toContain("Top up credits")
    expect(account).toContain("Open memory")
    expect(account).toContain("Add a selfie")
    expect(appLayout).toContain(".suite-account-card--primary")
  })

  it("moves the real Calendar workspace onto the editorial system without changing planner actions", () => {
    const calendar = read("components/app-v3/feed-planner-view.tsx")
    const header = read("components/feed-planner/feed-header.tsx")
    const tabs = read("components/feed-planner/feed-tabs.tsx")
    const grid = read("components/feed-planner/feed-grid.tsx")
    const post = read("components/feed-planner/feed-grid-item.tsx")
    const appLayout = read("app/app/layout.tsx")

    expect(calendar).toContain("suite-editorial-calendar")
    expect(calendar).toContain("Calendar · Plan to post")
    expect(calendar).toContain("See the month before you post it.")
    expect(header).toContain("suite-calendar-header")
    expect(tabs).toContain("suite-calendar-tabs")
    expect(grid).toContain("suite-calendar-grid")
    expect(post).toContain("suite-calendar-post")
    expect(appLayout).toContain(".suite-calendar-grid")
    expect(appLayout).toContain("border: 3px solid var(--suite-night)")
  })

  it("uses a varied identity-preserving editorial image library in the Suite proof", () => {
    const proof = read("components/brand/bold-editorial-proof.tsx")
    const imageRoot = "public/images/brand/bold-editorial-suite"
    const imageFiles = [
      "suite-editorial-studio-power-v1.png",
      "suite-editorial-white-shirt-v1.png",
      "suite-editorial-street-v1.png",
      "suite-editorial-cafe-lace-v1.jpeg",
      "suite-editorial-mirror-mono-v1.jpeg",
      "suite-editorial-street-mono-v1.jpeg",
      "suite-editorial-city-dog-v1.jpeg",
      "suite-editorial-think-bigger-v1.jpeg",
      "suite-editorial-turtleneck-light-v1.jpeg",
    ]

    for (const imageFile of imageFiles) {
      expect(proof).toContain(`/images/brand/bold-editorial-suite/${imageFile}`)
      expect(readFileSync(`${imageRoot}/${imageFile}`).byteLength).toBeGreaterThan(100_000)
    }
  })

  it("renders a real responsive email proof with the approved hierarchy and compliance floor", () => {
    const email = renderSselfieNoirGlassProofEmail({
      ctaHref: "https://www.sselfie.ai/auth/setup-password?proof=1",
    })

    expect(email).toContain('<table role="presentation"')
    expect(email).toContain("@media screen and (max-width: 620px)")
    expect(email).toContain("source: generateMembershipWelcomeEmail")
    expect(email).toContain("Welcome to the SUITE")
    expect(email).toContain("200 photos a month")
    expect(email).toContain("Set your password")
    expect(email).toContain("https://www.sselfie.ai/auth/setup-password?proof=1")
    expect(email).not.toContain("Unsubscribe")
    expect(email).toContain("#FAFAF9")
    expect(email).toContain("#09090B")
    expect(email).toContain("#F3E6CF")
    expect(email).not.toContain("#981826")
  })

  it("uses the real Vault Maya promise and current checkout price in the marketing proof", () => {
    const proof = read("components/brand/bold-editorial-proof.tsx")
    const designPage = read("app/admin/design-system/page.tsx")

    expect(proof).toContain("One selfie.")
    expect(proof).toContain("Choose a look.")
    expect(proof).toContain("30 photo creations each month")
    expect(proof).toContain("marketingNeon")
    expect(proof).toContain("Worth posting.")
    expect(proof).toContain("/images/vault-maya/proof/img-7880-bw-editorial.webp")
    expect(proof).toContain("/images/vault-maya/proof/img-2534-original-selfie.webp")
    expect(designPage).toContain("getVaultMayaPriceDisplay")
    expect(designPage).toContain("vaultMayaPrice.monthlyLabel")
  })

  it("keeps the approved reference and governing document wired together", () => {
    const designAuthority = read("docs/SSELFIE_DESIGN_SYSTEM.md")
    const agentInstructions = read("AGENTS.md")
    const docsIndex = read("docs/README.md")
    const emailAssets = read("docs/EMAIL_VISUAL_ASSETS.md")

    expect(designAuthority).toContain("SSELFIE Noir Glass")
    expect(designAuthority).toContain(
      "docs/brand/references/sselfie-noir-glass-suite-direction-2026-08-27.png"
    )
    expect(agentInstructions).toContain("docs/SSELFIE_DESIGN_SYSTEM.md")
    expect(agentInstructions).toContain("sole current visual authority")
    expect(agentInstructions).toContain("Earlier Bold Editorial")
    expect(agentInstructions).toContain("2026-08-27")
    expect(docsIndex).toContain("2026-08-27 SSELFIE Noir Glass")
    expect(emailAssets).toContain("New or redesigned email work must follow SSELFIE")
    expect(emailAssets).toContain("Noir Glass in `docs/SSELFIE_DESIGN_SYSTEM.md`")
    expect(designAuthority).toContain("Maya is a fashionista and creative director")
    expect(designAuthority).toContain("/brand/maya-avatar-creative-director-v2.png")
  })

  it("prevents legacy palette aliases from returning to active design surfaces", () => {
    const activeDesignSources = [
      "app/app/layout.tsx",
      "components/app-v3/edit-mode.tsx",
      "components/brand/bold-editorial-primitives.module.css",
      "components/brand/bold-editorial-proof.module.css",
      "components/sselfie/public-marketing.tsx",
      "components/prompt-vault/prompt-vault-checkout-link.tsx",
      "components/vault-maya/vault-maya-checkout-link.tsx",
      "components/vault-maya/vault-maya-landing.module.css",
    ]
    const forbiddenAliases = [
      "--ss-brand-espresso",
      "--ss-brand-chalk",
      "--ss-brand-ivory",
      "--ss-brand-parchment",
      "--ss-brand-taupe",
      "--ss-brand-champagne",
      "--color-obsidian",
      "--color-whisper",
    ]

    for (const sourcePath of activeDesignSources) {
      const source = read(sourcePath)
      for (const alias of forbiddenAliases) {
        expect(source, `${sourcePath} must not use compatibility token ${alias}`).not.toContain(
          alias
        )
      }
    }
  })

  it("keeps product and prompt documents subordinate to the current visual authority", () => {
    const playbook = read("docs/funnel/SELFIE_TO_BRAND_SHOOT_E2E_BUILD_PLAYBOOK_2026-06-01.md")
    const mayaContract = read("docs/product/MAYA_INVISIBLE_AI_FIRST_RESULT_2026-07-13.md")
    const productOutline = read("docs/funnel/SELFIE_TO_BRAND_SHOOT_PRODUCT_OUTLINE_2026-06-01.md")
    const moduleTwo = read(
      "docs/funnel/SELFIE_TO_BRAND_SHOOT_MODULE_2_BRAND_WORLD_CARDS_2026-06-02.md"
    )
    const historicalResearch = read("docs/audits/SUITE_VALUE_AND_HOME_RESEARCH_2026-06-11.md")
    const promptStrategy = read("lib/maya/maya-pro-brand-prompt-strategy.md")

    for (const document of [
      playbook,
      mayaContract,
      productOutline,
      moduleTwo,
      historicalResearch,
      promptStrategy,
    ]) {
      expect(document).toContain("docs/SSELFIE_DESIGN_SYSTEM.md")
    }

    expect(playbook).not.toContain("Use the active SSELFIE cool monochrome system")
    expect(mayaContract).not.toContain(
      "Seasalt, White, Silver, Davy, and Night product tokens only"
    )
    expect(productOutline).not.toContain("- cool monochrome palette")
    expect(moduleTwo).toContain("not the SSELFIE interface palette")
    expect(moduleTwo).toContain("Pearl or Paper frame")
    expect(historicalResearch).toContain("Historical research snapshot")
    expect(historicalResearch).not.toContain("Tap-first, Cool Editorial")
    expect(promptStrategy).toContain("Historical creative-prompt reference")
    expect(promptStrategy).toContain("sole current visual authority")
  })
})
