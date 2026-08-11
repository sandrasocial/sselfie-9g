// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("CUSTOMER-PHOTOSHOOT-01 format contract", () => {
  const read = (path: string) => readFileSync(path, "utf8")

  it("adds Photoshoot as a first-class customer format", () => {
    expect(read("components/app-v3/types.ts")).toContain('"photoshoot"')
    expect(read("components/app-v3/visual-front-door.tsx")).toContain('photoshoot: "Full shoot"')
    expect(read("components/app-v3/maya-concierge.tsx")).toContain('id: "photoshoot"')
    expect(read("lib/app-v3/maya/draft-snapshot.ts")).toContain('"photoshoot"')
  })

  it("generates one set from Maya's role-tagged shoot briefs instead of individual cards", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const route = read("app/api/app-v3/maya/generate/route.ts")
    const chatRoute = read("app/api/app-v3/maya/chat/route.ts")

    expect(concierge).toContain("generatePhotoshootSet")
    expect(concierge).toContain('conceptFormat === "photoshoot"')
    expect(concierge).toContain("Create full photoshoot")
    expect(route).toContain("validatePhotoshootBriefs")
    expect(route).toContain("photoshoot_plan_invalid")
    expect(chatRoute).toContain("shotRole")
  })

  it("generates photoshoot sets with a hero-first cohesion anchor", () => {
    const route = read("app/api/app-v3/maya/generate/route.ts")

    expect(route).toContain("pickPhotoshootHeroJobIndex")
    expect(route).toContain("runPhotoshootHeroAnchoredJobs")
    expect(route).toContain("Photoshoot cohesion role: HERO ANCHOR")
    expect(route).toContain("Use the uploaded selfies as the identity anchor")
    expect(route).toContain("Use the generated hero reference only as a style/cohesion anchor")
    expect(route).toContain("const selfieAndHeroFiles = [...selfieFiles, heroFile]")

    // Hero renders from selfies + optional inspiration (identity + style ground truth).
    const heroFirst = route.indexOf(
      "const heroBuffer = await runJob(hero.job, selfieAndInspirationFiles)"
    )
    const restAfter = route.indexOf("restJobs.map(async ({ item, index })")
    expect(heroFirst).toBeGreaterThan(-1)
    expect(restAfter).toBeGreaterThan(heroFirst)
  })
})
