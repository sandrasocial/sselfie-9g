import "server-only"

import { put } from "@vercel/blob"
import { generateObject } from "ai"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { campaignPlanSchema } from "@/lib/campaign-outcome/plan-schema"
import { validateCampaignPlanTruth } from "@/lib/campaign-outcome/plan-validation"
import { renderCampaignSlide } from "@/lib/campaign-outcome/slide-renderer"
import { ensureCampaignOutcomeSchema } from "@/lib/campaign-outcome/schema"
import {
  buildCampaignTraceability,
  generateCampaignReelClips,
  loadCampaignPatternCorpus,
  resolveCampaignVideoOwnerUserId,
  validateCampaignReelPlan,
} from "@/lib/campaign-outcome/reel"
import type {
  CampaignData,
  CampaignPhoto,
  CampaignPost,
  CampaignPostRole,
  CampaignStoryRole,
  CampaignStorySequence,
} from "@/lib/campaign-outcome/types"
import { sql } from "@/lib/db/client"
import { generateFeedImageWithOpenAI } from "@/lib/feed-planner/openai-image"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"

type ClaimedCampaignOrder = {
  id: number
  user_id: string | null
  is_test_mode: boolean
  customer_email: string
  selfie_url: string
  what_she_sells: string
  promotion: string
  target_audience: string
  voice_reference: string | null
  platform: string | null
}

function orderedPosts<T extends { role: CampaignPostRole }>(posts: T[]): T[] {
  const order: CampaignPostRole[] = ["attention", "trust", "offer"]
  return order
    .map(role => posts.find(post => post.role === role))
    .filter((post): post is T => Boolean(post))
}

function orderedStorySequences<T extends { role: CampaignStoryRole }>(sequences: T[]): T[] {
  const order: CampaignStoryRole[] = ["warmup", "offer"]
  return order
    .map(role => sequences.find(sequence => sequence.role === role))
    .filter((sequence): sequence is T => Boolean(sequence))
}

async function savePng(path: string, buffer: Buffer): Promise<string> {
  const blob = await put(path, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  })
  return blob.url
}

async function claimCampaignOrder(orderId: number): Promise<ClaimedCampaignOrder | null> {
  await ensureCampaignOutcomeSchema()
  const rows = await sql`
    UPDATE campaign_orders
    SET
      status = 'generating',
      generation_started_at = NOW(),
      generation_attempts = generation_attempts + 1,
      generation_error = NULL,
      updated_at = NOW()
    WHERE id = ${orderId}
      AND status = 'inputs_ready'
      AND selfie_url IS NOT NULL
      AND what_she_sells IS NOT NULL
      AND promotion IS NOT NULL
      AND target_audience IS NOT NULL
    RETURNING id, user_id, is_test_mode, customer_email, selfie_url, what_she_sells, promotion,
      target_audience, voice_reference, platform
  `
  return (rows[0] as ClaimedCampaignOrder | undefined) || null
}

export async function generateCampaignOrder(
  orderId: number
): Promise<{ generated: boolean; reason?: string }> {
  const order = await claimCampaignOrder(orderId)
  if (!order) return { generated: false, reason: "not_ready_or_already_claimed" }

  try {
    const patternCorpus = await loadCampaignPatternCorpus()
    const patternPrompt = patternCorpus
      .map(
        pattern =>
          `${pattern.id}: ${pattern.hookLine}${pattern.views ? ` (${pattern.views} views)` : ""}`
      )
      .join("\n")
    const { object } = await generateObject({
      model: createMayaOpenRouterModel("feed_planner"),
      schema: campaignPlanSchema,
      prompt: `You are Maya, Sandra's practical personal-brand creative director.

Complete one coherent campaign for one promotion. Return every field in the schema.

What she sells:
${order.what_she_sells}

What she is promoting now:
${order.promotion}

Who it is for:
${order.target_audience}

Voice or brand reference, if supplied:
${order.voice_reference || "None supplied. Keep the copy clear and editable."}

Primary platform:
${order.platform || "Instagram"}

Build exactly:
- Three feed posts in this order: attention, trust, offer.
- Three alternate photo directions that belong to the same visual world.
- One seven-slide carousel for the same promotion.
- Two five-frame Story sequences. The warmup sequence builds relevance and trust. The offer sequence makes one clear invitation.
- One five-day publishing plan using the exact allowed asset labels.
- One 15-30 second reel, ready to assemble: a specific hook and script, one concrete one-take phone clip for her to film, three image-to-video b-roll plans, exact overlay lines, clip order, audio type, caption, and call to action.

Sandra's proven pattern corpus. Choose exactly one ID and return it as reel.corpusPatternId:
${patternPrompt}

Use that same selected pattern to shape the opening attention post and the reel. Adapt the
structure to this buyer's real brief. Do not copy an unrelated hook word for word.

Rules:
- Use simple, everyday human language. Short sentences. No coach-speak, hype, fake urgency, em dashes, or fluffy claims.
- Never invent a personal story, customer result, price, deadline, guarantee, credential, link, keyword, or product detail.
- If a claim is not present in the input, keep it general and editable.
- Each CTA must connect to what she is promoting without inventing a keyword or link.
- The intake does not contain an approved DM keyword or link. Never write "comment", "DM", or
  "message" followed by a keyword. Never say "link in bio". Use a plain invitation to see, read,
  or join the named promotion instead.
- Never make an absolute identity or body promise. Do not say "nothing gets replaced", "your face
  stays your face", "your real body", "no reshaping", or guarantee that AI will not change a
  detail. It is truthful to say the product is designed to preserve natural features and that AI
  can still vary small details.
- Do not invent urgency such as "last chance", "today only", "this week only", a deadline, or
  limited spots unless those exact facts are present in the intake.
- Make every asset feel like one campaign, not a pile of unrelated content.
- Keep carousel and Story text short enough to read on a phone. One idea per slide.
- The first post should be the easiest useful thing to publish first.
- The reel hook must name her exact promotion or her buyer's specific situation. If it could work unchanged for another business, it fails.
- Never use "did you know", "stop scrolling", "3 tips", generic motivational voiceover, or an unrelated trend.
- The self-filmed instruction must start with "Film", name one concrete physical action, and give a length in seconds. It must be filmable in one take on a phone.
- Reel b-roll can only animate the supplied campaign photos. Motion prompts may add a subtle blink, breathing, fabric or hair movement, parallax, or camera movement. Never invent walking, speaking, holding a new object, a new person, or a different scene.
- Reel overlayLines are the exact on-screen words in display order. assembly.clipOrder uses clip-1, clip-2, clip-3, and self_filmed only. assembly.overlayPlacements maps every overlay line to the exact clip where it appears, using the same words as overlayLines. Audio is a type, never a named or licensed track.
- Every photo prompt must describe a realistic editorial personal-brand photo using the same woman from the supplied reference selfie.
- Every photo prompt must include the exact sentence: "Use exact facial features from the reference image."
- Preserve her age, skin texture, face shape, hair, body proportions, and natural identity. Avoid plastic skin and visible AI tells.
- Do not put text, logos, or interface elements inside the generated photos. SSELFIE adds exact text afterward.
`,
    })

    const planPosts = orderedPosts(object.posts)
    if (object.posts.length !== 3 || planPosts.length !== 3)
      throw new Error("Maya did not return exactly the three campaign roles")
    if (object.alternatePhotos.length !== 3)
      throw new Error("Maya did not return all three alternate photos")
    if (object.carousel.slides.length !== 7)
      throw new Error("Maya did not return all seven carousel slides")
    const storyPlans = orderedStorySequences(object.storySequences)
    if (object.storySequences.length !== 2 || storyPlans.length !== 2)
      throw new Error("Maya did not return exactly both Story sequences")
    if (storyPlans.some(sequence => sequence.slides.length !== 5))
      throw new Error("Maya did not return five slides for each Story sequence")
    if (object.publishPlan.length !== 5)
      throw new Error("Maya did not return the complete five-day publishing plan")
    const publishDays = object.publishPlan.map(item => item.day)
    if (
      new Set(publishDays).size !== 5 ||
      publishDays.some(day => !Number.isInteger(day) || day < 1 || day > 5)
    ) {
      throw new Error("Maya did not return one valid publishing step for each day")
    }
    if (object.reel.brollClips.length !== 3)
      throw new Error("Maya did not return all three reel b-roll clips")
    validateCampaignPlanTruth(object, {
      whatSheSells: order.what_she_sells,
      promotion: order.promotion,
      targetAudience: order.target_audience,
    })
    const reelPlan = validateCampaignReelPlan(object.reel, {
      whatSheSells: order.what_she_sells,
      promotion: order.promotion,
      targetAudience: order.target_audience,
      allowedPatternIds: patternCorpus.map(pattern => pattern.id),
    })
    const selectedPattern = patternCorpus.find(pattern => pattern.id === reelPlan.corpusPatternId)
    if (!selectedPattern) throw new Error("Campaign reel corpus pattern could not be traced")
    const traceability = buildCampaignTraceability(selectedPattern, Boolean(order.voice_reference))

    const photoPlans = [
      ...planPosts.map(post => ({
        id: post.role,
        kind: "primary" as const,
        label: `${post.role} campaign image`,
        visualPrompt: post.visualPrompt,
        whyThisPhoto: post.whyThisPost,
      })),
      ...object.alternatePhotos.map((photo, index) => ({
        id: `alternate-${index + 1}`,
        kind: "alternate" as const,
        ...photo,
      })),
    ]

    const generatedPhotos = await Promise.all(
      photoPlans.map(async (photo, index) => {
        const buffer = await generateFeedImageWithOpenAI({
          prompt: `${photo.visualPrompt}\n\nUse exact facial features from the reference image. Create natural, high-end editorial photography with believable hands, skin texture, light, and proportions. No words or logos in the image.`,
          referenceUrls: [order.selfie_url],
          size: "1024x1536",
        })
        const visualUrl = await savePng(
          `campaign-outcomes/${order.id}/photos/${index + 1}-${photo.id}.png`,
          buffer
        )
        return { ...photo, buffer, visualUrl }
      })
    )

    const photos: CampaignPhoto[] = generatedPhotos.map(({ buffer: _buffer, ...photo }) => photo)
    const posts: CampaignPost[] = planPosts.map((post, index) => ({
      ...post,
      visualUrl: generatedPhotos[index].visualUrl,
    }))

    const carouselSlides = await Promise.all(
      object.carousel.slides.map(async (slide, index) => {
        const buffer = await renderCampaignSlide({
          background: generatedPhotos[index % generatedPhotos.length].buffer,
          format: "carousel",
          eyebrow: object.carousel.title,
          headline: slide.headline,
          body: slide.body,
          sequenceLabel: `${index + 1} / 7`,
        })
        const visualUrl = await savePng(
          `campaign-outcomes/${order.id}/carousel/${index + 1}.png`,
          buffer
        )
        return { index: index + 1, ...slide, visualUrl }
      })
    )

    const storySequences: CampaignStorySequence[] = await Promise.all(
      storyPlans.map(async (sequence, sequenceIndex) => ({
        role: sequence.role,
        title: sequence.title,
        slides: await Promise.all(
          sequence.slides.map(async (slide, slideIndex) => {
            const photoIndex = (sequenceIndex * 3 + slideIndex) % generatedPhotos.length
            const buffer = await renderCampaignSlide({
              background: generatedPhotos[photoIndex].buffer,
              format: "story",
              eyebrow: sequence.title,
              headline: slide.headline,
              body: slide.body,
              sequenceLabel: `${slideIndex + 1} / 5`,
            })
            const visualUrl = await savePng(
              `campaign-outcomes/${order.id}/stories/${sequence.role}-${slideIndex + 1}.png`,
              buffer
            )
            return { index: slideIndex + 1, ...slide, visualUrl }
          })
        ),
      }))
    )

    const businessVideoUserId = await resolveCampaignVideoOwnerUserId(order.user_id)
    const reelClips = await generateCampaignReelClips({
      orderId: order.id,
      businessVideoUserId,
      clipPlans: reelPlan.brollClips,
      photoUrls: Object.fromEntries(photos.map(photo => [photo.id, photo.visualUrl])),
    })

    const campaignData: CampaignData = {
      visualDirection: object.visualDirection,
      firstPostReason: object.firstPostReason,
      photos,
      posts,
      carousel: { title: object.carousel.title, slides: carouselSlides },
      storySequences,
      publishPlan: [...object.publishPlan].sort((a, b) => a.day - b.day),
      reel: {
        hook: reelPlan.hook,
        script: reelPlan.script,
        selfFilmedClipInstruction: reelPlan.selfFilmedClipInstruction,
        brollClips: reelClips,
        overlayLines: reelPlan.overlayLines,
        assembly: reelPlan.assembly,
        caption: reelPlan.caption,
        cta: reelPlan.cta,
        traceability,
      },
      traceability,
    }

    const updated = await sql`
      UPDATE campaign_orders
      SET
        status = 'needs_qa',
        campaign_data = ${JSON.stringify(campaignData)}::jsonb,
        generated_at = NOW(),
        generation_error = NULL,
        updated_at = NOW()
      WHERE id = ${order.id} AND status = 'generating'
      RETURNING id
    `
    if (!updated[0]) throw new Error("Campaign order changed before generated work could be saved")

    await logAnalyticsEvent({
      eventName: "campaign_generated",
      path: "/campaign/order",
      properties: {
        order_id: order.id,
        photo_count: 6,
        post_count: 3,
        carousel_slide_count: 7,
        story_slide_count: 10,
        reel_clip_count: reelClips.filter(clip => clip.status === "ready").length,
        reel_pattern_id: selectedPattern.id,
        is_test_mode: order.is_test_mode,
      },
    })
    return { generated: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : "Campaign generation failed"
    await sql`
      UPDATE campaign_orders
      SET status = 'generation_failed', generation_error = ${message}, updated_at = NOW()
      WHERE id = ${order.id} AND status = 'generating'
    `
    console.error(`[campaign-outcome] Generation failed for order ${order.id}:`, error)
    return { generated: false, reason: message }
  }
}
