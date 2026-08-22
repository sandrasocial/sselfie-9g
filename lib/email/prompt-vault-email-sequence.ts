export type PromptVaultEmailType =
  | "prompt-vault-day2-first-result"
  | "prompt-vault-day5-fix-bad-result"
  | "prompt-vault-day10-next-shoot"
  | "prompt-vault-day14-membership-bridge"

export interface PromptVaultEmailTouchDefinition {
  days: number
  emailType: PromptVaultEmailType
  excludeSuiteMembers?: boolean
}

export const PROMPT_VAULT_EMAIL_TOUCHES: PromptVaultEmailTouchDefinition[] = [
  { days: 2, emailType: "prompt-vault-day2-first-result" },
  { days: 5, emailType: "prompt-vault-day5-fix-bad-result" },
  { days: 10, emailType: "prompt-vault-day10-next-shoot" },
  {
    days: 14,
    emailType: "prompt-vault-day14-membership-bridge",
    excludeSuiteMembers: true,
  },
]
