// @vitest-environment node

import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Member Pulse admin restoration", () => {
  it("restores a dedicated MEMBERS destination without putting analytics back in Content", () => {
    const pagePath = "app/admin/members/page.tsx"
    const nav = read("components/admin/admin-nav.tsx")
    const contentPage = read("app/admin/content-brief/page.tsx")

    expect(existsSync(pagePath)).toBe(true)
    expect(nav).toMatch(/\{ label: ["']MEMBERS["'], href: ["']\/admin\/members["'] \}/)
    expect(contentPage).not.toContain("MemberPulseSection")
  })

  it("shows member struggle signals and recent anonymized language", () => {
    const page = read("app/admin/members/page.tsx")

    expect(page).toContain("buildMemberPulse")
    expect(page).toContain("Member pulse")
    expect(page).toContain("Generation problems")
    expect(page).toContain("Recovery shown")
    expect(page).toContain("What members told Maya they want")
    expect(page).toContain("What they asked Maya to change")
    expect(page).toContain("[7, 14, 30]")
    expect(page).not.toContain("email")
    expect(page).not.toContain("userId")
  })

  it("tracks reliability and direct-review signals without calling downloads happiness", () => {
    const pulse = read("lib/admin/member-pulse.ts")
    const page = read("app/admin/members/page.tsx")

    expect(pulse).toContain("generationFailures")
    expect(pulse).toContain("failureReasons")
    expect(pulse).toContain("recoveriesShown")
    expect(pulse).toContain("recoveryReasons")
    expect(pulse).toContain("chatAborts")
    expect(pulse).toContain("reviewsSubmitted")
    expect(pulse).toContain("vaultMayaLoved")
    expect(pulse).toContain("vaultMayaNotQuite")
    expect(pulse).toContain('"suite_post_caption_ready"')
    expect(pulse).toContain('"suite_ready_post_saved"')
    expect(pulse).toContain('"suite_post_project_resumed"')
    expect(pulse).toContain('"suite_maya_job_started"')
    expect(pulse).toContain('"suite_maya_job_finished"')
    expect(pulse).toContain('"suite_post_readiness_rated"')
    expect(pulse).toContain("readinessRatings")
    expect(page).toContain("Finished posts")
    expect(page).toContain("Projects resumed")
    expect(page).toContain("Would post it")
    expect(page).toContain("Almost ready")
    expect(page).toContain("Would not post")
    expect(page).toContain("and finished posts members marked as")
    expect(page).toContain("Vault Maya · Love this")
    expect(page).toContain("Vault Maya · Not quite")
    expect(pulse).not.toContain("downloadRate")
    expect(page).not.toContain("Loved it")
  })
})
