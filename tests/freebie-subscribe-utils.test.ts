import { describe, expect, it } from "vitest"
import { normalizeFreebieEmailTags, resolveAccessToken } from "@/lib/freebie/subscribe-utils"

describe("normalizeFreebieEmailTags", () => {
  it("adds required selfie-guide tags", () => {
    const tags = normalizeFreebieEmailTags(["lead"])
    expect(tags).toEqual(expect.arrayContaining(["lead", "freebie-subscriber", "sselfie-guide", "freebie-selfie-guide"]))
  })

  it("deduplicates overlapping tags", () => {
    const tags = normalizeFreebieEmailTags(["sselfie-guide", "freebie-subscriber"])
    expect(tags.filter((tag) => tag === "sselfie-guide")).toHaveLength(1)
    expect(tags.filter((tag) => tag === "freebie-subscriber")).toHaveLength(1)
  })
})

describe("resolveAccessToken", () => {
  it("keeps an existing token", () => {
    const result = resolveAccessToken("abc-123", () => "generated")
    expect(result).toEqual({ accessToken: "abc-123", wasGenerated: false })
  })

  it("generates a token when missing", () => {
    const result = resolveAccessToken(null, () => "generated-token")
    expect(result).toEqual({ accessToken: "generated-token", wasGenerated: true })
  })
})
