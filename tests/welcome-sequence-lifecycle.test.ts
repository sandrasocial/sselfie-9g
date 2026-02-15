import { describe, expect, it } from "vitest"

import {
  generateWelcomeDay14,
  generateWelcomeDay21,
  generateWelcomeDay28,
} from "@/lib/email/templates/welcome-sequence"
import { MARKETING_TEMPLATE_CATALOG } from "@/lib/email/marketing-template-catalog"

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

  it("registers new welcome lifecycle templates in marketing catalog", () => {
    const emailTypes = new Set(MARKETING_TEMPLATE_CATALOG.map((item) => item.emailType))
    expect(emailTypes.has("welcome-day-14")).toBe(true)
    expect(emailTypes.has("welcome-day-21")).toBe(true)
    expect(emailTypes.has("welcome-day-28")).toBe(true)
  })
})

