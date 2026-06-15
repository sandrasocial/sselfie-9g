// Shared Maya creative planning contract for customer-facing /app Maya.
// Pure types and validation helpers. Customer carousel consumes this first; other modes wire in later.

export type CreativeMode = "photo" | "reel_cover" | "carousel" | "story_sequence" | "video"

export type CreativeUseCase =
  | "single_editorial"
  | "full_photoshoot"
  | "educational"
  | "tutorial"
  | "sales"
  | "behind_the_scenes"
  | "opinion"
  | "trust"
  | "vault_product"
  | "soft_cta"
  | "motion"

export type TextSafeArea =
  | "top"
  | "upper_third"
  | "center"
  | "lower_third"
  | "bottom"
  | "left_column"
  | "right_column"
  | "none"

export type ReferenceImageStrategy =
  | "selfie_identity_anchor"
  | "selfie_plus_body_reference"
  | "inspiration_style_only"
  | "vault_style_context"
  | "existing_generated_image"
  | "screenshot_preserve_exact"
  | "no_reference"

export type CreativePlanValidationSeverity = "error" | "warning"

export interface VaultStyleReference {
  name: string
  promptSnippet?: string
  mood?: string
  referenceImageUrl?: string | null
  reason?: string
}

export interface InspirationInterpretation {
  sourceUrl?: string | null
  pose?: string
  outfit?: string
  lighting?: string
  colorGrade?: string
  mood?: string
  accessories?: string
  avoidCopying?: string[]
}

export interface ReferenceHandlingPlan {
  identityStrategy: ReferenceImageStrategy
  inspirationStrategy?: ReferenceImageStrategy
  notes?: string
}

export interface CreativePlanOutput {
  title: string
  purpose: string
  visualConcept: string
  imagePromptDirection?: string
  videoPromptDirection?: string
  textSafeArea?: TextSafeArea
  referenceImageStrategy: ReferenceImageStrategy
  reasonThisMatchesUserIntent: string
}

export interface CreativePlanValidationRule {
  id: string
  severity: CreativePlanValidationSeverity
  description: string
}

export interface CreativePlan {
  mode: CreativeMode
  userIntent: string
  useCase: CreativeUseCase
  audienceEmotion: string
  contentGoal: string
  visualDirection: string
  vaultStyleReferences: VaultStyleReference[]
  inspirationInterpretation?: InspirationInterpretation
  referenceHandling: ReferenceHandlingPlan
  outputCount: number
  outputs: CreativePlanOutput[]
  validationRules: CreativePlanValidationRule[]
}

export interface CreativePlanValidationResult {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export function normalizeCreativeMode(mode: string): CreativeMode | null {
  switch (mode) {
    case "photo":
      return "photo"
    case "reel-cover":
    case "reel_cover":
      return "reel_cover"
    case "carousel":
      return "carousel"
    case "story-slide":
    case "story_slide":
    case "story-sequence":
    case "story_sequence":
      return "story_sequence"
    case "video":
    case "motion":
      return "video"
    default:
      return null
  }
}

export function inferCreativeUseCase(intent: string, mode: CreativeMode): CreativeUseCase {
  const text = normalizePlanText(intent)
  if (mode === "video") return "motion"
  if (mode === "photo" && /\b(full shoot|photoshoot|series|collection|six|6|nine|9)\b/.test(text)) {
    return "full_photoshoot"
  }
  if (/\b(vault|prompt|prompts|style|styles|already own|top vault)\b/.test(text)) return "vault_product"
  if (/\b(tutorial|how to|settings|step|guide|method)\b/.test(text)) return "tutorial"
  if (/\b(sell|offer|checkout|price|launch|waitlist|buy)\b/.test(text)) return "sales"
  if (/\b(behind|process|bts|making of)\b/.test(text)) return "behind_the_scenes"
  if (/\b(opinion|truth|mistake|hot take|unpopular)\b/.test(text)) return "opinion"
  if (/\b(proof|testimonial|result|case study|trust)\b/.test(text)) return "trust"
  if (/\b(dm|comment|question|poll|soft cta|cta)\b/.test(text)) return "soft_cta"
  if (mode === "carousel" || mode === "story_sequence") return "educational"
  return "single_editorial"
}

export function isShortCreativeRequest(intent: string): boolean {
  return /\b(short|mini|quick|3 slides|three slides|one slide|single slide)\b/i.test(intent)
}

export function isFiveStylesRequest(intent: string): boolean {
  return /\b(5|five)\b/i.test(intent) && /\b(style|styles|prompt|prompts|vault)\b/i.test(intent)
}

export function isVaultRelatedRequest(intent: string, vaultStyleReferences: VaultStyleReference[] = []): boolean {
  return vaultStyleReferences.length > 0 || /\b(vault|prompt|prompts|style|styles|already own|top vault)\b/i.test(intent)
}

export function recommendCreativeOutputCount({
  mode,
  useCase,
  userIntent,
}: {
  mode: CreativeMode
  useCase: CreativeUseCase
  userIntent: string
}): number {
  if (isShortCreativeRequest(userIntent)) {
    if (mode === "carousel") return 3
    if (mode === "story_sequence") return 3
  }

  if (mode === "photo") return useCase === "full_photoshoot" ? 6 : 1
  if (mode === "reel_cover") return 1
  if (mode === "video") return 1

  if (mode === "story_sequence") {
    if (useCase === "sales" || useCase === "tutorial") return 5
    if (useCase === "educational" || useCase === "vault_product") return 7
    return 3
  }

  if (mode === "carousel") {
    if (isFiveStylesRequest(userIntent)) return 9
    if (useCase === "educational" || useCase === "tutorial" || useCase === "vault_product") return 7
    return 6
  }

  return 1
}

export function buildDefaultCreativePlanValidationRules(plan: Pick<CreativePlan, "mode" | "useCase" | "userIntent">): CreativePlanValidationRule[] {
  const rules: CreativePlanValidationRule[] = [
    {
      id: "output-count-matches-plan",
      severity: "error",
      description: "outputCount must match outputs.length before generation.",
    },
    {
      id: "each-output-has-purpose-and-visual-concept",
      severity: "error",
      description: "Every output must have one purpose and one visual concept.",
    },
    {
      id: "reference-strategy-declared",
      severity: "error",
      description: "Every output must declare how reference images should be used.",
    },
  ]

  if (plan.mode === "carousel") {
    rules.push({
      id: "carousel-minimum-for-educational-content",
      severity: "error",
      description: "Educational, tutorial, and Vault carousels need at least 6 slides unless the user asked for short.",
    })
    rules.push({
      id: "carousel-no-lazy-repeated-backgrounds",
      severity: "error",
      description: "Carousel visuals must not reuse the same background/prompt across every slide unless intentional.",
    })
  }

  if (plan.mode === "story_sequence") {
    rules.push({
      id: "story-sequence-count",
      severity: "error",
      description: "Story sequences should contain 3, 5, or 7 slides depending on intent.",
    })
  }

  if (plan.mode === "reel_cover" || plan.mode === "carousel" || plan.mode === "story_sequence") {
    rules.push({
      id: "text-safe-area",
      severity: "warning",
      description: "Text-forward outputs should declare a mobile-readable text-safe area.",
    })
  }

  if (isFiveStylesRequest(plan.userIntent)) {
    rules.push({
      id: "five-styles-means-five-style-outputs",
      severity: "error",
      description: "A five-style topic must include five distinct style outputs.",
    })
  }

  return rules
}

export function validateCreativePlan(plan: CreativePlan): CreativePlanValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (plan.outputCount !== plan.outputs.length) {
    errors.push(`outputCount is ${plan.outputCount}, but outputs.length is ${plan.outputs.length}`)
  }

  if (plan.outputCount !== recommendCreativeOutputCount(plan) && !isShortCreativeRequest(plan.userIntent)) {
    warnings.push("outputCount differs from the default recommendation for this mode and use case")
  }

  for (const [index, output] of plan.outputs.entries()) {
    const label = `output ${index + 1}`
    if (!output.title.trim()) errors.push(`${label} is missing a title`)
    if (!output.purpose.trim()) errors.push(`${label} is missing a purpose`)
    if (!output.visualConcept.trim()) errors.push(`${label} is missing a visual concept`)
    if (!output.reasonThisMatchesUserIntent.trim()) {
      errors.push(`${label} is missing reasonThisMatchesUserIntent`)
    }
    if (!output.referenceImageStrategy) errors.push(`${label} is missing referenceImageStrategy`)

    if (plan.mode === "video") {
      if (!output.videoPromptDirection?.trim()) errors.push(`${label} is missing videoPromptDirection`)
    } else if (!output.imagePromptDirection?.trim()) {
      errors.push(`${label} is missing imagePromptDirection`)
    }

    if (
      (plan.mode === "reel_cover" || plan.mode === "carousel" || plan.mode === "story_sequence") &&
      !output.textSafeArea
    ) {
      warnings.push(`${label} has no textSafeArea`)
    }
  }

  validateModeSpecificPlan(plan, errors, warnings)

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  }
}

function validateModeSpecificPlan(plan: CreativePlan, errors: string[], warnings: string[]): void {
  if (plan.mode === "carousel") {
    validateCarouselPlanRules(plan, errors)
  }

  if (plan.mode === "story_sequence" && ![3, 5, 7].includes(plan.outputCount)) {
    errors.push(`story_sequence outputCount must be 3, 5, or 7, got ${plan.outputCount}`)
  }

  if (plan.mode === "photo" && plan.outputCount > 1 && plan.useCase !== "full_photoshoot") {
    warnings.push("multi-output photo plan should use full_photoshoot useCase")
  }

  if (plan.mode === "video" && plan.outputCount !== 1) {
    errors.push("video plan must create exactly one motion output")
  }
}

function validateCarouselPlanRules(plan: CreativePlan, errors: string[]): void {
  const educational =
    plan.useCase === "educational" || plan.useCase === "tutorial" || plan.useCase === "vault_product"

  if (educational && !isShortCreativeRequest(plan.userIntent) && plan.outputCount < 6) {
    errors.push(`educational carousel needs at least 6 slides, got ${plan.outputCount}`)
  }

  if (isFiveStylesRequest(plan.userIntent) && countStyleOutputs(plan) < 5) {
    errors.push("five-style carousel must include five distinct style outputs")
  }

  if (isVaultRelatedRequest(plan.userIntent, plan.vaultStyleReferences) && plan.vaultStyleReferences.length === 0) {
    errors.push("Vault-related plan is missing vaultStyleReferences")
  }

  const visualDirections = plan.outputs
    .map(output => normalizePlanText(output.imagePromptDirection || output.visualConcept))
    .filter(Boolean)

  if (visualDirections.length >= 4 && new Set(visualDirections).size <= 2) {
    errors.push("carousel visual directions repeat too much")
  }
}

function countStyleOutputs(plan: CreativePlan): number {
  const vaultWords = plan.vaultStyleReferences
    .flatMap(style => normalizePlanText(style.name).split(/\s+/))
    .filter(word => word.length > 3)

  return plan.outputs.filter(output => {
    const text = normalizePlanText(
      [
        output.title,
        output.purpose,
        output.visualConcept,
        output.imagePromptDirection,
        output.reasonThisMatchesUserIntent,
      ].join(" ")
    )
    if (/\b(style|prompt|look|vault)\b/.test(text)) return true
    return vaultWords.some(word => text.includes(word))
  }).length
}

function normalizePlanText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}
