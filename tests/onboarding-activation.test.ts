import { describe, expect, it } from "vitest"

import { getActivationChecklist, getFreeUserWizardDecision } from "@/lib/onboarding/activation"

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
    expect(result.steps.map((step) => step.done)).toEqual([false, false, false])
  })

  it("moves next action to model training after selfie upload", () => {
    const result = getActivationChecklist({
      hasSelfies: true,
      hasTrainedModel: false,
      hasGeneratedAny: false,
    })
    expect(result.nextAction).toBe("train_model")
    expect(result.steps.map((step) => step.done)).toEqual([true, false, false])
  })

  it("moves next action to first generation when model is ready", () => {
    const result = getActivationChecklist({
      hasSelfies: true,
      hasTrainedModel: true,
      hasGeneratedAny: false,
    })
    expect(result.nextAction).toBe("generate_first_image")
    expect(result.steps.map((step) => step.done)).toEqual([true, true, false])
  })

  it("returns none when all activation steps are complete", () => {
    const result = getActivationChecklist({
      hasSelfies: true,
      hasTrainedModel: true,
      hasGeneratedAny: true,
    })
    expect(result.nextAction).toBe("none")
    expect(result.steps.map((step) => step.done)).toEqual([true, true, true])
  })
})
