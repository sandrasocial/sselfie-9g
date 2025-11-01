"use client"

import { useState } from "react"

interface ContentItem {
  date: string
  platform: string
  contentType: string
  caption: string
  hashtags?: string[]
  notes?: string
}

interface ContentCalendarExportProps {
  content: ContentItem[]
}

export function ContentCalendarExport({ content }: ContentCalendarExportProps) {
  const [exporting, setExporting] = useState(false)
  const [format, setFormat] = useState<"csv" | "json" | "ical">("csv")

  const handleExport = async () => {
    if (!content || content.length === 0) {
      alert("No content to export")
      return
    }

    setExporting(true)
    try {
      const response = await fetch("/api/admin/agent/export-calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, format }),
      })

      if (!response.ok) {
        throw new Error("Export failed")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `content-calendar-${new Date().toISOString().split("T")[0]}.${format === "ical" ? "ics" : format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Export error:", error)
      alert("Failed to export calendar")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
      <h3
        className="text-sm font-light uppercase mb-3 text-stone-900"
        style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
      >
        Export Calendar
      </h3>
      <div className="flex gap-2 mb-3">
        {(["csv", "json", "ical"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`px-3 py-1 text-xs uppercase rounded transition-colors ${
              format === f ? "bg-stone-900 text-stone-50" : "bg-stone-200 text-stone-700 hover:bg-stone-300"
            }`}
            style={{ letterSpacing: "0.15em" }}
          >
            {f === "ical" ? "iCal" : f.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        onClick={handleExport}
        disabled={exporting || !content || content.length === 0}
        className="w-full px-4 py-2 bg-stone-900 text-stone-50 text-xs uppercase rounded hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ letterSpacing: "0.15em" }}
      >
        {exporting ? "Exporting..." : `Export as ${format === "ical" ? "iCal" : format.toUpperCase()}`}
      </button>
      {content && content.length > 0 && (
        <p className="text-xs text-stone-500 mt-2">{content.length} items ready to export</p>
      )}
    </div>
  )
}
