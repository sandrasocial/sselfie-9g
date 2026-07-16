import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Calendar UI trust repairs", () => {
  it("does not render fake Instagram actions or invented account metrics", () => {
    const postCard = read("components/feed-planner/feed-post-card.tsx")
    const header = read("components/feed-planner/feed-header.tsx")

    for (const label of ["Menu", "Like", "Reply", "Send"]) {
      expect(postCard).not.toContain(`>${label}</span>`)
    }
    expect(header).not.toContain("1.2K")
    expect(header).not.toContain("342")
    expect(header).toContain("readyPosts")
    expect(header).toContain("postedPosts")
  })

  it("keeps gallery actions reachable only for members who have gallery access", () => {
    const view = read("components/feed-planner/instagram-feed-view.tsx")
    const modals = read("components/feed-planner/feed-modals.tsx")

    expect(view).toContain("access?.hasGalleryAccess")
    expect(modals).toContain("selectedPost.image_url && access?.hasGalleryAccess")
  })

  it("gives the post editor dialog semantics and keyboard dismissal", () => {
    const modals = read("components/feed-planner/feed-modals.tsx")

    expect(modals).toContain('role="dialog"')
    expect(modals).toContain('aria-modal="true"')
    expect(modals).toContain("useAccessibleModal(Boolean(selectedPost), onClosePost)")
  })

  it("uses touch-sized Calendar lens controls with explicit selected state", () => {
    const view = read("components/feed-planner/instagram-feed-view.tsx")

    expect(view).toContain("min-h-11")
    expect(view).toContain("aria-pressed={calendarLens === lens}")
  })

  it("uses the light-surface Maya toggle inside Calendar", () => {
    const header = read("components/feed-planner/feed-header.tsx")
    const toggle = read("components/sselfie/maya/maya-mode-toggle.tsx")

    expect(header).toContain('surface="light"')
    expect(toggle).toContain('surface?: "dark" | "light"')
    expect(toggle).toContain('bg-[#0D0E10] text-white')
  })

  it("waits for the saved style before initializing the new-grid picker", () => {
    const modal = read("components/feed-planner/feed-style-modal.tsx")

    expect(modal).toContain("isLoading: isLoadingPersonalBrand")
    expect(modal).toContain("if (!defaultFeedStyle && isLoadingPersonalBrand) return")
    expect(modal).toContain('role="dialog"')
    expect(modal).toContain("aria-pressed={isSelected}")
  })
})
