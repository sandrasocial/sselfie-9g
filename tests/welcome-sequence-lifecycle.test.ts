import { describe, expect, it } from "vitest"

import {
  generateWelcomeDay14,
  generateWelcomeDay21,
  generateWelcomeDay28,
} from "@/lib/email/templates/welcome-sequence"
import fs from "fs"
import path from "path"

const ROOT = process.cwd()

describe("welcome lifecycle templates", () => {
  it("renders day 14, 21, and 28 templates with studio CTA", () => {
    const day14 = generateWelcomeDay14({ firstName: "Sandra" })
    const day21 = generateWelcomeDay21({ firstName: "Sandra" })
    const day28 = generateWelcomeDay28({ firstName: "Sandra" })

    for (const template of [day14, day21, day28]) {
      expect(template.subject).toBeTruthy()
      expect(template.html).toContain("/studio")
      expect(template.text).toContain("/studio")
    }
  })

  it("keeps the welcome lifecycle templates available to the Stella bridge", () => {
    const emailRender = fs.readFileSync(path.join(ROOT, "lib/stella/email-render.ts"), "utf8")

    expect(emailRender).toContain('case "welcome-day-14"')
    expect(emailRender).toContain('case "welcome-day-21"')
    expect(emailRender).toContain('case "welcome-day-28"')
  })
})
