// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const ROUTE_PATH = "app/api/freebie/track-engagement/route.ts"

describe("freebie engagement route data model", () => {
  it("uses the canonical freebie strategy table model", () => {
    const contents = fs.readFileSync(path.join(ROOT, ROUTE_PATH), "utf8")

    expect(contents).toContain("freebie_brand_strategies")
    expect(contents).not.toContain("freebie_subscribers")
  })
})
