import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const ADMIN_EMAIL = "ssa@ssasocial.com"

interface ContentItem {
  date: string
  platform: string
  contentType: string
  caption: string
  hashtags?: string[]
  notes?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { content, format } = await request.json()

    if (!content || !Array.isArray(content)) {
      return NextResponse.json({ error: "Invalid content data" }, { status: 400 })
    }

    const contentItems = content as ContentItem[]

    switch (format) {
      case "csv":
        return exportAsCSV(contentItems)
      case "json":
        return exportAsJSON(contentItems)
      case "ical":
        return exportAsICal(contentItems)
      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Error exporting calendar:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function exportAsCSV(content: ContentItem[]) {
  const headers = ["Date", "Platform", "Content Type", "Caption", "Hashtags", "Notes"]
  const rows = content.map((item) => [
    item.date,
    item.platform,
    item.contentType,
    `"${item.caption.replace(/"/g, '""')}"`,
    item.hashtags ? `"${item.hashtags.join(", ")}"` : "",
    item.notes ? `"${item.notes.replace(/"/g, '""')}"` : "",
  ])

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="content-calendar-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}

function exportAsJSON(content: ContentItem[]) {
  const json = JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      contentCalendar: content,
    },
    null,
    2,
  )

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="content-calendar-${new Date().toISOString().split("T")[0]}.json"`,
    },
  })
}

function exportAsICal(content: ContentItem[]) {
  const icalEvents = content
    .map((item) => {
      const date = new Date(item.date)
      const dateStr = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

      return [
        "BEGIN:VEVENT",
        `DTSTART:${dateStr}`,
        `DTEND:${dateStr}`,
        `SUMMARY:${item.platform} - ${item.contentType}`,
        `DESCRIPTION:${item.caption}${item.hashtags ? "\\n\\nHashtags: " + item.hashtags.join(" ") : ""}${item.notes ? "\\n\\nNotes: " + item.notes : ""}`,
        `UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@sselfie.app`,
        "END:VEVENT",
      ].join("\r\n")
    })
    .join("\r\n")

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SSELFIE//Content Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    icalEvents,
    "END:VCALENDAR",
  ].join("\r\n")

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar",
      "Content-Disposition": `attachment; filename="content-calendar-${new Date().toISOString().split("T")[0]}.ics"`,
    },
  })
}
