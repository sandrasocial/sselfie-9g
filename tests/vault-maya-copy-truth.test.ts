// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

// B5/B6 + decisions 1 & 5 (Sandra, 2026-07-30): vault surfaces may not promise chat,
// inspo-image requests, or any speed claim, and must disclose monthly-credit expiry.
// These pins guard the CUSTOMER-FACING vault surfaces.

const ROOT = process.cwd()
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8")

const CUSTOMER_SURFACES = [
  "components/sselfie/public-marketing.tsx",
  "components/vault-maya/vault-maya-studio.tsx",
  "app/checkout/vault-maya/page.tsx",
  "app/vault-maya/page.tsx",
  "lib/email/templates/vault-maya-welcome.tsx",
  "components/checkout/success-content.tsx",
]

function vaultSlice(source: string): string {
  // public-marketing holds many products; pin only the Vault Maya region.
  const start = source.indexOf("Vault Maya · the vault, made for you")
  if (start === -1) return source
  const end = source.indexOf("WorkWithMePageContent", start)
  return source.slice(start, end === -1 ? undefined : end)
}

describe("vault surfaces: no unsupported v1 promises", () => {
  for (const file of CUSTOMER_SURFACES) {
    it(`${file} has no chat/inspo-image promises or speed claims`, () => {
      const raw = read(file)
      const text = file === "components/sselfie/public-marketing.tsx" ? vaultSlice(raw) : raw
      expect(text).not.toMatch(/chat with maya|message maya|maya chat/i)
      expect(text).not.toMatch(/inspo image/i)
      expect(text).not.toMatch(/30 seconds|seconds later|takes about a minute/i)
    })
  }
})

describe("credit-expiry disclosure (decision 4)", () => {
  it("offer page FAQ discloses monthly expiry and top-up permanence", () => {
    const page = vaultSlice(read("components/sselfie/public-marketing.tsx"))
    expect(page).toContain("unused ones from the previous month expire")
    expect(page).toContain("they never expire with the monthly refresh")
  })

  it("welcome email discloses the same", () => {
    const email = read("lib/email/templates/vault-maya-welcome.tsx")
    expect(email).toContain("Unused monthly photos expire when they refresh")
    expect(email).toContain("top-up credits you purchase never expire")
  })
})

describe("selfie privacy copy matches real deletion (B8)", () => {
  it("FAQ describes self-serve deletion, not a support promise", () => {
    const page = vaultSlice(read("components/sselfie/public-marketing.tsx"))
    expect(page).toContain("replace it or delete it completely anytime in your studio")
    expect(page).not.toContain("reply to any email and I'll remove it")
  })

  it("the deletion endpoint is wired to remove rows and blobs", () => {
    const route = read("app/api/vault-maya/delete-selfie/route.ts")
    expect(route).toContain("SELECT id, image_url FROM user_avatar_images")
    expect(route).toContain("image_type = 'selfie'")
    expect(route).toContain("await del(url)")
    expect(route).toContain("DELETE FROM user_avatar_images")
  })
})

describe("B1: vault-only customers can reach billing/cancellation", () => {
  it("studio opens the Stripe portal with a studio return path", () => {
    const studio = read("components/vault-maya/vault-maya-studio.tsx")
    expect(studio).toContain("/api/stripe/create-portal-session")
    expect(studio).toContain('returnPath: "/vault-maya/studio"')
    expect(studio).toContain("Account & billing")
  })

  it("the portal route accepts the studio return path", () => {
    const route = read("app/api/stripe/create-portal-session/route.ts")
    expect(route).toContain('"/vault-maya/studio"')
  })
})

describe("B10: activation instrumentation is wired", () => {
  it("studio emits every measurement-plan event", () => {
    const studio = read("components/vault-maya/vault-maya-studio.tsx")
    for (const event of [
      "vault_maya_studio_viewed",
      "vault_maya_selfie_added",
      "vault_maya_generation_started",
      "vault_maya_generation_completed",
      "vault_maya_generation_failed",
      "vault_maya_photo_saved",
      "vault_maya_drop_request_sent",
    ]) {
      expect(studio).toContain(event)
    }
  })
})

describe("B3: SUITE members cannot buy Vault Maya", () => {
  it("checkout page renders the included message for members", () => {
    const page = read("app/checkout/vault-maya/page.tsx")
    expect(page).toContain('access.level === "member"')
    expect(page).toContain("included in your SSELFIE SUITE membership")
    expect(page).toContain("/vault-maya/studio")
  })

  it("the checkout action refuses vault_maya sessions for members", () => {
    const action = read("app/actions/landing-checkout.ts")
    expect(action).toContain("assertVaultMayaCheckoutAllowed")
  })
})
