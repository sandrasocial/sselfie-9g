type UnknownRecord = Record<string, unknown>

export interface VideoAuthorityPromptInput {
  motionPrompt?: unknown
  imageDescription?: unknown
  category?: unknown
  userRequest?: unknown
  styleNotes?: unknown
  offerBriefPrefill?: unknown
  recommendedSource?: unknown
  uploadsTotal?: unknown
}

export interface VideoAuthorityPromptResult {
  prompt: string
  builder: string
}

const DEFAULT_MOTION_PROMPT =
  "subtle natural breathing, tiny expression shift, gentle camera push-in, soft ambient movement, keep the face and body unchanged"

function normalizeLine(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim()
}

function extractFirstMeaningfulLine(rawText: string): string {
  if (!rawText) return ""
  const lines = rawText.split("\n")

  for (const line of lines) {
    let cleaned = line.trim()
    if (!cleaned) continue

    cleaned = cleaned.replace(/\*\*[^*]+:\*\*/g, "")
    cleaned = cleaned.replace(/^[-*•]\s*/g, "")
    cleaned = cleaned.replace(/^["'`]|["'`]$/g, "")
    cleaned = cleaned.replace(/\*/g, "")
    cleaned = cleaned.replace(/^(motion|prompt|description):\s*/i, "")
    cleaned = cleaned.replace(/\s+/g, " ").trim()

    if (cleaned) return cleaned
  }

  return ""
}

function readStyleNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => normalizeLine(entry))
    .filter(Boolean)
    .slice(0, 4)
}

function readOfferSummary(value: unknown): string {
  if (!value || typeof value !== "object") return ""
  const prefill = value as UnknownRecord

  const offerType = normalizeLine(prefill.offerType)
  const transformation = normalizeLine(prefill.transformation)
  const idealClient = normalizeLine(prefill.idealClient)

  const summary: string[] = []
  if (offerType) summary.push(offerType)
  if (transformation) summary.push(transformation)
  if (idealClient) summary.push(`for ${idealClient}`)
  return summary.join(" ")
}

function inferCategoryDirective(category: string): string {
  const normalized = category.toLowerCase()
  if (normalized.includes("fashion")) {
    return "fabric and hair move naturally with controlled camera drift"
  }
  if (normalized.includes("food")) {
    return "focus on subtle hand movement and ingredient detail with stable framing"
  }
  if (normalized.includes("fitness")) {
    return "energy stays controlled with smooth body motion and steady framing"
  }
  if (normalized.includes("travel")) {
    return "ambient movement and perspective shift stay smooth and cinematic"
  }
  if (normalized.includes("professional") || normalized.includes("business")) {
    return "movement stays composed and confident with minimal camera motion"
  }
  return "movement remains natural and polished with subtle cinematic depth"
}

function inferStyleDirectives(notes: string[]): string[] {
  const normalized = notes.map((note) => note.toLowerCase())
  const directives: string[] = []

  if (normalized.some((note) => /no smile|don't smile|do not smile|avoid smile/.test(note))) {
    directives.push("keep expression neutral and natural")
  }

  if (normalized.some((note) => /cinematic|editorial|film/i.test(note))) {
    directives.push("maintain cinematic motion quality without abrupt movement")
  }

  if (normalized.some((note) => /minimal|clean|simple|subtle/.test(note))) {
    directives.push("keep movement subtle and clean")
  }

  return directives
}

function includesCameraDirection(text: string): boolean {
  return /\bcamera\b|\bdolly\b|\bpush-?in\b|\bpan\b|\barc\b|\btracking\b|\blocked\b|\bfixed\b|\bhandheld\b/i.test(text)
}

function ensureMaxLength(text: string, maxLength: number = 360): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim().replace(/[,.;:!?-]+$/g, "")}`
}

function includesSubjectMotion(text: string): boolean {
  return /\bturns?\b|\blooks?\b|\bblink\b|\bbreath|\bsmil|\badjusts?\b|\bwalk|\bmoves?\b|\bhair\b|\bfabric\b|\bhand\b/i.test(
    text,
  )
}

function includesPace(text: string): boolean {
  return /\bslow\b|\bgentle\b|\bsubtle\b|\bsoft\b|\bcalm\b|\bcontrolled\b|\bsmooth\b/i.test(text)
}

export function buildVideoAuthorityPrompt(input: VideoAuthorityPromptInput): VideoAuthorityPromptResult {
  const motionPrompt = extractFirstMeaningfulLine(normalizeLine(input.motionPrompt))
  const imageDescription = extractFirstMeaningfulLine(normalizeLine(input.imageDescription))
  const userRequest = extractFirstMeaningfulLine(normalizeLine(input.userRequest))
  const styleNotes = readStyleNotes(input.styleNotes)
  const offerSummary = readOfferSummary(input.offerBriefPrefill)

  const basePrompt = motionPrompt || imageDescription || userRequest || DEFAULT_MOTION_PROMPT
  const directives: string[] = []

  const category = normalizeLine(input.category)
  if (category) {
    directives.push(inferCategoryDirective(category))
  }

  directives.push(...inferStyleDirectives(styleNotes))

  if (normalizeLine(input.recommendedSource) === "custom_model" && Number(input.uploadsTotal || 0) > 0) {
    directives.push("preserve identity consistency from the source image")
  }

  if (offerSummary) {
    directives.push(`align mood with the brand promise: ${offerSummary}`)
  }

  const merged = [basePrompt, ...Array.from(new Set(directives.filter(Boolean)))]
    .join(", ")
    .replace(/\s+/g, " ")
    .trim()

  let finalPrompt = merged || DEFAULT_MOTION_PROMPT

  if (!includesCameraDirection(finalPrompt)) {
    finalPrompt = `${finalPrompt}, gentle camera push-in`
  }

  if (!includesSubjectMotion(finalPrompt)) {
    finalPrompt = `${finalPrompt}, natural blink and subtle breathing motion`
  }

  if (!includesPace(finalPrompt)) {
    finalPrompt = `${finalPrompt}, slow controlled motion`
  }

  finalPrompt = `${finalPrompt}, preserve identity and facial structure, no subtitles, no text overlays, no extra people, no face morphing`

  finalPrompt = ensureMaxLength(finalPrompt)

  return {
    prompt: finalPrompt,
    builder: directives.length > 0 ? "video-authority-contextual-v1" : "video-authority-base-v1",
  }
}
