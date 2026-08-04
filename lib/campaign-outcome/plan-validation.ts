import type { z } from "zod"

import type { campaignPlanSchema } from "@/lib/campaign-outcome/plan-schema"

type CampaignPlan = z.infer<typeof campaignPlanSchema>

type CampaignBrief = {
  whatSheSells: string
  promotion: string
  targetAudience: string
}

const INVENTED_KEYWORD =
  /\b(?:comment|dm|message)\s+(?:the\s+word\s+)?["“']?([a-z][a-z0-9_-]{2,})\b/gi
const ABSOLUTE_IDENTITY_PROMISES = [
  /\bnothing gets replaced\b/i,
  /\byour face stays your face\b/i,
  /\bface stays (?:exactly )?(?:the same|unchanged)\b/i,
  /\byour (?:real|actual) body\b/i,
  /\bno reshaping\b/i,
  /\bguaranteed to look like you\b/i,
  /\bAI (?:does not|doesn't|will not|won't) change you\b/i,
]
const URGENCY_PATTERNS = [
  /\blast chance\b/i,
  /\btoday only\b/i,
  /\bends? (?:today|tomorrow)\b/i,
  /\bthis week only\b/i,
  /\blimited spots?\b/i,
]

function campaignText(plan: CampaignPlan): string {
  return [
    plan.visualDirection,
    plan.firstPostReason,
    ...plan.posts.flatMap(post => [post.headline, post.caption, post.cta]),
    plan.carousel.title,
    ...plan.carousel.slides.flatMap(slide => [slide.headline, slide.body]),
    ...plan.storySequences.flatMap(sequence => [
      sequence.title,
      ...sequence.slides.flatMap(slide => [slide.headline, slide.body]),
    ]),
    ...plan.publishPlan.map(item => item.instruction),
    plan.reel.hook,
    plan.reel.script,
    plan.reel.caption,
    plan.reel.cta,
    ...plan.reel.overlayLines,
  ].join("\n")
}

export function validateCampaignPlanTruth(plan: CampaignPlan, brief: CampaignBrief): CampaignPlan {
  const output = campaignText(plan)
  const supplied = `${brief.whatSheSells}\n${brief.promotion}\n${brief.targetAudience}`

  for (const match of output.matchAll(INVENTED_KEYWORD)) {
    const keyword = match[1]
    if (keyword) throw new Error(`Campaign plan failed truth QA: invented keyword ${keyword}`)
  }

  if (ABSOLUTE_IDENTITY_PROMISES.some(pattern => pattern.test(output))) {
    throw new Error("Campaign plan failed truth QA: unsupported absolute identity promise")
  }

  for (const pattern of URGENCY_PATTERNS) {
    const match = output.match(pattern)?.[0]
    if (match && !supplied.toLowerCase().includes(match.toLowerCase())) {
      throw new Error("Campaign plan failed truth QA: urgency was not supplied by the buyer")
    }
  }

  return plan
}
