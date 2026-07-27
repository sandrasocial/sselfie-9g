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

export function isMayaOperatingLayerEnabled(identity?: MayaOperatingLayerIdentity): boolean {
  const allowlist = normalizedEntries(process.env.MAYA_OPERATING_LAYER_ALLOWLIST)
  const email = identity?.email?.trim().toLowerCase()
  const userId = identity?.userId?.trim().toLowerCase()
  const allowlisted = Boolean((email && allowlist.has(email)) || (userId && allowlist.has(userId)))

  if (allowlisted) return true

  if (!isEnabled(process.env.FEATURE_MAYA_OPERATING_LAYER)) return false

  return identity?.accessLevel === "full" || identity?.accessLevel === "trial"
}
