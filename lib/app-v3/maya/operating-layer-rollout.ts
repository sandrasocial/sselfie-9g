import "server-only"

type MayaOperatingLayerIdentity = {
  userId?: string | null
  email?: string | null
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
  if (isEnabled(process.env.FEATURE_MAYA_OPERATING_LAYER)) return true

  const allowlist = normalizedEntries(process.env.MAYA_OPERATING_LAYER_ALLOWLIST)
  if (!allowlist.size) return false

  const email = identity?.email?.trim().toLowerCase()
  const userId = identity?.userId?.trim().toLowerCase()
  return Boolean((email && allowlist.has(email)) || (userId && allowlist.has(userId)))
}
