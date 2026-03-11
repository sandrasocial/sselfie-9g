import { describe, expect, it } from "vitest"

import {
  getRecommendedSource,
  resolveModelChoice,
  getCreditCostForSource,
  type ModelChoiceReadiness,
} from "@/lib/maya/model-choice-policy"

describe("getRecommendedSource", () => {
  it("returns custom_model when user has trained model", () => {
    expect(
      getRecommendedSource({ hasTrainedModel: true, canUseSelfies: false }),
    ).toBe("custom_model")
    expect(
      getRecommendedSource({ hasTrainedModel: true, canUseSelfies: true }),
    ).toBe("custom_model")
  })

  it("returns selfies when no trained model but has uploads", () => {
    expect(
      getRecommendedSource({ hasTrainedModel: false, canUseSelfies: true }),
    ).toBe("selfies")
  })

  it("returns base_model when no model and no uploads", () => {
    expect(
      getRecommendedSource({ hasTrainedModel: false, canUseSelfies: false }),
    ).toBe("base_model")
  })
})

describe("resolveModelChoice", () => {
  const trained: ModelChoiceReadiness = { hasTrainedModel: true, canUseSelfies: true }
  const untrainedWithSelfies: ModelChoiceReadiness = { hasTrainedModel: false, canUseSelfies: true }
  const untrainedNoUploads: ModelChoiceReadiness = { hasTrainedModel: false, canUseSelfies: false }

  it("trained + selected custom_model → effective custom_model, available", () => {
    const r = resolveModelChoice({ readiness: trained, selectedSource: "custom_model" })
    expect(r.effectiveSource).toBe("custom_model")
    expect(r.available).toBe(true)
    expect(r.fallbackReason).toBeUndefined()
  })

  it("trained + selected selfies → effective selfies, available", () => {
    const r = resolveModelChoice({ readiness: trained, selectedSource: "selfies" })
    expect(r.effectiveSource).toBe("selfies")
    expect(r.available).toBe(true)
  })

  it("untrained + selected custom_model → fallback to selfies when canUseSelfies", () => {
    const r = resolveModelChoice({
      readiness: untrainedWithSelfies,
      selectedSource: "custom_model",
    })
    expect(r.effectiveSource).toBe("selfies")
    expect(r.available).toBe(false)
    expect(r.fallbackReason).toBe("training_required")
  })

  it("untrained + selected custom_model → fallback to base_model when no uploads", () => {
    const r = resolveModelChoice({
      readiness: untrainedNoUploads,
      selectedSource: "custom_model",
    })
    expect(r.effectiveSource).toBe("base_model")
    expect(r.available).toBe(false)
    expect(r.fallbackReason).toBe("training_required")
  })

  it("untrained + selected selfies + has uploads → effective selfies, available", () => {
    const r = resolveModelChoice({
      readiness: untrainedWithSelfies,
      selectedSource: "selfies",
    })
    expect(r.effectiveSource).toBe("selfies")
    expect(r.available).toBe(true)
  })

  it("untrained + selected selfies + no uploads → fallback, no_selfies", () => {
    const r = resolveModelChoice({
      readiness: untrainedNoUploads,
      selectedSource: "selfies",
    })
    expect(r.effectiveSource).toBe("base_model")
    expect(r.available).toBe(false)
    expect(r.fallbackReason).toBe("no_selfies")
  })

  it("choose_source uses recommendedSource", () => {
    expect(
      resolveModelChoice({ readiness: trained, selectedSource: "choose_source" }).effectiveSource,
    ).toBe("custom_model")
    expect(
      resolveModelChoice({ readiness: untrainedWithSelfies, selectedSource: "choose_source" })
        .effectiveSource,
    ).toBe("selfies")
    expect(
      resolveModelChoice({ readiness: untrainedNoUploads, selectedSource: "choose_source" })
        .effectiveSource,
    ).toBe("base_model")
  })

  it("base_model always available", () => {
    const r = resolveModelChoice({ readiness: untrainedNoUploads, selectedSource: "base_model" })
    expect(r.effectiveSource).toBe("base_model")
    expect(r.available).toBe(true)
  })
})

describe("getCreditCostForSource", () => {
  it("charges Pro cost for selfies (default 2K)", () => {
    expect(getCreditCostForSource("selfies")).toBe(2)
    expect(getCreditCostForSource("selfies", "2K")).toBe(2)
  })

  it("charges Classic cost for custom_model and base_model", () => {
    expect(getCreditCostForSource("custom_model")).toBe(1)
    expect(getCreditCostForSource("base_model")).toBe(1)
  })
})
