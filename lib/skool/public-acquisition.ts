/**
 * The one live Skool group (confirmed by Sandra 2026-09-03). Everything the
 * customer can click must resolve here.
 *
 * NOTE: this is the PUBLIC url. It is deliberately separate from
 * SKOOL_GROUP_ID in membership-contract.ts, which is the internal entitlement
 * namespace baked into every membership key. Do not "align" the two — changing
 * SKOOL_GROUP_ID would orphan existing entitlements and setup links.
 */
export const SKOOL_GROUP_URL = "https://www.skool.com/sselfie"

export const SKOOL_PUBLIC_MEMBERSHIP_URL = `${SKOOL_GROUP_URL}/about`

/** Where a member lands when Maya hands her back to a lesson. */
export const SKOOL_CLASSROOM_URL = `${SKOOL_GROUP_URL}/classroom`

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
