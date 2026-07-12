export type AiPromptsEmailType =
  | "ai-prompts-day1-vault-bridge"
  | "ai-prompts-day2-try-first-prompt"
  | "ai-prompts-day5-edit-makes-postable"
  | "ai-prompts-day7-prompt-vault-offer"
  | "ai-prompts-day9-prompt-vault-proof"
  | "ai-prompts-day11-prompt-vault-why-now"

export interface AiPromptsEmailTouchDefinition {
  days: number
  emailType: AiPromptsEmailType
  suppressIfSentTypes?: string[]
}

export const AI_PROMPTS_EMAIL_TOUCHES: AiPromptsEmailTouchDefinition[] = [
  { days: 1, emailType: "ai-prompts-day1-vault-bridge" },
  { days: 5, emailType: "ai-prompts-day5-edit-makes-postable" },
  {
    days: 7,
    emailType: "ai-prompts-day7-prompt-vault-offer",
    suppressIfSentTypes: ["ai-prompts-day7-starter-kit-offer"],
  },
  { days: 9, emailType: "ai-prompts-day9-prompt-vault-proof" },
  { days: 11, emailType: "ai-prompts-day11-prompt-vault-why-now" },
]
