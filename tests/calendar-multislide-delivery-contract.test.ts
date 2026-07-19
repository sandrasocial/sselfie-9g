import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Calendar carousel delivery", () => {
  it("stores every generated carousel slide while keeping slide one as the grid cover", () => {
    const replaceRoute = read("app/api/feed/[feedId]/replace-post-image/route.ts")
    const migration = read("migrations/20260719_calendar_post_media.sql")

    expect(migration).toContain("ADD COLUMN IF NOT EXISTS media_urls JSONB")
    expect(replaceRoute).toContain("imageUrls")
    expect(replaceRoute).toContain("media_urls = ${JSON.stringify(ownedImageUrls)}::jsonb")
    expect(replaceRoute).toContain("image_url = ${ownedImageUrls[0]}")
  })

  it("routes the planned format into shared Maya and attaches every finished slide", () => {
    const types = read("components/app-v3/types.ts")
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const calendar = read("components/feed-planner/instagram-feed-view.tsx")

    expect(types).toContain("plannedFormat: OutputFormat")
    expect(types).toContain("mediaUrls: string[]")
    expect(calendar).toContain("plannedFormat: plannedFormatForPost(post)")
    expect(concierge).toContain('intentForFormat(target.plannedFormat, "content_card")')
    expect(concierge).toContain("imageUrls: urls")
    expect(concierge).toContain("targetFormat === activeCalendarTarget?.plannedFormat")
  })

  it("shows the full saved sequence inside the post and clears it with the post", () => {
    const card = read("components/feed-planner/feed-post-card.tsx")
    const removeRoute = read("app/api/feed/[feedId]/remove-post-image/route.ts")

    expect(card).toContain("post.media_urls")
    expect(card).toContain("Save all slides")
    expect(removeRoute).toContain("media_urls = '[]'::jsonb")
  })
})
