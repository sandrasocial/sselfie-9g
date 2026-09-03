import { SKOOL_CLASSROOM_URL } from "@/lib/skool/public-acquisition"

export const SKOOL_HANDOFF_SOURCE = "skool" as const

export const SKOOL_HANDOFF_KEYS = [
  "suite-maya",
  "selfie-practice",
  "editing-practice",
  "ai-photo-practice",
] as const

export type SkoolHandoffKey = (typeof SKOOL_HANDOFF_KEYS)[number]

export type SkoolMayaHandoff = {
  key: SkoolHandoffKey
  lessonTitle: string
  title: string
  description: string
  creationIdea: string
  starterPrompt: string
  returnUrl: string
}

// TODO (launch, 2026-09-03): the group moved to skool.com/sselfie. The four
// per-lesson classroom ids below came from the retired sselfie-photo-club-2569
// group and do not resolve in the new one, so every returnUrl currently lands on
// the classroom root instead of the exact lesson. Functional, but she loses her
// place. Swap SKOOL_CLASSROOM_URL for `${SKOOL_CLASSROOM_URL}/<id>?md=<md>` per
// handoff once the real ids are pulled from the live classroom.
const SKOOL_HANDOFFS: Record<SkoolHandoffKey, SkoolMayaHandoff> = {
  "suite-maya": {
    key: "suite-maya",
    lessonTitle: "How Skool, SUITE, and Maya work together",
    title: "Continue your Skool lesson with Maya",
    description:
      "You are in the right place. Maya will help you turn the lesson into one clear next step inside SSELFIE.",
    creationIdea: "Choose my next step in the SSELFIE method after the Skool introduction.",
    starterPrompt:
      "I just came from the Skool lesson about how Skool, SUITE, and Maya work together. Help me choose one clear next step today. Keep it simple and guide me one step at a time.",
    returnUrl: SKOOL_CLASSROOM_URL,
  },
  "selfie-practice": {
    key: "selfie-practice",
    lessonTitle: "Selfies",
    title: "Practise this selfie lesson with Maya",
    description:
      "Maya knows which lesson you came from and will help you choose one setup to practise now.",
    creationIdea: "Practise one simple selfie setup from the SSELFIE Skool Selfies lesson.",
    starterPrompt:
      "I just finished the Selfies lesson in SSELFIE Skool. Help me choose one simple selfie setup to practise today. Ask only what you need, then give me clear step-by-step direction.",
    returnUrl: SKOOL_CLASSROOM_URL,
  },
  "editing-practice": {
    key: "editing-practice",
    lessonTitle: "Editing",
    title: "Practise this editing lesson with Maya",
    description:
      "Maya will help you choose one useful edit and understand why it improves the photo.",
    creationIdea: "Practise one editing skill from the SSELFIE Skool Editing lesson.",
    starterPrompt:
      "I just finished the Editing lesson in SSELFIE Skool. Help me choose one useful edit to practise on my photo. Explain what to change, why it helps, and how to know when the edit is finished.",
    returnUrl: SKOOL_CLASSROOM_URL,
  },
  "ai-photo-practice": {
    key: "ai-photo-practice",
    lessonTitle: "AI Photos",
    title: "Continue your AI Photos lesson with Maya",
    description:
      "Maya will help you choose the right source selfie and create a result that still feels like you.",
    creationIdea: "Create one realistic AI photo from the SSELFIE Skool AI Photos lesson.",
    starterPrompt:
      "I just finished the AI Photos lesson in SSELFIE Skool. Help me choose the best source selfie and create one realistic photo that still looks and feels like me. Guide me one step at a time.",
    returnUrl: SKOOL_CLASSROOM_URL,
  },
}

function firstString(value: unknown): string | null {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === "string" ? candidate.trim().toLowerCase() : null
}

export function resolveSkoolHandoffKey(value: unknown): SkoolHandoffKey | null {
  const candidate = firstString(value)
  return candidate && SKOOL_HANDOFF_KEYS.includes(candidate as SkoolHandoffKey)
    ? (candidate as SkoolHandoffKey)
    : null
}

export function resolveSkoolMayaHandoff(source: unknown, lesson: unknown): SkoolMayaHandoff | null {
  if (firstString(source) !== SKOOL_HANDOFF_SOURCE) return null
  const key = resolveSkoolHandoffKey(lesson)
  return key ? SKOOL_HANDOFFS[key] : null
}

export function getSkoolMayaHandoff(key: unknown): SkoolMayaHandoff | null {
  const resolved = resolveSkoolHandoffKey(key)
  return resolved ? SKOOL_HANDOFFS[resolved] : null
}

export function getSkoolMayaPromptContext(key: unknown): string | null {
  const handoff = getSkoolMayaHandoff(key)
  if (!handoff) return null
  return [
    "## VERIFIED SSELFIE SKOOL HANDOFF",
    `The member arrived from the allowlisted SSELFIE Skool lesson: \"${handoff.lessonTitle}\".`,
    `Her intended next step is: \"${handoff.creationIdea}\".`,
    "Acknowledge the lesson briefly, then help her complete that exact next step inside SSELFIE.",
    "Keep the guidance simple and practical. Do not ask what she wants to do from scratch, do not invent Skool progress, and do not pitch another product.",
  ].join("\n")
}
