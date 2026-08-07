export type PromptVaultProofRecoveryCandidate = {
  email: string
  firstName?: string | null
  isPromptLead: boolean
  isVaultBuyer: boolean
  isInternalOrTest: boolean
  unsubscribed: boolean
  blockedDelivery: boolean
  receivedRecentVaultOffer: boolean
}

export function classifyPromptVaultProofRecoveryAudience(
  candidates: PromptVaultProofRecoveryCandidate[]
) {
  const eligible: Array<{ email: string; firstName: string | null }> = []
  const excluded = {
    duplicate: 0,
    notPromptLead: 0,
    vaultBuyer: 0,
    internalOrTest: 0,
    unsubscribed: 0,
    blockedDelivery: 0,
    recentVaultOffer: 0,
  }
  const seen = new Set<string>()

  for (const candidate of candidates) {
    const email = candidate.email.trim().toLowerCase()
    if (!email || seen.has(email)) {
      excluded.duplicate++
      continue
    }
    seen.add(email)

    if (!candidate.isPromptLead) excluded.notPromptLead++
    else if (candidate.isVaultBuyer) excluded.vaultBuyer++
    else if (candidate.isInternalOrTest) excluded.internalOrTest++
    else if (candidate.unsubscribed) excluded.unsubscribed++
    else if (candidate.blockedDelivery) excluded.blockedDelivery++
    else if (candidate.receivedRecentVaultOffer) excluded.recentVaultOffer++
    else eligible.push({ email, firstName: candidate.firstName?.trim() || null })
  }

  return { eligible, excluded }
}
