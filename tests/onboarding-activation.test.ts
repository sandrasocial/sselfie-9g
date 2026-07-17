import { describe, expect, it } from "vitest"

import { getActivationChecklist, getActivationContinueHref, getFreeUserWizardDecision } from "@/lib/onboarding/activation"

describe("getFreeUserWizardDecision", () => {
  it("opens wizard at selfie step for incomplete users without selfies", () => {
    expect(
      getFreeUserWizardDecision({
        onboardingCompleted: false,
        hasSelfies: false,
      }),
    ).toEqual({
      showWizard: true,
      initialStep: 5,
      mode: "selfie_first",
    })
  })

  it("does not block users who already uploaded selfies", () => {
    expect(
      getFreeUserWizardDecision({
        onboardingCompleted: false,
        hasSelfies: true,
      }),
    ).toEqual({
      showWizard: false,
      mode: "none",
    })
  })

  it("does not show wizard after onboarding completion", () => {
    expect(
      getFreeUserWizardDecision({
        onboardingCompleted: true,
        hasSelfies: false,
      }),
    ).toEqual({
      showWizard: false,
      mode: "none",
    })
  })
})

describe("getActivationChecklist", () => {
  it("prioritizes selfie upload first", () => {
    const result = getActivationChecklist({
      hasSelfies: false,
      hasTrainedModel: false,
      hasGeneratedAny: false,
    })
    expect(result.nextAction).toBe("upload_selfie")
    expect(result.steps.map((step) => step.done)).toEqual([false, false])
  })

  it("moves directly to first generation after selfie upload", () => {
    const result = getActivationChecklist({
      hasSelfies: true,
      hasTrainedModel: false,
      hasGeneratedAny: false,
    })
    expect(result.nextAction).toBe("generate_first_image")
    expect(result.steps.map((step) => step.key)).toEqual(["selfie", "generate"])
    expect(result.steps.map((step) => step.done)).toEqual([true, false])
  })

  it("does not add model training even when a legacy model exists", () => {
    const result = getActivationChecklist({
      hasSelfies: true,
      hasTrainedModel: true,
      hasGeneratedAny: false,
    })
    expect(result.nextAction).toBe("generate_first_image")
    expect(result.steps.map((step) => step.key)).toEqual(["selfie", "generate"])
    expect(result.steps.map((step) => step.done)).toEqual([true, false])
  })

  it("returns none when all activation steps are complete", () => {
    const result = getActivationChecklist({
      hasSelfies: true,
      hasTrainedModel: true,
      hasGeneratedAny: true,
    })
    expect(result.nextAction).toBe("none")
    expect(result.steps.map((step) => step.done)).toEqual([true, true])
  })

  it("skips model training step when it is not required", () => {
    const result = getActivationChecklist({
      hasSelfies: true,
      hasTrainedModel: false,
      hasGeneratedAny: false,
      requiresModelTraining: false,
    })

    expect(result.nextAction).toBe("generate_first_image")
    expect(result.steps.map((step) => step.key)).toEqual(["selfie", "generate"])
    expect(result.steps.map((step) => step.done)).toEqual([true, false])
  })
})

describe("getActivationContinueHref", () => {
  it("routes first-generation activation back into Maya", () => {
    expect(getActivationContinueHref("generate_first_image")).toBe("/app?view=create")
  })

  it("returns null for upload step because UI should open wizard in place", () => {
    expect(getActivationContinueHref("upload_selfie")).toBeNull()
  })
})
