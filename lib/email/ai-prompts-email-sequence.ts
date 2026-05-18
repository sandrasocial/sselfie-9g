export type AiPromptsEmailType =
  | "ai-prompts-day2-try-first-prompt"
  | "ai-prompts-day5-edit-makes-postable"
  | "ai-prompts-day7-starter-kit-offer"

export interface AiPromptsEmailTouchDefinition {
  days: number
  emailType: AiPromptsEmailType
}

export const AI_PROMPTS_EMAIL_TOUCHES: AiPromptsEmailTouchDefinition[] = [
  { days: 2, emailType: "ai-prompts-day2-try-first-prompt" },
  { days: 5, emailType: "ai-prompts-day5-edit-makes-postable" },
  { days: 7, emailType: "ai-prompts-day7-starter-kit-offer" },
]
