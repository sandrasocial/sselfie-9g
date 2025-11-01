// Utility to parse AI-generated content calendar from text

interface ContentItem {
  date: string
  platform: string
  contentType: string
  caption: string
  hashtags?: string[]
  notes?: string
}

export function parseContentCalendar(text: string): ContentItem[] {
  if (!text || typeof text !== "string") {
    return []
  }

  const items: ContentItem[] = []

  // Try to parse structured content from AI response
  // Look for patterns like:
  // Date: 2025-01-15
  // Platform: Instagram
  // Type: Reel
  // Caption: ...
  // Hashtags: #tag1 #tag2

  const sections = text.split(/\n\n+/)

  for (const section of sections) {
    const lines = section.split("\n").filter((line) => line.trim())

    if (lines.length < 3) continue

    const item: Partial<ContentItem> = {}

    for (const line of lines) {
      const [key, ...valueParts] = line.split(":")
      const value = valueParts.join(":").trim()

      if (!value) continue

      const lowerKey = key.toLowerCase().trim()

      if (lowerKey.includes("date")) {
        item.date = value
      } else if (lowerKey.includes("platform")) {
        item.platform = value
      } else if (lowerKey.includes("type") || lowerKey.includes("content type")) {
        item.contentType = value
      } else if (lowerKey.includes("caption") || lowerKey.includes("post")) {
        item.caption = value
      } else if (lowerKey.includes("hashtag")) {
        if (value && typeof value === "string") {
          item.hashtags = value.split(/\s+/).filter((tag) => tag.startsWith("#"))
        }
      } else if (lowerKey.includes("note")) {
        item.notes = value
      }
    }

    // Validate required fields
    if (item.date && item.platform && item.contentType && item.caption) {
      items.push(item as ContentItem)
    }
  }

  // If no structured content found, try to extract from markdown tables
  if (items.length === 0) {
    const tableMatch = text.match(/\|[^\n]+\|[\s\S]*?\n\|[-\s|]+\|\n([\s\S]*?)(?:\n\n|$)/)
    if (tableMatch && tableMatch[1]) {
      const rows = tableMatch[1].split("\n").filter((row) => row.includes("|"))

      for (const row of rows) {
        const cells = row
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell)

        if (cells.length >= 4) {
          items.push({
            date: cells[0] || "",
            platform: cells[1] || "",
            contentType: cells[2] || "",
            caption: cells[3] || "",
            hashtags:
              cells[4] && typeof cells[4] === "string"
                ? cells[4].split(/\s+/).filter((tag) => tag.startsWith("#"))
                : undefined,
            notes: cells[5],
          })
        }
      }
    }
  }

  return items
}

export function formatContentCalendarPrompt(): string {
  return `
When creating a content calendar, please format your response like this:

Date: YYYY-MM-DD
Platform: Instagram/TikTok/etc
Type: Post/Reel/Story/etc
Caption: Your caption here
Hashtags: #tag1 #tag2 #tag3
Notes: Any additional notes

(Repeat for each content item)

This format allows for easy export to CSV, JSON, or iCal formats.
`
}
