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
    expect(gridItem).toContain("Generate image for post ${post.position}")
    expect(gridItem).toContain("Add photo to post ${post.position}")
  })
})
