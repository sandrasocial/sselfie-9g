import "server-only"

type MayaOperatingLayerIdentity = {
  userId?: string | null
  email?: string | null
  accessLevel?: "full" | "trial" | "limited" | null
}

function normalizedEntries(value: string | undefined): Set<string> {
  return new Set(
    (value || "")
      .split(",")
      .map(entry => entry.trim().toLowerCase())
      .filter(Boolean)
  )
}

function isEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase()
  return normalized === "true" || normalized === "1" || normalized === "on"
}

function valueTestEntries(): Set<string> {
  const entries = normalizedEntries(process.env.MAYA_VALUE_TEST_ALLOWLIST)
  return entries.size > 0 && entries.size <= 20 ? entries : new Set()
}

export function isMayaOperatingLayerEnabled(identity?: MayaOperatingLayerIdentity): boolean {
  const allowlist = normalizedEntries(process.env.MAYA_OPERATING_LAYER_ALLOWLIST)
  const valueTestAllowlist = valueTestEntries()
  const email = identity?.email?.trim().toLowerCase()
  const userId = identity?.userId?.trim().toLowerCase()
  const allowlisted = Boolean(
    (email && (allowlist.has(email) || valueTestAllowlist.has(email))) ||
    (userId && (allowlist.has(userId) || valueTestAllowlist.has(userId)))
  )

  if (allowlisted) return true

  if (!isEnabled(process.env.FEATURE_MAYA_OPERATING_LAYER)) return false

  return identity?.accessLevel === "full" || identity?.accessLevel === "trial"
}

/** Maya Home is a narrower founder-preview cohort than the existing operating layer.
 * The global operating-layer flag must never widen this UI rollout. */
export function isMayaHomeEnabled(identity?: MayaOperatingLayerIdentity): boolean {
  const previewAllowlist = normalizedEntries(
    process.env.MAYA_HOME_ALLOWLIST || process.env.MAYA_OPERATING_LAYER_ALLOWLIST
  )
  const valueTestAllowlist = valueTestEntries()
  const email = identity?.email?.trim().toLowerCase()
  const userId = identity?.userId?.trim().toLowerCase()
  return Boolean(
    (email && (previewAllowlist.has(email) || valueTestAllowlist.has(email))) ||
    (userId && (previewAllowlist.has(userId) || valueTestAllowlist.has(userId)))
  )
}
