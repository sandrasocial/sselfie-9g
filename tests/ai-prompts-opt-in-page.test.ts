// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const page = readFileSync("app/ai-prompts/page.tsx", "utf8")
const form = readFileSync("components/ai-prompts/opt-in-form.tsx", "utf8")

describe("free prompts opt-in page", () => {
  it("uses the approved Vault hero and makes an accurate five-prompt promise", () => {
    expect(page).toContain(
      "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1784653608406-382550.png"
    )
    expect(page).toContain("Turn One Selfie Into Five Beautiful AI Photos")
    expect(page).toContain("Five complete, ready-to-use AI photo prompts")
    expect(page).not.toContain("Unlimited Photoshoots")
  })

  it("puts creation before the paid Vault and names the tested tool", () => {
    expect(page).toContain("Choose a clear selfie")
    expect(page).toContain("Upload your selfie to ChatGPT")
    expect(page).toContain("WHEN YOU&apos;RE READY FOR MORE")
    expect(page).not.toContain("AI tool of your choice")
    expect(page.toLowerCase()).not.toContain("visual world")
    expect(page.toLowerCase()).not.toContain("explore")
    expect(page.toLowerCase()).not.toContain("opening-shot")
  })

  it("keeps the landing page focused on one opt-in action", () => {
    expect(page).toContain('href="#get-prompts"')
    expect(page).not.toContain("Get the Free Selfie Guide")
    expect(form).toContain("Where should I send your free prompts?")
    expect(form).toContain("You’ll also receive simple instructions")
  })

  it("deduplicates the proof strip before selecting three looks", () => {
    expect(page).toContain("seenLabels")
    expect(page).toContain("seenSources")
    expect(page).toContain(".slice(0, 3)")
  })
})
