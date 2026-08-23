import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  BOLD_EDITORIAL_COLORS,
  BOLD_EDITORIAL_GUARDRAILS,
  BOLD_EDITORIAL_SHAPE,
  BOLD_EDITORIAL_TYPE,
} from "@/lib/brand/bold-editorial-tokens"
import { renderBoldEditorialProofEmail } from "@/lib/email/templates/bold-editorial-proof"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("Bold Editorial Studio foundation", () => {
  it("locks the approved cross-channel tokens and four-stage method", () => {
    expect(BOLD_EDITORIAL_COLORS).toMatchObject({
      ink: "#0D0E10",
      chalk: "#F7F7F5",
      paper: "#FFFFFF",
      oxblood: "#981826",
    })
    expect(BOLD_EDITORIAL_TYPE.display).toContain("Cormorant Garamond")
    expect(BOLD_EDITORIAL_TYPE.sans).toContain("Manrope")
    expect(BOLD_EDITORIAL_SHAPE.radius.surface).toBe("6px")
    expect(BOLD_EDITORIAL_GUARDRAILS.method).toEqual(["TAKE", "CREATE", "EDIT", "POST"])
  })

  it("exposes additive global CSS tokens without remapping live legacy variables", () => {
    const globals = read("app/globals.css")

    expect(globals).toContain("--ss-brand-ink: #0d0e10")
    expect(globals).toContain("--ss-brand-chalk: #f7f7f5")
    expect(globals).toContain("--ss-brand-oxblood: #981826")
    expect(globals).toContain("--ss-brand-radius: 6px")
    expect(globals).toContain(
      "These tokens are additive until each live surface is deliberately migrated"
    )
  })

  it("keeps the component reference private and discoverable to the founder", () => {
    const adminLayout = read("app/admin/layout.tsx")
    const designPage = read("app/admin/design-system/page.tsx")
    const adminNav = read("components/admin/admin-nav.tsx")

    expect(adminLayout).toContain("isAdminEmail")
    expect(designPage).toContain("BoldEditorialProof")
    expect(designPage).toContain("renderBoldEditorialProofEmail")
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
    expect(navigation).toContain('const METHOD = ["TAKE", "CREATE", "EDIT", "POST"]')
    expect(frontDoor).toContain("Create something worth posting.")
    expect(frontDoor).toContain("var(--suite-accent)")
    expect(gallery).toContain("Gallery · Your visual library")
    expect(gallery).toContain("var(--suite-accent)")
    expect(appPage).toContain('title: "SSELFIE Suite"')
  })

  it("moves the real Maya workspace onto the editorial system without changing its controls", () => {
    const maya = read("components/app-v3/maya-concierge.tsx")
    const appLayout = read("app/app/layout.tsx")

    expect(maya).toContain("suite-maya-header")
    expect(maya).toContain("suite-maya-thread")
    expect(maya).toContain("suite-maya-message--maya")
    expect(maya).toContain("suite-maya-message--user")
    expect(maya).toContain("suite-maya-composer")
    expect(maya).toContain("suite-maya-input")
    expect(maya).toContain("suite-maya-send")
    expect(maya).toContain('aria-label="Message Maya"')
    expect(maya).toContain('aria-label="Attach an inspiration image"')
    expect(appLayout).toContain("border-bottom: 3px solid var(--suite-accent)")
    expect(appLayout).toContain("background: var(--suite-accent)")
    expect(maya).toContain("suite-maya-paths")
    expect(maya).toContain("AI Photos")
    expect(maya).toContain("Edit a Photo")
    expect(maya).toContain("Build a Post")
    expect(appLayout).toContain(".suite-concept-card")
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
    const email = renderBoldEditorialProofEmail({
      ctaHref: "https://www.sselfie.ai/selfie-guide?proof=1",
      unsubscribeHref: "https://www.sselfie.ai/unsubscribe?proof=1",
    })

    expect(email).toContain('<table role="presentation"')
    expect(email).toContain("@media only screen and (max-width: 620px)")
    expect(email).toContain("One selfie.<br>Four useful moves.")
    expect(email).toContain("TAKE")
    expect(email).toContain("CREATE")
    expect(email).toContain("EDIT")
    expect(email).toContain("POST")
    expect(email).toContain("START WITH TAKE")
    expect(email).toContain("Unsubscribe")
    expect(email).toContain("#981826")
    expect(email).not.toMatch(/#(?:f0ede8|f3eee7|c9a96e|7c3aed)/i)
  })

  it("keeps the approved reference and governing document wired together", () => {
    const designAuthority = read("docs/SSELFIE_DESIGN_SYSTEM.md")
    const agentInstructions = read("AGENTS.md")

    expect(designAuthority).toContain("Bold Editorial Studio")
    expect(designAuthority).toContain(
      "docs/brand/references/sselfie-bold-editorial-direction-2026-08-23.png"
    )
    expect(agentInstructions).toContain("docs/SSELFIE_DESIGN_SYSTEM.md")
    expect(agentInstructions).toContain("sole current visual authority")
  })
})
