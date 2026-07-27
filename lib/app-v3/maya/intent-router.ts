import type { CreationIntent, CreationIntentSource, OutputFormat } from "@/components/app-v3/types"

type IntentPattern = {
  format: OutputFormat
  patterns: RegExp[]
}

const PATTERNS: IntentPattern[] = [
  {
    format: "story-sequence",
    patterns: [
      /\bstory\s+sequence\b/i,
      /\bstory\s+series\b/i,
      /\bstories\b/i,
      /\bsequence\b/i,
      /\bmultiple\s+story\b/i,
    ],
  },
  {
    format: "story-slide",
    patterns: [/\bstory\s+slide\b/i, /\bstory\s+frame\b/i, /\bone\s+story\b/i, /\bstory\b/i],
  },
  {
    format: "reel-cover",
    patterns: [/\breel\s+cover\b/i, /\bcover\b/i, /\bcarousel\s+cover\b/i, /\bpost\s+cover\b/i],
  },
  {
    format: "carousel",
    patterns: [
      /\bcarousel\b/i,
      /\bslides?\b/i,
      /\bteach\s+this\b/i,
      /\bteach\b/i,
      /\bhow\s+to\b/i,
    ],
  },
  {
    format: "photoshoot",
    patterns: [
      /\bfull\s+shoot\b/i,
      /\bphoto\s*shoot\b/i,
      /\bphotoshoot\b/i,
      /\bshoot\b/i,
      /\bseries\b/i,
      /\bset\b/i,
    ],
  },
  {
    format: "video",
    patterns: [/\bmotion\b/i, /\bvideo\b/i, /\banimate\b/i, /\bmake\s+it\s+move\b/i],
  },
  {
    format: "photo",
    patterns: [
      /\bprofile\s+photo\b/i,
      /\bprofile\s+picture\b/i,
      /\bheadshot\b/i,
      /\bportrait\b/i,
      /\bbrand\s+photo\b/i,
      /\bphoto\b/i,
      /\bpicture\b/i,
    ],
  },
]

function normalize(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function memberDelegatesFormatChoice(input: string): boolean {
  const text = normalize(input)
  if (!text) return false
  return /\b(i don t know|i do not know|not sure|you choose|choose for me|maya choose|you decide|decide for me|maya decide|surprise me)\b/i.test(
    text
  )
}

export function intentForFormat(
  format: OutputFormat,
  source: CreationIntentSource,
  confidence: CreationIntent["confidence"] = "high"
): CreationIntent {
  return { format, source, confidence }
}

export function needsClarificationIntent(source: CreationIntentSource): CreationIntent {
  return { format: null, source, confidence: "needs_clarify" }
}

export function detectCreationIntent(
  input: string,
  source: CreationIntentSource = "typed"
): CreationIntent {
  const text = normalize(input)
  if (!text) return needsClarificationIntent(source)

  const matches = PATTERNS.filter(group => group.patterns.some(pattern => pattern.test(text))).map(
    group => group.format
  )
  const unique = [...new Set(matches)]

  if (
    unique.includes("story-sequence") &&
    unique.includes("story-slide") &&
    /\b(story\s+(sequence|series)|stories|sequence|multiple\s+story)\b/i.test(text)
  ) {
    return intentForFormat("story-sequence", source)
  }

  if (
    unique.includes("story-slide") &&
    unique.includes("carousel") &&
    /\b(story\s+(slide|frame)|one\s+story)\b/i.test(text)
  ) {
    return intentForFormat("story-slide", source)
  }

  if (
    unique.includes("video") &&
    unique.includes("photo") &&
    /\b(animate|motion|make\s+it\s+move|video)\b/i.test(text)
  ) {
    return intentForFormat("video", source)
  }

  if (unique.length === 1) return intentForFormat(unique[0], source)
  if (unique.length > 1) return needsClarificationIntent(source)

  return needsClarificationIntent(source)
}
