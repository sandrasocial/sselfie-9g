import { MOTION_PROMPTING_SKILL } from "@/lib/maya/skills/motion-prompting-skill"
import { NANO_BANANA_PRO_SKILL } from "@/lib/maya/skills/nano-banana-pro-skill"

export interface MayaSkillContext {
  latestUserText: string
  chatType: string
  isStudioProMode: boolean
}

export interface MayaSkillSelection {
  skillId: "image_high_fidelity" | "video_motion" | "fallback_image"
  source: "nano_banana_pro" | "motion_prompting" | "baseline"
  version: string
  promptAddendum: string
  appliedRules: string[]
}

const VIDEO_INTENT_REGEX = /\b(video|reel|animate|animation|motion|i2v|b-?roll)\b/i
const IMAGE_INTENT_REGEX = /\b(photo|image|concept|photoshoot|portrait|look|style)\b/i
const HIGH_FIDELITY_HINT_REGEX = /\b(nano\s*banana|editorial|ultra|realistic|authentic|high\s*fidelity|studio\s*pro)\b/i

function toPromptAddendum(lines: string[]): string {
  return lines.map((line) => `- ${line}`).join("\n")
}

export function selectMayaSkill(input: MayaSkillContext): MayaSkillSelection {
  const latestUserText = input.latestUserText || ""

  if (VIDEO_INTENT_REGEX.test(latestUserText)) {
    return {
      skillId: "video_motion",
      source: MOTION_PROMPTING_SKILL.id,
      version: MOTION_PROMPTING_SKILL.version,
      promptAddendum:
        "Apply Motion Prompting Skill:\n" +
        toPromptAddendum([...MOTION_PROMPTING_SKILL.guidance, ...MOTION_PROMPTING_SKILL.bannedPatterns.map((p) => `Avoid: ${p}`)]),
      appliedRules: MOTION_PROMPTING_SKILL.guidance,
    }
  }

  if (IMAGE_INTENT_REGEX.test(latestUserText) && (input.isStudioProMode || HIGH_FIDELITY_HINT_REGEX.test(latestUserText))) {
    return {
      skillId: "image_high_fidelity",
      source: NANO_BANANA_PRO_SKILL.id,
      version: NANO_BANANA_PRO_SKILL.version,
      promptAddendum:
        "Apply Nano Banana Pro Skill:\n" +
        toPromptAddendum([...NANO_BANANA_PRO_SKILL.guidance, ...NANO_BANANA_PRO_SKILL.bannedPatterns.map((p) => `Avoid: ${p}`)]),
      appliedRules: NANO_BANANA_PRO_SKILL.guidance,
    }
  }

  return {
    skillId: "fallback_image",
    source: "baseline",
    version: "2026.03.06",
    promptAddendum:
      "Apply Baseline Prompt Discipline:\n" +
      toPromptAddendum([
        "Keep responses concise and specific to user intent.",
        "Use structured prompt composition and avoid filler adjectives.",
        "Prioritize user words in chat copy and generation quality in prompt composition.",
      ]),
    appliedRules: ["baseline_prompt_discipline"],
  }
}
