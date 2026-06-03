export type PromptVaultEmailType =
  | "prompt-vault-day2-first-result"
  | "prompt-vault-day3-system-upgrade"
  | "prompt-vault-day5-fix-bad-result"
  | "prompt-vault-day10-next-shoot"

export interface PromptVaultEmailTouchDefinition {
  days: number
  emailType: PromptVaultEmailType
}

export const PROMPT_VAULT_EMAIL_TOUCHES: PromptVaultEmailTouchDefinition[] = [
  { days: 2, emailType: "prompt-vault-day2-first-result" },
  { days: 3, emailType: "prompt-vault-day3-system-upgrade" },
  { days: 5, emailType: "prompt-vault-day5-fix-bad-result" },
  { days: 10, emailType: "prompt-vault-day10-next-shoot" },
]
