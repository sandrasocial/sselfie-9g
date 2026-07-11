import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const accessPage = readFileSync(
  join(process.cwd(), "app/access/selfie-to-ai-photos-kit/[token]/page.tsx"),
  "utf8"
)
const customerCopy = [
  "app/selfie-to-ai-photos-kit/page.tsx",
  "app/checkout/selfie-to-ai-photos-kit/page.tsx",
  "app/access/selfie-to-ai-photos-kit/[token]/page.tsx",
  "lib/email/templates/selfie-ai-photos-kit-delivery.ts",
]
  .map(path => readFileSync(join(process.cwd(), path), "utf8"))
  .join("\n")
  .toLowerCase()

describe("Selfie To AI Photos Kit product", () => {
  it("delivers the promised visual source-selfie lesson", () => {
    expect(accessPage).toContain("Choose this. Skip that.")
    expect(accessPage).toContain("good-front-selfie.png")
    expect(accessPage).toContain("good-3-4-selfie.png")
    expect(accessPage).toContain("bad-filtered-selfie.png")
    expect(accessPage).toContain("bad-blurry-selfie.png")
  })

  it("gives buyers a clear phone-to-prompt sequence", () => {
    expect(accessPage).toContain("On your phone, in this order.")
    expect(accessPage).toContain("Open ChatGPT")
    expect(accessPage).toContain("Upload the selfie first")
    expect(accessPage).toContain("Paste one starter prompt")
  })

  it("keeps the launch surfaces inside the approved voice guardrails", () => {
    for (const fragment of [
      "—",
      "flawless",
      "nobody will know",
      "no one will know",
      "perfect face",
      "elevated",
      "game changer",
      "skyrocket",
      "unlock your",
    ]) {
      expect(customerCopy).not.toContain(fragment)
    }
  })
})
