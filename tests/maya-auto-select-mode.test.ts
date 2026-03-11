import { describe, expect, it } from "vitest"

import {
  autoSelectMayaMode,
  isContentPlanningIntent,
  isUnifiedMayaUiEnabled,
} from "@/lib/maya/auto-select-mode"

describe("isUnifiedMayaUiEnabled", () => {
  it("enables unified mode for true-ish values", () => {
    expect(isUnifiedMayaUiEnabled("true")).toBe(true)
    expect(isUnifiedMayaUiEnabled("1")).toBe(true)
  })

  it("disables unified mode for false-ish values", () => {
    expect(isUnifiedMayaUiEnabled(undefined)).toBe(false)
    expect(isUnifiedMayaUiEnabled("false")).toBe(false)
    expect(isUnifiedMayaUiEnabled("0")).toBe(false)
    expect(isUnifiedMayaUiEnabled("")).toBe(false)
  })
})

describe("autoSelectMayaMode", () => {
  it("routes to planning mode when request is content planning", () => {
    expect(
      autoSelectMayaMode({
        hasReferenceImage: false,
        hasTrainedLoraModel: true,
        isContentPlanning: true,
      }),
    ).toBe("feed-planner")
  })

  it("routes to pro mode when reference image exists", () => {
    expect(
      autoSelectMayaMode({
        hasReferenceImage: true,
        hasTrainedLoraModel: true,
        isContentPlanning: false,
      }),
    ).toBe("pro")
  })

  it("routes to classic mode when lora exists and there is no reference image", () => {
    expect(
      autoSelectMayaMode({
        hasReferenceImage: false,
        hasTrainedLoraModel: true,
        isContentPlanning: false,
      }),
    ).toBe("maya")
  })

  it("defaults to pro mode when no reference image and no lora model", () => {
    expect(
      autoSelectMayaMode({
        hasReferenceImage: false,
        hasTrainedLoraModel: false,
        isContentPlanning: false,
      }),
    ).toBe("pro")
  })

  it("uses policy when canUseSelfies is provided: no model but has selfies → pro", () => {
    expect(
      autoSelectMayaMode({
        hasReferenceImage: false,
        hasTrainedLoraModel: false,
        isContentPlanning: false,
        canUseSelfies: true,
      }),
    ).toBe("pro")
  })

  it("uses policy when canUseSelfies is provided: no model and no selfies → pro", () => {
    expect(
      autoSelectMayaMode({
        hasReferenceImage: false,
        hasTrainedLoraModel: false,
        isContentPlanning: false,
        canUseSelfies: false,
      }),
    ).toBe("pro")
  })
})

describe("isContentPlanningIntent", () => {
  it("detects planning language", () => {
    expect(isContentPlanningIntent("Can you build me a content plan for next month?")).toBe(true)
    expect(isContentPlanningIntent("I need an instagram posting strategy")).toBe(true)
  })

  it("keeps explicit calendar build requests in Maya structured asset routing", () => {
    expect(isContentPlanningIntent("Create a content calendar for this month")).toBe(false)
    expect(isContentPlanningIntent("Can you give me a content calendar for this week?")).toBe(false)
  })

  it("ignores normal image prompt requests", () => {
    expect(isContentPlanningIntent("Create a luxury portrait with soft lighting")).toBe(false)
  })
})
