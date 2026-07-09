import type { IgContact, IgTriageResult } from "@/lib/ig-agent/types"

const DISTRESS_RE = /\b(struggling|anxious|anxiety|depressed|depression|panic|help me|crying|lost|overwhelmed|hate myself|mental health)\b/i
const REFUND_RE = /\b(refund|chargeback|dispute|cancel|scam|angry|not working|doesn't work|didn't work|broken|complaint|paid but|access issue)\b/i
const PROMPT_RE = /\b(prompts?|prompt pack|ai prompts?|chatgpt prompts?)\b/i
const VAULT_RE = /\b(vault|full shoot|full vault|paid prompts?)\b/i
const SELFIE_RE = /\b(selfie guide|selfie|settings|camera settings)\b/i
const LINK_RE = /\b(link|send it|where is it|can't find|access)\b/i
const FREE_RE = /\b(free|download|guide|preview)\b/i
const FAN_RE = /\b(love|obsessed|amazing|beautiful|thank you|thanks|inspired|this is so good|need this)\b/i

// Bare comments that are just a ManyChat keyword-automation trigger word (e.g. a lone "Kit" or
// "Suite" comment). ManyChat already delivers the real reply for these; drafting a native
// response too is redundant, and until this was added they had no matching regex at all and
// fell through to needs_review, flooding /admin/ig-inbox with noise ManyChat had already handled.
const BARE_KEYWORD_TRIGGERS: Record<string, string> = {
  kit: "kit_keyword",
  suite: "suite_keyword",
  prompt: "prompt_keyword",
  prompts: "prompt_keyword",
  vault: "vault_keyword",
}

function bareKeywordTrigger(message: string): string | null {
  const stripped = message.toLowerCase().replace(/[^a-z]/g, "")
  return BARE_KEYWORD_TRIGGERS[stripped] || null
}

const AESTHETIC_PATTERNS: Array<[RegExp, string]> = [
  [/\b(dark feminine|dark femme|dark balcony|moody|cinematic|luxury|glam)\b/i, "aesthetic_dark_feminine"],
  [/\b(coastal|white|clean girl|minimal|soft white)\b/i, "aesthetic_coastal_white"],
  [/\b(cafe|café|coffee|marble cafe|marble café)\b/i, "aesthetic_cafe"],
  [/\b(mirror selfie|phone shot|iphone|reel cover)\b/i, "aesthetic_mirror_selfie"],
  [/\b(brand shoot|personal brand|business photos|profile photo)\b/i, "aesthetic_brand_shoot"],
]

function addTag(tags: Set<string>, condition: boolean, tag: string) {
  if (condition) tags.add(tag)
}

export function detectGrowthTags(message: string): string[] {
  const tags = new Set<string>()
  addTag(tags, PROMPT_RE.test(message), "prompt_request")
  addTag(tags, VAULT_RE.test(message), "vault_interest")
  addTag(tags, /\b(how|chatgpt|upload|use it|do i paste|same chat|new chat)\b/i.test(message), "how_to_use_chatgpt")
  addTag(tags, /\b(face|same face|accurate|looks like me|doesn't look like me|features)\b/i.test(message), "face_accuracy_question")
  addTag(tags, /\b(price|cost|how much|expensive|afford)\b/i.test(message), "price_objection")
  addTag(tags, /\b(done for you|can you do it|make it for me|custom)\b/i.test(message), "wants_done_for_you")
  addTag(tags, /\b(buy|purchase|checkout|pay|order|want in|get the vault)\b/i.test(message), "buyer_intent")
  addTag(tags, /\b(confused|don't understand|where|how do i|help)\b/i.test(message), "confused")

  for (const [pattern, tag] of AESTHETIC_PATTERNS) {
    addTag(tags, pattern.test(message), tag)
  }

  return Array.from(tags)
}

export function triageIncomingMessage(message: string, contact: IgContact): IgTriageResult {
  const normalized = message.trim()
  const lowerTags = new Set((contact.tags || []).map((tag) => tag.toLowerCase()))
  const growthTags = detectGrowthTags(normalized)

  if (lowerTags.has("blocked")) {
    return {
      action: "ignore",
      reason: "blocked_contact",
      intent: "blocked",
      growthTags,
      confidenceHint: 1,
    }
  }

  if (contact.isIcelandic || lowerTags.has("icelandic")) {
    return {
      action: "flag",
      reason: "icelandic_contact",
      flagReason: "icelandic_contact",
      intent: "personal_contact",
      growthTags: [...new Set([...growthTags, "icelandic_contact"])],
      confidenceHint: 0.2,
    }
  }

  if (contact.isVerifiedFriend || lowerTags.has("friend") || lowerTags.has("family")) {
    return {
      action: "flag",
      reason: "verified_friend_or_family",
      flagReason: "friend_or_family",
      intent: "personal_contact",
      growthTags,
      confidenceHint: 0.2,
    }
  }

  if (/\bSandra\b/.test(normalized)) {
    return {
      action: "flag",
      reason: "uses_sandra_name",
      flagReason: "personal_tone",
      intent: "personal_contact",
      growthTags,
      confidenceHint: 0.45,
    }
  }

  if (DISTRESS_RE.test(normalized)) {
    return {
      action: "flag",
      reason: "distress_signal",
      flagReason: "emotional_or_distressed",
      intent: "support_emotional",
      growthTags,
      confidenceHint: 0.15,
    }
  }

  if (REFUND_RE.test(normalized)) {
    return {
      action: "flag",
      reason: "refund_or_complaint",
      flagReason: "refund_or_complaint",
      intent: "support_issue",
      growthTags,
      confidenceHint: 0.35,
    }
  }

  const bareTrigger = bareKeywordTrigger(normalized)
  if (bareTrigger) {
    return {
      action: "keyword_handled",
      reason: bareTrigger,
      intent: bareTrigger,
      growthTags,
      confidenceHint: 1,
    }
  }

  if (VAULT_RE.test(normalized)) {
    return { action: "auto_respond", reason: "vault_keyword", intent: "vault_interest", growthTags, confidenceHint: 0.9 }
  }
  if (PROMPT_RE.test(normalized)) {
    return { action: "auto_respond", reason: "prompt_keyword", intent: "prompt_request", growthTags, confidenceHint: 0.9 }
  }
  if (SELFIE_RE.test(normalized)) {
    return { action: "auto_respond", reason: "selfie_keyword", intent: "selfie_education", growthTags, confidenceHint: 0.85 }
  }
  if (LINK_RE.test(normalized) || FREE_RE.test(normalized)) {
    return { action: "auto_respond", reason: "link_or_free_keyword", intent: "link_request", growthTags, confidenceHint: 0.82 }
  }
  if (FAN_RE.test(normalized)) {
    return { action: "auto_respond", reason: "fan_message", intent: "community_love", growthTags, confidenceHint: 0.86 }
  }

  return {
    action: "flag",
    reason: "needs_review",
    flagReason: "needs_sandra_review",
    intent: "unknown",
    growthTags,
    confidenceHint: 0.55,
  }
}

