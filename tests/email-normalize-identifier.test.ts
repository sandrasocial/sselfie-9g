import { describe, expect, it } from "vitest"
import { normalizeEmailIdentifier } from "@/lib/email/normalize-identifier"

describe("normalizeEmailIdentifier", () => {
  it("returns empty string for empty values", () => {
    expect(normalizeEmailIdentifier(undefined)).toBe("")
    expect(normalizeEmailIdentifier(null)).toBe("")
    expect(normalizeEmailIdentifier("")).toBe("")
  })

  it("strips control characters and surrounding quotes", () => {
    expect(normalizeEmailIdentifier('  "123e4567-e89b-12d3-a456-426614174000"\n')).toBe(
      "123e4567-e89b-12d3-a456-426614174000",
    )
    expect(normalizeEmailIdentifier(" '\tseg_abc123\r\n' ")).toBe("seg_abc123")
  })

  it("unwinds nested quote wrappers", () => {
    expect(normalizeEmailIdentifier(`'"segment_001"'`)).toBe("segment_001")
    expect(normalizeEmailIdentifier("```aud_123```")).toBe("aud_123")
  })
})
