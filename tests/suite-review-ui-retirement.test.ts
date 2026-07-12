import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string): string {
  return readFileSync(path, "utf8")
}

describe("SUITE review UI and legacy feedback retirement", () => {
  it("hooks every App v3 download surface into the shared authenticated review helper", () => {
    for (const path of [
      "components/app-v3/concept-card.tsx",
      "components/app-v3/image-lightbox.tsx",
      "components/app-v3/gallery-view.tsx",
    ]) {
      expect(read(path)).toContain("recordSuiteDownloadForReview")
    }

    expect(read("components/app-v3/app-v3-shell.tsx")).toContain("<PostSuccessReviewPrompt />")
  })

  it("keeps the first review release text-only and consent-gated", () => {
    const prompt = read("components/testimonials/post-success-review-prompt.tsx")
    const submit = read("app/api/testimonials/submit/route.ts")

    expect(prompt).toContain('type="checkbox"')
    expect(prompt).not.toContain('type="file"')
    expect(submit).not.toContain("screenshot_url")
    expect(submit).toContain("body?.consent === true")
  })

  it("redirects the old public form and removes the unsafe generic feedback routes", () => {
    expect(read("app/(public)/share-your-story/page.tsx")).toContain('redirect("/app")')
    expect(existsSync("components/testimonials/testimonial-submission-form.tsx")).toBe(false)
    expect(existsSync("components/feedback/feedback-button.tsx")).toBe(false)
    expect(existsSync("components/feedback/feedback-modal.tsx")).toBe(false)
    expect(existsSync("app/api/feedback/route.ts")).toBe(false)
    expect(existsSync("app/api/feedback/upload-image/route.ts")).toBe(false)
    expect(existsSync("app/api/feedback/ai-response/route.ts")).toBe(false)
  })

  it("preserves feedback history readers while removing customer-facing writers", () => {
    expect(read("app/api/admin/customer-support/route.ts")).toContain("FROM feedback")
    expect(read("lib/admin/home-report.ts")).toContain("FROM feedback")
  })
})
