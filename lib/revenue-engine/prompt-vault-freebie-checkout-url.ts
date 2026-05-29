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
