export function buildPromptVaultFreebieCheckoutHref(input: {
  promptId: string
  accessToken: string
}) {
  const params = new URLSearchParams({
    source: "ai_prompts_access",
    utm_source: "ai_prompts",
    utm_medium: "prompt_pack",
    utm_campaign: "ai_prompts_to_prompt_vault",
    utm_content: `shoot_${input.promptId}`,
    checkout_source: "free_prompt_shoot_cta",
    buyer_stage: "lead",
    cta_keyword: "full_shoot_after_free_prompt",
    entry_path: "/ai-prompts/access/[token]",
  })

  const token = input.accessToken.trim()
  if (token) {
    params.set("freebie_token", token)
  }

  return `/checkout/prompt-vault?${params.toString()}`
}

export function buildSelfieAiPhotosKitFreebieCheckoutHref(input: {
  promptId: string
  accessToken: string
}) {
  const params = new URLSearchParams({
    source: "ai_prompts_access",
    utm_source: "ai_prompts",
    utm_medium: "prompt_pack",
    utm_campaign: "ai_prompts_to_selfie_ai_photos_kit",
    utm_content: `shoot_${input.promptId}`,
    checkout_source: "free_prompt_kit_cta",
    buyer_stage: "lead",
    cta_keyword: "first_ai_photos_after_free_prompt",
    entry_path: "/ai-prompts/access/[token]",
  })

  const token = input.accessToken.trim()
  if (token) {
    params.set("freebie_token", token)
  }

  return `/checkout/selfie-to-ai-photos-kit?${params.toString()}`
}
