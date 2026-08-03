export const VAULT_MAYA_REFERENCE_MODE = "vault-look-recreation" as const

export type LeadInspirationMode = "close-recreation" | "set-variation" | "style-accent"

/**
 * Vault Maya is the one style-led flow where the selected image is the promised result,
 * not an optional mood reference. Keep every other SUITE inspiration decision unchanged.
 */
export function resolveVaultMayaInspirationMode(input: {
  format: string
  requestedMode: unknown
  styleLedSession: boolean
}): LeadInspirationMode {
  if (input.format === "photo" && input.requestedMode === VAULT_MAYA_REFERENCE_MODE) {
    return "close-recreation"
  }
  return input.styleLedSession ? "style-accent" : "close-recreation"
}
