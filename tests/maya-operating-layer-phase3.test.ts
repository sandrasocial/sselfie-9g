// @vitest-environment node

import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("Maya operating layer Phase 3 integration contract", () => {
  it("keeps guidance separate from creative chat and generation routes", () => {
    const route = read("app/api/app-v3/maya/guidance/route.ts")
    const registry = read("lib/app-v3/maya/guidance/source-registry.ts")

    expect(route).toContain("isMayaOperatingLayerEnabled")
    expect(route).toContain("getAcademyEntitlementState")
    expect(route).not.toContain("generate-image")
    expect(route).not.toContain("publish")
    expect(registry).toContain("SANDRA_CORE_BELIEFS")
    expect(registry).toContain("maya_context")
    expect(registry).toContain("transcript_summary")
  })

  it("adapts Learn and the Academy lesson panel without replacing their content", () => {
    const library = read("components/app-v3/library-view.tsx")
    const lesson = read("components/sselfie/academy/lesson-maya-chat.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(library).toContain("/api/app-v3/maya/guidance")
    expect(lesson).toContain("/api/app-v3/maya/guidance")
    expect(lesson).toContain("MayaActionCard")
    expect(concierge).toContain("MayaGuidanceWorkspace")
    expect(concierge).toContain("key={session.mayaContext.taskId}")
  })

  it("does not add guidance text to the existing creative prompt sources", () => {
    const creativeRoute = read("app/api/app-v3/maya/chat/route.ts")
    expect(creativeRoute).not.toContain("MayaGuidanceRequest")
    expect(creativeRoute).not.toContain("sourceRefs")
  })
})
