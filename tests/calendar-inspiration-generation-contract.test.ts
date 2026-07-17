import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  normalizeInspirationImageUrl,
  normalizeVisualDirectionBrief,
  normalizeVisualDirectionMode,
} from "@/lib/feed-planner/visual-direction"

const read = (path: string) => readFileSync(path, "utf8")

describe("Calendar inspiration generation contract", () => {
  it("persists one optional visual direction per grid", () => {
    const migration = read("migrations/20260717_calendar_visual_direction.sql")
    const createRoute = read("app/api/feed/create-manual/route.ts")
    const updateRoute = read("app/api/feed/[feedId]/update-style/route.ts")

    for (const field of [
      "visual_direction_mode",
      "visual_direction_brief",
      "inspiration_image_url",
    ]) {
      expect(migration).toContain(field)
      expect(createRoute).toContain(field)
      expect(updateRoute).toContain(field)
    }
  })

  it("uses inspiration as the visual world for each separate post, never as identity", () => {
    const route = read("app/api/feed/[feedId]/generate-single/route.ts")
    const generator = read("lib/feed-planner/openai-image.ts")

    expect(route).toContain("SSELFIE_INSPIRATION_SET_VARIATION")
    expect(route).toContain("inspirationUrl: feedLayout.inspiration_image_url")
    expect(generator).toContain("inspirationUrl?: string | null")
    expect(generator).toContain("calendar-inspiration.png")
    expect(generator).toContain("[...identityFiles, inspirationFile]")
  })

  it("accepts only bounded direction input and SSELFIE's public image host", () => {
    expect(normalizeVisualDirectionMode("inspiration")).toBe("inspiration")
    expect(normalizeVisualDirectionMode("trained-model")).toBe("maya")
    expect(normalizeVisualDirectionBrief("too short")).toBeNull()
    expect(
      normalizeInspirationImageUrl(
        "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/app-v3/inspiration-references/example.png"
      )
    ).toContain("public.blob.vercel-storage.com")
    expect(normalizeInspirationImageUrl("https://example.com/not-allowed.png")).toBeNull()
  })
})
