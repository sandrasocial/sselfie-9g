export type AiPromptsEmailType =
  | "ai-prompts-day1-vault-bridge"
  | "ai-prompts-day2-try-first-prompt"
  | "ai-prompts-day5-edit-makes-postable"
  | "ai-prompts-day7-prompt-vault-offer"
  | "ai-prompts-day9-prompt-vault-proof"
  | "ai-prompts-day11-prompt-vault-why-now"
  | "ai-prompts-day10-suite-trial"

export interface AiPromptsEmailTouchDefinition {
  days: number
  emailType: AiPromptsEmailType
  suppressIfSentTypes?: string[]
}

export const AI_PROMPTS_EMAIL_TOUCHES: AiPromptsEmailTouchDefinition[] = [
  { days: 1, emailType: "ai-prompts-day1-vault-bridge" },
  { days: 5, emailType: "ai-prompts-day5-edit-makes-postable" },
  // FUNNEL-EMAIL-01 (2026-06-13): the $27 ask is now a 3-touch micro-sequence — concrete
  // offer (day 7), proof + the 2-minute how (day 9), light why-now (day 11) — before the
  // SUITE trial. Vault buyers are excluded by the candidate query.
  {
    days: 7,
    emailType: "ai-prompts-day7-prompt-vault-offer",
    suppressIfSentTypes: ["ai-prompts-day7-starter-kit-offer"],
  },
  {
    days: 9,
    emailType: "ai-prompts-day9-prompt-vault-proof",
  },
  {
    days: 11,
    emailType: "ai-prompts-day11-prompt-vault-why-now",
  },
  // SUITE trial moved 10 -> 14: it now follows the full $27 sequence instead of cutting
  // across it. Vault buyers get the trial automatically on purchase (suppressed here).
  {
    days: 14,
    emailType: "ai-prompts-day10-suite-trial",
    suppressIfSentTypes: ["suite_trial_unlock"],
  },
]
