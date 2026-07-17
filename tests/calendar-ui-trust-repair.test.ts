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

  it("uses touch-sized Calendar workspace controls with explicit selected state", () => {
    const tabs = read("components/feed-planner/feed-tabs.tsx")

    expect(tabs).toContain("min-h-11")
    expect(tabs).toContain('aria-label="Grid view"')
    expect(tabs).toContain('aria-label="Calendar view"')
    expect(tabs).toContain('aria-pressed={activeTab === "grid"}')
    expect(tabs).not.toContain('["plan", "grid", "profile"]')
  })

  it("removes the unexplained generation-mode toggle from Calendar", () => {
    const header = read("components/feed-planner/feed-header.tsx")

    expect(header).not.toContain("MayaModeToggle")
    expect(header).not.toContain("onToggleGenerationMode")
    expect(header).not.toContain("My look")
  })

  it("waits for the saved style before initializing the new-grid picker", () => {
    const modal = read("components/feed-planner/feed-style-modal.tsx")

    expect(modal).toContain("isLoading: isLoadingPersonalBrand")
    expect(modal).toContain("if (!defaultFeedStyle && isLoadingPersonalBrand) return")
    expect(modal).toContain('role="dialog"')
    expect(modal).toContain("aria-pressed={isSelected}")
  })

  it("opens on an editable Instagram canvas without a mode-choice gate", () => {
    const client = read("app/feed-planner/feed-planner-client.tsx")
    const entry = read("components/feed-planner/feed-view-screen.tsx")

    expect(client).not.toContain("autoDraftFiredRef")
    expect(entry).toContain("handlePlanWithMaya")
    expect(entry).toContain('"/api/app-v3/maya/feed-plan/draft"')
    expect(entry).toContain("CalendarEmptyCanvas")
    expect(entry).toContain("CalendarMayaWorkspace")
    expect(entry).toContain("handleQuickManualGrid")
    expect(entry).not.toContain("Start blank")
  })
})
