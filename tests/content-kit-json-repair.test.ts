import { describe, expect, it } from "vitest"
import { extractJsonArray, repairAndParseJson } from "@/lib/content-kit/json-repair"

describe("repairAndParseJson", () => {
  it("parses valid JSON untouched", () => {
    expect(repairAndParseJson('{"a":1,"b":[1,2]}')).toEqual({ a: 1, b: [1, 2] })
  })

  it("repairs an unescaped inner double quote (the camera-roll failure)", () => {
    const bad = '{"shots":[{"prompt":"the "Camera + lens" line must describe an iPhone","title":"Photodump 1"}]}'
    const parsed = repairAndParseJson(bad)
    expect(parsed.shots[0].prompt).toContain('"Camera + lens"')
    expect(parsed.shots[0].title).toBe("Photodump 1")
  })

  it("repairs raw newlines and tabs inside string values", () => {
    const bad = '{"prompt":"line one\nline two\ttabbed"}'
    expect(repairAndParseJson(bad)).toEqual({ prompt: "line one\nline two\ttabbed" })
  })

  it("removes trailing commas", () => {
    expect(repairAndParseJson('{"a":[1,2,],}')).toEqual({ a: [1, 2] })
  })

  it("still throws on hopeless input", () => {
    expect(() => repairAndParseJson("{this is not json at all")).toThrow(/unparseable/)
  })
})

describe("extractJsonArray", () => {
  it("extracts and repairs a fenced array with an inner quote", () => {
    const text = 'Here you go:\n```json\n[{"caption":"she said "yes" today"}]\n```'
    const parsed = extractJsonArray(text)
    expect(parsed[0].caption).toBe('she said "yes" today')
  })
})
