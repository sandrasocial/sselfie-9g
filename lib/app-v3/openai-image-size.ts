const OPENAI_SIZE_PATTERN = /^(\d+)x(\d+)$/

function isSafeGptImageSize(value: string): boolean {
  const match = value.match(OPENAI_SIZE_PATTERN)
  if (!match) return false
  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false
  if (width <= 0 || height <= 0) return false
  if (width % 16 !== 0 || height % 16 !== 0) return false
  const ratio = Math.max(width / height, height / width)
  return ratio <= 3
}

export function normalizeOpenAIImageSize(value: string | undefined, fallback: string): string {
  const normalized = value?.trim()
  if (normalized && isSafeGptImageSize(normalized)) return normalized
  return fallback
}
