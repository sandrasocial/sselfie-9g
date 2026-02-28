type MayaChatCreditPolicyInput = {
  isPromptBuilder: boolean
  isAdmin: boolean
  isStudioProMode: boolean
}

/**
 * Chat credits are not deducted in Studio Pro mode.
 * This preserves first-generation credits for image output.
 */
export function shouldDeductMayaChatCredit({
  isPromptBuilder,
  isAdmin,
  isStudioProMode,
}: MayaChatCreditPolicyInput): boolean {
  if (isPromptBuilder || isAdmin) return false
  if (isStudioProMode) return false
  return true
}
