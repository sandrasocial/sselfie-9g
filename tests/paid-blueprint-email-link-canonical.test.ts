// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

const TEMPLATE_PATHS = [
  "lib/email/templates/paid-blueprint-delivery.tsx",
  "lib/email/templates/paid-blueprint-day-1.tsx",
  "lib/email/templates/paid-blueprint-day-3.tsx",
  "lib/email/templates/paid-blueprint-day-7.tsx",
]

describe("paid blueprint email links", () => {
  it("use canonical /feed-planner links and avoid deprecated /blueprint/paid route", () => {
    for (const templatePath of TEMPLATE_PATHS) {
      const contents = fs.readFileSync(path.join(ROOT, templatePath), "utf8")
      expect(contents).toContain("/feed-planner?")
      expect(contents).not.toContain("/blueprint/paid?")
    }
  })
})
