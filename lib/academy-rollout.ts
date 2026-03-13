type AcademyIdentity = {
  userId?: string | null
  email?: string | null
}

function parseAllowlist(value: string | undefined): Set<string> {
  return new Set(
    (value || "")
      .split(",")
      .map(entry => entry.trim().toLowerCase())
      .filter(entry => entry.length > 0)
  )
}

export function isAcademyEntitlementsV2Enabled(identity?: AcademyIdentity): boolean {
  const rolloutFlag = (process.env.ENABLE_ACADEMY_ENTITLEMENTS_V2 || "").trim().toLowerCase()
  if (rolloutFlag !== "false") {
    return true
  }

  const allowlist = parseAllowlist(process.env.ACADEMY_ENTITLEMENTS_V2_ALLOWLIST)
  if (!allowlist.size) {
    return false
  }

  const userId = identity?.userId?.trim().toLowerCase()
  const email = identity?.email?.trim().toLowerCase()
  return (userId ? allowlist.has(userId) : false) || (email ? allowlist.has(email) : false)
}
