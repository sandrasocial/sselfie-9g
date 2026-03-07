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
