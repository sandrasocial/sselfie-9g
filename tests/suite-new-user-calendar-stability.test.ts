import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("new-user and Calendar stability contracts", () => {
  it("returns the member's saved selfie with every Calendar feed response", () => {
    const route = read("app/api/feed/[feedId]/route.ts")

    expect(route).toContain("FROM user_avatar_images")
    expect(route).toContain("image_type = 'selfie'")
    expect(route).toContain("sharedProfileImageUrl")
  })

  it("does not show a disabled fake creation surface to limited accounts", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(shell).not.toContain("pointer-events-none select-none opacity-60")
    expect(shell).toContain("min-h-[60dvh]")
  })

  it("gives video tiles and repeated Calendar actions distinct accessible names", () => {
    const gallery = read("components/app-v3/gallery-view.tsx")
    const gridItem = read("components/feed-planner/feed-grid-item.tsx")

    expect(gallery).toContain('${isVideo ? "Play" : "Open"} ${title}, item ${index + 1}')
    expect(gridItem).toContain("Open post ${post.position}")
    expect(gridItem).toContain("Add photo to post ${post.position}")
  })

  it("opens empty Calendar slots before Maya can create anything", () => {
    const gridItem = read("components/feed-planner/feed-grid-item.tsx")

    expect(gridItem).toContain("onOpenPost: () => void")
    expect(gridItem).toContain("onClick={onOpenPost}")
  })

  it("uses the same saved member identity inside the post editor", () => {
    const modals = read("components/feed-planner/feed-modals.tsx")
    const postCard = read("components/feed-planner/feed-post-card.tsx")

    expect(modals).toContain("resolveCalendarProfile")
    expect(modals).toContain("profileImageUrl={calendarProfile.profileImageUrl}")
    expect(postCard).toContain("profileImageUrl?: string | null")
    expect(postCard).toContain("alt={`${displayAccount}'s profile`}")
  })

  it("uses the saved member identity on the first empty Calendar canvas", () => {
    const screen = read("components/feed-planner/feed-view-screen.tsx")
    const canvas = read("components/feed-planner/calendar-empty-canvas.tsx")

    expect(screen).toContain('"/api/images?type=avatar&limit=1"')
    expect(screen).toContain("displayName={emptyCalendarProfile.displayName}")
    expect(screen).toContain("profileImageUrl={emptyCalendarProfile.profileImageUrl}")
    expect(canvas).toContain("displayName")
    expect(canvas).toContain("profileImageUrl")
    expect(canvas).not.toContain("yourname")
  })

  it("passes real selected-post generation state into Calendar Maya", () => {
    const view = read("components/feed-planner/instagram-feed-view.tsx")

    expect(view).toMatch(
      /activePost[\s\S]*generationStatus:\s*activePost\.generation_status[\s\S]*predictionId:\s*activePost\.prediction_id/
    )
  })
})
