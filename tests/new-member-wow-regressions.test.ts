import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { shouldStopAppV3MayaToolLoop } from "@/lib/app-v3/maya/tool-loop-policy"

const read = (path: string) => readFileSync(path, "utf8")

describe("new member WOW regressions", () => {
  it("continues after memory-writing tools so Maya asks the next onboarding question", () => {
    const step = (toolName: string) => ({ toolCalls: [{ toolName }] })

    expect(shouldStopAppV3MayaToolLoop({ steps: [step("save_brand_profile")] })).toBe(false)
    expect(shouldStopAppV3MayaToolLoop({ steps: [step("remember")] })).toBe(false)
    expect(shouldStopAppV3MayaToolLoop({ steps: [step("emit_concepts")] })).toBe(true)
    expect(
      shouldStopAppV3MayaToolLoop({
        steps: [step("save_brand_profile"), step("save_brand_profile"), step("save_brand_profile")],
      })
    ).toBe(true)
  })

  it("scrolls the post-value brand invitation into view", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const promptIndex = concierge.indexOf("const showBrandPrompt")
    const scrollEffect = concierge.slice(promptIndex, promptIndex + 900)

    expect(scrollEffect).toContain("showBrandPrompt")
    expect(scrollEffect).toContain("threadEndRef.current?.scrollIntoView")
  })

  it("keeps the first-grid style decision compact, explicit, and touch friendly", () => {
    const modal = read("components/feed-planner/feed-style-modal.tsx")
    const header = read("components/feed-planner/feed-header.tsx")
    const feedView = read("components/feed-planner/feed-view-screen.tsx")

    expect(modal).toContain("useState<FeedStyle | null>(defaultFeedStyle ?? null)")
    expect(modal).not.toContain('defaultFeedStyle || "Dark & Moody"')
    expect(modal).toContain("overflow-x-auto")
    expect(modal).toContain("snap-x")
    expect(modal).toContain("bg-[#F8FAFA]")
    expect(modal).toContain("disabled={isLoading || isUploadingInspiration || !canConfirm}")
    expect(modal).toContain("min-h-11")
    expect(modal).not.toContain("setShowAdvanced(true)")
    expect(modal).toContain("if (selectedStyle && previousStyleRef.current !== selectedStyle)")
    expect(modal).toContain('mode?: "first" | "new" | "style"')
    expect(modal).toContain('mode === "style"')
    expect(modal).toContain("How should this grid look?")
    expect(modal).toContain("Choose the look for this month.")
    expect(modal).toContain("Maya decides")
    expect(modal).toContain("Upload inspiration")
    expect(modal).toContain("Describe it myself")
    expect(header).toContain("Visual direction")
    expect(header).toContain("New grid")
    expect(header).toContain("defaultFeedStyle={lastFeedStyle}")
    expect(header).toContain('mode={isCreatingNewFeed ? "new" : "style"}')
    expect(feedView).toContain('mode={feedExists ? "new" : "first"}')
  })

  it("uses the light editorial signup system and mobile-sized controls", () => {
    const signup = read("app/auth/sign-up/page.tsx")

    expect(signup).toContain("bg-[#F8FAFA]")
    expect(signup).toContain("h-12")
    expect(signup).toContain('href="/privacy"')
    expect(signup).toContain('href="/terms"')
    expect(signup).not.toContain("radial-gradient")
    expect(signup).not.toContain("100K+")
  })

  it("keeps the legacy onboarding selfie requirement honest and recoverable", () => {
    const wizard = read("components/onboarding/unified-onboarding-wizard.tsx")

    expect(wizard).toContain("completionError")
    expect(wizard).toContain("selfieImages.length > 0")
    expect(wizard).toContain("Upload 1–3 selfies (required)")
    expect(wizard).not.toContain("Selfie upload is optional")
    expect(wizard).not.toContain("alert(error instanceof Error")
  })
})
