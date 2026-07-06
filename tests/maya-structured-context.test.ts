// @vitest-environment node

// 2026 UX contract (docs/research/CONVERSATIONAL_AI_UX_BEST_PRACTICES_2026-07-06.md):
// rule 3 - state syncs via structured context, never narration/replayed prose;
// rule 4 - an authoritative render snapshot rides every chat turn.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("structured session context (creationIdea)", () => {
  it("style relays carry the idea as structured context, never by replaying seedPrompt as a message", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).toContain("function carriedCreationIdea()")
    // All four relay sites (inspiration commit, vibe pick, maya-decides, shot director).
    expect(concierge.match(/creationIdea: carriedCreationIdea\(\)/g)?.length).toBeGreaterThanOrEqual(
      4
    )
    // The anti-pattern that caused the 2026-07-06 phantom-message bug: inheriting the
    // previous session's seed as the next session's visible first turn.
    expect(concierge).not.toContain("seed: session?.seedPrompt")
  })

  it("the chat route injects the carried idea as context, capped and sanitized", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")
    expect(route).toContain("creationIdea?: string | null")
    expect(route).toContain("clampText(body?.creationIdea, 400)")
    expect(route).toContain("SESSION IDEA")
  })

  it("the idea is durable session state: both draft sanitizers restore it", () => {
    const continuity = read("components/app-v3/continuity.ts")
    const serverDraft = read("lib/app-v3/maya/draft-snapshot.ts")
    for (const source of [continuity, serverDraft]) {
      expect(source).toContain('typeof session.creationIdea === "string"')
      expect(source).toContain("session.creationIdea.slice(0, 400)")
    }
  })
})

describe("authoritative lastGeneration snapshot", () => {
  it("every completed render records ground truth (photo, stream, sync, video, custom model, shoot set)", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    expect(concierge).toContain("function recordCompletedRender(")
    // One definition + five success-site calls.
    expect(concierge.match(/recordCompletedRender\(/g)?.length).toBeGreaterThanOrEqual(6)
    // A new session must never inherit the previous session's render state.
    expect(concierge).toContain("setLastGeneration(null)")
    // The snapshot rides the transport extras on every turn.
    expect(concierge).toContain("lastGeneration: LastGenerationSnapshot | null")
  })

  it("the chat route validates the snapshot and injects it as ground truth", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")
    expect(route).toContain("function normalizeLastGeneration(")
    expect(route).toContain("AUTHORITATIVE SESSION STATE")
    // Bounds: count clamped, prose fields clamped, booleans strict.
    expect(route).toContain("Math.min(Math.max(value.imageCount, 1), 12)")
    expect(route).toContain("value.usedInspiration === true")
  })
})

describe("dependency hygiene", () => {
  it('no dependency may float on "latest" (Stripe Basil-shape incident class)', () => {
    const pkg = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const floating: string[] = []
    for (const deps of [pkg.dependencies ?? {}, pkg.devDependencies ?? {}]) {
      for (const [name, spec] of Object.entries(deps)) {
        if (spec === "latest") floating.push(name)
      }
    }
    expect(floating).toEqual([])
  })
})
