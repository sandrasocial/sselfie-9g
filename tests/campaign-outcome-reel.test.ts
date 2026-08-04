// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"

const startVideoMock = vi.hoisted(() => vi.fn())
const checkVideoMock = vi.hoisted(() => vi.fn())
const pollPredictionMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))
vi.mock("@/lib/maya/video-generation-service", () => ({
  startVideoGeneration: startVideoMock,
  checkVideoGeneration: checkVideoMock,
}))
vi.mock("@/lib/replicate-polling", () => ({ pollPrediction: pollPredictionMock }))

describe("campaign reel layer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    startVideoMock.mockResolvedValue({
      videoId: 10,
      predictionId: "prediction-10",
      status: "processing",
      creditsDeducted: 0,
      newBalance: 0,
      motionPrompt: "gentle push-in",
    })
    pollPredictionMock.mockResolvedValue({ status: "succeeded" })
    checkVideoMock.mockResolvedValue({
      status: "succeeded",
      videoUrl: "https://blob.example.com/clip.mp4",
      progress: 100,
    })
  })

  it("rejects generic hooks and banned reel patterns before fulfillment", async () => {
    const { validateCampaignReelPlan } = await import("@/lib/campaign-outcome/reel")
    expect(() =>
      validateCampaignReelPlan(
        {
          hook: "Stop scrolling for three tips to grow online",
          script: "Here are three simple tips that can help anyone show up online.",
          selfFilmedClipInstruction:
            "Film yourself closing your laptop, then look at the camera for 5 seconds.",
          brollClips: [],
          overlayLines: ["Three tips", "Show up", "Start now"],
          assembly: {
            clipOrder: ["self_filmed"],
            overlayPlacements: [
              { overlayLine: "Three tips", overClipId: "self_filmed" },
              { overlayLine: "Show up", overClipId: "self_filmed" },
              { overlayLine: "Start now", overClipId: "self_filmed" },
            ],
            targetLengthSeconds: 20,
            audioType: "calm instrumental audio",
          },
          caption: "A generic caption that could belong to any business.",
          cta: "Read more.",
          corpusPatternId: "reel:11",
        },
        {
          whatSheSells: "A four-week home organization program",
          promotion: "The September Home Reset group",
          targetAudience: "Busy mothers whose homes feel overwhelming",
          allowedPatternIds: ["reel:11"],
        }
      )
    ).toThrow(/generic|banned/i)
  })

  it("keeps intake and corpus traceability on an approved specific reel", async () => {
    const { validateCampaignReelPlan } = await import("@/lib/campaign-outcome/reel")
    const plan = validateCampaignReelPlan(
      {
        hook: "If your home feels impossible by September, start with one room.",
        script:
          "The September Home Reset is for busy mothers who need a calmer place to begin. We start with one room, one small plan, and support that fits real life.",
        selfFilmedClipInstruction:
          "Film yourself closing one cupboard, then turn and smile at the camera for 5 seconds.",
        brollClips: [
          {
            id: "clip-1",
            sourcePhotoId: "attention",
            motionPrompt:
              "Gentle camera push-in with a natural blink and soft window-light movement.",
          },
        ],
        overlayLines: [
          "Your home is not the problem",
          "Start with one room",
          "September Home Reset",
        ],
        assembly: {
          clipOrder: ["clip-1", "self_filmed"],
          overlayPlacements: [
            { overlayLine: "Your home is not the problem", overClipId: "clip-1" },
            { overlayLine: "Start with one room", overClipId: "self_filmed" },
            { overlayLine: "September Home Reset", overClipId: "clip-1" },
          ],
          targetLengthSeconds: 20,
          audioType: "calm warm instrumental audio",
        },
        caption: "The September Home Reset gives busy mothers one calm place to begin.",
        cta: "Join the September group through the link in my bio.",
        corpusPatternId: "reel:11",
      },
      {
        whatSheSells: "A four-week home organization program",
        promotion: "The September Home Reset group",
        targetAudience: "Busy mothers whose homes feel overwhelming",
        allowedPatternIds: ["reel:11"],
      }
    )
    expect(plan.corpusPatternId).toBe("reel:11")
  })

  it("rejects an assembly when an overlay is assigned to the wrong sequence", async () => {
    const { validateCampaignReelPlan } = await import("@/lib/campaign-outcome/reel")
    expect(() =>
      validateCampaignReelPlan(
        {
          hook: "The September Home Reset starts with one calmer room.",
          script:
            "The September Home Reset is for busy mothers who need a calmer place to begin. We start with one room and one useful plan.",
          selfFilmedClipInstruction:
            "Film yourself closing one cupboard, then look at the camera for 5 seconds.",
          brollClips: [
            {
              id: "clip-1",
              sourcePhotoId: "attention",
              motionPrompt: "Gentle camera push-in with natural window-light movement.",
            },
          ],
          overlayLines: ["September Home Reset", "Start with one room"],
          assembly: {
            clipOrder: ["clip-1", "self_filmed"],
            overlayPlacements: [
              { overlayLine: "Start with one room", overClipId: "clip-1" },
              { overlayLine: "September Home Reset", overClipId: "self_filmed" },
            ],
            targetLengthSeconds: 20,
            audioType: "calm warm instrumental audio",
          },
          caption: "The September Home Reset gives busy mothers one calm place to begin.",
          cta: "Join the September group through the link in my bio.",
          corpusPatternId: "reel:11",
        },
        {
          whatSheSells: "A four-week home organization program",
          promotion: "The September Home Reset group",
          targetAudience: "Busy mothers whose homes feel overwhelming",
          allowedPatternIds: ["reel:11"],
        }
      )
    ).toThrow(/overlay placement/i)
  })

  it("does not create duplicate paid video jobs when one clip fails", async () => {
    startVideoMock.mockRejectedValue(new Error("provider unavailable"))
    const { generateCampaignReelClips } = await import("@/lib/campaign-outcome/reel")
    const result = await generateCampaignReelClips({
      orderId: 51,
      businessVideoUserId: "campaign-video-owner",
      clipPlans: [
        {
          id: "clip-1",
          sourcePhotoId: "attention",
          motionPrompt: "Gentle camera push-in with natural movement.",
        },
      ],
      photoUrls: { attention: "https://blob.example.com/photo.png" },
    })

    expect(startVideoMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual([
      expect.objectContaining({
        id: "clip-1",
        status: "unavailable",
        videoUrl: null,
        note: expect.stringContaining("could not be prepared"),
      }),
    ])
  })

  it("uses business funding and campaign-outcome source for every clip", async () => {
    const { generateCampaignReelClips } = await import("@/lib/campaign-outcome/reel")
    await generateCampaignReelClips({
      orderId: 51,
      businessVideoUserId: "campaign-video-owner",
      clipPlans: [
        {
          id: "clip-1",
          sourcePhotoId: "attention",
          motionPrompt: "Gentle camera push-in with natural movement.",
        },
      ],
      photoUrls: { attention: "https://blob.example.com/photo.png" },
    })

    expect(startVideoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "campaign-outcome",
        billingMode: "business",
        billingReference: "campaign-order-51:clip-1",
      })
    )
    expect(pollPredictionMock).toHaveBeenCalledWith(
      "prediction-10",
      expect.objectContaining({ timeout: 180_000 })
    )
  })
})
