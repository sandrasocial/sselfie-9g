export const VAULT_MAYA_REFERENCE_MODE = "vault-look-recreation" as const

/**
 * Vault Maya recreates a chosen look around the member as she really is. Keep this
 * scoped to Vault Maya so the protected SUITE generation system is unchanged.
 */
export const VAULT_MAYA_IDENTITY_PRESERVATION = `IDENTITY AND BODY ARE FIXED:
The identity photos are the only source for this woman's real face and body. Preserve her facial structure, face shape, skin tone, age, hair, natural body shape and build, shoulder width, torso length, waist-to-hip relationship, limb proportions, height impression, posture tendencies, and overall features.
Do not slim, enlarge, lengthen, shorten, idealize, age-shift, or reshape her. Do not copy the inspiration woman's face or body. Recreate the inspiration pose, outfit, setting, crop, and light around the member's real proportions, with natural anatomy.`

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
