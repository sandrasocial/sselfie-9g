export interface SelfieGuideChapter {
  id: string
  title: string
  markdown: string
}

function slugify(value: string): string {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized || "chapter"
}

function hasMeaningfulContent(value: string): boolean {
  const cleaned = String(value || "")
    .replace(/^#+\s+/gm, "")
    .replace(/[-_*`[\]():]/g, "")
    .replace(/\s+/g, "")
  return cleaned.length > 0
}

export function parseSelfieGuideChapters(markdown: string): SelfieGuideChapter[] {
  const source = String(markdown || "").replace(/\r/g, "")
  if (!source.trim()) return []

  const lines = source.split("\n")
  const chapters: SelfieGuideChapter[] = []

  let currentTitle = "Start Here"
  let currentLines: string[] = []
  let chapterIndex = 0

  const pushChapter = () => {
    const chunk = currentLines.join("\n").trim()
    if (!chunk || !hasMeaningfulContent(chunk)) {
      currentLines = []
      return
    }

    const id = `${slugify(currentTitle)}-${chapterIndex + 1}`
    chapters.push({
      id,
      title: currentTitle,
      markdown: chunk,
    })
    chapterIndex += 1
    currentLines = []
  }

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/)
    if (headingMatch) {
      pushChapter()
      currentTitle = headingMatch[1].trim()
      currentLines = [line]
      continue
    }

    currentLines.push(line)
  }

  pushChapter()

  return chapters
}

export function extractImageMarker(value: string): string | null {
  const text = String(value || "")
  const match = text.match(/\[IMAGE:\s*([^\s\]]+)/i)
  return match?.[1]?.trim().toLowerCase() || null
}

const PROGRESS_KEY = "sselfie-guide-progress"

export interface GuideProgress {
  chapterIndex: number
  challengeDays: number[]
  personalization: GuidePersonalization | null
}

export type GuidePhoneType = "iphone-15-16" | "iphone-13-14" | "android" | "not-sure"
export type GuidePostingFrequency = "never" | "sometimes" | "regularly"

export interface GuidePersonalization {
  phoneType: GuidePhoneType
  postingFrequency: GuidePostingFrequency
}

function isGuidePhoneType(value: unknown): value is GuidePhoneType {
  return (
    value === "iphone-15-16" ||
    value === "iphone-13-14" ||
    value === "android" ||
    value === "not-sure"
  )
}

function isGuidePostingFrequency(value: unknown): value is GuidePostingFrequency {
  return value === "never" || value === "sometimes" || value === "regularly"
}

function normalizePersonalization(value: unknown): GuidePersonalization | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Record<string, unknown>
  if (!isGuidePhoneType(candidate.phoneType) || !isGuidePostingFrequency(candidate.postingFrequency)) {
    return null
  }
  return {
    phoneType: candidate.phoneType,
    postingFrequency: candidate.postingFrequency,
  }
}

export function getGuideProgress(): GuideProgress {
  if (typeof window === "undefined") return { chapterIndex: 0, challengeDays: [], personalization: null }
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { chapterIndex: 0, challengeDays: [], personalization: null }
    const parsed = JSON.parse(raw) as Partial<GuideProgress>
    return {
      chapterIndex: typeof parsed.chapterIndex === "number" ? parsed.chapterIndex : 0,
      challengeDays: Array.isArray(parsed.challengeDays)
        ? parsed.challengeDays.filter((item): item is number => typeof item === "number")
        : [],
      personalization: normalizePersonalization(parsed.personalization),
    }
  } catch {
    return { chapterIndex: 0, challengeDays: [], personalization: null }
  }
}

export function saveGuideProgress(
  chapterIndex: number,
  challengeDays: number[],
  personalization: GuidePersonalization | null = null,
): void {
  if (typeof window === "undefined") return
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ chapterIndex, challengeDays, personalization }))
}
