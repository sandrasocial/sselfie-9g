import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(path, "utf8")
}

describe("APP-V3-LIVE-BUGS-01 regressions", () => {
  it("keeps App v3 shell localStorage reads out of render", () => {
    const shell = read("components/app-v3/app-v3-shell.tsx")

    expect(shell).toContain("const [section, setSection] = useState<AppV3Section>(initialSection)")
    expect(shell).toContain('if (params.has("view")) return')
    expect(shell).toContain("const stored = readStoredAppSection(initialSection)")
    expect(shell).toContain('if (initialSection !== "create") return')
    expect(shell).not.toContain("useState<AppV3Section>(() =>")
  })

  it("collapses the trial first-run front door to a single selfie action with activation analytics", () => {
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    const events = read("lib/analytics/event-contract.ts")

    expect(frontDoor).toContain("Hi, I'm Maya. Let's make your first photo.")
    expect(frontDoor).toContain("Add one clear selfie and I'll keep your real face")
    expect(frontDoor).toContain("Add my selfie")
    expect(frontDoor).toContain("suite_home_viewed")
    expect(frontDoor).toContain("first_action_selected")
    expect(frontDoor).toContain("activation_selfie_uploaded")
    expect(frontDoor).toContain('source: "front_door"')
    expect(frontDoor).toContain("!shouldShowTrialFirstRun && !compact")
    expect(events).toContain('"suite_home_viewed"')
    expect(events).toContain('"first_action_selected"')
  })

  it("lets the trial claim path sign in directly without the password detour", () => {
    const shared = read("lib/payments/shared.ts")
    const claim = read("app/claim/[token]/page.tsx")

    expect(shared).toContain("skipPasswordSetup?: boolean")
    expect(shared).toContain("options.skipPasswordSetup")
    expect(claim).toContain("skipPasswordSetup: true")
  })

  it("renders admin credits as unlimited instead of an ambiguous dash", () => {
    const route = read("app/api/app-v3/account/route.ts")
    const account = read("components/app-v3/account-view.tsx")

    expect(route).toContain("creditsUnlimited")
    expect(route).toContain("isAdminEmail(user.email)")
    expect(account).toContain("creditsUnlimited")
    expect(account).toContain("Unlimited")
    expect(account).toContain("Credit balance unavailable")
    expect(account).not.toContain(' : "—"')
  })

  it("dispatches concept cards by the emitted concept format, not a stale session format", () => {
    const chatRoute = read("app/api/app-v3/maya/chat/route.ts")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(chatRoute).toContain("Always include the output format for this concept batch")
    expect(chatRoute).toContain("execute: async ({ concepts, format }) => ({ concepts, format })")
    expect(concierge).toContain("function extractConceptFormat")
    // STORY-GENERATION fix 2026-07-03: the chain gained a truncation-salvage fallback.
    expect(concierge).toContain("part.output?.format ??")
    expect(concierge).toContain("part.rawInput?.format ??")
    expect(concierge).toContain("salvageConceptsPayload(part.rawInput ?? part.input)?.format")
    expect(concierge).toContain("targetFormat: OutputFormat = format")
    expect(concierge).toContain("format: targetFormat")
    expect(concierge).toContain('stream: wantsBakedText ? false : targetFormat !== "carousel"')
    expect(concierge).toContain("format={conceptFormat}")
    expect(concierge).toContain("generateConcept(key, concept, conceptFormat)")
  })

  it("passes inspiration references through final generation, not only concept planning", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")
    const generateRoute = read("app/api/app-v3/maya/generate/route.ts")
    const visualRules = read("lib/app-v3/maya/visual-rules.ts")
    const types = read("lib/app-v3/maya/concept-types.ts")

    expect(types).toContain("inspirationImageUrl?: string | null")
    expect(concierge).toContain("inspirationImageUrl: inspirationUrl")
    expect(generateRoute).toContain("withInspirationReferenceInstruction")
    expect(generateRoute).toContain("body.inspirationImageUrl")
    expect(generateRoute).toContain("generationReferenceUrls")
    expect(visualRules).toContain("The inspiration image contributes 0% facial information")
    expect(visualRules).toContain("Do not inherit eyes, lips, nose, jawline")
  })
})
