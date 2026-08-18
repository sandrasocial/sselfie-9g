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
      /\binstagram\s+stories\b/i,
      /\bmultiple\s+story\s+(?:slides?|frames?)\b/i,
    ],
  },
  {
    format: "story-slide",
    patterns: [
      /\bstory\s+slide\b/i,
      /\bstory\s+frame\b/i,
      /\bone\s+story\s+(?:slide|frame)\b/i,
      /\binstagram\s+story\b/i,
    ],
  },
  {
    format: "reel-cover",
    patterns: [/\breel\s+cover\b/i, /\bcarousel\s+cover\b/i, /\bpost\s+cover\b/i],
  },
  {
    format: "carousel",
    patterns: [/\bcarousel\b/i, /\bslides?\b/i],
  },
  {
    format: "photoshoot",
    patterns: [/\bfull\s+shoot\b/i, /\bphoto\s*shoot\b/i, /\bphotoshoot\b/i, /\bbrand\s+shoot\b/i],
  },
  {
    format: "video",
    patterns: [/\bvideo\b/i, /\banimate\b/i, /\bmake\s+it\s+move\b/i],
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
    ],
  },
]

const DIRECT_CREATION_ACTION =
  /\b(create|make|generate|build|design|produce|write|animate|turn\s+(?:this|it|that)\s+into)\b/i

const CREATION_REQUEST =
  /\b(create|make|generate|build|design|produce|write|animate|teach|turn\s+(?:this|it|that)\s+into|i\s+(?:want|need|would\s+like)|please|help\s+me)\b/i

const BARE_FORMAT_SELECTION =
  /^(?:actually\s+)?(?:just\s+)?(?:a\s+|an\s+|one\s+)?(?:photo|profile\s+photo|headshot|portrait|photoshoot|photo\s+shoot|brand\s+shoot|reel\s+cover|carousel|story\s+slide|story\s+frame|story\s+sequence|instagram\s+story|instagram\s+stories|video)$/i

function normalize(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isNeutralFormatDiscussion(text: string): boolean {
  const explicitCreationAction =
    DIRECT_CREATION_ACTION.test(text) || BARE_FORMAT_SELECTION.test(text)
  if (explicitCreationAction) return false

  return (
    /^(can|could|would|will|do|does|did|is|are|should|what|why|how|when|where)\b/i.test(text) ||
    /\b(explain|understand|analy[sz]e|review|critique|feedback|feels?\s+off|what\s+makes|think\s+through|whether|right\s+for)\b/i.test(
      text
    )
  )
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

  // Maya Home is also a general assistant. Advice/questions stay conversational even if
  // they mention a format; a direct creation verb still routes the request immediately.
  if (isNeutralFormatDiscussion(text)) return needsClarificationIntent(source)

  // Topic words are not format choices. A member can talk about her story, a coaching
  // series, what to cover, or how to teach something without silently entering a graphic
  // pipeline. Route only a real creation request that also names a concrete format, or a
  // short direct answer such as "Carousel" to Maya's visible format question.
  if (!CREATION_REQUEST.test(text) && !BARE_FORMAT_SELECTION.test(text)) {
    return needsClarificationIntent(source)
  }

  const matches = PATTERNS.filter(group => group.patterns.some(pattern => pattern.test(text))).map(
    group => group.format
  )
  const unique = [...new Set(matches)]

  if (
    unique.includes("story-sequence") &&
    unique.includes("story-slide") &&
    /\b(story\s+(sequence|series)|instagram\s+stories|multiple\s+story\s+(?:slides?|frames?))\b/i.test(
      text
    )
  ) {
    return intentForFormat("story-sequence", source)
  }

  if (
    unique.includes("story-slide") &&
    unique.includes("carousel") &&
    /\b(story\s+(slide|frame)|one\s+story\s+(?:slide|frame)|instagram\s+story)\b/i.test(text)
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
