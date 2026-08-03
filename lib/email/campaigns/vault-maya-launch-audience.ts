export interface VaultMayaLaunchContact {
  email: string
  firstName?: string | null
  unsubscribed?: boolean
}

export interface VaultMayaLaunchAudienceInput {
  contacts: VaultMayaLaunchContact[]
  paidSuiteEmails: Iterable<string>
  salesExcludedEmails: Iterable<string>
  commerceBuyerEmails: Iterable<string>
}

function normalizeEmail(value: string): string | null {
  const email = String(value || "").trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function normalizedSet(values: Iterable<string>): Set<string> {
  const result = new Set<string>()
  for (const value of values) {
    const email = normalizeEmail(value)
    if (email) result.add(email)
  }
  return result
}

export function classifyVaultMayaLaunchAudience(input: VaultMayaLaunchAudienceInput) {
  const paidSuite = normalizedSet(input.paidSuiteEmails)
  const salesExcluded = normalizedSet(input.salesExcludedEmails)
  const commerceBuyers = normalizedSet(input.commerceBuyerEmails)
  const unique = new Map<string, VaultMayaLaunchContact>()

  for (const contact of input.contacts) {
    const email = normalizeEmail(contact.email)
    if (!email || contact.unsubscribed) continue
    if (!unique.has(email)) unique.set(email, { ...contact, email })
  }

  const suite: VaultMayaLaunchContact[] = []
  const commerce: VaultMayaLaunchContact[] = []
  const nonbuyers: VaultMayaLaunchContact[] = []
  let protectedNotSuite = 0

  for (const contact of unique.values()) {
    if (paidSuite.has(contact.email)) {
      suite.push(contact)
      continue
    }
    if (salesExcluded.has(contact.email)) {
      protectedNotSuite += 1
      continue
    }
    if (commerceBuyers.has(contact.email)) commerce.push(contact)
    else nonbuyers.push(contact)
  }

  return {
    subscribed: unique.size,
    suite,
    commerce,
    nonbuyers,
    protectedNotSuite,
    eligibleNonmembers: commerce.length + nonbuyers.length,
  }
}
