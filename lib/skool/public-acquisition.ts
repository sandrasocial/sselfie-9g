export const SKOOL_PUBLIC_MEMBERSHIP_URL =
  "https://www.skool.com/sselfie/about"

export const SKOOL_PUBLIC_ACQUISITION_FLAG =
  "NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED"

export function isSkoolPublicAcquisitionEnabled(
  value = process.env.NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED,
): boolean {
  return value === "true"
}

/**
 * Resolve only a public, new-customer membership CTA. Existing-customer,
 * internal, recovery, and legacy checkout paths must continue to use their
 * original destinations and must not call this helper.
 */
export function resolvePublicMembershipAcquisitionHref(input: {
  legacyHref: string
  enabled?: string
}): string {
  return isSkoolPublicAcquisitionEnabled(input.enabled)
    ? SKOOL_PUBLIC_MEMBERSHIP_URL
    : input.legacyHref
}
