// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Maya creative control rollback", () => {
  const concierge = read("components/app-v3/maya-concierge.tsx")
  const generalPrompt = read("lib/maya/general-assistant-persona.ts")

  it("does not silently force text or a default typography style after a format switch", () => {
    const start = concierge.indexOf("Conversational format switching")
    const end = concierge.indexOf("}, [\n    messages", start)
    const effect = concierge.slice(start, end)

    expect(effect).toContain("rememberedOverlayStyle")
    expect(effect).not.toContain("rememberedOverlayStyle || homeMode")
    expect(effect).not.toContain('rememberedOverlayStyle ?? "editorial-serif-center"')
    expect(effect).toContain("if (session?.outputFormat === latest)")
    expect(effect).toContain("lastPulledFormatRef.current = null")
  })

  it("retires an automatically selected visual world when the member changes format", () => {
    const start = concierge.indexOf("Conversational format switching")
    const end = concierge.indexOf("}, [\n    messages", start)
    const effect = concierge.slice(start, end)

    expect(effect).toContain("MAYA_GENERAL_AESTHETIC")
    expect(effect).toContain("session?.aesthetic.id === MAYA_DECIDES_AESTHETIC.id")
    expect(effect).not.toContain("updateCurrentSession(MAYA_DECIDES_AESTHETIC")
  })

  it("recommends an unspecified format before committing it", () => {
    expect(generalPrompt).toContain("recommend one format in plain language")
    expect(generalPrompt).toContain("Do not call set_format until")
    expect(generalPrompt).toContain("she confirms.")
    expect(generalPrompt).not.toContain("choose the strongest format and call set_format")
  })
})
