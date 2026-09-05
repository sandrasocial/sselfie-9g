// @vitest-environment node

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const concierge = readFileSync(
  resolve(process.cwd(), "components/app-v3/maya-concierge.tsx"),
  "utf8"
)
const inline = readFileSync(
  resolve(process.cwd(), "components/app-v3/maya-inline-components.tsx"),
  "utf8"
)
const conceptCard = readFileSync(
  resolve(process.cwd(), "components/app-v3/concept-card.tsx"),
  "utf8"
)

describe("Maya streaming stability and inline Vault thumbnails", () => {
  it("keeps completed concepts visible while the next concept is still streaming", () => {
    expect(concierge).toContain("options: { allowReadySubset?: boolean } = {}")
    expect(concierge).toContain("if (options.allowReadySubset)")
    expect(concierge).toContain("allowReadySubset: isThinking")
  })

  it("shows compact, uncropped inline Vault photos", () => {
    expect(inline.match(/grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6/g)).toHaveLength(2)
    expect(inline.match(/className="object-contain"/g)?.length).toBeGreaterThanOrEqual(3)
    expect(inline).not.toContain(
      'sizes="160px"\n                  className="object-cover transition-transform'
    )
    expect(conceptCard).toContain('className="suite-concept-visual flex w-full justify-start')
    expect(conceptCard).toContain('className="group relative aspect-[3/4] w-36')
    expect(conceptCard).toContain('h-full w-full object-contain grayscale-[18%]')
    expect(conceptCard).not.toContain('suite-concept-visual relative aspect-[4/3]')
  })
})
