import { describe, expect, it } from "vitest"

import { validateCampaignPlanTruth } from "@/lib/campaign-outcome/plan-validation"

const basePlan = {
  visualDirection:
    "Warm editorial founder photography in a real studio with natural light and varied compositions.",
  firstPostReason: "It connects the buyer's problem to the named offer before making the invitation.",
  posts: [
    {
      role: "attention" as const,
      headline: "When your content needs new photos again",
      caption:
        "Vault Maya gives women building a personal brand a simpler way to create useful photos from their own selfies.",
      cta: "See the Vault Maya details.",
      visualPrompt: "A realistic editorial full-body founder portrait in soft natural window light.",
      whyThisPost: "It names the recurring photo problem and connects it to Vault Maya.",
    },
    {
      role: "trust" as const,
      headline: "AI photos should still feel recognizable",
      caption:
        "Vault Maya is designed to preserve natural features while changing the setting, styling, and light. AI can still vary small details, so every result should be checked.",
      cta: "Read how Vault Maya works.",
      visualPrompt: "A realistic editorial seated portrait with natural skin texture and believable hands.",
      whyThisPost: "It explains the product honestly without guaranteeing a perfect result.",
    },
    {
      role: "offer" as const,
      headline: "Create your next set of brand photos",
      caption:
        "The Vault Maya founder membership includes 30 monthly photo creations, the Vault look library, weekly drops, and downloads.",
      cta: "Join Vault Maya for $19 per month.",
      visualPrompt: "A realistic editorial founder portrait with a confident relaxed expression.",
      whyThisPost: "It makes the named offer and approved price clear.",
    },
  ],
  alternatePhotos: [
    {
      label: "Working portrait",
      visualPrompt: "A realistic editorial working portrait in a bright studio.",
      whyThisPhoto: "Adds a useful working image.",
    },
    {
      label: "Close portrait",
      visualPrompt: "A realistic close founder portrait in window light.",
      whyThisPhoto: "Adds a profile-ready option.",
    },
    {
      label: "Movement portrait",
      visualPrompt: "A realistic standing founder portrait with subtle natural movement.",
      whyThisPhoto: "Adds visual variety.",
    },
  ],
  carousel: {
    title: "How Vault Maya works",
    slides: Array.from({ length: 7 }, (_, index) => ({
      headline: `Vault Maya step ${index + 1}`,
      body: "Choose a look and create a photo from your own selfie.",
    })),
  },
  storySequences: [
    {
      role: "warmup" as const,
      title: "A simpler photo workflow",
      slides: Array.from({ length: 5 }, (_, index) => ({
        headline: `Photo need ${index + 1}`,
        body: "Vault Maya helps create useful personal-brand photos.",
      })),
    },
    {
      role: "offer" as const,
      title: "Vault Maya founder membership",
      slides: Array.from({ length: 5 }, (_, index) => ({
        headline: `Vault Maya detail ${index + 1}`,
        body: "The founder membership is $19 per month.",
      })),
    },
  ],
  publishPlan: Array.from({ length: 5 }, (_, index) => ({
    day: index + 1,
    asset: [
      "attention_post",
      "warmup_stories",
      "carousel",
      "trust_post",
      "offer_post",
    ][index] as
      | "attention_post"
      | "warmup_stories"
      | "carousel"
      | "trust_post"
      | "offer_post",
    instruction: "Publish the next approved Vault Maya campaign asset.",
  })),
  reel: {
    hook: "Vault Maya is for the days your business needs new photos again.",
    script:
      "Choose a Vault look, add your own selfies, and create a new photo for your personal brand. Check the result and download the ones you want to use.",
    selfFilmedClipInstruction: "Film yourself choosing a photo on your phone for 5 seconds.",
    brollClips: [
      {
        id: "clip-1" as const,
        sourcePhotoId: "attention" as const,
        motionPrompt: "A subtle camera push-in with a natural blink and gentle breathing.",
      },
      {
        id: "clip-2" as const,
        sourcePhotoId: "trust" as const,
        motionPrompt: "A slow parallax shift with subtle breathing and natural hair movement.",
      },
      {
        id: "clip-3" as const,
        sourcePhotoId: "offer" as const,
        motionPrompt: "A gentle camera hold with soft light movement and a natural blink.",
      },
    ],
    overlayLines: ["Need new photos?", "Choose a Vault look", "Create with your own selfies"],
    assembly: {
      clipOrder: ["self_filmed", "clip-1", "clip-2", "clip-3"],
      overlayPlacements: [
        { overlayLine: "Need new photos?", overClipId: "self_filmed" as const },
        { overlayLine: "Choose a Vault look", overClipId: "clip-1" as const },
        { overlayLine: "Create with your own selfies", overClipId: "clip-2" as const },
      ],
      targetLengthSeconds: 20,
      audioType: "Light instrumental background audio",
    },
    caption: "Vault Maya helps you create useful brand photos from your own selfies.",
    cta: "See the Vault Maya details.",
    corpusPatternId: "reel:1",
  },
}

const brief = {
  whatSheSells: "Vault Maya, a monthly AI photo membership",
  promotion: "The Vault Maya founder membership at $19 per month",
  targetAudience: "Women over 35 building a personal brand",
}

describe("campaign plan truth gate", () => {
  it("accepts specific copy that stays inside the supplied brief", () => {
    expect(() => validateCampaignPlanTruth(basePlan, brief)).not.toThrow()
  })

  it("rejects an invented DM or comment keyword", () => {
    const plan = structuredClone(basePlan)
    plan.posts[0].cta = "Comment photo and I will send you the link."

    expect(() => validateCampaignPlanTruth(plan, brief)).toThrow(/invented keyword/i)
  })

  it("rejects absolute identity and body promises", () => {
    const plan = structuredClone(basePlan)
    plan.posts[1].caption =
      "Nothing gets replaced. Your face stays your face and your real body is guaranteed."

    expect(() => validateCampaignPlanTruth(plan, brief)).toThrow(/identity promise/i)
  })

  it("rejects urgency that was not supplied by the buyer", () => {
    const plan = structuredClone(basePlan)
    plan.posts[2].cta = "Last chance. Join Vault Maya today only."

    expect(() => validateCampaignPlanTruth(plan, brief)).toThrow(/urgency/i)
  })
})
