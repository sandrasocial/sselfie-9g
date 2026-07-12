// @vitest-environment node

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  LOOK_CHOICE_ACTIONS,
  buildActivationCohort,
  buildActivationFocus,
  buildActivationFunnelScorecardFromFacts,
  type ActivationStepKey,
  type ActivationUserFact,
} from "@/lib/admin/activation-funnel-scorecard"

const NOW = new Date("2026-07-12T12:00:00.000Z")

function fact(overrides: Partial<ActivationUserFact> = {}): ActivationUserFact {
  return {
    userId: "user-1",
    cohortKey: "trial",
    sourceKey: "prompt-vault-paid",
    sourceMethod: "claim_subscriber",
    entryAt: "2026-06-20T12:00:00.000Z",
    openedAt: "2026-06-20T12:01:00.000Z",
    selfieUploadedAt: "2026-06-20T12:02:00.000Z",
    lookChosenAt: "2026-06-20T12:03:00.000Z",
    generatedAt: "2026-06-20T12:05:00.000Z",
    downloadedAt: "2026-06-20T12:06:00.000Z",
    firstQualifyingAt: "2026-06-20T12:02:00.000Z",
    returnedWithin7d: true,
    createdAgainDays8To14: true,
    ...overrides,
  }
}

function getStep(cohort: ReturnType<typeof buildActivationCohort>, key: ActivationStepKey) {
  const result = cohort.steps.find(step => step.key === key)
  if (!result) throw new Error(`Missing step ${key}`)
  return result
}

describe("activation funnel scorecard", () => {
  it("uses mature denominators for seven-day and week-two behavior", () => {
    const cohort = buildActivationCohort({
      key: "trial",
      label: "Trials",
      now: NOW,
      facts: [
        fact(),
        fact({
          userId: "user-2",
          entryAt: "2026-07-10T12:00:00.000Z",
          openedAt: "2026-07-10T12:01:00.000Z",
          firstQualifyingAt: "2026-07-10T12:02:00.000Z",
          generatedAt: null,
          downloadedAt: null,
          returnedWithin7d: true,
          createdAgainDays8To14: true,
        }),
      ],
    })

    expect(getStep(cohort, "opened_app")).toMatchObject({ count: 2, eligible: 2, ratePct: 100 })
    expect(getStep(cohort, "first_image_generated")).toMatchObject({
      count: 1,
      eligible: 2,
      ratePct: 50,
    })
    expect(getStep(cohort, "returned_within_7d")).toMatchObject({
      count: 1,
      eligible: 1,
      ratePct: 100,
    })
    expect(getStep(cohort, "created_again_days_8_14")).toMatchObject({
      count: 1,
      eligible: 1,
      ratePct: 100,
    })
  })

  it("does not present upload or generation as measurements the events cannot support", () => {
    const cohort = buildActivationCohort({
      key: "trial",
      label: "Trials",
      facts: [fact()],
      now: NOW,
    })
    const selfie = getStep(cohort, "selfie_uploaded")
    const generation = getStep(cohort, "first_image_generated")

    expect(selfie.label).toBe("Uploaded a selfie")
    expect(selfie.description).toContain("already-saved selfie is not tracked")
    expect(selfie.targetComparable).toBe(false)
    expect(generation.description).toContain("Session IDs do not exist")
    expect(generation.targetComparable).toBe(false)
  })

  it("groups trial sources without hiding exact, fallback, and unknown attribution", () => {
    const report = buildActivationFunnelScorecardFromFacts({
      windowDays: 30,
      now: NOW,
      appFacts: [],
      trialFacts: [
        fact(),
        fact({ userId: "user-2", sourceKey: "starter-kit-paid", sourceMethod: "email_fallback" }),
        fact({ userId: "user-3", sourceKey: "direct", sourceMethod: "direct" }),
      ],
    })

    expect(report.sessionMeasurementAvailable).toBe(false)
    expect(report.trialSources.map(cohort => cohort.key)).toEqual([
      "direct",
      "prompt-vault-paid",
      "starter-kit-paid",
    ])
    expect(report.trialSourceAttribution).toEqual({
      exactClaimSubscriber: 1,
      emailFallback: 1,
      direct: 1,
    })
  })

  it("counts committed visual choices, not typed intent, format, or post-generation actions", () => {
    expect(LOOK_CHOICE_ACTIONS).toContain("choose_vibe")
    expect(LOOK_CHOICE_ACTIONS).toContain("choose_shot")
    expect(LOOK_CHOICE_ACTIONS).toContain("inspiration_style_committed")
    expect(LOOK_CHOICE_ACTIONS).not.toContain("typed_message")
    expect(LOOK_CHOICE_ACTIONS).not.toContain("format_choice")
    expect(LOOK_CHOICE_ACTIONS).not.toContain("use_inspiration")
  })

  it("keeps trial downloads and source attribution joined to the trial cohort", () => {
    const reportSource = readFileSync(
      resolve(process.cwd(), "lib/admin/activation-funnel-scorecard.ts"),
      "utf8"
    )
    const toolsPage = readFileSync(resolve(process.cwd(), "app/admin/tools/page.tsx"), "utf8")

    expect(reportSource).toContain("JOIN trial_cohort c ON c.user_id = ae.user_id")
    expect(reportSource).toContain("e.event_name = 'suite_image_downloaded'")
    expect(reportSource).toContain("ae.properties->>'subscriber_id'")
    expect(reportSource).toContain("LEFT JOIN freebie_subscribers exact_subscriber")
    expect(reportSource).toContain("LOWER(fs.email) = LOWER(u.email)")
    expect(toolsPage).toContain('href: "/admin/activation-funnel"')
  })

  it("focuses on weak mature week-two creation before earlier activation steps", () => {
    const focus = buildActivationFocus(
      buildActivationCohort({
        key: "trial",
        label: "Trials",
        now: NOW,
        facts: [
          fact({ createdAgainDays8To14: false }),
          fact({
            userId: "user-2",
            downloadedAt: null,
            generatedAt: null,
            returnedWithin7d: false,
            createdAgainDays8To14: false,
          }),
        ],
      })
    )

    expect(focus).toMatchObject({
      status: "constraint",
      stepKey: "created_again_days_8_14",
      title: "Turn activated trials into a paid second week",
    })
    expect(focus.evidence).toBe(
      "0 of 2 eligible people generated or downloaded again in days 8 to 14 (0%). This is below the 25% weekly focus signal."
    )
  })

  it("skips an immature week-two window and selects the next measured constraint", () => {
    const focus = buildActivationFocus(
      buildActivationCohort({
        key: "trial",
        label: "Trials",
        now: NOW,
        facts: [
          fact({
            entryAt: "2026-07-02T12:00:00.000Z",
            firstQualifyingAt: "2026-07-02T12:02:00.000Z",
            downloadedAt: null,
            returnedWithin7d: false,
            createdAgainDays8To14: false,
          }),
        ],
      })
    )

    expect(focus).toMatchObject({
      status: "constraint",
      stepKey: "returned_within_7d",
      title: "Give activated trials a reason to return",
    })
    expect(focus.evidence).toContain("0 of 1 eligible person")
  })
})
