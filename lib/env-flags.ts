export function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name]
  if (raw == null || raw === "") return defaultValue
  const normalized = String(raw).trim().toLowerCase()
  if (["1", "true", "yes", "on"].includes(normalized)) return true
  if (["0", "false", "no", "off"].includes(normalized)) return false
  return defaultValue
}

export function envNumber(name: string, defaultValue: number): number {
  const raw = process.env[name]
  if (raw == null || raw === "") return defaultValue
  const n = Number(String(raw).trim())
  return Number.isFinite(n) ? n : defaultValue
}
