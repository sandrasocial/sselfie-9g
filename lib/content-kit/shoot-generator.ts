import "server-only"

import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { put } from "@vercel/blob"
import { sql } from "@/lib/db/client"
import { callContentKitLlm, callContentKitVision } from "@/lib/content-kit/llm"
import { repairAndParseJson } from "@/lib/content-kit/json-repair"
import type { Shoot, ShootMessage, ShootShot, ShootShotRole } from "@/lib/content-kit/types"
import {
  ensurePublishedVaultPromptNumbers,
  ensureVaultCollectionsSchema,
} from "@/lib/vault/published-collections"
import {
  audienceBlock,
  noFakeBlock,
  proofBlock,
  sanitizeGroundedText,
  voiceBlock,
} from "@/lib/content/grounding"
import {
  SSELFIE_ENVIRONMENT_INTEGRATION,
  SSELFIE_INSPIRATION_CLOSE_RECREATE,
  SSELFIE_INSPIRATION_SET_VARIATION,
  SSELFIE_SELFIE_RESTYLE,
} from "@/lib/app-v3/maya/visual-rules"
import { AVOID_LIST } from "@/lib/app-v3/maya/ingredients"
import { buildLikenessPromptBlock } from "@/lib/app-v3/likeness-memory"
import { getMemory } from "@/lib/app-v3/maya/memory-store"
import { isContentPolicyError, sanitizePromptForImageSafety } from "@/lib/ai/image-safety"
import { normalizeOpenAIImageSize } from "@/lib/app-v3/openai-image-size"

// SHOOT-STUDIO-01: Sandra's real workflow, automated. Inspiration images + her selfie →
// vault-anatomy shot prompts (the comment-PROMPT giveaway asset) → gpt-image-2 edit with
// the selfie as identity anchor and the inspiration images as style ground truth.
// Same flagship pipeline as app-v3 (app/api/app-v3/maya/generate/route.ts).

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
// SHOOT-PARITY (2026-07-14): render at the suite's proven native size. 1440x2560 sat in
// gpt-image-2's stretch zone (2.3x the pixels at the same effort), which produced visibly softer
// output than suite Maya's 1024x1536 — Sandra compared them directly. The suite measured this
// class on 2026-06-10 (medium ~82s, high ~191s, both inside the 300s ceiling). Env override
// stays for HD-export experiments, independent of suite Maya's APP_V3_PORTRAIT_SIZE.
const PORTRAIT_SIZE = normalizeOpenAIImageSize(process.env.SHOOT_STUDIO_PORTRAIT_SIZE, "1024x1536")
// Admin content renders HIGH by default: Sandra's 2026-06-22 quality lock reserved high for admin
// content (the suite stays medium for member cost control), but admin was hardcoded to medium.
// Safe here because admin renders one shot per request (fits the 300s ceiling; ~191s vs ~82s).
const DEFAULT_RENDER_QUALITY: ImgQuality =
  process.env.SHOOT_STUDIO_IMAGE_QUALITY === "medium" ||
  process.env.SHOOT_STUDIO_IMAGE_QUALITY === "low"
    ? (process.env.SHOOT_STUDIO_IMAGE_QUALITY as ImgQuality)
    : "high"

// LIKENESS PARITY (2026-07-14): suite Maya appends the member's durable likeness corrections
// (app_v3_memory.likeness_notes) to every render; admin shoots never did. Pull Sandra's own
// notes from the same store so every correction she teaches Maya in the suite also anchors
// admin renders. Fail-soft: any error renders without the block, never breaks a shoot.
const ADMIN_LIKENESS_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"
async function getAdminLikenessBlock(): Promise<string> {
  try {
    const [row] = (await sql`
      SELECT id FROM users WHERE email = ${ADMIN_LIKENESS_EMAIL} LIMIT 1
    `) as Array<{ id: string }>
    if (!row?.id) return ""
    const memory = await getMemory(String(row.id))
    return buildLikenessPromptBlock(memory.likenessNotes)
  } catch (error) {
    console.error("[shoot-studio] likeness notes skipped:", error)
    return ""
  }
}
const DEFAULT_SHOTS_PER_SHOOT = 6
const INSPIRATION_PREFLIGHT_TIMEOUT_MS = 20_000
const INSPIRATION_PREFLIGHT_REQUEST_TIMEOUT_MS = 7_000
const INSPIRATION_PREFLIGHT_CONCURRENCY = 3
const SHOOT_PLANNING_TIMEOUT_MS = 150_000
const SHOT_ROLE_SEQUENCE: ShootShotRole[] = [
  "establishing-full-body",
  "movement-lifestyle-action",
  "seated-hero",
  "profile",
  "close-portrait",
  "cover-safe-hero",
]
const SHOT_ROLES = new Set<ShootShotRole>([...SHOT_ROLE_SEQUENCE, "true-detail"])

// Vault-anatomy sections the planner writes that carry real styling/scene direction. These are
// forwarded into the render prompt so Sandra's notes (location, outfit, mood) actually reach the
// image model — the same way suite Maya sends the full compiled brief to gpt-image-2. Without
// this the image model only sees the inspiration + selfies and drifts back to the selfie.
const RENDER_BRIEF_LABELS = [
  "Scene",
  "Outfit",
  "Hair",
  "Makeup",
  "Accessories/props",
  "Pose",
  "Camera + lens",
  "Camera angle",
  "Composition",
  "Body proportion lock",
  "Mood",
  "Color grading",
] as const
// Shot 1 recreates the inspiration image, so its crop/pose/camera must come from the image itself,
// not the planner. These framing sections are dropped from shot 1's written brief; the styling and
// scene sections (Scene, Outfit, Mood, etc.) still flow through so notes like "Iceland" land.
const SHOT_ONE_FRAMING_LABELS = new Set<string>([
  "Pose",
  "Camera + lens",
  "Camera angle",
  "Composition",
  "Body proportion lock",
])

function extractShotRenderBrief(prompt: string, labels: readonly string[]): string {
  return labels
    .map(label => {
      const value = extractPromptSection(prompt, label)
      return value ? `${label}: ${value}` : ""
    })
    .filter(Boolean)
    .join("\n")
}

// SSELFIE_ENVIRONMENT_INTEGRATION now lives in lib/app-v3/maya/visual-rules.ts so admin and suite
// share one source of truth (SHOOT-PARITY-01).

// Mirrors suite Maya's CANDID_EDITORIAL: the identity references are for likeness only, never a
// pose/expression to copy. Stops close-ups from looking like a stiff duplicate of the selfie.
const SSELFIE_CANDID_REALISM =
  "Keep the pose and expression candid and caught-in-the-moment, natural to this environment, " +
  "relaxed and unposed, never a stiff studio pose, never a forced smile at the camera, and never a " +
  "copy of the selfies' pose, head angle, or expression. When recreating the inspiration image, " +
  "match its pose and energy but render it as a believable natural moment, not a rigid copy."

// Prepended at GENERATION time only — never stored in the shareable prompt. The shareable
// prompt says "uploaded reference photos" (the buyer's own selfie in ChatGPT); here we
// attach selfie + inspiration together, so the image roles must be explicit or the model
// could lift a face from the inspiration. Structural no-fake guard, not prompt-dependent.
// Built per generation: the first `selfieCount` images are all the SAME woman (different
// angles: front, side profiles, full body) and define identity; the rest are style only.
function buildShotRenderPrompt(input: {
  selfieCount: number
  styleCount: number
  continuityCount?: number
  prompt: string
  shotRole?: ShootShotRole
  safetyRetry?: boolean
  /** Story collections: EVERY shot recreates its own inspiration image (not just shot 1). */
  closeRecreate?: boolean
}): string {
  const identityRange =
    input.selfieCount <= 1 ? "input image 1" : `input images 1-${input.selfieCount}`
  const firstStyleIndex = input.selfieCount + 1
  const lastStyleIndex = input.selfieCount + input.styleCount
  const styleRange =
    input.styleCount <= 1
      ? `input image ${firstStyleIndex}`
      : `input images ${firstStyleIndex}-${lastStyleIndex}`
  const continuityCount = input.continuityCount || 0
  const firstContinuityIndex = lastStyleIndex + 1
  const continuityRange =
    continuityCount <= 1
      ? `input image ${firstContinuityIndex}`
      : `input images ${firstContinuityIndex}-${lastStyleIndex + continuityCount}`
  const shotNumber = shotNumberFromPrompt(input.prompt)
  // Story collections recreate EVERY shot from its own inspiration; cohesive shoots only do so for
  // shot 1 (the rest vary within one world).
  const useCloseRecreate = Boolean(input.closeRecreate) || shotNumber === null || shotNumber <= 1
  const inspirationContract = useCloseRecreate
    ? SSELFIE_INSPIRATION_CLOSE_RECREATE
    : SSELFIE_INSPIRATION_SET_VARIATION
  const roleInstruction = useCloseRecreate
    ? "Shot role: close recreation of the inspiration image. Do not convert a close-up inspiration into a full-body, seated, walking, or wider brand shot. Match the inspiration image crop, framing, subject scale, pose geometry, expression energy, camera distance, and lens perspective."
    : shotRoleRenderInstruction(input.shotRole)
  // Forward the planner's written styling brief (suite Maya parity). A close-recreate shot omits the
  // framing sections so its crop/pose stay locked to the inspiration image; varied shots get the
  // full brief. The inspiration contract above keeps the image authoritative on any conflict.
  const briefLabels = useCloseRecreate
    ? RENDER_BRIEF_LABELS.filter(label => !SHOT_ONE_FRAMING_LABELS.has(label))
    : RENDER_BRIEF_LABELS
  const shotBrief = extractShotRenderBrief(input.prompt, briefLabels)
  const shotBriefInstruction = shotBrief
    ? useCloseRecreate
      ? `Written styling brief to follow for wardrobe, location, hair, makeup, mood and color grade, while keeping the inspiration image's exact crop, framing, pose, subject scale and camera. If anything here conflicts with what is visible in the inspiration image, the inspiration image wins:\n${shotBrief}`
      : `Written shot brief to follow for this set variation. Stay in the same visual world as the inspiration image. If anything here conflicts with what is visible in the inspiration image, the inspiration image wins:\n${shotBrief}`
    : ""

  return [
    input.closeRecreate
      ? "Create one image that recreates the attached inspiration image."
      : `Create image ${shotNumber ?? ""} of a cohesive editorial photoshoot.`.replace(
          "image  of",
          "one image of"
        ),
    `Use ${identityRange} as IDENTITY REFERENCES ONLY. Take from them only the person's facial structure, face shape, skin tone, natural skin texture, age, hair color, body proportions, and recognizable likeness. Do NOT copy the selfies' lighting, white balance, exposure, background, framing, head angle, pose, or expression. The identity references define the person; the scene, lighting, pose, and mood are defined below.`,
    input.selfieCount > 1
      ? "If the identity references differ from each other, input image 1 is the primary identity source: resolve any conflict in facial features toward input image 1."
      : "",
    `The person visible in the inspiration image is a DIFFERENT woman. Never blend, average, or borrow any facial features, face shape, eyes, nose, lips, jawline, skin, age, or body characteristics from the inspiration image. Her face and body come exclusively from ${identityRange}.`,
    `Use ${styleRange} as ORIGINAL INSPIRATION REFERENCES ONLY. Follow the inspiration image directly for wardrobe family, pose language, composition, camera distance, lighting direction, shadow pattern, location/set, color grade, editorial mood, and styling.`,
    continuityCount > 0
      ? `Use ${continuityRange} as GENERATED SET CONTINUITY REFERENCES ONLY. They show the already-approved visual world for this shoot: outfit family, hair/makeup finish, lighting, palette, image realism, location mood, and editorial treatment. Do not use them as the identity source. If a generated continuity image shows a face, ignore that face, facial structure, skin, hair, age, and body features.`
      : "",
    input.styleCount > 1
      ? "The first inspiration image is the primary visual source. Later inspiration images are secondary support only."
      : "",
    "Inspiration reference handling:",
    inspirationContract,
    continuityCount > 0
      ? "Photoshoot cohesion role: ANCHORED SET SHOT. Use the uploaded selfies as the identity anchor. Use the generated continuity reference only as a style/cohesion anchor for outfit, accessories, lighting, palette, and world. Match the generated continuity reference's wardrobe, accessories, hair, makeup, color grade, and location mood while creating this shot's distinct role and composition. Do not copy the continuity reference pose unless this shot asks for it."
      : "",
    roleInstruction,
    shotBriefInstruction,
    SSELFIE_ENVIRONMENT_INTEGRATION,
    SSELFIE_SELFIE_RESTYLE,
    SSELFIE_CANDID_REALISM,
    "Photorealistic high-end fashion/editorial image. Natural skin texture, realistic hands, realistic proportions, sharp editorial detail, no CGI, no plastic beauty retouching, no random logos.",
    AVOID_LIST,
    input.safetyRetry
      ? "Safety retry: keep the styling fully clothed, tasteful, non-sexual, and editorial while preserving the same inspiration mood."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

function shotNumberFromPrompt(prompt: string): number | null {
  const match = prompt.match(/\bCreate image\s+(\d+)\b/i)
  if (!match?.[1]) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function shotRoleRenderInstruction(role?: ShootShotRole): string {
  switch (role) {
    case "establishing-full-body":
      return "Shot role: establishing/wider context. Show enough of the outfit and location to establish the world, while preserving natural proportions."
    case "movement-lifestyle-action":
      return "Shot role: lifestyle/action. Capture a believable candid movement or useful brand moment in the same visual world."
    case "seated-hero":
      return "Shot role: seated or leaning hero. Calm, confident, polished, with face clear and outfit/world visible."
    case "profile":
      return "Shot role: profile or three-quarter profile. Keep the face shape recognizable and the pose editorial."
    case "close-portrait":
      return "Shot role: close portrait. Face-led crop, clear eyes, natural skin texture, intimate editorial framing."
    case "cover-safe-hero":
      return "Shot role: cover-safe hero. Strong image with clean negative space for text, but no text rendered in the image."
    case "true-detail":
      return "Shot role: detail. Focus on fabric, hands, accessories, setting texture, or outfit detail from the same world. Full face is optional."
    default:
      return ""
  }
}

function extractPromptSection(prompt: string, label: string): string {
  const labels = [
    "Scene",
    "Outfit",
    "Hair",
    "Makeup",
    "Accessories/props",
    "Pose",
    "Camera \\+ lens",
    "Camera angle",
    "Composition",
    "Body proportion lock",
    "Mood",
    "Color grading",
    "Image quality",
    "Avoid",
  ]
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const otherLabels = labels.filter(item => item !== escapedLabel).join("|")
  const match = prompt.match(
    new RegExp(`${escapedLabel}:\\s*([\\s\\S]*?)(?=\\s+(?:${otherLabels}):|$)`, "i")
  )
  return match?.[1]?.replace(/\s+/g, " ").trim().slice(0, 700) || ""
}

function normalizeShotRole(value: unknown, index: number): ShootShotRole {
  const role = String(value || "").trim() as ShootShotRole
  return SHOT_ROLES.has(role) ? role : SHOT_ROLE_SEQUENCE[index % SHOT_ROLE_SEQUENCE.length]
}

function getGenerationFailureSummary(error: unknown): string {
  const candidate = error as { message?: unknown; code?: unknown; status?: unknown; type?: unknown }
  const message = typeof candidate?.message === "string" ? candidate.message : "Unknown image error"
  const code = typeof candidate?.code === "string" ? candidate.code : null
  const status =
    typeof candidate?.status === "number" || typeof candidate?.status === "string"
      ? String(candidate.status)
      : null
  const type = typeof candidate?.type === "string" ? candidate.type : null
  return [status && `status=${status}`, code && `code=${code}`, type && `type=${type}`, message]
    .filter(Boolean)
    .join(" · ")
}

function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

function stripEmDashes(text: string): string {
  return sanitizeGroundedText(text)
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

async function readImage(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Could not load an input image")
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.startsWith("image/")) throw new Error("Input URL did not return an image")
  return Buffer.from(await res.arrayBuffer())
}

async function normalizeForOpenAI(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { animated: false })
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer()
}

// ── Prompt writing ──────────────────────────────────────────────────────────────

// Prompt anatomy retained directly in product code after the old repo-local authoring skill was removed.
function buildVaultAnatomy(totalShots = DEFAULT_SHOTS_PER_SHOOT): string {
  return `Each shot prompt must follow the SSELFIE vault anatomy, in this exact order, each section a labeled paragraph:
1. Series header: "Create image N of a ${totalShots}-part [collection name] editorial photoshoot." (shot 2+ : "Create image N of the same [collection name] editorial photoshoot.")
2. Identity lock, verbatim: "Use the uploaded reference photos as the only source for the person's face and identity. Preserve the person's facial structure, face shape, skin tone, natural skin texture, body proportions, age, hair color, and overall look from the reference photos."
3. "Scene:" location, architecture, materials, light quality.
4. "Outfit:" every garment with fabric, fit, color, finish, shoes, bag. Specific, never vague.
5. "Hair:" style + movement, ending with "Keep the person's natural hair color from the uploaded reference photos."
6. "Makeup:" finish-first, named tones, "polished, not heavy glam".
7. "Accessories/props:" what is in hand or worn, plus explicit exclusions ("No phone").
8. "Pose:" body position, each hand, head angle, expression. Mid-motion beats static.
9. "Camera + lens:" "shot on Canon EOS R5 with a [35mm/50mm/85mm] lens", framing, "no wide-angle distortion".
10. "Camera angle:" height and distance.
11. "Composition:" "vertical 9:16", subject placement, background, leading lines.
12. "Body proportion lock:" (full/three-quarter shots) natural head size, leg length, torso, hips, shoulders; avoid stretched legs, tiny head, warped feet, runway exaggeration.
13. "Mood:" 3-5 short phrases.
14. "Color grading:" named palette per surface, saturation level, "subtle film grain", editorial contrast.
15. "Image quality:" "vertical 9:16 portrait, 2K quality, minimum 1440 x 2560 px if available, crisp editorial sharpness, no blur, no low-resolution softness, no compression haze."
16. "Avoid:" comma list, always including: distorted hands, extra fingers, plastic skin, heavy glam makeup, cartoonish AI style, CGI, blur, random logos. Plus shot-specific failure modes.

Series consistency: ONE shoot means same outfit, hair, makeup, location and grade in every shot. Only Scene details, Accessories/props, Pose, Camera and Composition vary. Shot arc: arrival/establishing, lifestyle action, seated or still hero, close-up or detail.

The prompts must work for ANY woman pasting them into ChatGPT with her own selfie. Never reference a specific person. No em-dashes anywhere. No-fake doctrine: realistic, recognizable, true-to-you; never "perfect face", "flawless skin", "look rich", "no one will know".`
}

function buildJsonContract(count = DEFAULT_SHOTS_PER_SHOOT): string {
  return `Respond with ONLY a JSON object, no commentary:
{
  "title": "Collection name, 2-4 words, editorial (e.g. 'Quiet Luxury London')",
  "shots": [
    {
      "shotRole": "one of: establishing-full-body, movement-lifestyle-action, seated-hero, profile, close-portrait, cover-safe-hero, true-detail",
      "title": "Collection Name · Shot Name",
      "whenToUse": "1-2 sentences in Sandra's voice: where to post it, what caption energy.",
      "mood": "five · dot · separated · lowercase · tags",
      "prompt": "the full vault-anatomy prompt"
    }
  ]
}
Exactly ${count} shots.`
}

function buildCreatePrompt(
  notes?: string,
  opts?: { story?: boolean; vibe?: string; shotCount?: number }
): string {
  const shotCount = opts?.shotCount ?? DEFAULT_SHOTS_PER_SHOOT
  if (opts?.story) {
    // Story collection: one prompt per inspiration image, each its OWN world. Overrides the
    // cohesive "one shoot" rules. Vibe (e.g. iPhone mirror selfie) adapts every prompt's style.
    return `You are SSELFIE's vault prompt writer. There are ${shotCount} attached inspiration images. Write a varied STORY COLLECTION of ${shotCount} copy-paste ChatGPT prompts, one per inspiration image IN ORDER, as a photodump-style sequence.

STORY COLLECTION RULES (these override any "cohesive photoshoot" or "same outfit across shots" wording in the anatomy below):
- Prompt N is a CLOSE RECONSTRUCTION of inspiration image N. Preserve its crop, composition, framing, subject scale, pose geometry, expression energy, camera distance, lens perspective, lighting, shadow pattern, visible wardrobe silhouette, visible props, background tone, color grade and mood.
- Each prompt is its OWN world: its own scene, outfit, location, pose, crop, lighting and mood from its own inspiration image. Do NOT make the prompts match each other. This is a varied storytelling collection, not one shoot.
- Describe only what is visible or structurally implied by that inspiration image. Do not invent props, outfits, or framing the image does not show.
${opts.vibe ? `\nCOLLECTION VIBE for every prompt: ${opts.vibe}\nAdapt every section to this vibe. If the vibe is a casual iPhone / mirror selfie / photodump style, the 'Camera + lens' line must describe an iPhone phone camera (NOT a Canon or editorial camera), 'Image quality' must read as real phone-camera quality (natural, slightly imperfect, NOT studio editorial sharpness), and 'Mood' must match the vibe (everyday camera-roll energy, not a posed studio shoot). Never use double-quote characters inside any JSON string value.\n` : ""}
${notes ? `Sandra's direction for this collection: ${notes}\n\n` : ""}${buildVaultAnatomy(shotCount)}

${voiceBlock()}

${noFakeBlock()}

AUDIENCE CONTEXT FOR whenToUse ONLY:
${audienceBlock()}

PROOF CONTEXT FOR SHOT UTILITY ONLY:
${proofBlock()}

Assign shotRole on every shot (pick the closest role to what the inspiration shows). Keep the prompt body generic and usable for any buyer; put Sandra/audience-specific posting guidance only in whenToUse.

${buildJsonContract(shotCount)}`
  }

  return `You are SSELFIE's vault prompt writer. Study the attached inspiration images. Treat the FIRST attached inspiration image as the primary guide for style, outfit family, lighting direction, camera distance, makeup finish, accessories, location materials, color grade and mood. Use any later inspiration images only as secondary references when they support that first image. Then write a ${shotCount}-shot editorial photoshoot that recreates EXACTLY that world, as copy-paste ChatGPT prompts.

SHOT 1 NON-NEGOTIABLE: shot 1 must be a close visual reconstruction of the FIRST inspiration image. Preserve its crop, composition, framing, subject scale, pose geometry, expression energy, camera distance, lens perspective, lighting direction, shadow pattern, visible wardrobe silhouette, visible props/accessories, background tone, color grade and mood. If the inspiration image is a tight face crop, shot 1 must stay a tight face crop. Do not turn it into full-body, seated, walking, arrival, lifestyle, wider studio, or outfit-establishing content.

PLANNING RULE: describe only what is visible or structurally implied by the inspiration image. Do not invent jeans, shoes, bags, chairs, locations, full outfits, or body framing when the inspiration image does not show them. For shots 2-${shotCount}, create believable variations from the same photoshoot world, keeping the visible garment/fabric family, lens feel, light, shadow language and color grade anchored to the first inspiration image, but the CROP and CAMERA DISTANCE must vary by shot role (see below) - do not anchor crop family to shot 1's specific framing, or every shot reads as a near-duplicate.

${notes ? `Sandra's direction for this shoot: ${notes}\n\n` : ""}${buildVaultAnatomy(shotCount)}

${voiceBlock()}

${noFakeBlock()}

AUDIENCE CONTEXT FOR whenToUse ONLY:
${audienceBlock()}

PROOF CONTEXT FOR SHOT UTILITY ONLY:
${proofBlock()}

After shot 1, use a genuinely varied MIX of shot roles so the set does not read as six near-identical crops: establishing/wider, seated or still hero, profile, close portrait, and cover-safe hero should each land at a clearly different camera distance and framing. A tight inspiration crop does not mean every shot must stay tight - reasonably and tastefully extrapolate the outfit/location for a wider or medium shot (same wardrobe family, same world) rather than banning wider shot roles outright; only avoid inventing SPECIFIC unseen details (a particular prop, a specific room, an object) that the inspiration image gives no basis for. Assign shotRole on every shot. true-detail is optional: use at most one faceless detail only when it clearly improves the set. Do not force a faceless detail shot.

Keep the prompt body generic and usable for any buyer; put Sandra/audience-specific posting guidance only in whenToUse.

${buildJsonContract(shotCount)}`
}

function extractJsonObject(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("LLM response contained no JSON object")
  return repairAndParseJson(candidate.slice(start, end + 1))
}

function sanitizeShots(
  raw: any[],
  limit = DEFAULT_SHOTS_PER_SHOOT,
  opts?: { story?: boolean }
): Omit<ShootShot, "id" | "status">[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("LLM returned no shots")
  if (raw.length < limit) throw new Error(`LLM returned ${raw.length} shots, expected ${limit}`)
  const shots = raw.slice(0, limit).map((shot, index) => {
    if (typeof shot?.prompt !== "string" || shot.prompt.trim().length < 200) {
      throw new Error("LLM returned an incomplete shot prompt")
    }
    return {
      shotRole: normalizeShotRole(shot.shotRole, index),
      title: stripEmDashes(String(shot.title || "Untitled shot")).trim(),
      whenToUse: stripEmDashes(String(shot.whenToUse || "")).trim(),
      mood: stripEmDashes(String(shot.mood || "")).trim(),
      prompt: stripEmDashes(shot.prompt).trim(),
    }
  })
  validateShotSet(shots, opts)
  return shots
}

function validateShotSet(
  shots: Array<Pick<ShootShot, "shotRole" | "prompt" | "title">>,
  opts?: { story?: boolean }
) {
  const roles = shots.map(shot => shot.shotRole)
  // Story collections are deliberately varied per-shot and may repeat a role (e.g. all mirror
  // selfies), so the cohesive-shoot role-diversity + detail-cap checks don't apply.
  if (!opts?.story) {
    const uniqueRoles = new Set(roles)
    if (shots.length >= DEFAULT_SHOTS_PER_SHOOT && uniqueRoles.size < 4) {
      throw new Error("Shoot plan is too repetitive: expected at least 4 distinct shot roles")
    }
    const detailCount = roles.filter(role => role === "true-detail").length
    if (detailCount > 1) {
      throw new Error(`Shoot plan has too many true-detail shots, got ${detailCount}`)
    }
  }
  const normalizedPrompts = shots.map(shot =>
    stripEmDashes(shot.prompt)
      .toLowerCase()
      .replace(/\b(shot|image|create|the|a|an|and|with|of|in|on|for|to)\b/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180)
  )
  if (new Set(normalizedPrompts).size < Math.min(shots.length, 4)) {
    throw new Error("Shoot plan is too repetitive: prompts are not distinct enough")
  }
}

function toPromptShot({
  imageUrl: _imageUrl,
  renderStatus: _renderStatus,
  renderErrorCode: _renderErrorCode,
  renderErrorMessage: _renderErrorMessage,
  renderAttempts: _renderAttempts,
  lastRenderAttemptAt: _lastRenderAttemptAt,
  status: _status,
  ...rest
}: ShootShot) {
  return rest
}

// ── Image generation ────────────────────────────────────────────────────────────

type ImgQuality = "low" | "medium" | "high"

export class InspirationModerationError extends Error {
  readonly code = "inspiration_moderation_blocked"
  readonly status = 422

  constructor(message: string) {
    super(message)
    this.name = "InspirationModerationError"
  }
}

export class ShootPlanningError extends Error {
  readonly code: "inspiration_preflight_unavailable" | "shoot_planning_timed_out"
  readonly status = 503
  readonly retryable = true

  constructor(
    code: "inspiration_preflight_unavailable" | "shoot_planning_timed_out",
    message: string
  ) {
    super(message)
    this.name = "ShootPlanningError"
    this.code = code
  }
}

export class ShootRenderError extends Error {
  readonly status: number
  readonly code: "moderation_blocked" | "generation_failed"
  readonly retryable: boolean
  readonly shoot: Shoot

  constructor(input: {
    message: string
    code: "moderation_blocked" | "generation_failed"
    retryable: boolean
    shoot: Shoot
  }) {
    super(input.message)
    this.name = "ShootRenderError"
    this.status = input.code === "moderation_blocked" ? 422 : 500
    this.code = input.code
    this.retryable = input.retryable
    this.shoot = input.shoot
  }
}

async function runWithTimeout<T>(
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutError: () => Error
): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  try {
    return await operation(controller.signal)
  } catch (error) {
    if (timedOut) throw timeoutError()
    throw error
  } finally {
    clearTimeout(timer)
  }
}

async function assertSafeInspirationImages(inspirationUrls: string[]): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || inspirationUrls.length === 0) return
  const openai = new OpenAI({ apiKey })
  const checks = await runWithTimeout(
    INSPIRATION_PREFLIGHT_TIMEOUT_MS,
    async signal => {
      const results: Array<{ index: number; blocked: boolean; unavailable: boolean }> = []
      for (
        let start = 0;
        start < inspirationUrls.length;
        start += INSPIRATION_PREFLIGHT_CONCURRENCY
      ) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError")
        const chunk = inspirationUrls.slice(start, start + INSPIRATION_PREFLIGHT_CONCURRENCY)
        results.push(
          ...(await Promise.all(
            chunk.map(async (url, offset) => {
              const index = start + offset + 1
              try {
                const response = await openai.moderations.create(
                  {
                    model: "omni-moderation-latest",
                    input: [{ type: "image_url", image_url: { url } }],
                  },
                  {
                    signal,
                    maxRetries: 0,
                    timeout: INSPIRATION_PREFLIGHT_REQUEST_TIMEOUT_MS,
                  }
                )
                return {
                  index,
                  blocked: response.results.some(result => result.flagged),
                  unavailable: false,
                }
              } catch (error) {
                if (signal.aborted) throw error
                console.warn(
                  `[shoot-studio] inspiration preflight unavailable for image ${index}: ${getGenerationFailureSummary(error)}`
                )
                return { index, blocked: false, unavailable: true }
              }
            })
          ))
        )
        if (results.some(result => result.unavailable)) break
      }
      return results
    },
    () =>
      new ShootPlanningError(
        "inspiration_preflight_unavailable",
        "Inspiration safety checks took too long. Try creating the shoot again."
      )
  )
  const unavailable = checks.filter(check => check.unavailable)
  if (unavailable.length > 0) {
    throw new ShootPlanningError(
      "inspiration_preflight_unavailable",
      "Inspiration safety checks are temporarily unavailable. Try creating the shoot again."
    )
  }
  const blocked = checks.filter(check => check.blocked).map(check => check.index)
  if (blocked.length === 0) return
  const label = blocked.length === 1 ? `image ${blocked[0]}` : `images ${blocked.join(", ")}`
  throw new InspirationModerationError(
    `Replace inspiration ${label} before creating this shoot. It was marked as potentially sensitive and will not render reliably.`
  )
}

export async function generateShotImage(input: {
  selfieUrls: string[]
  inspirationUrls: string[]
  continuityUrls?: string[]
  prompt: string
  shotRole?: ShootShotRole
  quality: ImgQuality
  /** Story collections: this shot recreates its own inspiration image. */
  closeRecreate?: boolean
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")
  const openai = new OpenAI({ apiKey })

  // Selfies FIRST (identity, up to 6 angles), inspiration after (style, up to 3). 2026-07-05:
  // raised from 4 per Sandra - gpt-image-2's edit endpoint accepts multiple reference images,
  // and more real angles (front, both side profiles, full body, plus extras) improves how well
  // it captures facial and body features, not just the face.
  const selfieUrls = input.selfieUrls.filter(Boolean).slice(0, 6)
  const styleUrls = input.inspirationUrls.filter(Boolean).slice(0, 3)
  const continuityUrls = (input.continuityUrls || []).filter(isAllowedUrl).slice(0, 2)
  if (selfieUrls.length === 0) throw new Error("At least one selfie reference is required")
  if (styleUrls.length === 0) throw new Error("At least one inspiration reference is required")
  const urls = [...selfieUrls, ...styleUrls, ...continuityUrls]
  const files = await Promise.all(
    urls.map(async (url, i) =>
      toFile(await normalizeForOpenAI(await readImage(url)), `shoot-input-${i}.png`, {
        type: "image/png",
      })
    )
  )

  const fullPrompt = buildShotRenderPrompt({
    selfieCount: selfieUrls.length,
    styleCount: styleUrls.length,
    continuityCount: continuityUrls.length,
    prompt: input.prompt,
    shotRole: input.shotRole,
    closeRecreate: input.closeRecreate,
  })
  const likenessBlock = await getAdminLikenessBlock()
  const withLikeness = (text: string) => (likenessBlock ? `${text}\n\n${likenessBlock}` : text)
  const editInput: Record<string, unknown> = {
    model: OPENAI_IMAGE_MODEL,
    image: files.length === 1 ? files[0] : files,
    prompt: withLikeness(fullPrompt),
    n: 1,
    size: PORTRAIT_SIZE,
    quality: input.quality,
    output_format: "png",
    // Documented OpenAI param (images.d.ts): "low" is less restrictive than the "auto" default
    // while still hard-blocking genuinely explicit content. Our own prompts are always tasteful
    // editorial fashion photography, so the stricter default only produces false positives here.
    moderation: "low",
  }
  if (OPENAI_IMAGE_MODEL !== "gpt-image-2") editInput.input_fidelity = "high"

  let response
  try {
    response = await openai.images.edit(editInput as any)
  } catch (error) {
    if (!isContentPolicyError(error)) throw error
    const retryPrompt = buildShotRenderPrompt({
      selfieCount: selfieUrls.length,
      styleCount: styleUrls.length,
      continuityCount: continuityUrls.length,
      prompt: sanitizePromptForImageSafety(input.prompt),
      shotRole: input.shotRole,
      safetyRetry: true,
      closeRecreate: input.closeRecreate,
    })
    response = await openai.images.edit({ ...editInput, prompt: withLikeness(retryPrompt) } as any)
  }
  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error("No image data returned from OpenAI")

  const blob = await put(
    `content-kit/shoots/${Date.now()}-${Math.floor(Math.random() * 1e6)}.png`,
    Buffer.from(b64, "base64"),
    {
      access: "public",
      contentType: "image/png",
    }
  )
  return blob.url
}

// ── Row mapping + persistence ───────────────────────────────────────────────────

function parsePublishedPromptNumbers(value: unknown): Record<string, string> {
  let parsed: unknown
  try {
    parsed = typeof value === "string" ? JSON.parse(value || "{}") : value
  } catch {
    return {}
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>)
      .filter(([shotId, number]) => shotId && number)
      .map(([shotId, number]) => [shotId, String(number)])
  )
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== "string") return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseStringArray(value: unknown): string[] {
  return parseJsonArray(value).filter(
    (item): item is string => typeof item === "string" && item.length > 0
  )
}

function mapRow(row: any): Shoot {
  const publishedPromptNumbers = parsePublishedPromptNumbers(row.published_prompt_numbers)
  const rawShots = parseJsonArray(row.shots) as ShootShot[]
  const selfieUrls = parseStringArray(row.selfie_urls)
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    publishedVaultSlug: row.published_vault_slug ?? null,
    vaultPublishedAt: row.vault_published_at
      ? new Date(row.vault_published_at).toISOString()
      : null,
    emailDropStatus: row.email_drop_status ?? null,
    collectionType: row.collection_type === "story" ? "story" : "cohesive",
    vibe: row.vibe ?? null,
    inspirationUrls: parseStringArray(row.inspiration_urls),
    selfieUrl: row.selfie_url,
    // Older shoots predate selfie_urls; fall back to the single selfie_url.
    selfieUrls: selfieUrls.length > 0 ? selfieUrls : row.selfie_url ? [row.selfie_url] : [],
    shots: rawShots.map((shot: ShootShot) => ({
      ...shot,
      promptNumber: publishedPromptNumbers[shot.id] ?? shot.promptNumber ?? null,
    })),
    messages: parseJsonArray(row.messages) as ShootMessage[],
    createdAt: new Date(row.created_at).toISOString(),
  }
}

// Atomically merges a patch into ONE shot inside the shots JSONB array. Concurrent per-shot
// renders each touch only their own element - saveShots would write the whole array from a
// stale in-memory snapshot and clobber renders that finished in parallel.
async function saveShotPatch(id: number, shotId: string, patch: Partial<ShootShot>) {
  await sql`
    UPDATE content_shoots
    SET shots = (
      SELECT jsonb_agg(
        CASE WHEN shot->>'id' = ${shotId} THEN shot || ${JSON.stringify(patch)}::jsonb ELSE shot END
        ORDER BY ord
      )
      FROM jsonb_array_elements(shots) WITH ORDINALITY AS t(shot, ord)
    ),
    updated_at = NOW()
    WHERE id = ${id}
  `
}

async function saveShots(id: number, shots: ShootShot[], messages?: ShootMessage[]) {
  if (messages) {
    await sql`
      UPDATE content_shoots
      SET shots = ${JSON.stringify(shots)}::jsonb, messages = ${JSON.stringify(messages)}::jsonb, updated_at = NOW()
      WHERE id = ${id}
    `
  } else {
    await sql`
      UPDATE content_shoots SET shots = ${JSON.stringify(shots)}::jsonb, updated_at = NOW() WHERE id = ${id}
    `
  }
}

export async function listShoots(limit = 20): Promise<Shoot[]> {
  await ensureVaultCollectionsSchema()
  await ensurePublishedVaultPromptNumbers()
  const rows = (await sql`
    SELECT
      cs.*,
      vc.slug AS published_vault_slug,
      vc.published_at AS vault_published_at,
      vc.email_drop_status AS email_drop_status,
      vpn.prompt_numbers AS published_prompt_numbers
    FROM content_shoots cs
    LEFT JOIN vault_collections vc ON vc.source_shoot_id = cs.id AND vc.status = 'published'
    LEFT JOIN LATERAL (
      SELECT json_object_agg(vp.source_shot_id, vp.number ORDER BY vp.sort_order ASC) AS prompt_numbers
      FROM vault_prompts vp
      WHERE vp.collection_id = vc.id AND vp.status = 'published'
    ) vpn ON TRUE
    WHERE cs.status != 'archived'
    ORDER BY cs.created_at DESC
    LIMIT ${limit}
  `) as any[]
  return rows.map(mapRow)
}

export async function getShoot(id: number): Promise<Shoot | null> {
  await ensureVaultCollectionsSchema()
  await ensurePublishedVaultPromptNumbers()
  const rows = (await sql`
    SELECT
      cs.*,
      vc.slug AS published_vault_slug,
      vc.published_at AS vault_published_at,
      vc.email_drop_status AS email_drop_status,
      vpn.prompt_numbers AS published_prompt_numbers
    FROM content_shoots cs
    LEFT JOIN vault_collections vc ON vc.source_shoot_id = cs.id AND vc.status = 'published'
    LEFT JOIN LATERAL (
      SELECT json_object_agg(vp.source_shot_id, vp.number ORDER BY vp.sort_order ASC) AS prompt_numbers
      FROM vault_prompts vp
      WHERE vp.collection_id = vc.id AND vp.status = 'published'
    ) vpn ON TRUE
    WHERE cs.id = ${id}
    LIMIT 1
  `) as any[]
  return rows.length ? mapRow(rows[0]) : null
}

// ── Actions ─────────────────────────────────────────────────────────────────────

// Additive, idempotent: older content_shoots rows only have selfie_url.
async function ensureSelfieUrlsColumn(): Promise<void> {
  try {
    await sql`ALTER TABLE content_shoots ADD COLUMN IF NOT EXISTS selfie_urls jsonb`
    await sql`ALTER TABLE content_shoots ADD COLUMN IF NOT EXISTS collection_type text`
    await sql`ALTER TABLE content_shoots ADD COLUMN IF NOT EXISTS vibe text`
  } catch (error) {
    console.error("[shoot-studio] ensure selfie_urls column skipped:", error)
  }
}

export async function createShootDraft(input: {
  inspirationUrls: string[]
  /** One or more identity references (front, side profiles, full body). */
  selfieUrls: string[]
  notes?: string
  /** "story" = a varied collection, one inspiration per shot, no continuity. Default "cohesive". */
  collectionType?: "cohesive" | "story"
  /** Free-form or preset vibe/style for a story collection, e.g. "iPhone mirror selfie". */
  vibe?: string
}): Promise<Shoot> {
  const story = input.collectionType === "story"
  const vibe = input.vibe?.trim() || undefined
  // Story collections allow one inspiration per shot (up to 9); cohesive shoots stay at 3.
  const inspirationUrls = input.inspirationUrls.filter(isAllowedUrl).slice(0, story ? 9 : 3)
  if (inspirationUrls.length === 0) throw new Error("Add at least one inspiration image")
  const shotCount = story ? inspirationUrls.length : DEFAULT_SHOTS_PER_SHOOT
  const requestedSelfieUrls = input.selfieUrls.filter(Boolean).slice(0, 6)
  const selfieUrls = requestedSelfieUrls.filter(isAllowedUrl)
  if (selfieUrls.length === 0) throw new Error("Pick at least one of your selfies")
  if (selfieUrls.length !== requestedSelfieUrls.length) {
    throw new Error(
      "One or more selected selfies could not be used. Re-upload or reselect your selfies."
    )
  }
  await assertSafeInspirationImages(inspirationUrls)

  let parsed: any = null
  let drafts: Omit<ShootShot, "id" | "status">[] = []
  let lastPlanError: unknown = null
  const planningStartedAt = Date.now()
  for (let attempt = 0; attempt < 2; attempt++) {
    const retryNote =
      attempt === 0
        ? input.notes?.trim() || undefined
        : [
            input.notes?.trim(),
            "Re-plan the shoot. The previous version failed validation. Use distinct shotRole values, prioritize face-forward usable brand images, use at most one true-detail shot, and avoid repeating the same pose/background.",
          ]
            .filter(Boolean)
            .join("\n")
    const remainingPlanningMs = SHOOT_PLANNING_TIMEOUT_MS - (Date.now() - planningStartedAt)
    if (remainingPlanningMs <= 0) {
      throw new ShootPlanningError(
        "shoot_planning_timed_out",
        "Shoot planning took too long. No shoot was created. Try again."
      )
    }
    const raw = await runWithTimeout(
      remainingPlanningMs,
      signal =>
        callContentKitVision(
          buildCreatePrompt(retryNote, { story, vibe, shotCount }),
          inspirationUrls,
          undefined,
          { signal }
        ),
      () =>
        new ShootPlanningError(
          "shoot_planning_timed_out",
          "Shoot planning took too long. No shoot was created. Try again."
        )
    )
    try {
      parsed = extractJsonObject(raw)
      drafts = sanitizeShots(parsed.shots, shotCount, { story })
      lastPlanError = null
      break
    } catch (error) {
      lastPlanError = error
      console.warn("[shoot-studio] shoot plan failed validation:", error)
    }
  }
  if (lastPlanError) throw lastPlanError
  const title = stripEmDashes(String(parsed.title || "Untitled shoot")).trim()

  const shots: ShootShot[] = drafts.map((shot, i) => ({
    ...shot,
    id: `shot-${i + 1}`,
    renderStatus: "pending",
    status: "draft",
  }))
  const messages: ShootMessage[] = [
    ...(input.notes?.trim()
      ? [{ role: "sandra" as const, text: input.notes.trim(), at: new Date().toISOString() }]
      : []),
    {
      role: "agent",
      text: `Here's "${title}": ${shots.length} shots in that exact world. Generating the photos now. Kill what misses, approve what's you, or tell me what to change.`,
      at: new Date().toISOString(),
    },
  ]

  await ensureSelfieUrlsColumn()
  const rows = (await sql`
    INSERT INTO content_shoots (title, slug, inspiration_urls, selfie_url, selfie_urls, shots, messages, collection_type, vibe)
    VALUES (${title}, ${toSlug(title)}, ${JSON.stringify(inspirationUrls)}::jsonb, ${selfieUrls[0]},
            ${JSON.stringify(selfieUrls)}::jsonb,
            ${JSON.stringify(shots)}::jsonb, ${JSON.stringify(messages)}::jsonb,
            ${story ? "story" : "cohesive"}, ${vibe ?? null})
    RETURNING *
  `) as any[]
  return { ...mapRow(rows[0]), selfieUrls, inspirationUrls }
}

// NOTE: there is intentionally no whole-shoot batch renderer. Rendering 6-9 shots in one
// invocation (synchronous or after()) outruns maxDuration and, because batch renderers only
// persisted at the end, a kill lost every image (shoots 44-46, 2026-07-01/02). Initial renders
// go through regenerateShot - one shot per request, persisted atomically per shot - driven by
// the client's renderDraftShots queue in components/admin/shoot-studio-client.tsx.

const REFINE_CONTRACT = `Respond with ONLY a JSON object:
{
  "reply": "1-2 sentences back to Sandra in her own voice (warm, close friend, contractions).",
  "shots": [ { "id": "shot-1", "title": "...", "whenToUse": "...", "mood": "...", "prompt": "..." } ]
}
Return ALL shots, every field, even untouched ones. Apply Sandra's change everywhere it logically applies (an outfit change applies to every shot; "make shot 3 a close-up" applies to one). Keep the vault anatomy intact in every prompt. No em-dashes.`

export async function refineShoot(id: number, message: string): Promise<Shoot> {
  const shoot = await getShoot(id)
  if (!shoot) throw new Error("Shoot not found")
  const ask = message.trim()
  if (!ask) throw new Error("Say what you want changed")
  const story = shoot.collectionType === "story"
  const collectionRules = story
    ? `STORY COLLECTION RULES:
- Keep every shot tied to its existing inspiration image at the same index.
- Every shot remains its own world. Do not introduce cross-shot outfit, location, pose, lighting, or color-grade continuity.
- Preserve the current collection vibe: ${shoot.vibe || "editorial close recreation"}.
- Keep phone-camera, mirror-selfie, photodump, or other preset camera language intact when present.`
    : `COHESIVE SHOOT RULES:
- Keep one consistent outfit family, hair, makeup, location mood, lighting world, and color grade.
- Preserve the existing shot-role and camera-distance variety.`

  const raw = await callContentKitLlm(
    `You are SSELFIE's vault prompt writer, refining the photoshoot "${shoot.title}" for Sandra.

Current shots JSON:
${JSON.stringify(shoot.shots.map(toPromptShot), null, 2)}

Sandra says: "${ask}"

${collectionRules}

${buildVaultAnatomy(shoot.shots.length)}

${voiceBlock()}

${noFakeBlock()}

${REFINE_CONTRACT}`
  )
  const parsed = extractJsonObject(raw)
  const updated = sanitizeShots(parsed.shots, shoot.shots.length, { story })
  const reply = stripEmDashes(
    String(parsed.reply || "Done. Regenerating the changed shots now.")
  ).trim()

  // Only re-render shots whose prompt actually changed; keep approvals on untouched shots.
  const nextShots: ShootShot[] = shoot.shots.map((existing, i) => {
    const next = updated[i]
    if (!next) return existing
    const changed = next.prompt !== existing.prompt
    return {
      ...existing,
      ...next,
      imageUrl: changed ? undefined : existing.imageUrl,
      renderStatus: changed ? "pending" : existing.renderStatus,
      renderErrorCode: changed ? null : existing.renderErrorCode,
      renderErrorMessage: changed ? null : existing.renderErrorMessage,
      status: changed ? "draft" : existing.status,
    }
  })

  const messages: ShootMessage[] = [
    ...shoot.messages,
    { role: "sandra", text: ask, at: new Date().toISOString() },
    { role: "agent", text: reply, at: new Date().toISOString() },
  ]
  await saveShots(shoot.id, nextShots, messages)
  return { ...shoot, shots: nextShots, messages }
}

export async function regenerateShot(
  id: number,
  shotId: string,
  quality: ImgQuality = DEFAULT_RENDER_QUALITY
): Promise<Shoot> {
  const shoot = await getShoot(id)
  if (!shoot) throw new Error("Shoot not found")
  const idx = shoot.shots.findIndex(shot => shot.id === shotId)
  if (idx === -1) throw new Error("Shot not found")

  const shotRole = normalizeShotRole(shoot.shots[idx].shotRole, idx)
  const isStory = shoot.collectionType === "story"
  const renderAttempts = (shoot.shots[idx].renderAttempts || 0) + 1
  const lastRenderAttemptAt = new Date().toISOString()
  try {
    const imageUrl = await generateShotImage({
      selfieUrls: shoot.selfieUrls,
      // Story shots recreate their OWN inspiration (inspo idx); cohesive shots use all inspiration.
      inspirationUrls: isStory
        ? [shoot.inspirationUrls[idx] ?? shoot.inspirationUrls[0]]
        : shoot.inspirationUrls,
      // Story shots have no continuity anchor; cohesive shots anchor 2+ to shot 1.
      continuityUrls:
        !isStory && idx > 0 && shoot.shots[0]?.imageUrl && isAllowedUrl(shoot.shots[0].imageUrl)
          ? [shoot.shots[0].imageUrl]
          : [],
      prompt: shoot.shots[idx].prompt,
      shotRole,
      quality,
      closeRecreate: isStory,
    })
    const patch: Partial<ShootShot> = {
      shotRole,
      imageUrl,
      renderStatus: "completed",
      renderErrorCode: null,
      renderErrorMessage: null,
      renderAttempts,
      lastRenderAttemptAt,
      status: quality === "high" ? shoot.shots[idx].status : "draft",
    }
    shoot.shots[idx] = { ...shoot.shots[idx], ...patch }
    await saveShotPatch(shoot.id, shoot.shots[idx].id, patch)
    return shoot
  } catch (error) {
    const moderationBlocked = isContentPolicyError(error)
    const code = moderationBlocked ? "moderation_blocked" : "generation_failed"
    const message = moderationBlocked
      ? "This inspiration could not be recreated safely as-is. Replace the inspiration image and create the collection again."
      : "This photo hit a temporary rendering error. Re-roll this card to try again."
    const patch: Partial<ShootShot> = {
      shotRole,
      renderStatus: moderationBlocked ? "moderation_blocked" : "failed",
      renderErrorCode: moderationBlocked ? "moderation_blocked" : "generation_failed",
      renderErrorMessage: message,
      renderAttempts,
      lastRenderAttemptAt,
    }
    shoot.shots[idx] = { ...shoot.shots[idx], ...patch }
    await saveShotPatch(shoot.id, shoot.shots[idx].id, patch)
    console.warn(
      `[shoot-studio] shot ${shotId} render failed for shoot ${shoot.id}: ${getGenerationFailureSummary(error)}`
    )
    throw new ShootRenderError({
      message,
      code,
      retryable: !moderationBlocked,
      shoot,
    })
  }
}

const EXTEND_CONTRACT = `Respond with ONLY a JSON object:
{
  "reply": "1-2 sentences back to Sandra in her own voice.",
  "shots": [
    {
      "title": "Collection Name · Shot Name",
      "whenToUse": "1-2 sentences in Sandra's voice: where to post it, what caption energy.",
      "mood": "five · dot · separated · lowercase · tags",
      "prompt": "the full vault-anatomy prompt"
    }
  ]
}
Return only the NEW shots. No em-dashes.`

export async function extendShoot(id: number, count = 2): Promise<Shoot> {
  const shoot = await getShoot(id)
  if (!shoot) throw new Error("Shoot not found")
  if (shoot.collectionType === "story") {
    throw new Error(
      "Story collections use one inspiration per image. Start a new collection with more inspiration images instead."
    )
  }
  const safeCount = Math.min(Math.max(Math.floor(count), 1), 4)
  const nextTotal = shoot.shots.length + safeCount

  const raw = await callContentKitLlm(
    `You are SSELFIE's vault prompt writer. Add ${safeCount} more shots to the existing photoshoot "${shoot.title}".

Current shots JSON:
${JSON.stringify(shoot.shots.map(toPromptShot), null, 2)}

Keep the same collection world, outfit family, hair, makeup, location mood and color grade. Add fresh useful angles only: movement, detail, profile, cover, story, carousel, seated hero, or full-body variations not already covered.

${buildVaultAnatomy(nextTotal)}

${voiceBlock()}

${noFakeBlock()}

${EXTEND_CONTRACT}

Exactly ${safeCount} new shots.`
  )
  const parsed = extractJsonObject(raw)
  const drafts = sanitizeShots(parsed.shots, safeCount)
  const start = shoot.shots.length + 1
  const newShots: ShootShot[] = drafts.map((shot, i) => ({
    ...shot,
    id: `shot-${start + i}`,
    renderStatus: "pending",
    status: "draft",
  }))

  const combinedShots = [...shoot.shots, ...newShots]
  const reply = stripEmDashes(
    String(parsed.reply || `Added ${safeCount} more shots to the same world.`)
  ).trim()
  const messages: ShootMessage[] = [
    ...shoot.messages,
    {
      role: "agent",
      text: reply,
      at: new Date().toISOString(),
    },
  ]
  await saveShots(shoot.id, combinedShots, messages)
  return { ...shoot, shots: combinedShots, messages }
}

export async function setShotStatus(
  id: number,
  shotId: string,
  status: ShootShot["status"]
): Promise<void> {
  const shoot = await getShoot(id)
  if (!shoot) throw new Error("Shoot not found")
  const shots = shoot.shots.map(shot => (shot.id === shotId ? { ...shot, status } : shot))
  await saveShots(id, shots)
}

export async function setShootStatus(id: number, status: Shoot["status"]): Promise<void> {
  await sql`UPDATE content_shoots SET status = ${status}, updated_at = NOW() WHERE id = ${id}`
}
