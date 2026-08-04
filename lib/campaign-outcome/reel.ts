import "server-only"

import { getAdminEmails } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"
import { checkVideoGeneration, startVideoGeneration } from "@/lib/maya/video-generation-service"
import { pollPrediction } from "@/lib/replicate-polling"
import type {
  CampaignPatternReference,
  CampaignReelClip,
  CampaignReelClipPlan,
  CampaignTraceability,
} from "@/lib/campaign-outcome/types"

export type CampaignReelPlan = {
  hook: string
  script: string
  selfFilmedClipInstruction: string
  brollClips: CampaignReelClipPlan[]
  overlayLines: string[]
  assembly: {
    clipOrder: string[]
    overlayPlacements: Array<{
      overlayLine: string
      overClipId: string
    }>
    targetLengthSeconds: number
    audioType: string
  }
  caption: string
  cta: string
  corpusPatternId: string
}

const FALLBACK_PATTERNS: CampaignPatternReference[] = [
  {
    id: "viral-dna:visible-transformation",
    hookLine: "Show the visible change in the opening beat, tied to the buyer's real situation.",
    views: null,
    source: "viral-dna",
  },
  {
    id: "viral-dna:specific-next-step",
    hookLine: "Name the specific stuck moment, then give one small next step.",
    views: null,
    source: "viral-dna",
  },
  {
    id: "viral-dna:offer-proof",
    hookLine: "Open with the exact outcome the offer helps the buyer reach.",
    views: null,
    source: "viral-dna",
  },
]

const BANNED_HOOKS = /\b(did you know|stop scrolling|3\s+tips?|three\s+tips?)\b/i
const FABRICATED_MOTION =
  /\b(walks?|walking|talks?|talking|speaks?|speaking|types?|typing|drinks?|drinking|picks? up|holding a new|new person|new location|scene change)\b/i
const GENERIC_WORDS = new Set([
  "about",
  "again",
  "build",
  "building",
  "business",
  "content",
  "create",
  "online",
  "people",
  "ready",
  "something",
  "their",
  "these",
  "thing",
  "today",
  "women",
  "your",
])

function normalizedWords(value: string): string[] {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9]+/g)
      ?.filter(word => word.length >= 4 && !GENERIC_WORDS.has(word)) ?? []
  )
}

function containsSpecificInputLanguage(
  hook: string,
  input: {
    whatSheSells: string
    promotion: string
    targetAudience: string
  }
): boolean {
  const hookWords = new Set(normalizedWords(hook))
  const inputWords = [input.promotion, input.whatSheSells, input.targetAudience].flatMap(
    normalizedWords
  )
  return inputWords.some(word => hookWords.has(word))
}

export function validateCampaignReelPlan(
  plan: CampaignReelPlan,
  input: {
    whatSheSells: string
    promotion: string
    targetAudience: string
    allowedPatternIds: string[]
  }
): CampaignReelPlan {
  if (BANNED_HOOKS.test(plan.hook) || BANNED_HOOKS.test(plan.script)) {
    throw new Error("Campaign reel failed QA: banned generic hook pattern")
  }
  if (!containsSpecificInputLanguage(plan.hook, input)) {
    throw new Error("Campaign reel failed QA: hook is generic to this buyer")
  }
  if (!input.allowedPatternIds.includes(plan.corpusPatternId)) {
    throw new Error("Campaign reel failed QA: corpus traceability is missing")
  }
  if (plan.brollClips.length > 3) {
    throw new Error("Campaign reel failed QA: more than three b-roll clips")
  }
  if (new Set(plan.brollClips.map(clip => clip.id)).size !== plan.brollClips.length) {
    throw new Error("Campaign reel failed QA: b-roll clip IDs are not unique")
  }
  if (new Set(plan.brollClips.map(clip => clip.sourcePhotoId)).size !== plan.brollClips.length) {
    throw new Error("Campaign reel failed QA: b-roll sources are not distinct")
  }
  if (plan.brollClips.some(clip => FABRICATED_MOTION.test(clip.motionPrompt))) {
    throw new Error("Campaign reel failed QA: b-roll invents action outside the source photo")
  }
  if (!/^film\b/i.test(plan.selfFilmedClipInstruction)) {
    throw new Error("Campaign reel failed QA: self-filmed direction is not one-take filmable")
  }
  if (!/\b\d{1,2}\s*seconds?\b/i.test(plan.selfFilmedClipInstruction)) {
    throw new Error("Campaign reel failed QA: self-filmed direction needs a clear length")
  }
  if (
    !Number.isInteger(plan.assembly.targetLengthSeconds) ||
    plan.assembly.targetLengthSeconds < 15 ||
    plan.assembly.targetLengthSeconds > 30
  ) {
    throw new Error("Campaign reel failed QA: target length must be 15 to 30 seconds")
  }
  if (
    plan.overlayLines.length < 2 ||
    plan.overlayLines.length > 6 ||
    plan.overlayLines.some(line => !line.trim())
  ) {
    throw new Error("Campaign reel failed QA: overlay sequence is incomplete")
  }
  const allowedClipIds = new Set([...plan.brollClips.map(clip => clip.id), "self_filmed"])
  if (
    plan.assembly.clipOrder.length < 2 ||
    plan.assembly.clipOrder.length > 6 ||
    !plan.assembly.clipOrder.includes("self_filmed") ||
    plan.assembly.clipOrder.some(clipId => !allowedClipIds.has(clipId))
  ) {
    throw new Error("Campaign reel failed QA: assembly contains an unknown clip")
  }
  const placementLines = plan.assembly.overlayPlacements.map(placement => placement.overlayLine)
  if (
    placementLines.length !== plan.overlayLines.length ||
    placementLines.some((line, index) => line !== plan.overlayLines[index]) ||
    plan.assembly.overlayPlacements.some(placement => !allowedClipIds.has(placement.overClipId))
  ) {
    throw new Error("Campaign reel failed QA: overlay placement does not match the reel sequence")
  }
  return plan
}

export async function loadCampaignPatternCorpus(limit = 8): Promise<CampaignPatternReference[]> {
  try {
    const rows = await sql`
      SELECT id, hook_line, views
      FROM content_reel_references
      WHERE hook_line IS NOT NULL AND LENGTH(TRIM(hook_line)) > 8
      ORDER BY COALESCE(views, 0) DESC, id ASC
      LIMIT ${Math.min(Math.max(limit, 1), 20)}
    `
    const references = rows.map(row => ({
      id: `reel:${String(row.id)}`,
      hookLine: String(row.hook_line).trim().slice(0, 240),
      views: Number.isFinite(Number(row.views)) ? Number(row.views) : null,
      source: "reel-corpus" as const,
    }))
    return references.length > 0 ? references : FALLBACK_PATTERNS
  } catch (error) {
    console.warn("[campaign-outcome] Proven reel corpus unavailable; using locked viral DNA", error)
    return FALLBACK_PATTERNS
  }
}

export function buildCampaignTraceability(
  pattern: CampaignPatternReference,
  includeVoiceReference: boolean
): CampaignTraceability {
  return {
    note: `Built from the buyer's campaign brief and Sandra's proven ${pattern.source === "reel-corpus" ? "reel" : "viral-DNA"} pattern: ${pattern.hookLine}`,
    intakeFields: [
      "what_she_sells",
      "promotion",
      "target_audience",
      ...(includeVoiceReference ? (["voice_reference"] as const) : []),
    ],
    corpusPattern: pattern,
  }
}

export async function resolveCampaignVideoOwnerUserId(
  existingUserId: string | null
): Promise<string | null> {
  if (existingUserId) return existingUserId
  const adminEmail = getAdminEmails()[0]
  if (!adminEmail) return null
  const rows = await sql`
    SELECT id FROM users WHERE LOWER(email) = ${adminEmail} LIMIT 1
  `
  return rows[0]?.id ? String(rows[0].id) : null
}

async function generateOneClip(input: {
  orderId: number
  businessVideoUserId: string
  plan: CampaignReelClipPlan
  sourcePhotoUrl: string
}): Promise<CampaignReelClip> {
  let finalError = "Video provider unavailable"
  try {
    const started = await startVideoGeneration({
      userId: input.businessVideoUserId,
      imageUrl: input.sourcePhotoUrl,
      motionPrompt: input.plan.motionPrompt,
      imageDescription: "A campaign brand photo. Animate only what is already visible.",
      category: "campaign-outcome",
      source: "campaign-outcome",
      billingMode: "business",
      billingReference: `campaign-order-${input.orderId}:${input.plan.id}`,
    })
    const prediction = await pollPrediction(started.predictionId, {
      maxAttempts: 60,
      initialDelay: 1500,
      maxDelay: 6000,
      timeout: 180_000,
    })
    if (prediction.status !== "succeeded") {
      throw new Error(typeof prediction.error === "string" ? prediction.error : "Video failed")
    }
    const checked = await checkVideoGeneration({
      userId: input.businessVideoUserId,
      predictionId: started.predictionId,
      videoId: started.videoId,
    })
    if (checked.status !== "succeeded") {
      throw new Error(checked.status === "failed" ? checked.error : "Video did not finish")
    }
    return {
      ...input.plan,
      sourcePhotoUrl: input.sourcePhotoUrl,
      status: "ready",
      videoUrl: checked.videoUrl,
      note: null,
    }
  } catch (error) {
    finalError = error instanceof Error ? error.message : String(error)
  }

  console.warn(`[campaign-outcome] Reel clip ${input.plan.id} unavailable: ${finalError}`)
  return {
    ...input.plan,
    sourcePhotoUrl: input.sourcePhotoUrl,
    status: "unavailable",
    videoUrl: null,
    note: "This b-roll clip could not be prepared. Your reel is still ready to use with the remaining clips.",
  }
}

export async function generateCampaignReelClips(input: {
  orderId: number
  businessVideoUserId: string | null
  clipPlans: CampaignReelClipPlan[]
  photoUrls: Record<string, string>
}): Promise<CampaignReelClip[]> {
  const plans = input.clipPlans.slice(0, 3)
  if (!input.businessVideoUserId) {
    return plans.map(plan => ({
      ...plan,
      sourcePhotoUrl: input.photoUrls[plan.sourcePhotoId] || "",
      status: "unavailable",
      videoUrl: null,
      note: "This b-roll clip could not be prepared. Your reel is still ready to use with the remaining clips.",
    }))
  }

  return Promise.all(
    plans.map(plan => {
      const sourcePhotoUrl = input.photoUrls[plan.sourcePhotoId]
      if (!sourcePhotoUrl) {
        return Promise.resolve({
          ...plan,
          sourcePhotoUrl: "",
          status: "unavailable" as const,
          videoUrl: null,
          note: "This b-roll clip could not be prepared. Your reel is still ready to use with the remaining clips.",
        })
      }
      return generateOneClip({
        orderId: input.orderId,
        businessVideoUserId: input.businessVideoUserId as string,
        plan,
        sourcePhotoUrl,
      })
    })
  )
}
