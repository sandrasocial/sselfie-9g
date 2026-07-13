import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { validateWeeklyBriefDraft } from "@/lib/content/weekly-brief-contract"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function validDraft() {
  return {
    researchNotes: "Grounded in this week's measured behavior and current research.",
    demandMap: {
      strongestDemandSignal: "People are saving practical photo instructions.",
      painfulBefore: "She does not know what visual to make next.",
      desiredAfter: "She can make a recognizable image from her phone.",
      beliefShift: "She does not need a full production team to be visible.",
      primaryOfferBridge: "Start with the paid prompt collection.",
      contentWarning: "Do not promise instant business results.",
    },
    trendRadar: [
      {
        trend: "Natural phone-camera candids",
        whyItsMoving: "The visual language feels immediate and attainable.",
        howSandraRidesIt: "Teach the visual method using a real, recognizable result.",
        noFakeGuardrail: "Keep natural skin texture and realistic phone-camera detail.",
        vibePreset:
          "Natural phone-camera candids in soft window light, relaxed framing, realistic skin texture, and a different everyday room in each shot. Keep the person recognizable to the uploaded reference photo.",
      },
    ],
    contentPlan: Array.from({ length: 5 }, (_, index) => ({
      day: DAYS[index],
      format: index === 1 ? "carousel" : "reel",
      funnelStage: index === 4 ? "warm" : "cold",
      engineeredFor: index === 4 ? "comment" : "save",
      title: `Piece ${index + 1}`,
      hook: `A grounded hook ${index + 1}`,
      visualHook: "Show the finished result in the first frame.",
      onScreenText: ["One clear line"],
      caption: "A short grounded caption.",
      ctaKeyword: index === 4 ? "WORK" : "PROMPT",
      whyThisWorks: "It follows a measured audience signal.",
    })),
    dailyStories: DAYS.map((day, index) => ({
      day,
      theme: `Theme ${index + 1}`,
      conversationType: (["my-story", "my-clients", "my-beliefs", "my-life"] as const)[index % 4],
      offerMention: index % 2 === 0 ? "none" : "Prompt Vault",
    })),
    emailSummary: "This week follows the strongest measured demand signal. The plan stays focused.",
  }
}

describe("weekly content brief draft contract", () => {
  it("accepts a complete canonical weekly draft", () => {
    const draft = validDraft()

    expect(validateWeeklyBriefDraft(draft)).toEqual(draft)
  })

  it("requires at least five content pieces and all seven weekday themes", () => {
    const tooFewPieces = validDraft()
    tooFewPieces.contentPlan = tooFewPieces.contentPlan.slice(0, 4)
    expect(() => validateWeeklyBriefDraft(tooFewPieces)).toThrow(
      "contentPlan must contain at least 5 pieces"
    )

    const missingSunday = validDraft()
    missingSunday.dailyStories = missingSunday.dailyStories.slice(0, 6)
    expect(() => validateWeeklyBriefDraft(missingSunday)).toThrow(
      "dailyStories must contain exactly 7 weekday themes"
    )
  })

  it("rejects replacement aliases instead of silently storing an incompatible payload", () => {
    const legacyDemand = validDraft() as Record<string, any>
    legacyDemand.demandMap.offerBridge = legacyDemand.demandMap.primaryOfferBridge
    delete legacyDemand.demandMap.primaryOfferBridge

    expect(() => validateWeeklyBriefDraft(legacyDemand)).toThrow(
      "demandMap.offerBridge is a retired alias"
    )

    const legacyTrend = validDraft() as Record<string, any>
    legacyTrend.trendRadar[0].wave = legacyTrend.trendRadar[0].trend
    delete legacyTrend.trendRadar[0].trend

    expect(() => validateWeeklyBriefDraft(legacyTrend)).toThrow(
      "trendRadar[0].wave is a retired alias"
    )
  })

  it("requires at least one usable visual trend and blocks names, products, and channels", () => {
    const noVisualTrend = validDraft()
    noVisualTrend.trendRadar[0].vibePreset = ""
    expect(() => validateWeeklyBriefDraft(noVisualTrend)).toThrow(
      "trendRadar must contain at least one usable buyer-safe vibePreset"
    )

    const unsafe = validDraft()
    unsafe.trendRadar[0].vibePreset =
      "Sandra uses this SSELFIE SUITE look in an Instagram Reel with a PROMPT CTA."
    expect(() => validateWeeklyBriefDraft(unsafe)).toThrow(
      "trendRadar[0].vibePreset contains a name, product, keyword, or channel reference"
    )
  })

  it("validates before storage or email and keeps live readers independent of the retired engine", () => {
    const root = process.cwd()
    const script = fs.readFileSync(path.join(root, "scripts/weekly-brief-prep.ts"), "utf8")
    const trendRoute = fs.readFileSync(
      path.join(root, "app/api/admin/content-kit/trend-vibes/route.ts"),
      "utf8"
    )
    const carousel = fs.readFileSync(
      path.join(root, "lib/content-kit/carousel-generator.ts"),
      "utf8"
    )

    const validationCall = script.indexOf("const input = validateWeeklyBriefDraft(JSON.parse(raw))")
    expect(validationCall).toBeGreaterThan(-1)
    expect(validationCall).toBeLessThan(script.indexOf("INSERT INTO analytics_reports"))
    expect(validationCall).toBeLessThan(script.indexOf("resend.emails.send"))

    for (const consumer of [trendRoute, carousel]) {
      expect(consumer).toContain("@/lib/content/weekly-brief-contract")
      expect(consumer).not.toContain("@/lib/content-engine/brief-generator")
    }
  })
})
