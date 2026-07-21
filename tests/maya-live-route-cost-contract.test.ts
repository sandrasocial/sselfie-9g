import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("live Maya route cost contract", () => {
  it("caches personalized recommendations and uses the inexpensive model", () => {
    const source = read("app/api/app-v3/maya/recommendations/route.ts")
    expect(source).toContain('createMayaOpenRouterModel("chat_default"')
    expect(source).toContain("getCachedRecommendations")
    expect(source).toContain("saveCachedRecommendations")
    expect(source).toContain("maxOutputTokens: 800")
  })

  it("uses Haiku and a tight output budget for Calendar operations", () => {
    const source = read("app/api/app-v3/maya/calendar-agent/route.ts")
    expect(source).toContain('createMayaOpenRouterModel("chat_default"')
    expect(source).toContain("maxOutputTokens: 800")
  })

  it("applies dynamic model and output budgets to the main Maya chat", () => {
    const source = read("app/api/app-v3/maya/chat/route.ts")
    expect(source).toContain("getAppV3ChatTask")
    expect(source).toContain("getAppV3ChatMaxOutputTokens")
    expect(source).toContain("maxMessages: 16")
  })
})
