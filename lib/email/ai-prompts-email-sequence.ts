export type AiPromptsEmailType =
  | "ai-prompts-day1-vault-bridge"
  | "ai-prompts-day2-try-first-prompt"
  | "ai-prompts-day5-edit-makes-postable"
  | "ai-prompts-day7-prompt-vault-offer"
  | "ai-prompts-day10-suite-trial"

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
  // FUNNEL-2026-06-11: trial offer for those the $27 Vault didn't convert. Vault buyers
  // are excluded by the candidate query (and get the trial automatically on purchase).
  {
    days: 10,
    emailType: "ai-prompts-day10-suite-trial",
    suppressIfSentTypes: ["suite_trial_unlock"],
  },
]
