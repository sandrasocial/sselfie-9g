import { z } from "zod"

const shortSlideSchema = z.object({
  headline: z.string().min(2).max(80),
  body: z.string().min(2).max(240),
})

// Anthropic structured output currently rejects JSON schemas whose array minItems is greater
// than one. Keep provider-facing arrays at min(1), then enforce exact campaign counts after the
// response is parsed in the generator and reel validators.
export const campaignPlanSchema = z.object({
  visualDirection: z.string().min(20).max(500),
  firstPostReason: z.string().min(10).max(300),
  posts: z
    .array(
      z.object({
        role: z.enum(["attention", "trust", "offer"]),
        headline: z.string().min(3).max(120),
        caption: z.string().min(40).max(1800),
        cta: z.string().min(2).max(220),
        visualPrompt: z.string().min(40).max(1800),
        whyThisPost: z.string().min(10).max(300),
      })
    )
    .min(1),
  alternatePhotos: z
    .array(
      z.object({
        label: z.string().min(2).max(80),
        visualPrompt: z.string().min(40).max(1800),
        whyThisPhoto: z.string().min(10).max(300),
      })
    )
    .min(1),
  carousel: z.object({
    title: z.string().min(3).max(100),
    slides: z.array(shortSlideSchema).min(1),
  }),
  storySequences: z
    .array(
      z.object({
        role: z.enum(["warmup", "offer"]),
        title: z.string().min(3).max(100),
        slides: z.array(shortSlideSchema).min(1),
      })
    )
    .min(1),
  publishPlan: z
    .array(
      z.object({
        day: z.number().int(),
        asset: z.enum([
          "attention_post",
          "warmup_stories",
          "carousel",
          "trust_post",
          "offer_post",
        ]),
        instruction: z.string().min(5).max(300),
      })
    )
    .min(1),
  reel: z.object({
    hook: z.string().min(12).max(180),
    script: z.string().min(40).max(900),
    selfFilmedClipInstruction: z.string().min(20).max(300),
    brollClips: z
      .array(
        z.object({
          id: z.enum(["clip-1", "clip-2", "clip-3"]),
          sourcePhotoId: z.enum(["attention", "trust", "offer"]),
          motionPrompt: z.string().min(20).max(500),
        })
      )
      .min(1),
    overlayLines: z.array(z.string().min(2).max(100)).min(1),
    assembly: z.object({
      clipOrder: z.array(z.string().min(2).max(50)).min(1),
      overlayPlacements: z
        .array(
          z.object({
            overlayLine: z.string().min(2).max(100),
            overClipId: z.enum(["clip-1", "clip-2", "clip-3", "self_filmed"]),
          })
        )
        .min(1),
      targetLengthSeconds: z.number().int(),
      audioType: z.string().min(5).max(100),
    }),
    caption: z.string().min(40).max(1800),
    cta: z.string().min(2).max(220),
    corpusPatternId: z.string().min(3).max(100),
  }),
})
